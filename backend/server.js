// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// Extract headings from text based on common patterns
function extractHeadings(text) {
  const headings = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Pattern 1: All caps lines (likely headings)
    if (line.length > 3 && line.length < 100 && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line)) {
      headings.push(line);
      continue;
    }
    
    // Pattern 2: Lines starting with numbers (1., 1.1, etc.)
    if (/^\d+\.(\d+\.)*\s+[A-Z]/.test(line)) {
      headings.push(line);
      continue;
    }
    
    // Pattern 3: Short lines that start with capital and end with no punctuation
    if (line.length > 3 && line.length < 80 && /^[A-Z]/.test(line) && !/[.!?]$/.test(line)) {
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      // Check if next line is empty or starts lowercase (indicates this might be a heading)
      if (!nextLine || /^[a-z]/.test(nextLine)) {
        headings.push(line);
      }
    }
  }
  
  // Remove duplicates and return unique headings
  return [...new Set(headings)];
}

// Parse PDF file
async function parsePDF(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  
  return {
    totalPages: data.numpages,
    text: data.text
  };
}

// Parse DOCX file
async function parseDOCX(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer: dataBuffer });
  
  // DOCX doesn't provide page count easily, so we estimate based on characters
  // Average page has ~2000-3000 characters
  const estimatedPages = Math.ceil(result.value.length / 2500);
  
  return {
    totalPages: estimatedPages,
    text: result.value
  };
}

// Main upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();

    let parseResult;

    // Parse based on file type
    if (fileExt === '.pdf') {
      parseResult = await parsePDF(filePath);
    } else if (fileExt === '.docx') {
      parseResult = await parseDOCX(filePath);
    } else {
      await fs.unlink(filePath);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Extract headings from parsed text
    const headings = extractHeadings(parseResult.text);

    // Clean up uploaded file
    await fs.unlink(filePath);

    // Send response
    res.json({
      fileName: fileName,
      totalPages: parseResult.totalPages,
      headings: headings
    });

  } catch (error) {
    console.error('Error processing file:', error);
    
    // Clean up file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to process file',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files if present (useful for single-repo deployments)
const publicPath = path.join(__dirname, 'public');
const indexHtml = path.join(publicPath, 'index.html');

fs.access(publicPath).then(() => {
  app.use(express.static(publicPath));

  // Any non-API route should serve the frontend index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}).catch(() => {
  // public folder doesn't exist; likely running frontend separately
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Upload endpoint: http://localhost:${PORT}/api/upload`);
});