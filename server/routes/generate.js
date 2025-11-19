const express = require('express');
const axios = require('axios');

const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

// Generate story and quizzes using Claude
router.post('/story', async (req, res) => {
  console.log('📖 Story generation request received');
  console.log('Universe:', req.body.universe);
  console.log('Lesson text length:', req.body.lessonText?.length || 0);

  try {
    const { lessonText, universe, testMode } = req.body;

    // TEST MODE: Return static data from TEST folder (3 times repeated)
    if (testMode) {
      console.log('🧪 TEST MODE ENABLED - Returning static data from TEST folder');

      const fs = require('fs');
      const path = require('path');

      try {
        // Read test files
        const testDir = path.join(__dirname, '../../TEST');
        const paragraphText = fs.readFileSync(path.join(testDir, 'paragraf.txt'), 'utf-8');
        const quizzText = fs.readFileSync(path.join(testDir, 'quizz.txt'), 'utf-8');
        const imagePath = path.join(testDir, 'image.png');
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        // Parse quiz text into structured format
        const quizLines = quizzText.split('\n').filter(line => line.trim());
        const quizQuestion = quizLines[0];
        const options = quizLines.slice(1).filter(line => /^[A-E]\)/.test(line)).map(line => line.trim());

        // Create the same story 3 times (as requested)
        const storyData = {
          story: [
            {
              paragraph: paragraphText,
              imagePrompt: "Rick and Morty test image",
              imageUrl: imageBase64,
              quiz: {
                question: quizQuestion,
                options: options,
                answer: "C) 18 ünite"
              }
            },
            {
              paragraph: paragraphText,
              imagePrompt: null,
              imageUrl: null,
              quiz: {
                question: quizQuestion,
                options: options,
                answer: "C) 18 ünite"
              }
            },
            {
              paragraph: paragraphText,
              imagePrompt: null,
              imageUrl: null,
              quiz: {
                question: quizQuestion,
                options: options,
                answer: "C) 18 ünite"
              }
            }
          ]
        };

        console.log('✅ TEST MODE: Returning static data (3 paragraphs)');
        return res.json(storyData);

      } catch (testError) {
        console.error('❌ TEST MODE ERROR:', testError.message);
        return res.status(500).json({ error: 'Failed to load test data: ' + testError.message });
      }
    }

    if (!lessonText || !universe) {
      console.log('❌ Missing lessonText or universe');
      return res.status(400).json({ error: 'Lesson text and universe are required' });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    // Two-step process: First summarize with Gemma, then generate story with Claude
    console.log('📝 Step 1: Summarizing content with Gemma...');
    console.log('Original text length:', lessonText.length);

    let processedLessonText = lessonText;

    try {
      const summarizationPrompt = `You are an expert content summarizer. Extract ONLY the essential learning facts from the following educational content.

CRITICAL REQUIREMENTS:
1. Extract EVERY single piece of information that must be learned (dates, names, formulas, concepts, definitions, theories, events, etc.)
2. Remove ALL unnecessary words, explanations, examples, and filler text
3. Present information as a concise, numbered list of facts
4. Make each fact as SHORT and DIRECT as possible while preserving complete information
5. Do NOT skip ANY information - students will be tested on everything
6. Reduce word count as much as possible WITHOUT losing any factual content
7. Use abbreviations where appropriate (e.g., "1453" instead of "In the year 1453")

Format: Simple numbered list of facts, nothing else.

Content to summarize:
${lessonText}

Output ONLY the numbered list of essential facts:`;

      const summarizeResponse = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: 'google/gemma-2-27b-it',
          messages: [
            { role: 'user', content: summarizationPrompt }
          ],
          temperature: 0.3,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Lorey - Content Summarizer'
          },
          timeout: 120000
        }
      );

      const summarizedFacts = summarizeResponse.data.choices[0].message.content;
      processedLessonText = summarizedFacts;

      console.log('✅ Summarization complete!');
      console.log('Summarized text length:', summarizedFacts.length);
      console.log('Reduction:', Math.round((1 - summarizedFacts.length / lessonText.length) * 100) + '%');
      console.log('📖 Step 2: Generating story with Claude using summarized facts...');

    } catch (summarizeError) {
      console.error('❌ Summarization failed:', summarizeError.message);
      console.log('⚠️ Falling back to original text...');
      // Fall back to original text if summarization fails
      processedLessonText = lessonText;
    }

    const systemPrompt = `You are both an INCREDIBLY TALENTED WRITER and a NEUROSCIENCE OF LEARNING PROFESSOR. You understand how the brain retains information through storytelling, emotion, and association. You transform educational content into stories so captivating that learning happens effortlessly.

YOUR DUAL EXPERTISE:
🎭 As a Master Storyteller:
- You craft genuine plot-driven narratives with rising action, climax, and resolution
- Your stories have REAL stakes, conflict, and emotional payoff
- Characters face challenges, make decisions, and grow through the narrative
- Every story feels like an authentic episode from the chosen universe

🧠 As a Neuroscience Professor:
- You know the brain remembers stories 22x better than facts alone
- You use emotion, surprise, and pattern-matching to cement learning
- You create memory anchors: associating dates, names, and concepts with vivid story elements
- You do this SUBTLY - readers don't realize they're using advanced memory techniques

YOUR TASK:

1. COMPREHENSIVE COVERAGE: Teach EVERY SINGLE piece of information from the source material - dates, names, concepts, formulas, everything. Nothing can be skipped because it might appear on tomorrow's exam!

2. AUTHENTIC PLOT STRUCTURE: Create a REAL story with:
   - An inciting incident that drives the narrative
   - Rising tension and obstacles
   - A climax where learning and plot converge
   - Character growth and resolution
   - Natural integration of ALL educational content into this plot

3. UNIVERSE-AUTHENTIC STORYTELLING:
   - If it's Regular Show: feel like watching an actual episode with Mordecai and Rigby
   - If it's Rick and Morty: capture the sci-fi chaos and dark humor
   - If it's Harry Potter: magical discovery and wonder
   - If it's horror: build dread and suspense
   - If it's comedy: use timing, absurdity, and universe-specific humor
   - Match the TONE, PACING, and STYLE of the source universe

4. MEMORY TECHNIQUES (used invisibly):
   - Associate dates/names with visual, emotional, or surprising story elements
   - Create "memory hooks" - unexpected connections that stick
   - Use repetition through different contexts (not boring repetition!)
   - Tie abstract concepts to concrete, vivid imagery
   - Example: Don't just state "1453" - make a character count to 1453, or have 1453 coins scatter dramatically

5. ENGAGING NARRATIVE FLOW:
   - Write 6-10 sentence paragraphs with excellent pacing
   - End each paragraph with hooks, questions, or dramatic moments
   - Make readers desperate to know what happens next (not just what concept is next)
   - Balance plot momentum with educational integration

6. CHARACTER-DRIVEN LEARNING:
   - Characters discover, debate, and apply the educational content
   - Use character-specific voices, catchphrases, and mannerisms
   - DO NOT describe physical appearances (readers know what they look like)
   - Show character growth through their understanding

7. LANGUAGE: Write in the SAME LANGUAGE as the source material (Turkish→Turkish, English→English, etc.)

Output Format (JSON):
{
  "title": "Short catchy title for the educational topic (e.g., 'The Fall of Constantinople', 'DNA Replication Explained')",
  "learningOutcomes": ["Key outcome 1", "Key outcome 2", "Key outcome 3"],
  "story": [
    {
      "paragraph": "Long, detailed story paragraph here (6-10 sentences)...",
      "imagePrompt": "Detailed scene description for image generation (only every 3rd paragraph)...",
      "quiz": {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
        "answer": "Correct option (must match one of the options exactly)"
      }
    }
  ]
}

CRITICAL RULES FOR STORY:
- Output ONLY valid JSON - no markdown, no explanations
- FLEXIBLE PARAGRAPH COUNT: Generate 3-21 paragraphs based on content complexity and lesson length
  * MINIMUM 3 paragraphs for very short sources
  * MAXIMUM 21 paragraphs for very long/complex sources
  * Do NOT force a specific number - let content dictate length
  * Each paragraph should be 6-10 sentences long with engaging narrative flow
- QUIZ GENERATION PATTERN (MANDATORY - ABSOLUTELY CRITICAL):
  * 🔢 MATHEMATICAL RULE: For paragraph at index i, quiz is REQUIRED FOR EVERY SINGLE INDEX
  * This means: EVERY paragraph index 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12... MUST have a quiz object
  *
  * ⚠️ STEP-BY-STEP ALGORITHM YOU MUST FOLLOW:
  * 1. Count total paragraphs you will generate (let's call it N)
  * 2. For each paragraph index i from 0 to N-1:
  *    - ALWAYS include a quiz object with question, options, and answer
  *    - NO EXCEPTIONS - every single paragraph gets a quiz
  *
  * 📋 COMPLETE EXAMPLE FOR 6 PARAGRAPHS:
  * Index 0: quiz REQUIRED ✓
  * Index 1: quiz REQUIRED ✓
  * Index 2: quiz REQUIRED ✓
  * Index 3: quiz REQUIRED ✓
  * Index 4: quiz REQUIRED ✓
  * Index 5: quiz REQUIRED ✓
  * RESULT: Quizzes at [0, 1, 2, 3, 4, 5] = ALL 6 paragraphs have quizzes
  *
  * ❌ WRONG: Quizzes only at [0, 2, 4] - missing quizzes at indices 1, 3, 5
  * ❌ WRONG: Quizzes only at [0, 3, 6] - missing quizzes at other indices
  * ✅ CORRECT: Quiz at EVERY index [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...]
  *
  * Each quiz must have:
  * - "question": A question testing understanding of that specific paragraph's content
  * - "options": Exactly 5 options as array ["Option A", "Option B", "Option C", "Option D", "Option E"]
  * - "answer": The correct option text (must match one of the options exactly)
- IMAGE GENERATION PATTERN (MANDATORY - USE EXACT MATHEMATICAL FORMULA):
  * 🔢 MATHEMATICAL RULE: For paragraph at index i, set imagePrompt IF AND ONLY IF (i % 3 === 0)
  * This means: i modulo 3 equals zero → imagePrompt REQUIRED, otherwise → imagePrompt = null
  *
  * ⚠️ STEP-BY-STEP ALGORITHM YOU MUST FOLLOW:
  * 1. Count total paragraphs you will generate (let's call it N)
  * 2. For each paragraph index i from 0 to N-1:
  *    - Calculate: remainder = i % 3
  *    - If remainder equals 0: SET imagePrompt to detailed description
  *    - If remainder equals 1 or 2: SET imagePrompt to null
  *
  * 📋 COMPLETE EXAMPLE FOR 15 PARAGRAPHS:
  * Index 0:  0 % 3 = 0 → imagePrompt = "detailed..." ✓
  * Index 1:  1 % 3 = 1 → imagePrompt = null
  * Index 2:  2 % 3 = 2 → imagePrompt = null
  * Index 3:  3 % 3 = 0 → imagePrompt = "detailed..." ✓
  * Index 4:  4 % 3 = 1 → imagePrompt = null
  * Index 5:  5 % 3 = 2 → imagePrompt = null
  * Index 6:  6 % 3 = 0 → imagePrompt = "detailed..." ✓
  * Index 7:  7 % 3 = 1 → imagePrompt = null
  * Index 8:  8 % 3 = 2 → imagePrompt = null
  * Index 9:  9 % 3 = 0 → imagePrompt = "detailed..." ✓
  * Index 10: 10 % 3 = 1 → imagePrompt = null
  * Index 11: 11 % 3 = 2 → imagePrompt = null
  * Index 12: 12 % 3 = 0 → imagePrompt = "detailed..." ✓
  * Index 13: 13 % 3 = 1 → imagePrompt = null
  * Index 14: 14 % 3 = 2 → imagePrompt = null
  * RESULT: Images at [0, 3, 6, 9, 12] = EXACTLY 5 images
  *
  * ❌ WRONG: [0, 3, 5, 7, 9, 11, 13, 14] - random indices
  * ✅ CORRECT: [0, 3, 6, 9, 12] - only multiples of 3
- Escape all quotes inside strings with backslash
- NO newlines inside string values

EDUCATIONAL COVERAGE (MANDATORY):
- Teach EVERY SINGLE fact from the source - dates, names, formulas, concepts, EVERYTHING
- Students will be tested on this tomorrow - missing ANY information is unacceptable
- Use memory techniques: associate dates/names with vivid story moments
- Create emotional connections to facts so they stick in memory
- Repeat key information through different story contexts

PLOT & ENTERTAINMENT (EQUALLY MANDATORY):
- This is a REAL story with plot, not just facts in costume
- Create an actual narrative arc: setup → conflict → climax → resolution
- Match the universe's tone: comedy if it's comedy, horror if it's horror, adventure if it's adventure
- Use universe-specific locations, technologies, and signature moments
- Make readers care about WHAT HAPPENS NEXT, not just what they'll learn next
- Characters should face real challenges and grow

CHARACTER & DIALOGUE:
- DO NOT describe physical appearances (readers know what they look like)
- USE character-specific voices, catchphrases, and mannerisms
- Characters should react authentically to events
- Let characters discover and debate the educational content naturally

LANGUAGE MATCH: Story, paragraphs, and quizzes MUST be in the SAME language as source content

CRITICAL RULES FOR IMAGE PROMPTS:
- ⚠️ MANDATORY: Generate imagePrompt for EVERY paragraph where (index % 3 === 0)
- Pattern MUST be: Index 0=IMAGE, 1=null, 2=null, 3=IMAGE, 4=null, 5=null, 6=IMAGE, 7=null, 8=null, 9=IMAGE...
- DO NOT SKIP indices 3, 6, 9, 12, 15, 18... - they ALL need imagePrompts!
- If you generate 14 paragraphs, you MUST have imagePrompts at indices [0, 3, 6, 9, 12] = 5 images

CHARACTER DESCRIPTION (MANDATORY - EXTREME DETAIL):
- ⚠️ CRITICAL: In EVERY imagePrompt, describe main characters in COMPLETE DETAIL:
  * FACE: Eye color, eye shape, facial hair, skin tone, facial expression, distinctive features (scars, marks, etc.)
  * HAIR: Color, style, length, texture (e.g., "messy black hair", "wild gray spiky hair", "long blonde braided hair")
  * CLOTHING: Complete outfit description - shirt/jacket color and style, pants/skirt color and style, shoes, accessories
  * BODY TYPE: Height, build (if relevant to character recognition)
  * ACCESSORIES: Glasses, jewelry, weapons, tools, signature items
- Examples of COMPLETE character descriptions:
  * Rick and Morty: "Rick Sanchez, tall elderly man with wild gray spiky hair, blue eyes, wrinkled face, white lab coat stained with unknown substances, blue pants, black shoes, brown belt, holding his portal gun"
  * Harry Potter: "Harry Potter, teenage boy with messy black hair, bright green eyes, round glasses, lightning bolt scar on forehead, pale skin, Gryffindor red and gold robes, black pants, holding wooden wand"
  * Regular Show: "Mordecai, tall blue jay bird with bright blue feathers on head and body, white chest feathers, black tail feathers, orange beak, wearing white button-up shirt, blue jeans"
- ⚠️ IMPORTANT: Always describe the MAIN character(s) first, then the scene

SCENE COMPLEXITY RULES (MANDATORY):
- ⚠️ AVOID COMPLEX SCENES: Keep scenes SIMPLE and FOCUSED
  * Focus on 1-2 main characters maximum
  * Avoid crowded scenes with many characters
  * Avoid complex multi-layered backgrounds
  * Avoid scenes with too many objects or details competing for attention
- ⚠️ CHARACTER COUNT LIMIT:
  * MAXIMUM 2 characters per scene
  * If story involves multiple characters, focus on the main protagonist(s)
  * Background characters should be minimal or blurred
- ⚠️ SCENE SIMPLICITY:
  * Choose clear, single-focus moments from the story
  * Avoid busy action scenes with multiple things happening
  * Prefer character-focused moments over complex action sequences
  * Simple backgrounds that don't distract from characters

ART STYLE (MANDATORY):
- ALWAYS specify the art style matching the universe:
  * Rick and Morty: "2D animated art style from Rick and Morty show"
  * Harry Potter: "Realistic cinematic style, live-action movie quality"
  * Regular Show: "2D cartoon animation style from Regular Show"
  * Avatar The Last Airbender: "2D animated art style from Avatar series"
  * Star Wars: "Realistic sci-fi cinematic style"
- Always end with: "high quality, detailed, [art style of universe]"

SCENE COMPOSITION:
- Make scenes FUN, DYNAMIC, and directly related to the story moment
- Include environment details, lighting, mood, and action
- Focus on character expressions and body language
- Keep composition simple: main character(s) in foreground, simple background`;

    const userPrompt = `You are creating an episode of ${universe} that teaches this content:

${processedLessonText}

YOUR MISSION:
${testMode ?
  'TEST MODE: Create a SHORT story with EXACTLY 1 paragraph, 1 image prompt, and 1 quiz. Cover the main concept from the content above in an engaging way.' :
  'Create a story that feels like an AUTHENTIC ${universe} episode while teaching EVERY SINGLE piece of information above. Students have an exam tomorrow - they need to learn it ALL.'
}

🎬 PLOT STRUCTURE - REAL STORY FLOW:
1. Opening: Set up the situation in classic ${universe} style
2. Inciting Incident: Something happens that kicks off the adventure/conflict
3. Rising Action: Characters face obstacles while discovering the educational content
4. Climax: The most intense moment where plot and learning converge
5. Resolution: How everything wraps up (with all facts learned!)

⚠️ CRITICAL - NATURAL STORY FLOW:
- This is a REAL STORY with actual events happening, NOT a classroom lecture in costume
- Characters should NOT sit around explaining facts to each other constantly
- Learning happens through ACTION, DISCOVERY, PROBLEM-SOLVING, and experiencing events
- Example: Instead of "Rick explained to Morty about photosynthesis...", show them encountering a plant-based alien crisis where understanding photosynthesis becomes crucial to survival
- The story FLOWS naturally - events happen, characters react, and learning emerges organically from the plot

📊 PACING - AVOID INFORMATION OVERLOAD:
- DO NOT dump all facts at once or in rapid succession - this is boring and ineffective
- SPREAD information throughout the narrative naturally
- If needed, make the story LONGER (12-15 paragraphs) to properly distribute information
- Give readers breathing room between concepts with action, character moments, or plot developments
- Each fact should have its moment to shine within the story context

🧠 MEMORY TECHNIQUES (use subtly):
- Associate dates/names with VIVID, EMOTIONAL story moments
- Create surprising connections (e.g., "The year 1453? That's how many times Rigby hit the snooze button before...")
- Use repetition through different contexts (characters debate it, recall it, apply it)
- Make abstract concepts CONCRETE (turn a formula into a physical object or action)

🎭 UNIVERSE AUTHENTICITY:
- ${universe} locations, technology, signature elements
- Match the TONE: If it's comedy, make it FUNNY. If it's horror, make it SCARY. If it's adventure, make it THRILLING.
- Character voices: Use their catchphrases, speech patterns, personality quirks
- This should feel like watching/reading an actual ${universe} episode

📚 EDUCATIONAL COVERAGE:
- Include EVERY fact, date, name, formula, concept from the source
- Nothing can be skipped - it's all testable material
- Integrate naturally through ACTION and EVENTS, not constant dialogue exposition
- Make facts memorable through story context
- Better to have a longer, well-paced story than a short, cramped one

✨ ENTERTAINMENT VALUE:
- Readers should be DESPERATE to know what happens next
- Create real stakes, conflict, tension
- End each paragraph with a hook or cliffhanger
- Balance "What will they learn?" with "What will happen?!"
- SHOW the story unfolding, don't just TELL facts

TECHNICAL REQUIREMENTS:
- Output ONLY valid JSON with these REQUIRED fields:
  * "title": Short catchy title for the educational topic (e.g., 'The Fall of Constantinople', 'DNA Replication')
  * "learningOutcomes": Array of 3-5 key learning outcomes (brief bullet points)
  * "story": Array of paragraph objects
${testMode ?
  '- TEST MODE: EXACTLY 1 paragraph (6-8 sentences), 1 imagePrompt at paragraph 0, 1 quiz' :
  '- FLEXIBLE paragraph count: Generate 3-21 paragraphs based on content complexity and lesson length\n  * MINIMUM 3 paragraphs for very short sources\n  * MAXIMUM 21 paragraphs for very long/complex sources\n- IMAGE PATTERN RULE (MANDATORY - USE MATHEMATICAL FORMULA):\n  * 🔢 FORMULA: imagePrompt is required IF AND ONLY IF (index % 3 === 0)\n  * ALGORITHM:\n    1. Determine N = total number of paragraphs\n    2. For each paragraph i from 0 to N-1:\n       - If (i % 3 === 0): imagePrompt = "detailed description"\n       - Otherwise: imagePrompt = null\n  *\n  * VERIFICATION - For 15 paragraphs, check EVERY index:\n    Index 0:  0%3=0 ✓ imagePrompt | Index 1:  1%3=1 ✗ null | Index 2:  2%3=2 ✗ null\n    Index 3:  3%3=0 ✓ imagePrompt | Index 4:  4%3=1 ✗ null | Index 5:  5%3=2 ✗ null\n    Index 6:  6%3=0 ✓ imagePrompt | Index 7:  7%3=1 ✗ null | Index 8:  8%3=2 ✗ null\n    Index 9:  9%3=0 ✓ imagePrompt | Index 10: 10%3=1 ✗ null | Index 11: 11%3=2 ✗ null\n    Index 12: 12%3=0 ✓ imagePrompt | Index 13: 13%3=1 ✗ null | Index 14: 14%3=2 ✗ null\n    RESULT: [0, 3, 6, 9, 12] ONLY - EXACTLY 5 images\n  *\n  * ❌ WRONG: [0, 3, 5, 7, 9, 11, 13, 14] - does NOT follow (i%3===0)\n  * ✅ CORRECT: [0, 3, 6, 9, 12] - ONLY indices where (i%3===0)'
}
- QUIZ PATTERN (MANDATORY - ABSOLUTELY CRITICAL - NO EXCEPTIONS):
  * 🔢 MATHEMATICAL RULE: For paragraph at index i, quiz is REQUIRED FOR EVERY SINGLE INDEX
  * ⚠️ CRITICAL RULE: EVERY SINGLE paragraph MUST include a quiz object - NO EXCEPTIONS
  * 
  * STEP-BY-STEP ALGORITHM YOU MUST FOLLOW:
  * 1. Count total paragraphs you will generate (let's call it N)
  * 2. For each paragraph index i from 0 to N-1:
  *    - ALWAYS include a quiz object with question, options, and answer
  *    - NO EXCEPTIONS - every single paragraph gets a quiz
  *
  * COMPLETE EXAMPLE FOR 6 PARAGRAPHS:
  * Index 0: quiz REQUIRED ✓ | Index 1: quiz REQUIRED ✓ | Index 2: quiz REQUIRED ✓
  * Index 3: quiz REQUIRED ✓ | Index 4: quiz REQUIRED ✓ | Index 5: quiz REQUIRED ✓
  * RESULT: Quizzes at [0, 1, 2, 3, 4, 5] = ALL 6 paragraphs have quizzes
  *
  * ❌ WRONG: Quizzes only at [0, 2, 4] - missing quizzes at indices 1, 3, 5
  * ❌ WRONG: Quizzes only at [0, 3, 6] - missing quizzes at other indices  
  * ❌ WRONG: Quizzes at [0, 1, 3, 4, 6, 7] - missing quiz at index 2
  * ✅ CORRECT: Quiz at EVERY index [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, ...]
  *
  * Quiz requirements:
  * - "question": A question testing understanding of that specific paragraph's content
  * - "options": Exactly 5 options as array ["Option A", "Option B", "Option C", "Option D", "Option E"]
  * - "answer": The correct option text (must match one of the options exactly, case-sensitive)
  * 
  * REMEMBER: If you generate 10 paragraphs, you MUST have 10 quizzes (one for each paragraph)
- Write in the SAME LANGUAGE as the source content

Make them learn EVERYTHING while having the time of their lives!`;

    console.log('🤖 Sending request to OpenRouter...');

    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 16000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Lorey - Educational Story Generator'
        },
        timeout: 300000 // 5 minute timeout
      }
    );

    console.log('📦 Response received from OpenRouter');
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.error('❌ Invalid response structure from OpenRouter');
      console.error('Full response:', response.data);
      throw new Error('Invalid response from OpenRouter API');
    }

    const content = response.data.choices[0].message.content;

    // Try to extract JSON if it's wrapped in markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/, '').replace(/```$/, '').trim();
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/, '').replace(/```$/, '').trim();
    }

    // Try to fix common JSON issues
    // Remove any text before the first {
    const firstBrace = jsonContent.indexOf('{');
    if (firstBrace > 0) {
      jsonContent = jsonContent.substring(firstBrace);
    }

    // Remove any text after the last }
    const lastBrace = jsonContent.lastIndexOf('}');
    if (lastBrace > 0 && lastBrace < jsonContent.length - 1) {
      jsonContent = jsonContent.substring(0, lastBrace + 1);
    }

    console.log('📄 Parsing JSON response...');
    let storyData;
    try {
      storyData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.log('📝 First 500 chars of response:', jsonContent.substring(0, 500));
      console.log('📝 Last 500 chars of response:', jsonContent.substring(jsonContent.length - 500));
      throw new Error('Invalid JSON response from AI: ' + parseError.message);
    }

    console.log('✅ Story generated successfully!');

    // Enforce image prompt pattern (indices 0,3,6,9,...)
    const imagePatternResult = enforceImagePromptPattern(storyData.story, universe);
    console.log('🛠 Image pattern enforcement result:', imagePatternResult);

    // Enforce quiz pattern (every paragraph must have a quiz)
    const quizPatternResult = enforceQuizPattern(storyData.story);
    console.log('🛠 Quiz pattern enforcement result:', quizPatternResult);

    console.log('📊 Story Structure:');
    console.log('  - Title:', storyData.title || '❌ MISSING TITLE');
    console.log('  - Learning Outcomes:', storyData.learningOutcomes?.length || 0, 'outcomes');
    console.log('  - Total Paragraphs:', storyData.story?.length || 0);

    // Log which paragraphs have image prompts
    const paragraphsWithImages = [];
    const paragraphsWithoutImages = [];
    storyData.story?.forEach((p, idx) => {
      if (p.imagePrompt && p.imagePrompt !== null) {
        paragraphsWithImages.push(idx);
      } else {
        paragraphsWithoutImages.push(idx);
      }
    });
    console.log('  - Paragraphs WITH imagePrompt:', paragraphsWithImages.join(', '));
    console.log('  - Expected pattern for', storyData.story?.length, 'paragraphs:',
      Array.from({ length: Math.ceil((storyData.story?.length || 0) / 3) }, (_, i) => i * 3).join(', ')
    );

    // Log which paragraphs have quizzes
    const paragraphsWithQuizzes = [];
    const paragraphsWithoutQuizzes = [];
    storyData.story?.forEach((p, idx) => {
      if (p.quiz && typeof p.quiz === 'object' && p.quiz.question) {
        paragraphsWithQuizzes.push(idx);
      } else {
        paragraphsWithoutQuizzes.push(idx);
      }
    });
    console.log('  - Paragraphs WITH quiz:', paragraphsWithQuizzes.length, 'out of', storyData.story?.length || 0);
    if (paragraphsWithoutQuizzes.length > 0) {
      console.warn('  ⚠️ Paragraphs WITHOUT quiz:', paragraphsWithoutQuizzes.join(', '));
    }

    const expectedImageCount = Math.ceil((storyData.story?.length || 0) / 3);
    const expectedIndices = Array.from({ length: expectedImageCount }, (_, i) => i * 3);

    if (paragraphsWithImages.length !== expectedImageCount) {
      console.log('⚠️  WARNING: Image count mismatch after enforcement!');
      console.log('  - Expected:', expectedImageCount, 'images');
      console.log('  - Got:', paragraphsWithImages.length, 'images');
      console.log('  - Expected indices:', expectedIndices.join(', '));
      console.log('  - Actual indices:', paragraphsWithImages.join(', '));
    }

    res.json(storyData);
  } catch (error) {
    console.error('❌ Story generation error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate story',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

function enforceImagePromptPattern(story, universe) {
  if (!Array.isArray(story) || story.length === 0) {
    return {
      expectedIndices: [],
      assignedFromOriginal: 0,
      reassigned: 0,
      generatedFallbacks: 0,
      discardedExtraPrompts: 0,
    };
  }

  const expectedIndices = [];
  for (let i = 0; i < story.length; i += 3) {
    expectedIndices.push(i);
  }

  const availablePrompts = [];

  story.forEach((paragraph, idx) => {
    if (paragraph && paragraph.imagePrompt && paragraph.imagePrompt !== null) {
      availablePrompts.push({
        prompt: paragraph.imagePrompt,
        sourceIndex: idx,
      });
    }
    if (paragraph) {
      paragraph.imagePrompt = null;
    }
  });

  const summary = {
    expectedIndices,
    assignedFromOriginal: 0,
    reassigned: 0,
    generatedFallbacks: 0,
    discardedExtraPrompts: 0,
  };

  const getFallbackPrompt = (paragraph, idx) => {
    const paragraphText = paragraph?.paragraph || '';
    const trimmed = paragraphText.length > 300 ? `${paragraphText.slice(0, 300)}...` : paragraphText;
    const universeLabel = universe || 'this story';
    if (trimmed) {
      return `Simple scene from ${universeLabel} showing 1-2 main characters in a focused moment. Character details: face, hair, clothing described clearly. Simple background. High quality, detailed, ${universeLabel} art style.`;
    }
    return `Simple scene from ${universeLabel} showing 1-2 main characters. Character details: face, hair, clothing described clearly. Simple background. High quality, detailed, ${universeLabel} art style.`;
  };

  expectedIndices.forEach((idx) => {
    const paragraph = story[idx];
    if (!paragraph) {
      return;
    }

    // Prefer prompts that already belong to this index
    const sameIndexIdx = availablePrompts.findIndex((item) => item.sourceIndex === idx);
    if (sameIndexIdx !== -1) {
      paragraph.imagePrompt = availablePrompts[sameIndexIdx].prompt;
      availablePrompts.splice(sameIndexIdx, 1);
      summary.assignedFromOriginal += 1;
      return;
    }

    // Otherwise borrow from the pool
    if (availablePrompts.length > 0) {
      const item = availablePrompts.shift();
      paragraph.imagePrompt = item.prompt;
      summary.reassigned += 1;
      return;
    }

    // As a last resort, generate a fallback prompt from the paragraph content
    paragraph.imagePrompt = getFallbackPrompt(paragraph, idx);
    summary.generatedFallbacks += 1;
  });

  summary.discardedExtraPrompts = availablePrompts.length;
  return summary;
}

// Helper function to enforce quiz pattern - every paragraph must have a quiz
function enforceQuizPattern(story) {
  if (!Array.isArray(story) || story.length === 0) {
    return {
      totalParagraphs: 0,
      quizzesFound: 0,
      quizzesAdded: 0,
      quizzesFixed: 0,
    };
  }

  const summary = {
    totalParagraphs: story.length,
    quizzesFound: 0,
    quizzesAdded: 0,
    quizzesFixed: 0,
  };

  story.forEach((paragraph, idx) => {
    if (!paragraph) {
      return;
    }

    // Check if quiz exists and is valid
    if (paragraph.quiz && typeof paragraph.quiz === 'object') {
      summary.quizzesFound += 1;

      // Validate quiz structure
      const quiz = paragraph.quiz;
      const needsFix = !quiz.question || 
                       !Array.isArray(quiz.options) || 
                       quiz.options.length !== 5 ||
                       !quiz.answer ||
                       !quiz.options.includes(quiz.answer);

      if (needsFix) {
        // Fix invalid quiz
        const paragraphText = paragraph.paragraph || '';
        const firstSentence = paragraphText.split(/[.!?]/)[0] || paragraphText.substring(0, 100);
        
        paragraph.quiz = {
          question: quiz.question || `What is the main concept discussed in this paragraph?`,
          options: Array.isArray(quiz.options) && quiz.options.length === 5 
            ? quiz.options 
            : ["Option A", "Option B", "Option C", "Option D", "Option E"],
          answer: quiz.options && quiz.options.includes(quiz.answer) 
            ? quiz.answer 
            : (quiz.options && quiz.options[0] ? quiz.options[0] : "Option A")
        };
        summary.quizzesFixed += 1;
        console.warn(`⚠️ Fixed invalid quiz at paragraph ${idx}`);
      }
    } else {
      // Quiz is missing - generate a fallback quiz
      const paragraphText = paragraph.paragraph || '';
      const firstSentence = paragraphText.split(/[.!?]/)[0] || paragraphText.substring(0, 100);
      
      paragraph.quiz = {
        question: `What is the main concept or key point discussed in this paragraph?`,
        options: ["Option A", "Option B", "Option C", "Option D", "Option E"],
        answer: "Option A"
      };
      summary.quizzesAdded += 1;
      console.warn(`⚠️ Missing quiz at paragraph ${idx}. Added fallback quiz.`);
    }
  });

  if (summary.quizzesAdded > 0 || summary.quizzesFixed > 0) {
    console.log(`📝 Quiz enforcement: Found ${summary.quizzesFound}, Added ${summary.quizzesAdded}, Fixed ${summary.quizzesFixed}`);
  }

  return summary;
}

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
  // Size is handled by API generation_config, prompt only describes the visual content
  const enhancedPrompt = `${prompt}, ${artStyle}, fun and dynamic scene, high quality, detailed.`;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Attempt ${attempt}/${maxRetries}: Sending image request to OpenRouter (Gemini Flash Image)...`);
      console.log('Universe:', universe);
      console.log('Art Style:', artStyle);
      console.log('Full Prompt:', enhancedPrompt);
      
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
      
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

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

      console.log(`📦 Image response received (attempt ${attempt}/${maxRetries})`);
      console.log('Full response:', JSON.stringify(response.data, null, 2));

      // Extract image from response
      const choice = response.data?.choices?.[0];
      const message = choice?.message;

      if (!message) {
        console.error('No message in response');
        throw new Error('No message in response');
      }

      console.log('Message structure:', JSON.stringify(message, null, 2));
      console.log('Choice structure:', JSON.stringify(choice, null, 2));

      // Check if finish_reason indicates image was generated
      const finishReason = choice?.finish_reason;
      const nativeFinishReason = choice?.native_finish_reason;
      
      console.log('Finish reason:', finishReason);
      console.log('Native finish reason:', nativeFinishReason);

      // Check for message.images array first (Gemini's actual response format)
      if (message.images && Array.isArray(message.images)) {
        for (const part of message.images) {
          // Check for image_url format
          if (part.image_url) {
            const imageUrl = part.image_url.url;
            console.log('✅ Image generated successfully (from message.images)');
            console.log('Image URL prefix:', imageUrl.substring(0, 50) + '...');
            return imageUrl;
          }

          // Check for inline_data (base64 image)
          if (part.inline_data) {
            const base64Data = part.inline_data.data;
            const mimeType = part.inline_data.mime_type || 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log('✅ Image generated successfully (from message.images base64)');
            console.log('Image URL prefix:', dataUrl.substring(0, 50) + '...');
            return dataUrl;
          }
        }
      }

      // Check response.data for images (OpenRouter might put it here)
      if (response.data.images && Array.isArray(response.data.images)) {
        for (const img of response.data.images) {
          if (img.url) {
            console.log('✅ Image generated successfully (from response.data.images)');
            return img.url;
          }
        }
      }

      // Fallback: Gemini returns content as an array with parts
      if (message.content && Array.isArray(message.content)) {
        for (const part of message.content) {
          // Check for inline_data (base64 image)
          if (part.inline_data) {
            const base64Data = part.inline_data.data;
            const mimeType = part.inline_data.mime_type || 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log('✅ Image generated successfully (inline_data base64)');
            console.log('Image URL prefix:', dataUrl.substring(0, 50) + '...');
            return dataUrl;
          }

          // Check for image_url format
          if (part.image_url) {
            const imageUrl = part.image_url.url;
            console.log('✅ Image generated successfully (image_url)');
            console.log('Image URL:', imageUrl.substring(0, 50) + '...');
            return imageUrl;
          }

          // Check for type: "image" parts
          if (part.type === 'image' && part.data) {
            const dataUrl = `data:image/png;base64,${part.data}`;
            console.log('✅ Image generated successfully (type: image)');
            return dataUrl;
          }
        }
      }

      // Check if native_finish_reason indicates image was generated but format is different
      if (nativeFinishReason === 'IMAGE_OTHER' || nativeFinishReason === 'IMAGE') {
        console.warn('⚠️ Image was generated (IMAGE_OTHER) but not found in expected format');
        console.log('⚠️ This might be an OpenRouter format issue. Checking alternative locations...');
        
        // Check entire response structure for any image data
        const responseString = JSON.stringify(response.data);
        const base64Match = responseString.match(/"data:image\/[^"]+;base64,([^"]+)"/);
        if (base64Match) {
          const imageUrl = base64Match[0].replace(/"/g, '');
          console.log('✅ Found image in response string (base64 match)');
          return imageUrl;
        }
        
        // If image was generated but not returned, throw error to trigger retry
        throw new Error('Image was generated by Gemini (IMAGE_OTHER) but OpenRouter did not return it in the response. Retrying...');
      }

      // Fallback: check if content is a string with base64
      if (typeof message.content === 'string') {
        // Check if it's already a data URL
        if (message.content.startsWith('data:image')) {
          console.log('✅ Image generated successfully (data URL string)');
          return message.content;
        }

        console.warn('⚠️ Got text content instead of image');
        console.error('❌ No image found in response, got text instead');
        throw new Error('Model returned text instead of image. Response: ' + message.content.substring(0, 200));
      }

      throw new Error('No image or content in response');

    } catch (error) {
      lastError = error;
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`❌ Image generation attempt ${attempt}/${maxRetries} failed:`, errorMessage);

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying (exponential backoff: 2s, 4s, 8s)
      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Failed to generate image after all retries');
}

// Generate image for a paragraph using Google Gemini
router.post('/image', async (req, res) => {
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
});

// Regenerate quiz for a specific concept
router.post('/quiz', async (req, res) => {
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
});

module.exports = router;
