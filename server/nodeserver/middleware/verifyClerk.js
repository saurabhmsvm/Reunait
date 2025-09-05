import dotenv from "dotenv";

dotenv.config();

function base64UrlDecode(str) {
    try {
        const pad = 4 - (str.length % 4 || 4);
        const base64 = (str + "=".repeat(pad)).replace(/-/g, "+").replace(/_/g, "/");
        const decoded = Buffer.from(base64, "base64").toString("utf8");
        return JSON.parse(decoded);
    } catch (_) {
        return null;
    }
}

export default function verifyClerk(req, res, next) {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"]; 
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const parts = token.split(".");
        if (parts.length === 3) {
            const payload = base64UrlDecode(parts[1]);
            if (payload) {
                req.auth = {
                    clerkUserId: payload.sub,
                    email: payload.email || payload.email_address || (payload.claims && payload.claims.email),
                    name: payload.name || payload.full_name || `${payload.first_name || ""} ${payload.last_name || ""}`.trim(),
                    avatarUrl: payload.picture || payload.profile_image_url || null,
                    raw: payload,
                };
                return next();
            }
        }
    }

    // Dev fallback via headers
    const devId = req.headers["x-dev-clerk-userid"]; 
    if (devId) {
        req.auth = {
            clerkUserId: String(devId),
            email: req.headers["x-dev-email"] || null,
            name: req.headers["x-dev-name"] || null,
            avatarUrl: req.headers["x-dev-avatar"] || null,
            raw: { dev: true },
        };
        return next();
    }

    return res.status(401).json({ success: false, message: "Unauthorized: missing or invalid Clerk token" });
}


