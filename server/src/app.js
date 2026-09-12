const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const openapiSpec = require('./swagger/openapi.json');
const errorHandler = require('./middlewares/errorHandler');
const ApiResponse = require('./utils/apiResponse');
const env = require('./config/env');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const gisRoutes = require('./routes/gisRoutes');

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Permissive for Swagger UI
  })
);

// CORS configuration supporting Vercel and custom production domains
const getCorsOriginConfig = () => {
  if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') {
    return true; // Allow dynamic origin with credentials
  }
  const explicitList = env.CORS_ORIGIN.split(',').map((s) => s.trim());
  return (origin, callback) => {
    if (
      !origin ||
      explicitList.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      origin.includes('localhost')
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  };
};

app.use(
  cors({
    origin: getCorsOriginConfig(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate Limiter for Auth & Upload routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Swagger API Documentation
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  return ApiResponse.success(
    res,
    {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date(),
      service: 'BhumiDrishti Backend',
    },
    'Service is healthy'
  );
});

// Mount V1 API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/records', recordRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/integration', integrationRoutes);
app.use('/api/v1/gis', gisRoutes);

// Root fallback aliases (e.g. /auth/login -> /api/v1/auth/login)
app.use('/auth', authLimiter, authRoutes);
app.use('/users', userRoutes);
app.use('/documents', documentRoutes);
app.use('/records', recordRoutes);
app.use('/verification', verificationRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/integration', integrationRoutes);
app.use('/gis', gisRoutes);

// 404 Handler
app.use((req, res) => {
  return ApiResponse.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
