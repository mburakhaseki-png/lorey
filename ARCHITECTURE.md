# Lorey Architecture Documentation

## System Overview

Lorey is a full-stack web application that transforms educational content into interactive, story-based learning experiences. The system uses AI models (Claude for narrative generation, Gemini for images) to create engaging educational content.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Next.js Frontend (Port 3000)                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  Home Page  │  │ Story Page  │  │  Components  │  │  │
│  │  │  (Upload)   │  │  (Display)  │  │ Quiz, Image  │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Express Backend (Port 3001)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  API Routes                            │  │
│  │  ┌─────────────────┐      ┌──────────────────────┐   │  │
│  │  │  /api/extract   │      │  /api/generate       │   │  │
│  │  │  - file         │      │  - story             │   │  │
│  │  │  - url          │      │  - image             │   │  │
│  │  │  - youtube      │      │  - quiz              │   │  │
│  │  └─────────────────┘      └──────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │             Processing Layer                          │  │
│  │  - pdf-parse (PDF extraction)                         │  │
│  │  - cheerio (Web scraping)                             │  │
│  │  - youtube-transcript (Video transcription)           │  │
│  │  - multer (File handling)                             │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    OpenRouter API                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Claude 3.5 Sonnet        │   Gemini 2.5 Flash        │  │
│  │  - Story generation       │   - Image generation      │  │
│  │  - Quiz creation          │                           │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Content Upload Flow

```
User → Upload File/URL/YouTube Link
  ↓
Frontend validates input
  ↓
POST /api/extract/{type}
  ↓
Backend extracts text using appropriate library
  ↓
Text validation & cleaning
  ↓
Return cleaned text to frontend
  ↓
Display preview to user
```

### 2. Story Generation Flow

```
User clicks "Generate Story"
  ↓
Frontend sends: { lessonText, universe }
  ↓
POST /api/generate/story
  ↓
Backend constructs prompt for Claude
  ↓
Claude API processes request (30-60s)
  ↓
Claude returns JSON:
  {
    "story": [
      {
        "paragraph": "...",
        "imagePrompt": "...",
        "quiz": { ... }
      }
    ]
  }
  ↓
Backend validates & returns to frontend
  ↓
Store in sessionStorage
  ↓
Navigate to /story page
```

### 3. Image Generation Flow

```
Story page loads
  ↓
For each paragraph sequentially:
  ↓
  POST /api/generate/image
    { prompt, universe }
  ↓
  Backend sends to Gemini API
  ↓
  Gemini returns image URL/data
  ↓
  Update storyData with imageUrl
  ↓
  Re-render component
  ↓
Next paragraph...
```

### 4. Quiz Interaction Flow

```
User selects answer
  ↓
Check if correct (client-side)
  ↓
Highlight green (correct) or red (incorrect)
  ↓
Show correct answer
  ↓
User clicks "Regenerate"
  ↓
POST /api/generate/quiz
  { concept, universe }
  ↓
Claude generates new quiz
  ↓
Update quiz in storyData
  ↓
Reset answer selection
```

## Component Architecture

### Frontend Components

```
app/
├── layout.tsx (Root layout, metadata)
├── page.tsx (Home - Upload interface)
│   └── Uses: Dropzone, Loader
└── story/
    └── page.tsx (Story display)
        └── Uses: ImageCard, Quiz, Loader

components/
├── ImageCard.tsx
│   - Displays paragraph + image
│   - Handles image loading states
│   - Framer Motion animations
│
├── Quiz.tsx
│   - Multiple choice quiz interface
│   - Answer validation
│   - Regenerate functionality
│
├── Loader.tsx
│   - Loading animations
│   - Full-page loader variant
│
└── ErrorMessage.tsx
    - Error display
    - Dismissible alerts
```

### Backend Routes

```
server/
├── index.js (Main server)
│   - CORS configuration
│   - Middleware setup
│   - Error handling
│
└── routes/
    ├── extract.js
    │   - POST /file (multer upload)
    │   - POST /url (cheerio scraping)
    │   - POST /youtube (transcript API)
    │
    └── generate.js
        - POST /story (Claude API)
        - POST /image (Gemini API)
        - POST /quiz (Claude API)
```

## State Management

### Frontend State (React hooks)

```typescript
// Home Page
- uploadType: 'file' | 'url' | 'youtube' | null
- file: File | null
- url: string
- universe: string
- extractedText: string
- isLoading: boolean
- error: string

// Story Page
- storyData: StoryData
- universe: string
- currentImageIndex: number
- isGeneratingImages: boolean
- selectedAnswers: Map<number, string>
```

### Session Storage

```typescript
sessionStorage {
  "storyData": "{ story: [...] }",
  "universe": "Custom Universe"
}
```

## API Integration

### OpenRouter Configuration

```javascript
Base URL: https://openrouter.ai/api/v1
Headers:
  - Authorization: Bearer ${API_KEY}
  - Content-Type: application/json
  - HTTP-Referer: http://localhost:3000
  - X-Title: Lorey

Models:
  - anthropic/claude-3.5-sonnet
  - google/gemini-2.0-flash-exp:free
```

### Request Format (Claude)

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.8,
  "max_tokens": 8000,
  "response_format": { "type": "json_object" }
}
```

## Security Considerations

### API Key Protection
- API key stored in `.env` (server-side only)
- Never exposed to client
- Added to `.gitignore`

### File Upload Security
- File type validation (whitelist)
- Size limit (10MB)
- Temporary storage with cleanup
- Multer sanitization

### Input Validation
- Text length limits (50-50,000 chars)
- URL validation
- YouTube URL parsing
- XSS prevention (React auto-escaping)

### Rate Limiting
- Consider adding rate limiting middleware
- OpenRouter has built-in rate limits
- Implement user-side debouncing

## Performance Optimizations

### Frontend
- Image lazy loading with Next.js Image
- Code splitting (Next.js automatic)
- Framer Motion animations (GPU-accelerated)
- Session storage (avoid re-generation)

### Backend
- Concurrent image generation (consider parallel requests)
- Stream processing for large files
- Response compression
- File cleanup after processing

### API Calls
- Appropriate timeout values
- Error handling with retries
- Caching responses (future enhancement)

## Scalability Considerations

### Current Limitations
- Single server instance
- No database (sessionStorage only)
- No user authentication
- Sequential image generation

### Future Improvements
1. **Database Integration**
   - PostgreSQL for story persistence
   - User accounts and history
   - Cached story templates

2. **Cloud Deployment**
   - Vercel for frontend
   - Railway/Render for backend
   - S3 for image storage

3. **Performance**
   - Redis for caching
   - CDN for static assets
   - Parallel image generation

4. **Features**
   - WebSocket for real-time updates
   - Background job queue (Bull)
   - Story sharing functionality

## Error Handling Strategy

### Frontend
```typescript
try {
  // API call
} catch (error) {
  // User-friendly message
  setError('Failed to...')
  // Log to console
  console.error(error)
  // Optionally: Send to error tracking service
}
```

### Backend
```javascript
// Route-level error handling
try {
  // Process request
  res.json(data)
} catch (error) {
  console.error(error)
  res.status(500).json({
    error: 'Description',
    message: error.message
  })
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})
```

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev  # Starts both servers
   ```

2. **Code Changes**
   - Frontend: Hot reload (Next.js)
   - Backend: Auto-restart (nodemon)

3. **Testing**
   - Manual testing in browser
   - Console logging for debugging
   - Network tab for API inspection

4. **Building**
   ```bash
   npm run build  # Production build
   npm start      # Production server
   ```

## Monitoring & Debugging

### Frontend Debugging
- React DevTools
- Browser console
- Network tab (API calls)
- Framer Motion DevTools

### Backend Debugging
- Console logs
- Express request logging
- Error stack traces
- OpenRouter dashboard (usage)

### Production Monitoring
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- API usage tracking (OpenRouter dashboard)
- User analytics (Google Analytics)

---

This architecture is designed to be:
- **Modular**: Easy to add new features
- **Maintainable**: Clear separation of concerns
- **Scalable**: Can grow with user demand
- **Performant**: Optimized for user experience
