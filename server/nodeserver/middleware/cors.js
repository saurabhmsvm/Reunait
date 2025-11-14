import cors from "cors";

// Parse allowed origins from environment variable
const parseAllowedOrigins = () => {
    const raw = process.env.ALLOWED_ORIGINS || '';
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

// Production safety check: warn if ALLOWED_ORIGINS is empty in production
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    console.warn('⚠️  WARNING: ALLOWED_ORIGINS is empty in production! CORS will allow all origins.');
}

// Validate wildcard usage (not allowed with credentials)
if (allowedOrigins.includes('*')) {
    console.warn('⚠️  WARNING: Wildcard (*) origin is not compatible with credentials: true. Browsers will reject it.');
}

// CORS middleware configuration
export const corsMiddleware = cors((req, callback) => {
    const corsOptions = {
        origin: function (origin, cb) {
            // Allow non-browser or same-origin requests (no Origin header)
            if (!origin) return cb(null, true);

            // Always allow Razorpay Checkout redirect posts to callback endpoint
            // Official flow posts from Razorpay domains via the browser
            if (req.originalUrl && req.originalUrl.startsWith("/api/donations/callback")) {
                return cb(null, true);
            }

            // If no configured origins, allow all (useful for local/dev without setting env)
            if (allowedOrigins.length === 0) return cb(null, true);

            const isAllowed = allowedOrigins.some((entry) => {
                // Reject wildcard when credentials are enabled (browsers will reject anyway)
                // But we prevent it here to avoid confusion
                if (entry === '*') {
                    return false; // Explicitly reject wildcard with credentials
                }
                // Support wildcard subdomains like *.example.com
                if (entry.startsWith('*.')) {
                    const base = entry.slice(2);
                    try {
                        const u = new URL(origin);
                        const hostname = u.hostname;
                        // Match exact base domain or subdomains (prevent bypasses like evilexample.com)
                        return hostname === base || 
                               (hostname.endsWith(`.${base}`) && hostname.split('.').length === base.split('.').length + 1);
                    } catch {
                        return false;
                    }
                }
                return origin === entry;
            });

            return isAllowed ? cb(null, true) : cb(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Include-Notifications'],
        credentials: true,
        maxAge: 86400, // cache preflight for 24h
    };
    callback(null, corsOptions);
});

// Private Network Access middleware for local/LAN
export const privateNetworkAccess = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Private-Network', 'true');
    }
    next();
};

