const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Root path
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Simple Web API Demo',
        endpoints: {
            '/api/random-result': 'GET - Randomly return success or failure result',
            '/api/health': 'GET - Health check'
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Server is running normally',
        timestamp: new Date().toISOString()
    });
});

// Main API endpoint - Randomly return success or failure
app.get('/api/access', (req, res) => {
    // Get query parameters
    const { type, data } = req.query;

    // Get Authorization header and extract token
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove "Bearer " prefix
    }

    // Randomly generate success or failure (50% probability)
    const isSuccess = Math.random() > 0.5;

    // Build response data
    const response = {
        success: isSuccess,
        message: isSuccess ? 'Operation successful' : 'Operation failed',
        timestamp: new Date().toISOString(),
        token: token || 'No token provided',
        requestData: {
            type: type || 'Not provided',
            data: data || 'Not provided'
        }
    };

    // Set different HTTP status codes based on success or failure
    const statusCode = isSuccess ? 200 : 400;

    res.status(statusCode).json(response);
});

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`📱 Access URL: http://localhost:${PORT}`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api/access`);
    console.log(`💡 Example request: http://localhost:${PORT}/api/access?type=test&data=hello`);
}); 