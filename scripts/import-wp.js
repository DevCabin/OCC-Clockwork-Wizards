const fs = require('fs');
const xml2js = require('xml2js');

async function importWordPress() {
  const xml = fs.readFileSync('../PRE_PRODUCTION_ASSETS/nerdymugscom.WordPress.2026-04-09.xml', 'utf8');
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
  const importedPosts = [];
  
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
    
    // Extract ASIN if present
    const asinMatch = amazonUrl.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : '';
    
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
    
    // Create post object
    importedPosts.push({
      id: postId,
      title: title,
      content: content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      category: category,
      tags: tags,
      amazonUrl: amazonUrl,
      asin: asin,
      imageUrl: imageUrl,
      price: price,
      publishedAt: new Date(pubDate).getTime(),
    });
    
    console.log(`Will import: ${title} → /post/${postId}`);
  }
  
  // Save redirects
  fs.writeFileSync('app/redirects.json', JSON.stringify(redirects, null, 2));
  console.log('\nRedirects saved to app/redirects.json');
  
  // Save imported posts
  fs.writeFileSync('app/imported-posts.json', JSON.stringify(importedPosts, null, 2));
  console.log('Imported posts saved to app/imported-posts.json');
  
  // Generate next.config.js for Vercel
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return ${JSON.stringify(redirects, null, 2)};
  },
};

module.exports = nextConfig;`;
  
  fs.writeFileSync('app/next.config.js', nextConfig);
  console.log('Next.js config saved to app/next.config.js');
  
  // Generate vercel.json for cron
  const vercelConfig = {
    "crons": [
      {
        "path": "/api/cron/discover",
        "schedule": "0 */8 * * *"
      }
    ]
  };
  
  fs.writeFileSync('app/vercel.json', JSON.stringify(vercelConfig, null, 2));
  console.log('Vercel config saved to app/vercel.json');
}

importWordPress().catch(console.error);