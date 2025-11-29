const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

// Extract audio from YouTube video using yt-dlp
async function extractAudioFromYouTube(videoId) {
  const tempDir = process.env.VERCEL === '1' ? '/tmp' : path.join(__dirname, '../../tmp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const audioPath = path.join(tempDir, `${videoId}.mp3`);
  
  try {
    // Use yt-dlp to extract audio (requires yt-dlp to be installed)
    // Alternative: use @distube/ytdl-core if yt-dlp is not available
    const { stdout, stderr } = await execPromise(
      `yt-dlp -x --audio-format mp3 -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`
    );
    
    return audioPath;
  } catch (error) {
    console.error('Error extracting audio:', error);
    throw new Error('Failed to extract audio from YouTube video');
  }
}

// Transcribe audio using OpenAI Whisper API
async function transcribeAudioWithWhisper(audioPath) {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Please configure it in your environment variables.');
  }

  try {
    // OpenAI SDK accepts fs.createReadStream in Node.js
    const audioStream = require('fs').createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'auto', // Auto-detect language
    });

    return transcription.text;
  } catch (error) {
    console.error('Whisper API error:', error);
    throw new Error('Failed to transcribe audio: ' + error.message);
  } finally {
    // Clean up audio file
    try {
      await fs.unlink(audioPath);
    } catch (err) {
      console.warn('Failed to delete temp audio file:', err);
    }
  }
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
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Extract video ID from URL
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    let transcriptText = null;

    // Step 1: Try to get existing captions first (faster and free)
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        const text = transcript.map(item => item.text).join(' ');
        transcriptText = cleanText(text);
        
        if (transcriptText && transcriptText.trim().length > 0) {
          console.log('✅ Found existing captions for video:', videoId);
          return res.json({ text: transcriptText });
        }
      }
    } catch (captionError) {
      console.log('⚠️ No existing captions found, trying audio extraction...');
      // Continue to audio extraction fallback
    }

    // Step 2: If no captions, extract audio and use Whisper API
    if (!transcriptText) {
      console.log('🎵 Extracting audio from video:', videoId);
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: 'No captions available and OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable to enable audio transcription.',
          message: 'OPENAI_API_KEY is required for videos without captions'
        });
      }

      try {
        const audioPath = await extractAudioFromYouTube(videoId);
        console.log('🎤 Transcribing audio with Whisper API...');
        transcriptText = await transcribeAudioWithWhisper(audioPath);
        transcriptText = cleanText(transcriptText);
        
        if (!transcriptText || transcriptText.trim().length === 0) {
          return res.status(500).json({
            error: 'Failed to generate transcript from audio',
            message: 'Transcription returned empty result'
          });
        }

        console.log('✅ Successfully transcribed audio for video:', videoId);
        return res.json({ text: transcriptText });
      } catch (audioError) {
        console.error('Audio extraction/transcription error:', audioError);
        return res.status(500).json({
          error: 'Failed to extract transcript. The video may not have captions and audio extraction failed.',
          message: audioError.message
        });
      }
    }
  } catch (error) {
    console.error('YouTube extraction error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to extract transcript from YouTube video';
    let statusCode = 500;
    
    if (error.message.includes('Could not retrieve a transcript')) {
      errorMessage = 'This video does not have captions/transcripts available. Please try a video with captions enabled.';
      statusCode = 400;
    } else if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable or private. Please check the URL and try again.';
      statusCode = 400;
    } else if (error.message.includes('Invalid YouTube URL')) {
      errorMessage = 'Invalid YouTube URL format. Please check the URL and try again.';
      statusCode = 400;
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      message: error.message
    });
  }
};

