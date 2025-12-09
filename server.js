// server.js

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// --- ABSOLUTE PATH SETUP FOR ES MODULES (CRITICAL) ---
// This safely derives the absolute directory path of the server.js file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The 'dist' folder contains the built frontend files.
// We use path.resolve to create a guaranteed absolute path to the 'dist' directory.
const distPath = path.resolve(__dirname, 'dist');
// ----------------------------------------------------

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Serve Static Files
// This middleware makes all files inside the dist folder accessible at the root URL.
// E.g., dist/assets/main.js -> /assets/main.js
app.use(express.static(distPath));

// 2. Client-Side Routing Fallback
// For all GET requests not matching a static file or an API route, serve index.html.
// This is essential for React Router (if you are using it).
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 3. Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
