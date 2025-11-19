const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { Readable } = require('stream');

// Helper function to count words in text
function countWords(text) {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Helper function to clean and format text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .trim();
}

// Parse multipart form data manually (for Vercel serverless functions)
async function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) {
        return reject(new Error('No boundary found in Content-Type'));
      }
      
      const parts = buffer.toString('binary').split(`--${boundary}`);
      const filePart = parts.find(part => part.includes('Content-Disposition: form-data; name="file"'));
      
      if (!filePart) {
        return reject(new Error('No file found in form data'));
      }
      
      const headerEnd = filePart.indexOf('\r\n\r\n');
      const header = filePart.substring(0, headerEnd);
      const content = filePart.substring(headerEnd + 4);
      
      // Extract filename
      const filenameMatch = header.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'file';
      
      // Remove trailing boundary
      const fileContent = content.replace(/\r\n--$/, '');
      const fileBuffer = Buffer.from(fileContent, 'binary');
      
      resolve({ filename, buffer: fileBuffer });
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const { filename, buffer } = await parseMultipartFormData(req);
    
    const ext = path.extname(filename).toLowerCase();
    
    // Validate file type
    const allowedTypes = ['.txt', '.pdf'];
    if (!allowedTypes.includes(ext)) {
      return res.status(400).json({ error: 'Only .txt and .pdf files are allowed' });
    }
    
    // Validate file size (50MB limit)
    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 50MB' });
    }

    let text = '';

    if (ext === '.txt') {
      text = buffer.toString('utf-8');
    } else if (ext === '.pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    }

    // Clean and format text
    text = cleanText(text);

    // Check word count limit (15,000 words)
    const wordCount = countWords(text);
    const MAX_WORDS = 15000;
    
    if (wordCount > MAX_WORDS) {
      return res.status(400).json({ 
        error: `Dosya çok uzun. Maksimum 15.000 kelime kabul edilir. Dosyanızda ${wordCount.toLocaleString('tr-TR')} kelime var.`,
        wordCount,
        maxWords: MAX_WORDS
      });
    }

    res.json({ text, wordCount });
  } catch (error) {
    console.error('File extraction error:', error);
    res.status(500).json({ error: 'Failed to extract text from file', message: error.message });
  }
};

