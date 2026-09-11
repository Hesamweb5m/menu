import { Router } from "express";
import {
  issueToken,
  requireAuth,
  serializeUser,
  verifyCredentials,
} from "../auth.js";
import { ApiError } from "../strapi.js";

const router = Router();

/**
 * POST /api/auth/local  ->  { jwt, user }
 *
 * Same request and response shape as Strapi's users-permissions plugin, so the
 * admin login page can post `{ identifier, password }`. `email` and `username`
 * are accepted as aliases for `identifier`.
 */
router.post("/local", (req, res) => {
  const body = req.body ?? {};
  const identifier = body.identifier ?? body.email ?? body.username;

  if (!identifier || !body.password) {
    throw ApiError.badRequest("identifier and password are required");
  }

  const user = verifyCredentials(String(identifier), String(body.password));

  res.json({ jwt: issueToken(user), user: serializeUser(user) });
});

export default router;

/** Mounted separately at /api/users/me so the frontend can validate a stored token. */
export const usersRouter = Router();

usersRouter.get("/me", requireAuth, (req, res) => {
  res.json(serializeUser(req.user));
});
