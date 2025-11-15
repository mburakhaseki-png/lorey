# 🚀 START HERE - Lorey Quick Launch

## ✅ Your API Key is Already Configured!

Good news! Your OpenRouter API key is already in the `.env` file.

---

## 🎯 3 Steps to Launch

### Step 1: Install Dependencies

Open terminal in this directory and run:

```bash
npm install
```

⏱️ **Wait time:** 2-3 minutes (depending on internet speed)

---

### Step 2: Start the Application

```bash
npm run dev
```

✅ **Success indicators:**
- `✓ Ready on http://localhost:3000`
- `🚀 Lorey API server running on port 3001`

⚠️ **If ports are busy:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#port-issues)

---

### Step 3: Open in Browser

Navigate to: **http://localhost:3000**

You should see the beautiful Lorey home page! 🎨

---

## 🎬 Create Your First Story

### Quick Test (2 minutes)

1. **Click** the **📄 File** button
2. **Drag and drop** `examples/sample-lesson.txt`
3. **Type** in universe field: `Rick and Morty`
4. **Click** "Generate Story"
5. **Wait** 30-60 seconds
6. **Enjoy** your story!

---

## 📚 What to Read Next

### New Users
→ [TUTORIAL.md](TUTORIAL.md) - Detailed walkthrough

### Developers
→ [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
→ [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Code organization

### Having Issues?
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common problems & solutions

### Full Documentation
→ [README.md](README.md) - Complete guide

---

## 💡 Quick Tips

### Best Practices

✅ **Content Length:** 200-2000 words
✅ **Universe Examples:** "Rick and Morty", "Harry Potter", "Marvel"
✅ **File Types:** .txt works best, .pdf may vary
✅ **First Try:** Use the sample-lesson.txt file

### What Makes a Good Story?

**Good Lesson Content:**
- Clear educational concepts
- Structured paragraphs
- Key facts and definitions
- 200-2000 words

**Good Universe Choice:**
- Popular TV shows/movies
- Rich characters and settings
- Specific (e.g., "Season 3 of The Office")

---

## 🎮 Try These Examples

### Example 1: Science + Sci-Fi
```
File: examples/sample-lesson.txt (Photosynthesis)
Universe: Rick and Morty
Result: Wacky science adventure!
```

### Example 2: History + Fantasy
```
Content: Copy a Wikipedia history article
Universe: Game of Thrones
Result: Epic historical narrative!
```

### Example 3: Math + Space
```
Content: Probability lesson
Universe: Star Trek
Result: Logical exploration!
```

---

## ⚡ Common First-Time Issues

### "Port already in use"
```bash
# Windows: Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### "Module not found"
```bash
# Reinstall dependencies
npm install
```

### "Generation fails"
- ✅ Check API key in `.env` (already done!)
- ✅ Verify credits at https://openrouter.ai/credits
- ✅ Try shorter content first

---

## 📊 Project Overview

**What is Lorey?**
An AI-powered web app that turns boring educational content into fun, interactive stories set in your favorite fictional universes.

**Tech Stack:**
- Frontend: Next.js + React + TypeScript + TailwindCSS
- Backend: Express.js + Node.js
- AI: Claude 3.5 Sonnet + Gemini 2.5 Flash (via OpenRouter)

**Features:**
- Multiple input methods (file, URL, YouTube)
- AI story generation
- Image generation for each scene
- Interactive quizzes
- Mobile-responsive design
- Beautiful animations

---

## 📁 Project Structure

```
Important Files:
├── app/
│   ├── page.tsx              → Home page (upload)
│   └── story/page.tsx        → Story display
├── components/               → Reusable UI components
├── server/                   → Backend API
│   └── routes/              → API endpoints
└── examples/                 → Sample lessons

Configuration:
├── .env                      → Your API key ✅
├── package.json              → Dependencies
└── tailwind.config.ts        → Theme colors

Documentation:
├── README.md                 → Full docs
├── QUICKSTART.md             → 5-min setup
├── TUTORIAL.md               → Walkthrough
└── TROUBLESHOOTING.md        → Common issues
```

---

## 🎯 Your Next Actions

### Right Now (5 minutes)
1. [ ] Run `npm install`
2. [ ] Run `npm run dev`
3. [ ] Open http://localhost:3000
4. [ ] Test with sample-lesson.txt
5. [ ] Try "Rick and Morty" universe

### This Week
- [ ] Read TUTORIAL.md
- [ ] Try different universes
- [ ] Upload your own content
- [ ] Customize colors in tailwind.config.ts

### Later
- [ ] Read ARCHITECTURE.md
- [ ] Explore the code
- [ ] Add new features
- [ ] Deploy to production

---

## 💰 OpenRouter Credits

Your API key is configured! Make sure you have credits:

1. Visit: https://openrouter.ai/credits
2. Check current balance
3. Add $5-10 if needed (lasts ~50-100 stories)
4. Monitor usage in dashboard

**Typical cost per story:** $0.05 - $0.15

---

## 🆘 Need Help?

### Quick Reference

| Issue | Solution |
|-------|----------|
| Installation fails | `npm cache clean --force` then `npm install` |
| Port in use | See TROUBLESHOOTING.md |
| Generation fails | Check credits at openrouter.ai |
| No images | Wait 2-3 minutes, they generate after story |
| Upload fails | Use .txt file, max 10MB |

### Documentation Guide

- **Quick setup:** QUICKSTART.md
- **How to use:** TUTORIAL.md
- **Problems:** TROUBLESHOOTING.md
- **Everything:** README.md
- **Technical:** ARCHITECTURE.md

---

## ✨ What Makes Lorey Special?

🎓 **Educational** - Preserves learning content
🎮 **Fun** - Set in your favorite universes
🖼️ **Visual** - AI-generated images
🧠 **Interactive** - Quizzes test understanding
📱 **Mobile-friendly** - Works everywhere
⚡ **Fast** - Stories in 30-60 seconds
🎨 **Beautiful** - Modern, polished design

---

## 🎊 You're Ready!

Everything is set up and ready to go. Your journey starts with:

```bash
npm install
npm run dev
```

Then open: **http://localhost:3000**

---

## 🌟 Pro Tips

1. **Start simple** - Use sample-lesson.txt first
2. **Be specific** - "Season 1 Rick and Morty" > "Rick and Morty"
3. **Keep it educational** - More concepts = better quizzes
4. **Experiment** - Try different universes with same lesson
5. **Have fun** - The AI is creative!

---

## 📞 Resources

**Lorey Docs:**
- Quick Start: QUICKSTART.md
- Tutorial: TUTORIAL.md
- Full Guide: README.md

**External:**
- OpenRouter: https://openrouter.ai
- Next.js: https://nextjs.org
- TailwindCSS: https://tailwindcss.com

---

## 🚀 Ready to Launch?

Open your terminal and run:

```bash
npm install && npm run dev
```

Then visit: **http://localhost:3000**

**Let's turn boring lessons into epic adventures!** ✨

---

*Need help? Check TROUBLESHOOTING.md or README.md*
