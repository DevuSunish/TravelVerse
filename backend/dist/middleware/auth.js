"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.JWT_SECRET || 'supersecretjwtkeytravelverse2026_change_me_in_production';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        // Asynchronously update last_seen timestamp
        (0, db_1.query)('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [decoded.id]).catch((e) => {
            console.warn('Failed to update last_seen:', e.message);
        });
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Token is invalid or expired' });
    }
}
