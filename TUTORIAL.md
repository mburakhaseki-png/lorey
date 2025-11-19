# Lorey Tutorial - Your First Story

This tutorial will walk you through creating your first educational story with Lorey.

## Prerequisites

- Node.js installed
- OpenRouter API key configured
- Application running (`npm run dev`)

---

## Step-by-Step Guide

### Step 1: Start the Application

```bash
# In your terminal
cd "c:\Users\Burak\Documents\Projeler\LOREY RS"
npm run dev
```

Wait for the message:
```
✓ Ready on http://localhost:3000
🚀 Lorey API server running on port 3001
```

### Step 2: Open in Browser

Navigate to: **http://localhost:3000**

You should see the Lorey home page with:
- Large "Lorey" title in violet
- "Turn Lessons Into Stories" subtitle
- Three upload option buttons: File, URL, YouTube

---

### Step 3: Choose Upload Method

Let's try the **File** option:

1. Click the **📄 File** button
2. You'll see a drag-and-drop area appear

---

### Step 4: Upload a Lesson

**Option A: Use the Sample File**
- Navigate to `examples/sample-lesson.txt`
- Drag and drop it into the upload area
- ✅ File name appears in violet

**Option B: Create Your Own**
- Create a `.txt` file with educational content
- Example: Write about photosynthesis, math, history, etc.
- Keep it between 200-2000 words for best results
- Drag into the upload area

---

### Step 5: Choose Your Universe

In the "Choose Your Universe" field, enter any fictional universe you love:

**Examples:**
- Your favorite TV show universe
- Your favorite movie universe
- Your favorite book universe
- Your own custom universe

💡 **Tip**: The more specific you are, the better the story matches that universe's vibe! You can create your own universe too.

---

### Step 6: Generate Your Story

1. Click the **"Extract & Generate Story"** button
2. You'll see a loading screen with:
   - Animated spinner
   - "Crafting your story... This may take a minute."

⏱️ **Wait time**: 30-90 seconds (depending on lesson length)

---

### Step 7: Explore Your Story

Once generation completes, you're taken to the Story Page!

**What you'll see:**

1. **Header Bar** (sticky top)
   - Your universe name
   - Number of scenes and quizzes
   - "← Home" button

2. **Story Content** (scrollable)
   - Each paragraph in a beautiful card
   - AI-generated images appear one by one
   - Quizzes below relevant paragraphs

---

### Step 8: Interact with Quizzes

When you see a quiz:

1. **Read the question** (based on the educational content)
2. **Select an answer** (A, B, C, D, or E)
3. **See immediate feedback**:
   - ✅ Green = Correct!
   - ❌ Red = Incorrect (correct answer shown)
4. **Click 🔄** in top-right to regenerate the question

---

### Step 9: Enjoy the Experience

As you scroll:
- **Images load progressively** (watch the counter in top-right)
- **Paragraphs animate** into view
- **Story flows naturally** with characters from your universe
- **Educational concepts** woven into the narrative

---

### Step 10: Create Another Story

1. Scroll to the bottom
2. Click **"Create Another Story"**
3. Or use **"← Home"** button at the top
4. Try a different universe or topic!

---

## Example Walkthrough

Let's do a full example together:

### Scenario: Teaching Photosynthesis with Your Favorite Universe

**1. Upload Method:** File (use `examples/sample-lesson.txt`)

**2. Universe:** `Your favorite sci-fi universe`

**3. Click:** Generate Story

**4. Story Generated:**

```
Scene 1:
Characters explore a plant cell, discovering the chloroplast. 
"See that green stuff? That's chlorophyll. It's like... it's like 
a solar panel, but for plants. Absorbs light energy and converts 
it to chemical energy."

[AI-generated image of characters inside a chloroplast]

Quiz:
Q: What is the main function of chlorophyll?
A) Store water
B) Absorb light energy ✓
C) Produce oxygen
D) Create glucose
E) Protect the cell
```

**5. Continue through 8-15 more scenes**, each teaching different aspects of photosynthesis through your chosen universe's adventure!

---

## Tips for Best Results

### Content Selection

✅ **Good Content:**
- Educational articles (Wikipedia, Khan Academy)
- Textbook chapters
- Tutorial guides
- Explanatory essays
- How-to guides

❌ **Avoid:**
- Very short texts (< 200 words)
- Lists without context
- Non-educational content
- Encrypted or formatted PDFs

### Universe Selection

✅ **Best Universes:**
- Popular TV shows with strong characters
- Movie franchises with distinct settings
- Book series with rich lore
- Video game worlds

🌟 **Pro Tips:**
- Specify the season/era for consistency
- Match universe complexity to topic
- Science topics → Sci-fi universes
- History topics → Period dramas
- Math topics → Strategic/puzzle universes

### File Preparation

**For .txt files:**
- Use plain text
- Include paragraph breaks
- Remove excessive formatting
- 200-2000 words optimal

**For .pdf files:**
- Ensure text is selectable (not scanned images)
- Simple formatting works best
- Remove headers/footers if possible

### URL Scraping

**Good URLs:**
- Wikipedia articles
- Blog posts
- Educational sites
- Simple HTML pages

**May have issues:**
- Paywalled content
- JavaScript-heavy sites
- Sites blocking scrapers
- Protected content

### YouTube Videos

**Requirements:**
- Video must have captions or subtitles
- Public video (not private/unlisted)
- Supports English and many other languages

**Best for:**
- Educational YouTube channels
- Lectures
- Tutorials
- TED Talks

---

## Troubleshooting

### Story generation stuck?
- Check browser console (F12)
- Verify API key has credits
- Try shorter content
- Refresh and try again

### No images appearing?
- Images generate after story loads
- Check "Generating images..." counter
- Wait 2-3 minutes total
- Images are optional - story is still readable!

### Quiz not working?
- Make sure you click an option
- Try the regenerate button
- Check if concept was educational enough

### Upload failed?
- Check file size (< 10MB)
- Verify file type (.txt or .pdf)
- Try copy-pasting content instead

---

## Advanced Usage

### Comparing Universes

Try the same lesson in different universes:

1. **Sci-fi comedy universe** - Casual, fun tone
2. **Magical learning universe** - School setting, wonder-filled
3. **Scientific exploration universe** - Formal, educational tone
4. **Office/workplace universe** - Relatable, everyday humor

See how the AI adapts the same content!

### Combining Topics

Create multi-concept lessons:

```
Topic: "The Physics of Basketball"
Content: Gravity + Projectile Motion + Energy Transfer
Universe: Space Jam or NBA
```

### Progressive Learning

Create a series:

1. **Lesson 1**: Basics (Universe: Simple/Kid-friendly)
2. **Lesson 2**: Intermediate (Universe: Teen shows)
3. **Lesson 3**: Advanced (Universe: Complex narratives)

---

## What's Next?

After mastering the basics:

1. **Experiment** with different universes
2. **Share** stories with students/friends
3. **Create** lesson series for courses
4. **Customize** the code (see ARCHITECTURE.md)
5. **Contribute** improvements (see README.md)

---

## Quick Reference

| Action | Where | How |
|--------|-------|-----|
| Upload file | Home → File button | Drag & drop or click |
| Enter URL | Home → URL button | Paste URL |
| YouTube link | Home → YouTube button | Paste video URL |
| Choose universe | Home → Text input | Type universe name |
| Generate | Home → Button | Click after upload + universe |
| Answer quiz | Story page → Quiz card | Click option |
| Regenerate quiz | Story page → 🔄 button | Click in quiz top-right |
| New story | Story page → Bottom | "Create Another Story" |
| Go home | Story page → Top | "← Home" button |

---

## Need Help?

- 📖 Read [README.md](README.md) for full documentation
- 🏗️ See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- 🚀 Check [QUICKSTART.md](QUICKSTART.md) for setup help
- 📁 Review [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for code organization

---

Happy learning! Turn every boring lesson into an epic adventure! 🚀✨
