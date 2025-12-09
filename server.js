// server.js (Use 'import' statements)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000; 

// The built frontend files are in the 'dist' folder.
const staticPath = path.join(__dirname, 'dist'); 

// Serve all static files from the 'dist' directory
app.use(express.static(staticPath));

// For all other GET requests, serve the index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
