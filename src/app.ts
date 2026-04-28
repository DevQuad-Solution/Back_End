import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import http from 'http';
import corsOptions from './config/cors';
import connectToDatabase from './config/db';
import { readdirSync } from 'fs';
import path from 'path';
import { resSender } from './utils/responseService';

// Database backup
import './utils/dbBackup';
import { useSocket } from './utils/websocket';
import { reqRateLimit } from './middlewares/rateLimiter';

// Load environment variables
dotenv.config();

const app: Application = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5004;

// Init socket.io
useSocket(server);

// Middleware

// Configure CSP for Swagger UI
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI
          'https://unpkg.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI
          'https://unpkg.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://unpkg.com', 'https://*.swagger.io'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

app.use(cors(corsOptions));
app.use(reqRateLimit); // Apply rate-limit
app.use(morgan('dev'));
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

// API Documentation endpoint
app.get('/api/v1/docs', (req: Request, res: Response) => {
  const docsPath = path.join(__dirname, 'public', 'docs.html');
  res.sendFile(docsPath);
});

// Api Routes

// console.log('Looking for routes in:', path.join(__dirname, 'Routes'));
// console.log('Found files:', readdirSync(path.join(__dirname, 'Routes')));
// Register routes dynamically from the 'Routes' directory
const routeFiles = readdirSync(path.join(__dirname, 'routes'));
for (const file of routeFiles) {
  if (file.endsWith('.js') || (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) {
    const routePath = path.join(__dirname, 'routes', file);
    /* eslint-disable @typescript-eslint/no-var-requires */
    const route = require(routePath).default;
    // console.log('Route 2: ', route);

    if (route) {
      app.use('/api', route);
      // console.log(`Registered routes from ${file}`);
    }

    // Log the routes that were registered
    if (route && route.stack) {
      // logger.info(`Routes in ${file}:`, route.stack.map((r: any) => r.route?.path).filter(Boolean));
    }
  }
}

// Catch unhandled routes
app.use((req, res, next) => {
    return resSender(res, 404, 'error', 'Route not found!');
});

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
