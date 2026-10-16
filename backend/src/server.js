require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Fail fast and loud on missing critical config instead of silently falling back
// to an insecure default (e.g. cors reflecting any origin when FRONTEND_URL is unset).
const REQUIRED_ENV = ['JWT_SECRET', 'DB_PASSWORD'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}. Check backend/.env.`);
  process.exit(1);
}

// Accept the configured FRONTEND_URL plus its localhost/127.0.0.1 dev-port
// siblings — Vite falls back to the next free port (5174, 5175, ...) whenever
// 5173 is already taken, and a mismatched origin otherwise fails as an opaque,
// hard-to-diagnose CORS block that looks identical to the server being down.
// Render provides the service's public URL at runtime. When FRONTEND_URL is
// not set, this also allows the same-origin production frontend.
const configuredFrontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL;
const FRONTEND_ORIGINS = new Set(configuredFrontendUrl ? [configuredFrontendUrl] : []);
try {
  const configured = new URL(configuredFrontendUrl);
  if (configured.hostname === 'localhost' || configured.hostname === '127.0.0.1') {
    for (const host of ['localhost', '127.0.0.1']) {
      for (let port = 5173; port <= 5180; port++) {
        FRONTEND_ORIGINS.add(`${configured.protocol}//${host}:${port}`);
      }
    }
  }
} catch { /* FRONTEND_URL isn't a plain host:port URL — only the exact configured value is allowed */ }

const app = express();
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || FRONTEND_ORIGINS.has(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} is not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/courts', require('./routes/courts'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/memberships', require('./routes/memberships'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ballboy', require('./routes/ballboy'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/stocks', require('./routes/stocks'));

// Serve the built Vite app from this service in production. This keeps the
// browser and API on one origin, while Vite continues serving the app locally.
const frontendDist = require('path').resolve(__dirname, '../../dist');
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
app.use(require('express').static(frontendDist));
app.get('*', (req, res, next) => {
  res.sendFile(require('path').join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Every route handler is wrapped in asyncHandler, so genuine async errors land
// here via next(err) instead of becoming unhandled rejections.
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: status === 500 ? 'Server error' : err.message });
});

// Last-resort safety net: log instead of letting the process die on a stray
// synchronous throw or a rejection from code outside the request lifecycle (e.g. cron).
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

require('./services/reminderScheduler').start();
require('./services/stockPriceScheduler').start();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
