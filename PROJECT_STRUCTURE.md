# Lorey - Project Structure

```
LOREY RS/
│
├── app/                          # Next.js App Directory
│   ├── globals.css               # Global styles with TailwindCSS
│   ├── layout.tsx                # Root layout component
│   ├── page.tsx                  # Home page (upload interface)
│   └── story/
│       └── page.tsx              # Story display page
│
├── components/                   # Reusable React components
│   ├── ErrorMessage.tsx          # Error display component
│   ├── ImageCard.tsx             # Image + paragraph card
│   ├── Loader.tsx                # Loading animations
│   └── Quiz.tsx                  # Interactive quiz component
│
├── server/                       # Express backend
│   ├── index.js                  # Main server entry point
│   ├── routes/
│   │   ├── extract.js            # Text extraction endpoints
│   │   └── generate.js           # AI generation endpoints
│   └── uploads/                  # Temporary file storage (auto-created)
│
├── utils/                        # Utility functions
│   ├── parseLesson.ts            # Text processing utilities
│   └── types.ts                  # TypeScript type definitions
│
├── examples/                     # Sample content
│   └── sample-lesson.txt         # Example lesson for testing
│
├── .env                          # Environment variables (create from .env.example)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── ARCHITECTURE.md               # System architecture documentation
├── LICENSE                       # MIT License
├── next.config.js                # Next.js configuration
├── nodemon.json                  # Nodemon configuration
├── package.json                  # Dependencies and scripts
├── postcss.config.js             # PostCSS configuration
├── PROJECT_STRUCTURE.md          # This file
├── QUICKSTART.md                 # Quick start guide
├── README.md                     # Main documentation
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

## File Descriptions

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies, scripts, and metadata |
| `tsconfig.json` | TypeScript compiler configuration |
| `next.config.js` | Next.js framework configuration |
| `tailwind.config.ts` | Tailwind CSS customization (colors, animations) |
| `postcss.config.js` | PostCSS plugins configuration |
| `nodemon.json` | Backend auto-reload configuration |
| `.env` | Environment variables (API keys) |
| `.gitignore` | Files/folders to exclude from git |

### Frontend (Next.js)

| File | Purpose | Key Features |
|------|---------|--------------|
| `app/layout.tsx` | Root layout | Metadata, font loading, global wrapper |
| `app/page.tsx` | Home page | File upload, URL/YouTube input, universe selection |
| `app/story/page.tsx` | Story display | Story rendering, image generation, quiz interaction |
| `app/globals.css` | Global styles | TailwindCSS, custom classes, scrollbar styles |

### Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `Loader.tsx` | Loading states | `message?: string` |
| `Quiz.tsx` | Interactive quiz | `quiz, concept?, universe?, onRegenerate?` |
| `ImageCard.tsx` | Scene display | `imageUrl?, paragraph, index` |
| `ErrorMessage.tsx` | Error display | `message, onDismiss?` |

### Backend (Express)

| File | Purpose | Endpoints |
|------|---------|-----------|
| `server/index.js` | Main server | Health check, middleware setup |
| `server/routes/extract.js` | Text extraction | `/file`, `/url`, `/youtube` |
| `server/routes/generate.js` | AI generation | `/story`, `/image`, `/quiz` |

### Utilities

| File | Purpose | Exports |
|------|---------|---------|
| `utils/types.ts` | TypeScript types | `Quiz`, `StoryParagraph`, `StoryData`, etc. |
| `utils/parseLesson.ts` | Text processing | `cleanLessonText`, `validateLessonText`, etc. |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main documentation, features, setup |
| `QUICKSTART.md` | 5-minute setup guide |
| `ARCHITECTURE.md` | System design, data flow, diagrams |
| `PROJECT_STRUCTURE.md` | This file - project organization |
| `LICENSE` | MIT License |

### Examples

| File | Purpose |
|------|---------|
| `examples/sample-lesson.txt` | Sample educational content for testing |

## Tech Stack Summary

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **File Upload**: React Dropzone
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **File Upload**: Multer
- **PDF Parsing**: pdf-parse
- **Web Scraping**: Cheerio
- **YouTube**: youtube-transcript

### AI Services
- **API Gateway**: OpenRouter
- **Story/Quiz**: Claude 3.5 Sonnet (Anthropic)
- **Images**: Gemini 2.5 Flash (Google)

## Development Ports

| Service | Port | URL |
|---------|------|-----|
| Next.js Frontend | 3000 | http://localhost:3000 |
| Express Backend | 3001 | http://localhost:3001 |

## Environment Variables

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx  # Required: OpenRouter API key
PORT=3001                           # Optional: Backend port (default: 3001)
```

## NPM Scripts

```bash
npm run dev          # Start both frontend and backend (development)
npm run dev:next     # Start only Next.js frontend
npm run dev:server   # Start only Express backend
npm run build        # Build Next.js for production
npm start            # Start both servers (production)
npm run lint         # Run ESLint
```

## Auto-Generated Directories

These directories are created automatically:

```
node_modules/        # NPM dependencies (after npm install)
.next/               # Next.js build output
server/uploads/      # Temporary file uploads (auto-cleaned)
```

## Build Output

After running `npm run build`:

```
.next/
├── cache/           # Build cache
├── server/          # Server-side rendering
└── static/          # Static assets
```

## Key Design Patterns

### Component Pattern
- Functional components with hooks
- TypeScript interfaces for props
- Framer Motion for animations
- Tailwind for styling

### API Pattern
- Express routes with async/await
- Centralized error handling
- Multer middleware for uploads
- Axios for OpenRouter API calls

### State Management
- React useState for local state
- sessionStorage for page transitions
- No global state library (not needed yet)

### File Organization
- Co-location of related files
- Separation by feature (not by type)
- Clear naming conventions
- Modular, reusable code

## Adding New Features

### New Page
1. Create `app/new-page/page.tsx`
2. Add navigation link in existing pages
3. Update routing as needed

### New Component
1. Create `components/NewComponent.tsx`
2. Define TypeScript interface for props
3. Export and import where needed

### New API Endpoint
1. Add route in `server/routes/`
2. Update `server/index.js` if new router
3. Document in README

### New AI Feature
1. Add endpoint in `server/routes/generate.js`
2. Configure OpenRouter model
3. Update frontend to call endpoint

## Best Practices

1. **TypeScript**: Use proper types, avoid `any`
2. **Components**: Keep them small and focused
3. **Error Handling**: Always catch and display errors
4. **Loading States**: Show feedback during async operations
5. **Responsive**: Mobile-first design
6. **Accessibility**: Proper semantic HTML, ARIA labels
7. **Performance**: Lazy loading, code splitting
8. **Security**: Validate inputs, sanitize data
9. **Documentation**: Comment complex logic
10. **Testing**: Test with various inputs and universes

---

For more information, see:
- [README.md](README.md) - Complete documentation
- [QUICKSTART.md](QUICKSTART.md) - Get started quickly
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design details
