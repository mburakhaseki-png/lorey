const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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
    const { concept, universe } = req.body;

    if (!concept) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    const prompt = `Generate a new challenging multiple-choice quiz question about this concept: "${concept}"

Universe context: ${universe || 'general'}

Requirements:
- 5 options (A, B, C, D, E)
- Test deep understanding, not just memorization
- Make it relevant and engaging
- Clearly indicate the correct answer

Output as JSON:
{
  "question": "Question text?",
  "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
  "answer": "Correct option text"
}`;

    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: 'anthropic/claude-sonnet-4.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Lorey - Quiz Generator'
        }
      }
    );

    const content = response.data.choices[0].message.content;

    // Try to extract JSON if it's wrapped in markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/, '').replace(/```$/, '').trim();
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/, '').replace(/```$/, '').trim();
    }

    const quizData = JSON.parse(jsonContent);

    res.json(quizData);
  } catch (error) {
    console.error('Quiz generation error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate quiz',
      message: error.response?.data?.error?.message || error.message
    });
  }
};

