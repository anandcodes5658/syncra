import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.js';
import { db } from './db.js';
import apiRoutes from './routes/api.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(config.storage.uploadDir));

// API router
app.use('/api', apiRoutes);

import fs from 'fs';

// Serve frontend static build if present (Railway / production unified single-service)
const candidateDistPaths = [
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist')
];

let distPath: string | null = null;
for (const p of candidateDistPaths) {
  if (fs.existsSync(p)) {
    distPath = p;
    break;
  }
}

if (distPath) {
  console.log(`Serving frontend build from: ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath!, 'index.html'));
  });
} else {
  // Root greeting when developing API standalone
  app.get('/', (req, res) => {
    res.json({
      app: 'Syncra Social Auto Poster API',
      status: 'online',
      docs: '/api/health'
    });
  });
}

async function startServer() {
  try {
    await db.init();
    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(` Syncra Social Auto Poster Backend`);
      console.log(` API Server running at: http://localhost:${config.port}`);
      console.log(` Uploads directory: ${config.storage.uploadDir}`);
      console.log(` Multi-Channel Engine: IG, FB, LinkedIn, YouTube & X`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();
