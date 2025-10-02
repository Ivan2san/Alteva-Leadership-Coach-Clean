import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth";
import { storage } from "../storage";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        fullName: string;
        lgp360Data?: any;
        lgp360UploadedAt?: string;
      };
    }
  }
}

type RequestUser = {
  id: string;
  email: string;
  role: string;
  fullName: string;
  lgp360Data?: any;
  lgp360UploadedAt?: string;
};

/**
 * Middleware to authenticate users via JWT token
 * Sets req.user with authenticated user data
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let user;

    if (!token) {
      // Bypass auth: use default admin user
      const users = await storage.getAllUsers();
      user = users.find(u => u.email === "admin@leadership-coach.app");
      
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
    } else {
      // Verify token using existing auth utility
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Get user from database
      user = await storage.getUser((decoded as any).userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
    }

    // Attach a SAFE shape to request (exclude password and serialize dates)
    // Your DB user may include Date | null and other fields; map only what Request.user promises.
    const { password: _ignore, ...u } = user as any;

    const safeUser: RequestUser = {
      id: String(u.id),
      email: String(u.email),
      role: String(u.role),
      fullName: String(u.fullName),
      // Optional data passthrough if present in your model; keep it loose by design
      lgp360Data: u.lgp360Data ?? undefined,
      // Serialize Date | null to ISO string or omit
      lgp360UploadedAt: u.lgp360UploadedAt ? new Date(u.lgp360UploadedAt).toISOString() : undefined,
    };

    req.user = safeUser;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to require admin role
 * Must be used after authenticateUser middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

/**
 * Middleware to require user role (regular user or admin)
 * Must be used after authenticateUser middleware
 */
export const requireUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!["user", "admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "User access required" });
  }

  next();
};