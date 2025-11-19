# Lorey - Edutainment AI Web App

Transform any boring lesson into an interactive, fun, and story-based learning experience inside your favorite fictional universe.

## Features

- **Multiple Input Methods**: Upload `.txt` or `.pdf` files, paste website URLs, or provide YouTube video links
- **AI-Powered Story Generation**: Uses Claude 3.5 Sonnet to transform educational content into engaging narratives
- **Image Generation**: Creates scene-specific images using Gemini 2.5 Flash
- **Interactive Quizzes**: Test your understanding with multiple-choice questions
- **Universe Customization**: Set your story in any fictional universe you love, or create your own custom universe
- **Mobile-First Design**: Fully responsive with beautiful animations
- **Modern UI**: Violet and black color scheme with glass morphism effects

## Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Dropzone** - File uploads

### Backend
- **Express.js** - API server
- **Multer** - File handling
- **pdf-parse** - PDF text extraction
- **Cheerio** - Web scraping
- **youtube-transcript** - YouTube transcription

### AI APIs (via OpenRouter)
- **Claude 3.5 Sonnet** - Story and quiz generation
- **Gemini 2.5 Flash** - Image generation

## Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd lorey
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
OPENROUTER_API_KEY=your_api_key_here
PORT=3001
```

Replace `your_api_key_here` with your actual OpenRouter API key.

4. **Run the development server**

```bash
npm run dev
```

This will start:
- Next.js frontend on `http://localhost:3000`
- Express backend on `http://localhost:3001`

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload Your Lesson

Choose one of three input methods:

- **File**: Drag and drop a `.txt` or `.pdf` file (max 10MB)
- **URL**: Paste a website URL to scrape text content
- **YouTube**: Paste a YouTube video URL to extract transcript

### 2. Choose Your Universe

Enter the name of any fictional universe, show, movie, or create your own:
- Any TV show universe
- Any movie universe
- Any book universe
- Your own custom universe
- ...be creative!

### 3. Generate Your Story

Click "Generate Story" and wait while the AI:
1. Analyzes your educational content
2. Creates an engaging narrative set in your chosen universe
3. Generates quizzes for key learning points
4. Creates images for each scene

### 4. Learn and Have Fun!

- Read the story paragraph by paragraph
- View AI-generated images for each scene
- Answer quizzes to test your understanding
- Regenerate quizzes for new questions

## Project Structure

```
lorey/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (upload)
│   └── story/
│       └── page.tsx          # Story display page
├── components/
│   ├── ImageCard.tsx         # Image + paragraph card
│   ├── Loader.tsx            # Loading animations
│   └── Quiz.tsx              # Interactive quiz component
├── server/
│   ├── index.js              # Express server
│   └── routes/
│       ├── extract.js        # Text extraction endpoints
│       └── generate.js       # AI generation endpoints
├── utils/
│   ├── types.ts              # TypeScript types
│   └── parseLesson.ts        # Text processing utilities
├── .env.example              # Environment variables template
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
└── package.json              # Dependencies
```

## API Endpoints

### Extract Endpoints

**POST** `/api/extract/file`
- Upload and extract text from `.txt` or `.pdf` file
- Body: `FormData` with `file` field

**POST** `/api/extract/url`
- Extract text from website URL
- Body: `{ url: string }`

**POST** `/api/extract/youtube`
- Extract transcript from YouTube video
- Body: `{ url: string }`

### Generate Endpoints

**POST** `/api/generate/story`
- Generate story and quizzes from lesson text
- Body: `{ lessonText: string, universe: string }`

**POST** `/api/generate/image`
- Generate image for a scene
- Body: `{ prompt: string, universe: string }`

**POST** `/api/generate/quiz`
- Regenerate quiz for a concept
- Body: `{ concept: string, universe?: string }`

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts both Next.js and Express servers concurrently.

### Running Separately

Frontend only:
```bash
npm run dev:next
```

Backend only:
```bash
npm run dev:server
```

### Building for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `PORT` | Backend server port (default: 3001) | No |

## OpenRouter Setup

1. Visit [OpenRouter](https://openrouter.ai)
2. Sign up for an account
3. Navigate to [Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Add credits to your account (recommended: $5-10 to start)
6. Copy the key to your `.env` file

### API Costs (Approximate)

- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Gemini 2.5 Flash**: Free tier available

A typical story generation (500 word lesson) costs approximately $0.05-0.15.

## Customization

### Colors

Edit [tailwind.config.ts](tailwind.config.ts) to change the color scheme:

```typescript
colors: {
  primary: '#8A2BE2', // Violet
  dark: '#0B0B0B',    // Black
}
```

### Story Length

Modify the prompt in [server/routes/generate.js](server/routes/generate.js):

```javascript
// Change from 8-15 paragraphs to your preferred length
"Include 8-15 paragraphs minimum for a complete story"
```

### Supported File Types

Edit [server/routes/extract.js](server/routes/extract.js) to add more file types:

```javascript
const allowedTypes = ['.txt', '.pdf', '.docx']; // Add .docx
```

## Troubleshooting

### "Failed to generate story"

- Check your OpenRouter API key is correct
- Ensure you have credits in your OpenRouter account
- Check the console for specific error messages

### "Failed to extract text"

- Verify file is under 10MB
- For URLs, ensure the website is accessible
- For YouTube, check the video has captions/transcript available

### Images not loading

- Gemini image generation may be rate-limited
- Check the browser console for errors
- Images are generated sequentially, so wait for completion

## Future Enhancements

- [ ] Audio narration using TTS
- [ ] Progress tracking and user accounts
- [ ] Save/share stories
- [ ] More quiz types (fill-in-blank, matching, etc.)
- [ ] Export to PDF
- [ ] Mobile app version (React Native)
- [ ] Multiple language support

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [OpenRouter](https://openrouter.ai) for AI API access
- [Anthropic](https://anthropic.com) for Claude
- [Google](https://deepmind.google) for Gemini
- [Vercel](https://vercel.com) for Next.js

---

Built with ❤️ for making learning fun and engaging.
