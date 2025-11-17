const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const cheerio = require('cheerio');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');

const router = express.Router();

// Configure multer for file uploads
// Use /tmp in Vercel, uploads folder locally
const getUploadDir = () => {
  if (process.env.VERCEL === '1') {
    return '/tmp';
  }
  return path.join(__dirname, '../uploads');
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = getUploadDir();
    try {
      if (process.env.VERCEL !== '1') {
        await fs.mkdir(uploadDir, { recursive: true });
      }
    } catch (err) {
      console.error('Error creating upload directory:', err);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .pdf files are allowed'));
    }
  }
});

// Extract text from uploaded file
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let text = '';

    if (ext === '.txt') {
      text = await fs.readFile(filePath, 'utf-8');
    } else if (ext === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    }

    // Clean up uploaded file
    await fs.unlink(filePath);

    // Clean and format text
    text = cleanText(text);

    res.json({ text });
  } catch (error) {
    console.error('File extraction error:', error);
    res.status(500).json({ error: 'Failed to extract text from file', message: error.message });
  }
});

// Extract text from URL
router.post('/url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, img').remove();

    // Extract text from main content areas
    let text = '';
    const contentSelectors = ['main', 'article', '.content', '#content', 'body'];

    for (const selector of contentSelectors) {
      const content = $(selector).first().text();
      if (content && content.length > text.length) {
        text = content;
      }
    }

    // Clean and format text
    text = cleanText(text);

    res.json({ text });
  } catch (error) {
    console.error('URL extraction error:', error);
    res.status(500).json({ error: 'Failed to extract text from URL', message: error.message });
  }
});

// Extract transcript from YouTube video
router.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Extract video ID from URL
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Combine transcript text
    const text = transcript.map(item => item.text).join(' ');

    // Clean and format text
    const cleanedText = cleanText(text);

    res.json({ text: cleanedText });
  } catch (error) {
    console.error('YouTube extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract transcript from YouTube video',
      message: error.message
    });
  }
});

// Helper function to extract YouTube video ID
function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper function to clean and format text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .trim();
}

module.exports = router;
