import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  GetAuthSessionResponse,
  LogoutParticipantResponse,
} from "@workspace/api-zod";
import {
  getParticipantsCollection,
  type ParticipantRecord,
} from "../lib/mongo";

const router: IRouter = Router();
const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_PROFILE_URL = "https://api.x.com/2/users/me";

interface XProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  verified_type?: string;
}

interface XProfileResponse {
  data?: XProfile;
}

interface XTokenResponse {
  access_token?: string;
}

function isEligibleParticipant(
  profile: XProfile | undefined,
): profile is XProfile {
  return (
    typeof profile?.id === "string" &&
    profile.id.length > 0 &&
    typeof profile.username === "string" &&
    profile.username.length > 0
  );
}

function getRedirectUri(req?: Request): string {
  const configuredUri = process.env.X_REDIRECT_URI?.trim();
  if (configuredUri) {
    const parsed = new URL(configuredUri);
    const isLocalHttp =
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !isLocalHttp) {
      throw new Error("X_REDIRECT_URI must use HTTPS.");
    }
    return parsed.toString();
  }

  const domains =
    process.env.NODE_ENV === "production"
      ? process.env.REPLIT_DOMAINS?.split(",")
      : [process.env.REPLIT_DEV_DOMAIN];
  const domain = domains?.map((value) => value?.trim()).find(Boolean);
  if (domain) {
    return `https://${domain}/api/auth/x/callback`;
  }

  if (req) {
    const host = req.get("host") || "localhost:3000";
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    return `${proto}://${host}/api/auth/x/callback`;
  }

  return "http://localhost:3000/api/auth/x/callback";
}

function isValidState(expected: string | undefined, received: unknown): boolean {
  if (!expected || typeof received !== "string") {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function queryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function redirectWithError(res: Response, code: string): void {
  res.redirect(302, `/?auth_error=${encodeURIComponent(code)}`);
}

router.get("/auth/x/start", async (req, res): Promise<void> => {
  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    redirectWithError(res, "not_configured");
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);
    const state = randomBytes(32).toString("hex");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    req.session.xOAuthState = state;
    req.session.xOAuthCodeVerifier = codeVerifier;
    await saveSession(req);

    const authorizationUrl = new URL(X_AUTHORIZE_URL);
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "users.read",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();

    res.redirect(302, authorizationUrl.toString());
  } catch (error) {
    req.log.error({ err: error }, "Unable to start X OAuth");
    redirectWithError(res, "service_unavailable");
  }
});

router.get("/auth/x/callback", async (req, res): Promise<void> => {
  const receivedState = queryValue(req.query.state);
  const expectedState = req.session.xOAuthState;
  const codeVerifier = req.session.xOAuthCodeVerifier;
  delete req.session.xOAuthState;
  delete req.session.xOAuthCodeVerifier;

  if (!isValidState(expectedState, receivedState) || !codeVerifier) {
    req.log.warn("Rejected X OAuth callback with invalid state");
    redirectWithError(res, "invalid_state");
    return;
  }

  const providerError = queryValue(req.query.error);
  if (providerError) {
    req.log.info({ providerError }, "Participant declined X authorization");
    await saveSession(req);
    redirectWithError(res, "authorization_denied");
    return;
  }

  const code = queryValue(req.query.code);
  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  if (!code || !clientId || !clientSecret) {
    await saveSession(req);
    redirectWithError(res, "authorization_incomplete");
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);
    const tokenParameters = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    const tokenResponse = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParameters.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    const tokenPayload = (await tokenResponse.json()) as XTokenResponse;
    if (!tokenResponse.ok || typeof tokenPayload.access_token !== "string") {
      req.log.warn(
        { statusCode: tokenResponse.status },
        "X OAuth token exchange failed",
      );
      await saveSession(req);
      redirectWithError(res, "verification_failed");
      return;
    }

    const profileUrl = new URL(X_PROFILE_URL);
    profileUrl.searchParams.set(
      "user.fields",
      "profile_image_url,verified,verified_type",
    );
    const profileResponse = await fetch(profileUrl, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    const profilePayload = (await profileResponse.json()) as XProfileResponse;
    const xUser = profilePayload.data;
    if (!profileResponse.ok || !isEligibleParticipant(xUser)) {
      req.log.warn(
        { statusCode: profileResponse.status },
        "X profile verification failed",
      );
      await saveSession(req);
      redirectWithError(res, "verification_failed");
      return;
    }

    const now = new Date();
    const participant = {
      xUserId: xUser.id,
      username: xUser.username,
      name:
        typeof xUser.name === "string" && xUser.name.length > 0
          ? xUser.name
          : xUser.username,
      profileImageUrl:
        typeof xUser.profile_image_url === "string"
          ? xUser.profile_image_url
          : null,
      xVerified:
        typeof xUser.verified === "boolean" ? xUser.verified : null,
      xVerifiedType:
        typeof xUser.verified_type === "string"
          ? xUser.verified_type
          : null,
      // Successful X account authentication is the only current eligibility rule.
      // The verification badge is informational; no engagement actions are configured.
      eligibilityStatus: "eligible" as const,
      lastAuthenticatedAt: now,
      updatedAt: now,
    };

    const participants = await getParticipantsCollection();
    await participants.updateOne(
      { xUserId: xUser.id },
      {
        $set: participant,
        $setOnInsert: {
          firstAuthenticatedAt: now,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await regenerateSession(req);
    req.session.participantXUserId = xUser.id;
    await saveSession(req);
    res.redirect(302, "/");
  } catch (error) {
    req.log.error({ err: error }, "X OAuth participant verification failed");
    redirectWithError(res, "verification_failed");
  }
});

router.get("/auth/session", async (req, res): Promise<void> => {
  try {
    const xUserId = req.session.participantXUserId;
    if (!xUserId) {
      res.json(GetAuthSessionResponse.parse({ authenticated: false, user: null }));
      return;
    }

    const participants = await getParticipantsCollection();
    const participant = await participants.findOne({ xUserId });
    if (!participant) {
      await new Promise<void>((resolve) => {
        req.session.destroy(() => resolve());
      });
      res.json(GetAuthSessionResponse.parse({ authenticated: false, user: null }));
      return;
    }

    const participantResponse: ParticipantRecord = participant;
    res.json(
      GetAuthSessionResponse.parse({
        authenticated: true,
        user: {
          xUserId: participantResponse.xUserId,
          username: participantResponse.username,
          name: participantResponse.name,
          profileImageUrl: participantResponse.profileImageUrl,
          xVerified: participantResponse.xVerified,
          xVerifiedType: participantResponse.xVerifiedType,
          eligibilityStatus: participantResponse.eligibilityStatus,
          firstAuthenticatedAt: participantResponse.firstAuthenticatedAt,
          lastAuthenticatedAt: participantResponse.lastAuthenticatedAt,
        },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Unable to load participant session");
    res.status(500).json({ error: "Session could not be loaded." });
  }
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((error) => {
    if (error) {
      req.log.error({ err: error }, "Unable to end participant session");
      res.status(500).json({ error: "Session could not be ended." });
      return;
    }

    res.clearCookie("nova.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.json(LogoutParticipantResponse.parse({ loggedOut: true }));
  });
});

export default router;
