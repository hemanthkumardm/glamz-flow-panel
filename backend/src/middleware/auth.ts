import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

const SECRET = process.env.JWT_SECRET ?? "dev_secret_change_me";

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, SECRET) as { id: string; role: string };
        req.userId = payload.id;
        req.userRole = payload.role;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.userRole !== "admin") {
        res.status(403).json({ message: "Admin only" });
        return;
    }
    next();
}
