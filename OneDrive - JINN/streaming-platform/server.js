require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // Added path module
const helmet = require('helmet'); // Security headers

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' 
    : 'http://localhost:3000'
}));
app.use(express.json());

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

// Production configuration
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'client/build');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
