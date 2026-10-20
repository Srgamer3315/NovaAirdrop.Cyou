import session from "express-session";
import { mongoSessionStore } from "../lib/mongo";

const sessionSecret = process.env.SESSION_SECRET || "nova-airdrop-dev-secret-key-12345";

export const sessionMiddleware = session({
  name: "nova.sid",
  secret: sessionSecret,
  store: mongoSessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  },
});
