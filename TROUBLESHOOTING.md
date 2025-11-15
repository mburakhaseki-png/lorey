# Troubleshooting Guide

Common issues and solutions for Lorey.

---

## Installation Issues

### Error: `npm install` fails

**Symptom:** Dependencies fail to install

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

**Alternative:** Try using yarn instead:
```bash
npm install -g yarn
yarn install
```

---

### Error: `command not found: next`

**Symptom:** Next.js commands don't work

**Solution:**
```bash
# Ensure Next.js is installed
npm install next@latest

# Or run with npx
npx next dev
```

---

## Server Issues

### Error: `EADDRINUSE: Port already in use`

**Symptom:** Port 3000 or 3001 already in use

**Solution:**

**Windows:**
```bash
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3002
```

---

### Error: `Cannot find module`

**Symptom:** Module not found errors

**Solution:**
```bash
# Reinstall dependencies
npm install

# Check imports use correct paths
# Use @/ for root-level imports
import Loader from '@/components/Loader'
```

---

## API Issues

### Error: `OpenRouter API key not configured`

**Symptom:** Story generation fails

**Solutions:**

1. **Check .env file exists:**
   ```bash
   # Should be in root directory
   ls -la .env
   ```

2. **Verify API key format:**
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
   ```

3. **Restart server after editing .env:**
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

4. **Verify API key is valid:**
   - Visit https://openrouter.ai/keys
   - Check key is active
   - Regenerate if needed

---

### Error: `Insufficient credits`

**Symptom:** Story generation fails with credit error

**Solution:**
1. Visit https://openrouter.ai/credits
2. Add $5-10 credits
3. Wait a moment for credits to appear
4. Try again

---

### Error: `Request timeout`

**Symptom:** Story generation takes too long and fails

**Solutions:**

1. **Shorten your lesson:**
   - Keep under 2000 words
   - Remove unnecessary content

2. **Increase timeout (server/routes/generate.js):**
   ```javascript
   timeout: 180000 // 3 minutes instead of 2
   ```

3. **Check internet connection:**
   - Ensure stable connection
   - Try again on better network

---

### Error: `Rate limit exceeded`

**Symptom:** Too many requests

**Solution:**
- Wait 1-2 minutes
- OpenRouter has rate limits
- Upgrade plan for higher limits

---

## Upload Issues

### Error: `File too large`

**Symptom:** Upload fails

**Solution:**
- Max file size: 10MB
- Compress or split your PDF
- Convert PDF to text first

---

### Error: `Failed to extract text from PDF`

**Symptom:** PDF upload succeeds but no text extracted

**Solutions:**

1. **Check PDF is text-based:**
   - Open PDF and try to select text
   - If you can't, it's a scanned image
   - Use OCR tool first (Adobe Acrobat, online OCR)

2. **Try converting to .txt:**
   - Copy text from PDF
   - Paste into .txt file
   - Upload .txt instead

3. **Simplify PDF:**
   - Remove complex formatting
   - Export as plain text
   - Remove headers/footers

---

### Error: `Failed to extract text from URL`

**Symptom:** Website scraping fails

**Solutions:**

1. **Check URL is accessible:**
   - Open in browser
   - Ensure no login required
   - Verify content is visible

2. **Try different URLs:**
   - Some sites block scrapers
   - Use Wikipedia or educational sites
   - Avoid paywalled content

3. **Manual copy-paste:**
   - Copy text from website
   - Create .txt file
   - Upload file instead

---

### Error: `YouTube transcript not available`

**Symptom:** YouTube extraction fails

**Solutions:**

1. **Check video has captions:**
   - Open video on YouTube
   - Click CC button
   - Auto-generated or manual captions work

2. **Public videos only:**
   - Ensure video is public
   - Not private or unlisted

3. **Alternative:**
   - Use YouTube's transcript feature
   - Copy-paste into .txt file
   - Upload file

---

## Generation Issues

### Error: `Story generation produces weird output`

**Symptom:** Story doesn't make sense or lacks educational content

**Solutions:**

1. **Improve your lesson text:**
   - Make it clearer and more structured
   - Include key concepts explicitly
   - Use proper paragraphs

2. **Be specific with universe:**
   - Instead of "Marvel", try "Marvel's Avengers"
   - Instead of "Harry Potter", try "Hogwarts in Year 1"

3. **Adjust length:**
   - Too short: Add more content (200+ words)
   - Too long: Split into multiple lessons

---

### Error: `No quizzes generated`

**Symptom:** Story has no quiz components

**Solutions:**

1. **Check lesson is educational:**
   - Must contain learnable concepts
   - Not just narrative or opinion

2. **Make concepts explicit:**
   - Add definitions
   - Include facts and figures
   - Explain processes

3. **Modify prompt (server/routes/generate.js):**
   - Increase quiz emphasis
   - Require minimum number of quizzes

---

### Error: `Images not loading`

**Symptom:** No images appear on story page

**Solutions:**

1. **Wait for generation:**
   - Images generate after story
   - Can take 2-3 minutes
   - Watch "Generating images..." indicator

2. **Check browser console (F12):**
   - Look for error messages
   - Network tab shows failed requests

3. **Images are optional:**
   - Story is readable without images
   - Fallback placeholder shows

4. **Check OpenRouter limits:**
   - Gemini may have rate limits
   - Try again later

---

## UI/UX Issues

### Issue: `Animations are laggy`

**Solution:**
- Disable animations in browser settings
- Close other tabs
- Use more powerful device
- Reduce browser zoom level

---

### Issue: `Text too small on mobile`

**Solution:**
- Zoom in browser
- Check responsive breakpoints
- Verify TailwindCSS is loading

---

### Issue: `Quiz doesn't respond to clicks`

**Solutions:**

1. **Check if already answered:**
   - Can only answer once
   - Regenerate for new quiz

2. **Reload page:**
   - Refresh browser
   - sessionStorage may be corrupted

3. **Browser console:**
   - Check for JavaScript errors
   - Disable browser extensions

---

## Data Issues

### Issue: `Story disappears on refresh`

**Symptom:** Refreshing story page loses data

**Explanation:** This is expected behavior
- Stories stored in sessionStorage
- Cleared on browser close
- Navigate via "Home" button, not refresh

**Solution for persistence:**
- Future update: Add database
- Current: Don't refresh story page
- Use back button to return home

---

### Issue: `Can't go back to edit universe`

**Solution:**
- Click "← Home" button at top
- Or "Create Another Story" at bottom
- Start fresh generation

---

## Development Issues

### Error: `TypeScript errors`

**Symptom:** TS compilation errors

**Solutions:**

1. **Check imports:**
   ```typescript
   // Use @/ prefix
   import { Quiz } from '@/utils/types'
   ```

2. **Verify types are exported:**
   ```typescript
   export interface Quiz { ... }
   ```

3. **Restart TypeScript server:**
   - VS Code: Cmd/Ctrl + Shift + P → "Restart TS Server"

---

### Error: `Tailwind classes not working`

**Symptom:** Styles not applied

**Solutions:**

1. **Check tailwind.config.ts content paths:**
   ```typescript
   content: [
     './app/**/*.{js,ts,jsx,tsx}',
     './components/**/*.{js,ts,jsx,tsx}',
   ]
   ```

2. **Rebuild:**
   ```bash
   npm run build
   npm run dev
   ```

3. **Check class names:**
   - Use official Tailwind classes
   - Custom classes defined in globals.css

---

### Error: `Hot reload not working`

**Symptom:** Changes don't appear without manual refresh

**Solutions:**

1. **Restart dev server:**
   ```bash
   # Ctrl+C to stop
   npm run dev
   ```

2. **Check nodemon for backend:**
   ```bash
   # Should auto-restart on .js changes
   # Check nodemon.json configuration
   ```

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## Database/Persistence (Future)

### Currently: No database

**Data storage:**
- sessionStorage (temporary)
- Cleared on browser close
- Per-tab storage

**Future plans:**
- PostgreSQL for stories
- User accounts
- Story history
- Sharing features

---

## Performance Issues

### Issue: `Slow story generation`

**Normal:**
- 30-90 seconds is expected
- Depends on lesson length
- Claude processes deeply

**If longer:**
- Check internet speed
- Verify OpenRouter status
- Try shorter lesson
- Check browser console

---

### Issue: `High memory usage`

**Solutions:**
- Close other tabs
- Restart browser
- Clear browser cache
- Use modern browser (Chrome, Firefox, Edge)

---

## Browser Compatibility

### Supported Browsers

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

### Known Issues

❌ Internet Explorer (not supported)
⚠️ Safari < 14 (limited Framer Motion support)
⚠️ Old mobile browsers (limited features)

---

## Debugging Tips

### 1. Check Browser Console

```bash
# Open developer tools
F12 (Windows/Linux)
Cmd+Option+I (Mac)

# Check tabs:
- Console: JavaScript errors
- Network: API requests
- Application: sessionStorage
```

### 2. Check Server Logs

```bash
# Backend logs in terminal
# Look for error messages
# Check API responses
```

### 3. Test with Sample File

```bash
# Use provided sample
examples/sample-lesson.txt

# Try simple universe
"Rick and Morty"

# Should work if setup correct
```

### 4. Verify Environment

```bash
# Check Node version
node --version  # Should be 18+

# Check npm version
npm --version

# Check .env file
cat .env  # Windows: type .env
```

---

## Getting Help

### Before asking for help:

1. ✅ Check this troubleshooting guide
2. ✅ Read error messages carefully
3. ✅ Check browser console (F12)
4. ✅ Try with sample-lesson.txt
5. ✅ Verify API key and credits
6. ✅ Restart server

### Documentation Resources:

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [TUTORIAL.md](TUTORIAL.md) - Usage tutorial
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details

### External Resources:

- OpenRouter Docs: https://openrouter.ai/docs
- Next.js Docs: https://nextjs.org/docs
- TailwindCSS: https://tailwindcss.com/docs

---

## Still Having Issues?

### Check these common mistakes:

❌ No .env file created
❌ API key not added to .env
❌ No credits in OpenRouter account
❌ Wrong API key format
❌ Server not restarted after .env change
❌ Wrong Node.js version (need 18+)
❌ Ports already in use
❌ Firewall blocking localhost
❌ Antivirus blocking Node.js

### Final steps:

1. **Complete reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Fresh start:**
   ```bash
   # Stop all servers
   # Close terminal
   # Open new terminal
   npm run dev
   ```

3. **Check system requirements:**
   - Node.js 18+
   - 2GB+ free RAM
   - Stable internet
   - Modern browser

---

## Reporting Bugs

If you find a bug:

1. **Document the issue:**
   - What you did
   - What you expected
   - What happened instead
   - Error messages
   - Screenshots if helpful

2. **Include environment:**
   - OS version
   - Node.js version
   - Browser version
   - Lorey version

3. **Minimal reproduction:**
   - Steps to reproduce
   - Sample input that fails
   - Expected vs actual output

---

Happy troubleshooting! Most issues are quick fixes. 🔧
