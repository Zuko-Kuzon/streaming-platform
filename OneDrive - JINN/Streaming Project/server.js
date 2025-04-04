require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
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
        console.error('TMDB Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from TMDB' });
    }
});

// Serve static files from React/Vue/Angular in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

// Change this line in server.js
const PORT = process.env.PORT || 3002; // Different port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));