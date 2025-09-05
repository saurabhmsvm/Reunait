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
// Ensure Clerk webhook receives the raw body for Svix verification BEFORE json parsing
app.post("/api/webhooks/clerk", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({limit: "30mb", extended: true}));
app.use(bodyParser.urlencoded({limit: "30mb", extended: true}));
app.use(cors());
app.use(clerkMiddleware());

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


/*  MONGOOSE SETUP  */
const PORT = process.env.PORT || 6001;
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: process.env.DB_NAME || "missing_found_db"
}).then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from network`));
}).catch((error) => console.log(`${error} did not connect`))
