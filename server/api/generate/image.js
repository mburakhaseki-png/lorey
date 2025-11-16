const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Helper function to generate image with retry logic
async function generateImageWithRetry(prompt, universe, maxRetries = 3) {
  const artStyleMap = {
    'Rick and Morty': '2D animated art style from Rick and Morty show, cartoon style',
    'Harry Potter': 'Realistic cinematic style, live-action movie quality, photorealistic',
    'Regular Show': '2D cartoon animation style from Regular Show, animated series style',
    'Avatar The Last Airbender': '2D animated art style from Avatar series, anime-inspired animation',
    'Star Wars': 'Realistic sci-fi cinematic style, movie quality, photorealistic',
    'Marvel': 'Realistic cinematic superhero style, movie quality, photorealistic',
    'DC': 'Realistic cinematic superhero style, movie quality, photorealistic',
    'SpongeBob': '2D cartoon animation style from SpongeBob SquarePants, animated series style',
    'Adventure Time': '2D cartoon animation style from Adventure Time, animated series style'
  };

  const artStyle = artStyleMap[universe] || 'detailed, high quality cinematic style';
  const enhancedPrompt = `${prompt}, ${artStyle}, fun and dynamic scene, high quality, detailed.`;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Attempt ${attempt}/${maxRetries}: Sending image request to OpenRouter (Gemini Flash Image)...`);
      
      const requestBody = {
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: enhancedPrompt
              }
            ]
          }
        ],
        generation_config: {
          modalities: ["image", "text"]
        },
        image_config: {
          aspect_ratio: "1:1"
        }
      };

      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Lorey - Image Generator'
          },
          timeout: 120000
        }
      );

      // Extract image from response
      const choice = response.data?.choices?.[0];
      const message = choice?.message;

      if (!message) {
        throw new Error('No message in response');
      }

      // Check for message.images array first
      if (message.images && Array.isArray(message.images)) {
        for (const part of message.images) {
          if (part.image_url) {
            return part.image_url.url;
          }
          if (part.inline_data) {
            const base64Data = part.inline_data.data;
            const mimeType = part.inline_data.mime_type || 'image/png';
            return `data:${mimeType};base64,${base64Data}`;
          }
        }
      }

      // Check response.data for images
      if (response.data.images && Array.isArray(response.data.images)) {
        for (const img of response.data.images) {
          if (img.url) {
            return img.url;
          }
        }
      }

      // Fallback: check message.content array
      if (message.content && Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.inline_data) {
            const base64Data = part.inline_data.data;
            const mimeType = part.inline_data.mime_type || 'image/png';
            return `data:${mimeType};base64,${base64Data}`;
          }
          if (part.image_url) {
            return part.image_url.url;
          }
        }
      }

      // Check if content is a string with base64
      if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
        return message.content;
      }

      throw new Error('No image found in response');

    } catch (error) {
      lastError = error;
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`❌ Image generation attempt ${attempt}/${maxRetries} failed:`, errorMessage);

      if (attempt === maxRetries) {
        throw error;
      }

      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error('Failed to generate image after all retries');
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

  console.log('🎨 Image generation request received');

  try {
    const { prompt, universe } = req.body;

    if (!prompt || !universe) {
      return res.status(400).json({ error: 'Prompt and universe are required' });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    // Try to generate image with retry logic
    const imageUrl = await generateImageWithRetry(prompt, universe, 3);
    
    console.log('✅ Image generated successfully after retries');
    return res.json({ imageUrl });

  } catch (error) {
    console.error('❌ Image generation error (all retries failed):', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate image',
      message: error.response?.data?.error?.message || error.message
    });
  }
};

