// server.js
const express = require('express');
const path = require('path');

const app = express();
// Use the port provided by the hosting environment (Render) or default to 10000
const PORT = process.env.PORT || 10000; 

// The built frontend files are located in the 'dist' folder
const staticPath = path.join(__dirname, 'dist');

// Serve all static files from the 'dist' directory
app.use(express.static(staticPath));

// For all other GET requests, serve the index.html file.
// This is crucial for client-side routing (deep links)
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
