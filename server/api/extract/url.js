const cheerio = require('cheerio');
const axios = require('axios');

// Helper function to clean and format text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .trim();
}

module.exports = async (req, res) => {
  // CORS headers - allow all origins including loreyai.com
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
};

