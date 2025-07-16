const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Mock API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/user', (req, res) => {
  res.json({ message: 'User endpoint - MongoDB connection required for full functionality' });
});

app.post('/api/user/login', (req, res) => {
  res.json({ message: 'Login endpoint - MongoDB connection required for authentication' });
});

app.post('/api/user/register', (req, res) => {
  res.json({ message: 'Register endpoint - MongoDB connection required for user creation' });
});

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 7777;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Frontend available at: http://localhost:${port}`);
  console.log(`🔧 API available at: http://localhost:${port}/api/health`);
  console.log('⚠️  Note: MongoDB is not connected. Some features will be limited.');
});