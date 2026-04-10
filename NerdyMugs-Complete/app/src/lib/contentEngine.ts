// NerdyMugs - Content Generation Engine
// Follows the exact prompt rules from the config

import type { AppState, Product, Post, GeneratedContent } from '@/types';
import { addPost, addLog, saveState } from './db';
import { triviaDatabase, videoSuggestions, contentRulesConfig } from '@/config/nerdyMugs';

// Banned phrases - never use these
const bannedPhrases = [
  "looking for the perfect gift",
  "whether you're a fan of",
  "take your morning coffee to the next level",
  "elevate your",
  "perfect for any fan",
  "must-have",
  "game-changer",
  "revolutionary",
  "innovative",
  "unleash your",
  "unlock your",
  "discover the power of",
  "transform your",
  "experience the",
  "premium quality",
  "superior craftsmanship",
];

// Title templates - clever, punchy
const titleTemplates: Record<string, string[]> = {
  "Star Trek": [
    "This {product} Is Logical. Highly Logical.",
    "Make It So: {product} Review",
    "Resistance Is Futile (You'll Want This)",
    "Live Long and Sip: {product}",
    "Set Phasers to Caffeine",
    "The {product} Spock Would Approve Of",
    "Boldly Go Where No Mug Has Gone Before",
  ],
  "Star Wars": [
    "The Force Is Strong With This {product}",
    "Do. Or Do Not. There Is No Try. (Just Buy.)",
    "This {product} Has a Bad Feeling About Your Sleep Schedule",
    "I Find Your Lack of {product} Disturbing",
    "The {product} You're Looking For",
    "May the Coffee Be With You",
    "This Is the Mug You're Looking For",
  ],
  "Retro Gaming": [
    "Press Start to Sip: {product}",
    "Level Up Your Morning With {product}",
    "Insert Coin, Receive {product}",
    "High Score: {product} Review",
    "The {product} That Broke the Speedrun Record",
    "Game Over? Not With This {product}",
    "Konami Code Not Required (But Recommended)",
  ],
  "Marvel": [
    "Avengers, Assemble... Your Coffee",
    "With Great {product} Comes Great Responsibility",
    "The {product} That's Worthy",
    "Hulk Smash... This Morning Meeting",
    "Tony Stark Would Drink From This",
    "Maximum Effort: {product} Review",
    "The {product} Thanos Would Snap For",
  ],
};

// Caption templates - scroll-stoppers
const captionTemplates: Record<string, string[]> = {
  "Star Trek": [
    "Spock would raise an eyebrow. You should raise this mug.",
    "The mug that makes Klingon coffee drinkable.",
    "Captain's log: found the perfect vessel.",
    "More logical than most of my life choices.",
    "Beam this up to my face immediately.",
  ],
  "Star Wars": [
    "The Force is caffeinated in this one.",
    "Darth Vader drinks from this. Probably.",
    "More reliable than a stormtrooper's aim.",
    "This mug has a higher midichlorian count than you.",
    "The Empire didn't design this, but they wish they did.",
  ],
  "Retro Gaming": [
    "This mug has more lives than you do.",
    "Speedrun your morning routine.",
    "The Konami code of coffee vessels.",
    "Pixel perfect. Just like your nostalgia.",
    "High score in the caffeine leaderboard.",
  ],
  "Marvel": [
    "Tony Stark's morning pick-me-up.",
    "Worthy of Mjolnir. Barely.",
    "Maximum effort in mug form.",
    "Thanos would snap half the universe for this.",
    "With great coffee comes great mugs.",
  ],
};

// Opening hooks by category
const openingHooks: Record<string, string[]> = {
  "Star Trek": [
    "Let's be honest: most Star Trek merch looks like it was designed by someone who's never actually watched an episode. This? This gets it.",
    "I've seen a lot of Trek memorabilia in my time. Most of it makes me want to transport myself away. But this...",
    "Somewhere between 'The Trouble with Tribbles' and 'The Inner Light,' someone designed this mug. And they cared.",
  ],
  "Star Wars": [
    "The galaxy far, far away has produced a lot of questionable merchandise. This isn't one of them.",
    "George Lucas sold Star Wars for $4 billion. He probably should have kept the rights to this mug.",
    "I've seen what passes for 'officially licensed' in the Star Wars universe. This actually deserves the label.",
  ],
  "Retro Gaming": [
    "Remember when games didn't have microtransactions? When you bought something and actually owned it? This mug remembers.",
    "The 8-bit era gave us a lot of things: repetitive stress injuries, questionable fashion, and an undying love for pixel art.",
    "Some people collect vintage games. I collect things that remind me why I fell in love with gaming in the first place.",
  ],
  "Marvel": [
    "Stan Lee created a universe. This mug holds coffee. Both are equally important to my morning.",
    "The MCU has 30+ movies. This mug has one job: hold my coffee. It does it better than most of those movies.",
    "With great coffee comes great responsibility. This mug understands the assignment.",
  ],
};

// CTA templates with personality
const ctaTemplates: Record<string, string[]> = {
  "Star Trek": [
    "Make it so. Click through and claim yours before the Borg do.",
    "Resistance is futile. Your coffee wants this.",
    "Live long and prosper—and maybe grab this while you're at it.",
  ],
  "Star Wars": [
    "Do it. Do it now. The Force commands it. (Okay, the Force doesn't care, but you should.)",
    "This is the mug you're looking for. No Jedi mind tricks needed.",
    "The Force is strong with this one. Your kitchen counter agrees.",
  ],
  "Retro Gaming": [
    "Insert coin. Receive mug. Simple as that.",
    "Game over for your old mug. Level up here.",
    "Press start on your best morning yet.",
  ],
  "Marvel": [
    "Suit up. Grab this. Save the world (or at least your morning).",
    "Even Deadpool would approve—and he approves of almost nothing.",
    "Be the hero your coffee deserves. Click through.",
  ],
};

// Check if text contains banned phrases
function containsBannedPhrase(text: string): boolean {
  const lowerText = text.toLowerCase();
  return bannedPhrases.some(phrase => lowerText.includes(phrase.toLowerCase()));
}

// Get random item from array
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate title (max 80 chars)
function generateTitle(product: Product): string {
  const templates = titleTemplates[product.category] || titleTemplates["Star Trek"];
  let title = random(templates).replace('{product}', product.name.split(' ').slice(0, 3).join(' '));
  
  if (title.length > contentRulesConfig.titleMaxChars) {
    title = title.substring(0, contentRulesConfig.titleMaxChars - 3) + '...';
  }
  
  return title;
}

// Generate caption (max 160 chars)
function generateCaption(product: Product): string {
  const templates = captionTemplates[product.category] || captionTemplates["Star Trek"];
  let caption = random(templates);
  
  if (caption.length > contentRulesConfig.captionMaxChars) {
    caption = caption.substring(0, contentRulesConfig.captionMaxChars - 3) + '...';
  }
  
  return caption;
}

// Get trivia fact for category
function getTrivia(category: string): string {
  const facts = triviaDatabase[category] || triviaDatabase["Star Trek"];
  return random(facts);
}

// Get video suggestion for category
function getVideoSuggestion(category: string): string {
  const suggestions = videoSuggestions[category] || videoSuggestions["Star Trek"];
  return random(suggestions);
}

// Generate opening paragraph
function generateOpening(product: Product): string {
  const hooks = openingHooks[product.category] || openingHooks["Star Trek"];
  return random(hooks);
}

// Generate body paragraph about the mug
function generateMugMention(product: Product): string {
  const mentions = [
    `The ${product.name} doesn't scream for attention. It doesn't need to. The design speaks the language of people who actually get the reference.`,
    `This isn't some mass-produced knockoff that'll fade in the dishwasher. The ${product.name} was clearly made by someone who understands why this matters.`,
    `I've had mugs that claimed to be 'officially licensed' feel cheaper than a dollar store special. The ${product.name} is the real deal.`,
    `The ${product.name} sits on my desk like a badge of honor. Coworkers who get it nod. Those who don't? Their loss.`,
  ];
  return random(mentions);
}

// Generate CTA
function generateCTA(category: string): string {
  const ctas = ctaTemplates[category] || ctaTemplates["Star Trek"];
  return random(ctas);
}

// Count words in text
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

// Generate full description (80-250 words)
function generateDescription(product: Product): string {
  const opening = generateOpening(product);
  const mugMention = generateMugMention(product);
  const trivia = getTrivia(product.category);
  const cta = generateCTA(product.category);
  
  const description = `${opening}

${mugMention}

Here's something you might not know: ${trivia}

${cta}`;

  // Check word count
  const wordCount = countWords(description);
  
  if (wordCount < contentRulesConfig.descriptionMinWords) {
    // Add more content if too short
    const extra = `I've been collecting ${product.category.toLowerCase()} memorabilia for years. Most of it ends up in a drawer. This one? It's in my daily rotation.`;
    return `${opening}\n\n${extra}\n\n${mugMention}\n\nHere's something you might not know: ${trivia}\n\n${cta}`;
  }
  
  if (wordCount > contentRulesConfig.descriptionMaxWords) {
    // Trim if too long (rare, but possible)
    const sentences = description.split('. ');
    let trimmed = '';
    let currentWords = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = countWords(sentence);
      if (currentWords + sentenceWords > contentRulesConfig.descriptionMaxWords - 10) {
        break;
      }
      trimmed += sentence + '. ';
      currentWords += sentenceWords;
    }
    
    return trimmed.trim() + ' ' + cta;
  }
  
  return description;
}

// Generate suggested tags
function generateTags(product: Product): string[] {
  const baseTags = product.tags.slice(0, 2);
  const extraTags = [
    product.category.toLowerCase().replace(/\s+/g, ''),
    'coffee',
    'mug',
    'nerdy',
  ];
  return [...baseTags, ...extraTags].slice(0, 4);
}

// Main content generation function
export function generateContent(product: Product): GeneratedContent {
  const title = generateTitle(product);
  const caption = generateCaption(product);
  const description = generateDescription(product);
  const suggestedTags = generateTags(product);
  const videoSuggestion = getVideoSuggestion(product.category);
  
  // Validate no banned phrases
  const allText = `${title} ${caption} ${description}`;
  if (containsBannedPhrase(allText)) {
    console.warn('Generated content contained banned phrase, regenerating...');
    return generateContent(product); // Retry
  }
  
  return {
    title,
    caption,
    description,
    suggestedTags,
    videoSuggestion,
  };
}

// Create a post for a product
export function createPost(state: AppState, product: Product): Post {
  const content = generateContent(product);
  
  const post = addPost(state, {
    productId: product.id,
    title: content.title,
    caption: content.caption,
    description: content.description,
    suggestedTags: content.suggestedTags,
    videoSuggestion: content.videoSuggestion,
    isPublished: true,
    category: product.category,
  });
  
  addLog(state, 'POST_CREATED', `Created post for ${product.name} in ${product.category}`);
  return post;
}

// Run content generation for discovered products
export function generateContentForProducts(state: AppState, products: Product[]): Post[] {
  const posts: Post[] = [];
  
  for (const product of products) {
    try {
      const post = createPost(state, product);
      posts.push(post);
    } catch (error) {
      addLog(state, 'CONTENT_ERROR', `Failed to generate content for ${product.name}: ${error}`);
    }
  }
  
  return posts;
}

// Regenerate content for an existing post
export function regeneratePost(state: AppState, postId: string): Post | null {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return null;
  
  const product = state.products.find(p => p.id === post.productId);
  if (!product) return null;
  
  const content = generateContent(product);
  
  post.title = content.title;
  post.caption = content.caption;
  post.description = content.description;
  post.suggestedTags = content.suggestedTags;
  post.videoSuggestion = content.videoSuggestion;
  post.publishedAt = Date.now();
  
  saveState(state);
  addLog(state, 'POST_REGENERATED', `Regenerated content for ${product.name}`);
  return post;
}
