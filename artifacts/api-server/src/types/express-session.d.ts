import "express-session";

declare module "express-session" {
  interface SessionData {
    participantXUserId?: string;
    xOAuthState?: string;
    xOAuthCodeVerifier?: string;
  }
}
