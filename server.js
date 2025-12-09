// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Get the current file's directory (safer than __dirname for ES modules)
const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

// 2. Define the project root (up one level if server.js is in a subdirectory, 
// but since it's in root, currentDir is the project root in the build context)
const root = path.resolve(currentDir, '..'); // Let's simplify this:

// *** USE THIS LINE FOR THE STATIC PATH ***
// This reliably points to the 'dist' folder at the root of the project
const staticPath = path.join(currentDir, 'dist'); 

// 3. (Optional, but clean) If the files are not found, try using path.join(process.cwd(), 'dist')

// *** Let's use the simplest, most reliable path structure ***
const distPath = path.resolve(currentDir, 'dist'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// Serve all static files from the 'dist' directory
app.use(express.static(distPath)); // <-- Changed variable name to distPath

// For all other GET requests, serve the index.html file.
app.get('*', (req, res) => {
  // Ensure we serve index.html from the distPath
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
