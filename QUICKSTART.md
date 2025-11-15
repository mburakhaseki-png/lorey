# Quick Start Guide

Get Lorey up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get Your OpenRouter API Key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up or log in
3. Navigate to [https://openrouter.ai/keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Copy your API key

## Step 3: Configure Environment

Create a `.env` file in the root directory:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Edit `.env` and add your API key:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
PORT=3001
```

## Step 4: Add Credits to OpenRouter

1. Visit [https://openrouter.ai/credits](https://openrouter.ai/credits)
2. Add $5-10 to start (enough for ~50-100 stories)

## Step 5: Start the Application

```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Step 6: Create Your First Story!

1. Open http://localhost:3000
2. Upload a text file or paste a URL
3. Enter a universe (e.g., "Rick and Morty")
4. Click "Generate Story"
5. Wait 30-60 seconds
6. Enjoy your personalized educational story!

## Example Lessons to Try

### Sample Text File

Create a file called `probability.txt`:

```
Probability is the measure of the likelihood that an event will occur. It is quantified as a number between 0 and 1, where 0 indicates impossibility and 1 indicates certainty. For example, when flipping a fair coin, the probability of getting heads is 0.5 or 50%. When rolling a six-sided die, the probability of rolling any specific number is 1/6 or approximately 16.67%.
```

### Sample URLs

- Wikipedia articles: `https://en.wikipedia.org/wiki/Photosynthesis`
- Educational sites: `https://www.khanacademy.org/...`
- Blog posts about any topic

### Sample YouTube Videos

- Educational videos with captions
- TED Talks
- Tutorial videos

## Troubleshooting

### Error: "OpenRouter API key not configured"
- Make sure your `.env` file exists
- Verify the API key is correct
- Restart the server after changing `.env`

### Error: "Failed to generate story"
- Check your OpenRouter account has credits
- Verify your API key is valid
- Check the console for detailed error messages

### No images showing
- Images generate sequentially after the story
- Check the "Generating images..." indicator
- Wait up to 2-3 minutes for all images

### Can't upload files
- Ensure file is under 10MB
- Only `.txt` and `.pdf` files supported
- Try drag-and-drop instead of clicking

## Tips for Best Results

1. **Lesson Length**: 200-2000 words works best
2. **Universe Choice**: Be specific (e.g., "Season 1 of The Office" vs just "The Office")
3. **Content Type**: Works best with educational/explanatory content
4. **File Format**: Plain text files give most consistent results

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the UI colors in `tailwind.config.ts`
- Modify story generation prompts in `server/routes/generate.js`
- Add support for more file types

---

Happy learning! 🚀
