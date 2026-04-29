"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = __importDefault(require("http"));
const cors_2 = __importDefault(require("./config/cors"));
const db_1 = __importDefault(require("./config/db"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const responseService_1 = require("./utils/responseService");
const websocket_1 = require("./utils/websocket");
const rateLimiter_1 = require("./middlewares/rateLimiter");
// Load environment variables
dotenv_1.default.config();
// Database backup
require("./utils/dbBackup");
const helmet_2 = __importDefault(require("./config/helmet"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5004;
// Init socket.io
(0, websocket_1.useSocket)(server);
// Apply helmet with CSP that allows external resources
app.use((0, helmet_1.default)(helmet_2.default));
app.use((0, cors_1.default)(cors_2.default));
app.use(rateLimiter_1.reqRateLimit);
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Basic route
app.get('/', (req, res) => {
    return (0, responseService_1.resSender)(res, 200, 'success', 'Root Test route is working!');
});
// Health check
app.get('/health', (req, res) => {
    let timestamp = new Date().toISOString();
    (0, responseService_1.resSender)(res, 200, 'success', 'Health check route is working!', null, timestamp);
});
app.get('/api/test', (req, res) => {
    return (0, responseService_1.resSender)(res, 200, 'success', 'Test route is working!');
});
// API Documentation endpoint - with disabled CSP for this route only
app.get('/api/v1/docs', (req, res) => {
    // Remove CSP for this route by setting appropriate headers
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline'; connect-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:;");
    const docsPath = path_1.default.join(__dirname, 'public', 'docs.html');
    res.sendFile(docsPath);
});
// Api Routes
const routeFiles = (0, fs_1.readdirSync)(path_1.default.join(__dirname, 'routes'));
for (const file of routeFiles) {
    if (file.endsWith('.js') || (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) {
        const routePath = path_1.default.join(__dirname, 'routes', file);
        const route = require(routePath).default;
        if (route) {
            app.use('/api', route);
        }
        if (route && route.stack) {
            // logger.info(`Routes in ${file}:`, route.stack.map((r: any) => r.route?.path).filter(Boolean));
        }
    }
}
// Catch unhandled routes
app.use((req, res, next) => {
    return (0, responseService_1.resSender)(res, 404, 'error', 'Route not found!');
});
// connect db and start server
(0, db_1.default)()
    .then(() => {
    server.listen(PORT, () => {
        console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
        console.log(`📚 API Docs available at http://localhost:${PORT}/api/v1/docs`);
    });
})
    .catch((err) => console.log('Error connecting to DB: ', err.message));
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 2000);
    }
});
exports.default = app;
