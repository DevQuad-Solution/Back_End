"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const allowedOrigins = [
    'http://localhost:5173',
    '*'
];
const corsOptions = {
    origin: (origin, callback) => {
        // Check if the origin is undefined (e.g., when testing without a browser)
        if (!origin) {
            return callback(null, true);
        }
        // For '*' wildcard origin, allow all origins
        if (allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        // Check if the origin is in the allowedOrigins array
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
};
exports.default = corsOptions;
