# CLINE One-Shot Prompt: Deploy NerdyMugs to Production

## 🎯 Mission
Deploy the NerdyMugs content machine to Vercel with full Amazon API integration, WordPress import, and automated scheduling.

## 📁 Project Structure (Already Extracted)
```
nerdymugs/
├── app/                          # Main React application
│   ├── src/
│   │   ├── config/nerdyMugs.ts   # Site config (edit this)
│   │   ├── lib/                  # Core logic
│   │   ├── components/           # UI components
│   │   └── ...
│   ├── package.json
│   └── ...
├── PRE_PRODUCTION_ASSETS/        # YOU HAVE THESE FILES
│   ├── wordpress-export.xml      # WP export (1.9MB)
│   └── credentials.csv           # Amazon API credentials
├── NerdyMugs-Companion-Guide.md  # User guide
└── PRODUCTION_PLAN.md            # Technical reference
```

## 🔐 Credentials File Format (credentials.csv)
The CSV should contain:
```csv
Access Key ID,Secret Access Key
AKIAxxxxxxxxxxxxxxxx,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ✅ STEP-BY-STEP EXECUTION PLAN

### PHASE 1: Environment Setup

**1.1 Read the credentials file**
```bash
cat PRE_PRODUCTION_ASSETS/credentials.csv
```
Extract:
- `VITE_AMAZON_ACCESS_KEY`
- `VITE_AMAZON_SECRET_KEY`
- `VITE_AMAZON_ASSOCIATE_TAG` (should be "georgwebsi-20")

**1.2 Create .env file in app/ directory**
Create `app/.env`:
```
VITE_AMAZON_ACCESS_KEY=AKIA...
VITE_AMAZON_SECRET_KEY=...
VITE_AMAZON_ASSOCIATE_TAG=georgwebsi-20
```

**1.3 Install dependencies**
```bash
cd app
npm install
```

**1.4 Test local build**
```bash
npm run build
```
Fix any TypeScript errors that appear.

---

### PHASE 2: WordPress Import

**2.1 Create import script**
Create `scripts/import-wp.js`:
```javascript
const fs = require('fs');
const xml2js = require('xml2js');

async function importWordPress() {
  const xml = fs.readFileSync('PRE_PRODUCTION_ASSETS/wordpress-export.xml', 'utf8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);
  
  const items = result.rss.channel[0].item || [];
  console.log(`Found ${items.length} posts to import`);
  
  // Filter only published posts
  const publishedPosts = items.filter(item => {
    const status = item['wp:status']?.[0];
    return status === 'publish';
  });
  
  console.log(`Found ${publishedPosts.length} published posts`);
  
  // Generate redirect map
  const redirects = [];
  
  for (const item of publishedPosts) {
    const title = item.title?.[0] || '';
    const link = item.link?.[0] || '';
    const content = item['content:encoded']?.[0] || '';
    const excerpt = item['excerpt:encoded']?.[0] || '';
    const pubDate = item.pubDate?.[0] || '';
    
    // Extract categories
    const categories = (item.category || [])
      .filter(cat => cat.$.domain === 'category')
      .map(cat => cat._);
    
    // Extract tags
    const tags = (item.category || [])
      .filter(cat => cat.$.domain === 'post_tag')
      .map(cat => cat._);
    
    // Extract Amazon link
    const amazonMatch = content.match(/https?:\/\/www\.amazon\.com\/[^\s"<>]+/);
    const amazonUrl = amazonMatch ? amazonMatch[0] : '';
    
    // Extract image
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
    const imageUrl = imgMatch ? imgMatch[1] : '';
    
    // Extract price
    const priceMatch = content.match(/\$[\d,]+(?:\.\d{2})?/);
    const price = priceMatch ? priceMatch[0] : '$19.99';
    
    // Map category
    const categoryMap = {
      'star-trek': 'Star Trek',
      'star trek': 'Star Trek',
      'star-wars': 'Star Wars',
      'star wars': 'Star Wars',
      'marvel': 'Marvel',
      'gaming': 'Retro Gaming',
      'retro-gaming': 'Retro Gaming',
    };
    
    let category = 'Star Trek';
    for (const cat of categories) {
      const mapped = categoryMap[cat.toLowerCase()];
      if (mapped) {
        category = mapped;
        break;
      }
    }
    
    // Generate new post ID
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create redirect
    const oldPath = new URL(link).pathname;
    redirects.push({
      source: oldPath,
      destination: `/post/${postId}`,
      permanent: true,
    });
    
    console.log(`Will import: ${title} → /post/${postId}`);
  }
  
  // Save redirects
  fs.writeFileSync('redirects.json', JSON.stringify(redirects, null, 2));
  console.log('\nRedirects saved to redirects.json');
  
  // Generate next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return ${JSON.stringify(redirects, null, 2)};
  },
};

module.exports = nextConfig;`;
  
  fs.writeFileSync('next.config.js', nextConfig);
  console.log('Next.js config saved to next.config.js');
}

importWordPress().catch(console.error);
```

**2.2 Run import script**
```bash
npm install xml2js
node scripts/import-wp.js
```

**2.3 Verify output**
Check that `redirects.json` and `next.config.js` were created.

---

### PHASE 3: Vercel Configuration

**3.1 Create vercel.json**
Create `app/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/discover",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

**3.2 Create API route for cron**
Create `app/src/app/api/cron/discover/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { runDiscoveryCycle } from '@/lib/discovery';
import { loadState, saveState } from '@/lib/db';

export async function GET(request: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = loadState();
    const products = await runDiscoveryCycle(state, 1);
    saveState(state);
    
    return NextResponse.json({
      success: true,
      productsDiscovered: products.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

---

### PHASE 4: Build & Test

**4.1 Build the app**
```bash
cd app
npm run build
```

**4.2 Fix any build errors**
Common issues:
- Missing type declarations → Add to `src/types/`
- Import errors → Check paths
- Environment variable issues → Verify .env

**4.3 Test locally**
```bash
npm run dev
```
Open http://localhost:5173 and verify:
- Site loads
- Admin panel works
- "Run Discovery Now" creates posts

---

### PHASE 5: Deploy to Vercel

**5.1 Install Vercel CLI**
```bash
npm i -g vercel
```

**5.2 Login to Vercel**
```bash
vercel login
```

**5.3 Deploy**
```bash
cd app
vercel --prod
```

**5.4 Add environment variables in Vercel dashboard**
Go to Project Settings → Environment Variables:
- `VITE_AMAZON_ACCESS_KEY`
- `VITE_AMAZON_SECRET_KEY`
- `VITE_AMAZON_ASSOCIATE_TAG`
- `CRON_SECRET` (generate a random string)

**5.5 Redeploy**
```bash
vercel --prod
```

---

### PHASE 6: Post-Deploy Verification

**6.1 Test the live site**
- Visit the Vercel URL
- Click around
- Test "Run Discovery Now" in Admin panel

**6.2 Verify Amazon API is working**
Check the browser console for:
- "Using Amazon Product Advertising API" (good)
- "Using simulated products" (needs API keys)

**6.3 Test redirects**
Take an old WordPress URL and verify it redirects to the new post.

**6.4 Set up custom domain**
In Vercel dashboard:
- Go to Settings → Domains
- Add `nerdymugs.com`
- Follow DNS instructions

---

## 🚨 TROUBLESHOOTING

### Build fails with TypeScript errors
```bash
# Check specific file
npx tsc --noEmit --project tsconfig.app.json
```

### Amazon API returns no products
- Verify credentials in `.env`
- Check that Associates account is active
- Ensure you've made a sale in last 90 days

### WordPress import fails
- Verify XML is valid: `xmllint PRE_PRODUCTION_ASSETS/wordpress-export.xml`
- Check for special characters in post titles

### Cron job not running
- Verify `vercel.json` is in the right location
- Check Vercel Functions logs
- Ensure `CRON_SECRET` is set

---

## 📋 SUCCESS CRITERIA

- [ ] App builds without errors
- [ ] Amazon API returns real products
- [ ] WordPress redirects work
- [ ] Admin panel functions correctly
- [ ] "Run Discovery Now" creates posts
- [ ] Site deployed to Vercel
- [ ] Custom domain configured (optional)

---

## 🎯 DELIVERABLES

When complete, you should have:
1. Live site at Vercel URL
2. Working Amazon product discovery
3. Imported WordPress posts
4. 301 redirects from old URLs
5. Admin panel with all features
6. Automated cron job (3 posts/day)

---

**Execute this plan step by step. Ask for clarification if anything is unclear.**

Good luck! 🖖☕
