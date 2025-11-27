import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting para login (proteção contra brute force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'TOO_MANY_ATTEMPTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting geral para API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Configuração do Helmet para segurança HTTP
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Middleware para validar origem (CSRF protection)
// IMPORTANTE: Não bloquear requisições OPTIONS (preflight CORS)
export const validateOrigin = (req, res, next) => {
  // Permitir sempre requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://cautela-front.vercel.app',
    'https://cautela-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  // Permitir requisições sem origin (mobile apps, Postman, etc)
  if (!origin) {
    return next();
  }
  
  // Em produção, validar origem; em desenvolvimento, permitir todas
  if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ 
      error: 'Origem não permitida',
      code: 'INVALID_ORIGIN',
      origin: origin
    });
  }
  
  next();
};

