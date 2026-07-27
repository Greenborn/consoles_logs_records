const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
dotenv.config();

const logsRoutes = require('./routes/logs');
const applicationsRoutes = require('./routes/applications');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', true);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

app.use('/api/console-log', logsRoutes);
app.use('/api/applications', applicationsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

module.exports = app;
