import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import reportsRouter from './routes/reports.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable for PDF viewing
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for local PDF serving
app.use('/reports', express.static(path.join(process.cwd(), 'reports')));

// ══════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'SOC Report Generator',
        version: '2.0',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/reports', reportsRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'Something went wrong',
        timestamp: new Date().toISOString(),
    });
});

// ══════════════════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('═'.repeat(60));
    console.log('🚀 SOC Report Generator Service');
    console.log('═'.repeat(60));
    console.log(`📌 Server running on: http://localhost:${PORT}`);
    console.log(`📋 API Base URL: http://localhost:${PORT}/api/reports`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('═'.repeat(60));
});

export default app;
