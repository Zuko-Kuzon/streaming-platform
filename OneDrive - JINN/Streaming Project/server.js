require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

const app = express();

// Middleware setup
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://streaming-platform.onrender.com'  // Your Render frontend URL
    : 'http://localhost:3000'
}));
app.use(express.json());

// Health check endpoint (required for Render monitoring)
app.get('/healthz', (req, res) => res.sendStatus(200));

// TMDB Proxy Endpoint
app.get('/api/tmdb', async (req, res) => {
  try {
    const { endpoint, ...queryParams } = req.query;
    const response = await axios.get(
      `https://api.themoviedb.org/3${endpoint}`, 
      {
        params: {
          api_key: process.env.TMDB_API_KEY,
          ...queryParams
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('TMDB Proxy Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
});

// Production configuration - Serve frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
