// NerdyMugs - Social Media Auto-Post Integration
// Posts to X/Twitter when new content goes live

import type { Post, Product } from '@/types';

interface XConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface PostToXParams {
  post: Post;
  product: Product;
  imageUrl: string;
}

// Character limits
const X_LIMITS = {
  text: 280,
  media: 4, // images per tweet
};

// Generate tweet text from post
export function generateTweet({ post, product }: PostToXParams): string {
  // Start with caption (the scroll-stopper)
  let tweet = post.caption;
  
  // Add price if available
  if (product.price) {
    tweet += ` ${product.price}`;
  }
  
  // Add link (X shortens to t.co, counts as 23 chars)
  const link = ` ${product.productUrl}`;
  
  // Check length
  if (tweet.length + link.length > X_LIMITS.text) {
    // Truncate caption to fit
    const maxCaptionLength = X_LIMITS.text - link.length - 3; // -3 for "..."
    tweet = tweet.substring(0, maxCaptionLength) + '...';
  }
  
  return tweet + link;
}

// Generate thread for longer content
export function generateThread({ post, product }: PostToXParams): string[] {
  const tweets: string[] = [];
  
  // First tweet: Hook + image
  const hook = post.caption;
  const link = ` ${product.productUrl}`;
  const price = product.price ? ` ${product.price}` : '';
  
  let firstTweet = hook + price + link;
  if (firstTweet.length > X_LIMITS.text) {
    const maxLen = X_LIMITS.text - link.length - price.length - 3;
    firstTweet = hook.substring(0, maxLen) + '...' + price + link;
  }
  tweets.push(firstTweet);
  
  // Second tweet: Trivia fact (these are engaging)
  const triviaMatch = post.description.match(/Here's something you might not know: (.+?)(?:\n|$)/);
  if (triviaMatch) {
    const trivia = `🤓 ${triviaMatch[1].trim()}`;
    if (trivia.length <= X_LIMITS.text) {
      tweets.push(trivia);
    }
  }
  
  // Third tweet: CTA
  const ctaMatch = post.description.match(/(?:Click through|Grab this|Check price)[^.]+\./i);
  if (ctaMatch) {
    tweets.push(ctaMatch[0]);
  }
  
  return tweets;
}

// Post to X (server-side only - requires API keys)
export async function postToX(
  _config: XConfig,
  params: PostToXParams
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    // In production, this would use the X API v2
    // For now, we'll log what WOULD be posted
    
    const tweet = generateTweet(params);
    const thread = generateThread(params);
    
    console.log('=== WOULD POST TO X ===');
    console.log('Tweet:', tweet);
    console.log('Thread:', thread);
    console.log('Image:', params.imageUrl);
    console.log('========================');
    
    // Actual implementation would be:
    /*
    const client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    });
    
    // Upload image
    const mediaId = await client.v1.uploadMedia(params.imageUrl);
    
    // Post tweet with media
    const tweet = await client.v2.tweet({
      text: generateTweet(params),
      media: { media_ids: [mediaId] },
    });
    
    return { success: true, tweetId: tweet.data.id };
    */
    
    return { success: true, tweetId: 'mock-tweet-id' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Schedule X post (called after post creation)
export async function scheduleXPost(
  config: XConfig,
  post: Post,
  product: Product
): Promise<void> {
  // In production, this would queue the post
  // For immediate posting:
  await postToX(config, { post, product, imageUrl: product.imageUrl });
}

// X API v2 Types (for reference)
/*
POST https://api.twitter.com/2/tweets
{
  "text": "Your tweet here",
  "media": {
    "media_ids": ["1234567890"]
  }
}

Response:
{
  "data": {
    "id": "1234567890123456789",
    "text": "Your tweet here"
  }
}
*/
