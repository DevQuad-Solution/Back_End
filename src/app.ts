import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import http from 'http';
import corsOptions from './config/cors';
import connectToDatabase, { initializeAISettings } from './config/db';
import fs, { readdirSync } from 'fs';
import path from 'path';
import { resSender } from './utils/responseService';
import { useSocket } from './utils/websocket';
import { reqRateLimit } from './middlewares/rateLimiter';
import { startRadarJob } from './jobs/radarJob';

// Load environment variables
dotenv.config();

// Database backup
import './jobs/dbBackup';
import helmetConfig from './config/helmet';
import { initializeSettings } from './controllers/admin/settingsControllers';

startRadarJob();

const app: Application = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5004;

// Init socket.io
useSocket(server);

// Apply helmet with CSP that allows external resources
app.use(helmet(helmetConfig));

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(reqRateLimit);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req: Request, res: Response) => {
  return resSender(res, 200, 'success', 'Root Test route is working!');
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  let timestamp = new Date().toISOString();
  resSender(res, 200, 'success', 'Health check route is working!', null, timestamp);
});

app.get('/api/test', (req, res) => {
  return resSender(res, 200, 'success', 'Test route is working!');
});

// API Documentation endpoint - with disabled CSP for this route only
app.get('/api/v1/docs', (req: Request, res: Response) => {
  // Remove CSP for this route by setting appropriate headers
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline'; connect-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:;",
  );
  const docsPath = path.join(__dirname, 'public', 'docs.html');
  res.sendFile(docsPath);
});

// Api Routes
const routeFiles = readdirSync(path.join(__dirname, 'routes'));
for (const file of routeFiles) {
  if (file.endsWith('.js') || (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) {
    const routePath = path.join(__dirname, 'routes', file);
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
  return resSender(res, 404, 'error', 'Route not found!');
});

// Ensure the temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// connect db and start server
connectToDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
      console.log(`📚 API Docs available at http://localhost:${PORT}/api/v1/docs`);
    });
  })
  .catch((err) => console.log('Error connecting to DB: ', err.message));

server.on('error', (e: any) => {
  if (e.code === 'EADDRINUSE') {
    console.error('Address in use, retrying...');
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 2000);
  }
});

export default app;
