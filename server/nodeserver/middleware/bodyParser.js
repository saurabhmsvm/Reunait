import express from "express";
import bodyParser from "body-parser";

// Webhook routes that need raw body for signature verification
const WEBHOOK_ROUTES = [
    "/api/webhooks/clerk",
    "/api/donations/webhook"
];

// Check if request is a webhook route
const isWebhookRoute = (url) => {
    return url && WEBHOOK_ROUTES.some(route => url.startsWith(route));
};

// Skip JSON body parsing for webhooks so we can verify the raw payload
export const skipJsonForWebhooks = (req, res, next) => {
    if (isWebhookRoute(req.originalUrl)) {
        return next();
    }
    return express.json()(req, res, next);
};

// Apply body parsers to all routes EXCEPT webhooks (need raw body for signature verification)
export const bodyParserMiddleware = (req, res, next) => {
    if (isWebhookRoute(req.originalUrl)) {
        return bodyParser.raw({ type: "application/json" })(req, res, next);
    }
    return bodyParser.json({ limit: "30mb", extended: true })(req, res, (err) => {
        if (err) return next(err);
        return bodyParser.urlencoded({ limit: "30mb", extended: true })(req, res, next);
    });
};

