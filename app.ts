import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import reportRoutes from './src/routes/reports.ts';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reports', reportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SOC Report Generator v1.0'
  });
});

// Home
app.get('/', (req, res) => {
  res.json({
    message: 'SOC Security Report Generator API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      generateReport: 'POST /api/reports/generate',
      listReports: 'GET /api/reports/list'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
});

export default app;