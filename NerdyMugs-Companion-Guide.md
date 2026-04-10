# 🖖☕ NerdyMugs Companion Guide
## Your Step-by-Step Guide to Running the Ultimate Coffee Mug Content Machine

*Written for high schoolers, nerds, and anyone who wants to automate their way to affiliate marketing glory*

---

## What Even Is This Thing?

**NerdyMugs** is a content machine that:
1. **Finds** cool nerdy coffee mugs on Amazon
2. **Writes** witty blog posts about them (automatically!)
3. **Publishes** them to your website
4. **Makes you money** when people buy through your links

Think of it like having a robot intern who never sleeps, never asks for a raise, and actually knows the difference between Star Trek and Star Wars.

---

## 📋 What You Need Before Starting

### The Essentials (Can't Skip These)
- [ ] A computer (Windows, Mac, or Linux)
- [ ] Node.js installed (we'll show you how)
- [ ] A code editor (VS Code is free and awesome)
- [ ] Internet connection (duh)

### The "Nice to Have" Stuff (For Going Live)
- [ ] Amazon Associates account (free)
- [ ] Amazon Product API access (also free)
- [ ] Vercel account (free tier)
- [ ] Supabase account (free tier)
- [ ] Your old WordPress export (if migrating)

---

## Part 1: Installing the Stuff You Need

### Step 1: Install Node.js

**What is it?** Node.js lets you run JavaScript on your computer (not just in the browser).

**How to install:**

1. Go to [nodejs.org](https://nodejs.org)
2. Click the big green "LTS" button (LTS = Long Term Support = stable)
3. Download and run the installer
4. Click "Next" a bunch of times until it's done

**Verify it worked:**
Open your terminal/command prompt and type:
```bash
node --version
```

You should see something like `v20.11.0`. If you do, you're golden! 🎉

---

### Step 2: Install a Code Editor

**We recommend VS Code** (it's what the pros use and it's FREE).

1. Go to [code.visualstudio.com](https://code.visualstudio.com)
2. Download for your operating system
3. Install it
4. Optional: Install these extensions (they're like apps for your editor):
   - "ES7+ React/Redux/React-Native snippets"
   - "Prettier - Code: formatter"
   - "Tailwind CSS IntelliSense"

---

### Step 3: Get the NerdyMugs Code

You should have a ZIP file called `NerdyMugs.zip`. 

**Extract it:**
- **Windows:** Right-click → "Extract All"
- **Mac:** Double-click the ZIP
- **Linux:** You probably already know how 😎

Move the extracted folder somewhere you'll remember (like your Documents folder).

---

## Part 2: Running NerdyMugs Locally

### Step 4: Open the Project

1. Open VS Code
2. Click "File" → "Open Folder"
3. Navigate to your `NerdyMugs` folder and select it
4. You should see a bunch of files on the left side

**Important files to know:**
- `src/config/nerdyMugs.ts` - The "brain" of your site (categories, voice, etc.)
- `src/App.tsx` - The main page
- `src/components/` - All the UI pieces
- `package.json` - Lists what your app needs to run

---

### Step 5: Install Dependencies

Dependencies = other people's code that your app needs to work.

1. In VS Code, press `` Ctrl + ` `` (that's the backtick key, usually under Esc)
2. This opens a terminal at the bottom
3. Make sure you're in the right folder (you should see something like `~/NerdyMugs$`)
4. Type this command and press Enter:

```bash
npm install
```

**What does this do?** It downloads all the code libraries your app needs. This might take a few minutes. Go grab a snack! 🍿

When it's done, you'll see a `node_modules` folder (this is all the downloaded stuff).

---

### Step 6: Start the App!

In that same terminal, type:

```bash
npm run dev
```

You should see something like:
```
  VITE v5.0.0  ready in 247 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Open your browser** and go to: `http://localhost:5173/`

🎉 **YOU DID IT!** You should see the NerdyMugs site running!

---

## Part 3: Using NerdyMugs

### The Public Site (What Visitors See)

When you open the site, you'll see:

1. **Navigation Bar** - Logo + category filters + Admin button
2. **Filter Bar** - Tags to filter posts
3. **Masonry Grid** - All your posts (photos + titles + captions)
4. **Click a Post** - Opens the full article with affiliate link

**Try it out:**
- Click "Star Trek" to filter only Trek mugs
- Click a post to see the full write-up
- Click "Check price on Amazon" to see the affiliate link in action

---

### The Admin Panel (Your Control Center)

Click the **"Admin"** button (gear icon) in the top right.

#### Tab 1: Site & Schedule

**Site Config:**
- **Site Name:** What shows in the header
- **Tagline:** The subtitle under your logo
- **Amazon Affiliate ID:** Your tracking code (probably `georgwebsi-20`)

**Schedule Config:**
- **Posts Per Day:** How many posts to auto-create (default: 3)
- **Quiet Days:** Days when NO posts are created (default: Sunday)

**Make changes → Click "Save"**

---

#### Tab 2: Categories

This is where you control what kinds of mugs get featured.

**Default categories:**
- Star Trek (weight: 3)
- Star Wars (weight: 3)
- Retro Gaming (weight: 2)
- Marvel (weight: 2)

**What does "weight" mean?**
Higher weight = that category shows up MORE often.
- Weight 3 = "I want lots of these"
- Weight 1 = "Occasionally throw one in"

**To add a new category:**
1. Type a name (like "Doctor Who")
2. Set a weight (1-5)
3. Add tags (comma separated: "tardis, dalek, time-lord")
4. Click "Add Category"

**To edit a category:**
- Click "Active/Inactive" to turn it on/off
- Click the trash can to delete it

---

#### Tab 3: Automation

This is where the MAGIC happens! ✨

**Stats:**
- Mugs: How many products in your database
- Posts: How many blog posts published
- Clicks: How many people clicked your affiliate links

**"Run Discovery Now" Button:**
Click this to manually create new posts. The app will:
1. Pick a category (based on weights)
2. Search Amazon for mugs
3. Write a witty post about one
4. Add it to your site

**Recent Activity:**
Shows a log of everything the app has done.

---

#### Tab 4: Import (The Cool Part!)

**Importing from WordPress:**

If you have an old WordPress site with posts, you can import them!

1. In WordPress, go to **Tools → Export → All Content**
2. Download the `.xml` file
3. In NerdyMugs Admin, go to the **Import** tab
4. Drag and drop your XML file (or click to browse)
5. The app will:
   - Read all your old posts
   - Extract Amazon links, images, and prices
   - Create new posts in NerdyMugs format
   - Generate 301 redirects (so old URLs don't break)

**After import, you'll get:**
- A count of imported posts
- Download buttons for redirect files
- Your old posts now live in the new system!

---

## Part 4: Customizing Your Content

### Changing the "Voice"

Open `src/config/nerdyMugs.ts` in VS Code.

**Find this section:**
```typescript
export const voiceConfig = {
  tone: ["witty", "clever", "warm", "nerdy"],
  never: ["generic", "salesy", "cringe", "basic", "bland"],
  sampleLines: [
    "Spock would call this mug 'fascinating.' We call it Tuesday.",
    "This mug has more force than Anakin's midichlorian count.",
  ],
};
```

**Change it to whatever you want!**
- Want more sarcastic? Add "sarcastic" to tone
- Want to ban certain words? Add them to "never"
- Want different sample lines? Replace them!

---

### Adding Your Own Trivia

Still in `nerdyMugs.ts`, find:
```typescript
export const triviaDatabase: Record<string, string[]> = {
  "Star Trek": [
    "Leonard Nimoy originally didn't want to play Spock...",
    // ... more facts
  ],
};
```

**Add your own trivia:**
```typescript
"Star Trek": [
  "YOUR COOL FACT HERE",
  "ANOTHER COOL FACT",
  // ...
],
```

These facts get randomly inserted into posts!

---

## Part 5: Going Live (The Real Deal)

### Option A: Quick Demo Mode (No Amazon API)

Your app already works! It uses "simulated" products (placeholder images and fake data). Great for testing, not great for making money.

### Option B: Full Production Mode (With Amazon API)

To get REAL products with REAL images and REAL affiliate links:

#### Step 1: Get Amazon API Keys

1. Log into your [Amazon Associates](https://affiliate-program.amazon.com) account
2. Go to **Product Advertising API**
3. Create new credentials
4. You'll get:
   - **Access Key** (starts with `AKIA...`)
   - **Secret Key** (long random string)

#### Step 2: Create Environment File

In your project folder, create a file named `.env`:

```bash
VITE_AMAZON_ACCESS_KEY=your-access-key-here
VITE_AMAZON_SECRET_KEY=your-secret-key-here
VITE_AMAZON_ASSOCIATE_TAG=georgwebsi-20
```

**Replace** the placeholder values with your real keys!

#### Step 3: Restart the App

1. Stop the running app (press `Ctrl + C` in the terminal)
2. Start it again: `npm run dev`
3. Now when you click "Run Discovery Now", it searches REAL Amazon!

---

### Deploying to the Internet

When you're ready for the world to see your site:

#### Option 1: Vercel (Easiest)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign up (free)
4. Click "New Project"
5. Import your GitHub repo
6. Add your environment variables (the `.env` stuff)
7. Click Deploy

Your site will be live at `https://your-project.vercel.app`!

#### Option 2: Netlify (Also Easy)

Similar process to Vercel. Both are free for starter projects.

---

## Part 6: Troubleshooting

### Problem: "npm install" fails

**Try:**
```bash
npm cache clean --force
npm install
```

### Problem: "npm run dev" says port is in use

**Fix:** Kill the old process or use a different port:
```bash
npm run dev -- --port 3000
```

### Problem: Changes don't show up

**Fix:** Hard refresh your browser (Ctrl + Shift + R)

### Problem: Amazon API returns no products

**Check:**
1. Are your API keys correct?
2. Is your Associates account active?
3. Did you make a sale in the last 90 days? (Amazon requires this)

### Problem: Import says "0 imported"

**Check:**
1. Is your XML file valid?
2. Do your posts have Amazon links in them?
3. Try opening the XML in a text editor to verify it's not empty

---

## Part 7: Pro Tips

### Tip 1: The 3-Post Guarantee

Your app is set to create 3 posts per day. Here's how:
- Cron runs every 8 hours (8am, 4pm, midnight)
- Each run creates 1 post
- 3 runs × 1 post = 3 posts per day
- Sundays are "quiet days" (no posts)

### Tip 2: Category Weights Explained

Think of weights like lottery tickets:
- Star Trek (weight 3) = 3 tickets
- Marvel (weight 2) = 2 tickets
- Total tickets = 5
- Star Trek has 3/5 = 60% chance of being picked

### Tip 3: The Trivia Database

The more trivia facts you add, the more unique your posts become. Aim for 10-20 facts per category.

### Tip 4: Affiliate Links

Your affiliate tag (`georgwebsi-20`) gets automatically added to every Amazon link. When someone clicks and buys, you get a commission!

### Tip 5: SEO Magic

Each post gets:
- A unique URL (`/post/abc123`)
- Proper meta tags
- Fast loading (thanks to Vite)
- Mobile-friendly design

Google loves this stuff!

---

## Quick Reference Card

### Commands You'll Use

```bash
# Start the app
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new packages
npm install package-name
```

### File Locations

| What You Want | Where It Is |
|---------------|-------------|
| Change site name | `src/config/nerdyMugs.ts` → `siteConfig` |
| Change categories | `src/config/nerdyMugs.ts` → `categoriesConfig` |
| Change trivia | `src/config/nerdyMugs.ts` → `triviaDatabase` |
| Change colors | `src/index.css` |
| Add new pages | `src/App.tsx` |

### Environment Variables

| Variable | What It Does |
|----------|--------------|
| `VITE_AMAZON_ACCESS_KEY` | Your Amazon API access key |
| `VITE_AMAZON_SECRET_KEY` | Your Amazon API secret key |
| `VITE_AMAZON_ASSOCIATE_TAG` | Your affiliate tracking code |
| `VITE_SUPABASE_URL` | Database URL (for production) |
| `VITE_SUPABASE_ANON_KEY` | Database key (for production) |

---

## Glossary (Nerd-to-English)

| Term | What It Means |
|------|---------------|
| **API** | A way for apps to talk to each other |
| **ASIN** | Amazon's product ID (like a barcode) |
| **Affiliate** | You promote products, get paid when people buy |
| **Cron** | A scheduler that runs tasks automatically |
| **Deploy** | Put your website on the internet |
| **Dependency** | Code your app needs to work |
| **Environment Variable** | Secret settings (like passwords) |
| **Masonry** | A grid layout where items have different heights |
| **npm** | Node Package Manager (installs code libraries) |
| **Redirect** | Automatically send visitors from old URL to new URL |
| **Repository (repo)** | Your code stored on GitHub |
| **SDK** | Software Development Kit (tools to build apps) |
| **Terminal** | Command line (where you type scary commands) |
| **301** | Permanent redirect (tells Google "this moved forever") |

---

## You're Ready!

You now know everything you need to:
- ✅ Install and run NerdyMugs
- ✅ Customize your content
- ✅ Import old WordPress posts
- ✅ Connect to Amazon API
- ✅ Deploy to the internet
- ✅ Make money while you sleep

**Now go forth and automate!** 🚀

---

## Need Help?

- **Stuck on something?** Google the error message (seriously, it works)
- **Want to learn more?** Check out [freeCodeCamp](https://freecodecamp.org) for JavaScript/React tutorials
- **Curious about the code?** Read the comments in the source files!

**Live long and prosper!** 🖖☕

---

*Document Version: 1.0*
*Last Updated: 2024*
*Built with ❤️ for nerds everywhere*
