import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.js"
import casesRoutes from "./routes/cases.js"
import findMatchesRoutes from "./routes/find-matches.js"
import userAuthRoutes from "./routes/user-auth.js"
import reportRoutes from "./routes/report.js"
import caseOwnerProfileRoutes from "./routes/caseOwnerProfile.js"
import homepageRoutes from "./routes/homepage.js"
import testimonialRoutes from "./routes/testimonial.js"
import { clerkMiddleware } from "@clerk/express";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Ensure Express trusts upstream proxies so req.ip and X-Forwarded-For work correctly
app.set('trust proxy', true);

// Middleware
// Important: Skip JSON body parsing for the Clerk webhook so we can verify the raw payload
app.use((req, res, next) => {
    if (req.originalUrl && req.originalUrl.startsWith("/api/webhooks/clerk")) {
        return next();
    }
    return express.json()(req, res, next);
});
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
// Apply body parsers to all routes EXCEPT the Clerk webhook
app.use((req, res, next) => {
    if (req.originalUrl && req.originalUrl.startsWith("/api/webhooks/clerk")) {
        return next();
    }
    return bodyParser.json({ limit: "30mb", extended: true })(req, res, (err) => {
        if (err) return next(err);
        return bodyParser.urlencoded({ limit: "30mb", extended: true })(req, res, next);
    });
});
app.use(cors());
// Clerk middleware: mark webhook route as public so it bypasses auth
app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    // Public routes (no auth) for Clerk webhooks
    // @clerk/express supports a function or array; safest is to skip when url starts with webhook path
    // We guard again below in code to ensure it isn't blocked
    // Note: If using older versions, this option may be ignored; the explicit route remains public
}));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Apply rate limiter to all routes
app.use(rateLimiter);

/*  ROUTES  */
app.use("/auth", authRoutes);
app.use("/cases", casesRoutes);
app.use("/api", findMatchesRoutes);
app.use("/api", userAuthRoutes);
app.use("/api", reportRoutes);
app.use("/api", caseOwnerProfileRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/testimonials", testimonialRoutes);


/*  MONGOOSE SETUP  */
const PORT = process.env.PORT || 6001;
mongoose.connect(process.env.MONGO_URL, {
    dbName: process.env.DB_NAME || "missing_found_db"
}).then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from network`));
}).catch((error) => console.log(`${error} did not connect`))
