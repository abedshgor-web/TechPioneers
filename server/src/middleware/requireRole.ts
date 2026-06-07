import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * Gate a route behind one or more roles. Must run after requireAuth.
 * Roles: "user" | "advertiser" | "admin".
 */
export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
