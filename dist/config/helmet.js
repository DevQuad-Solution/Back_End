"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://unpkg.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'http:'],
            connectSrc: ["'self'", 'https://unpkg.com', 'https://*.swagger.io'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
        },
    },
};
exports.default = helmetConfig;
