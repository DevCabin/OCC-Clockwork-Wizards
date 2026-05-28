/**
 * Placeholder Images for Missing Content
 * 
 * Fun, nerdy placeholders to maintain SEO while keeping the site looking good
 */

// Nerdy "404: Image Not Found" placeholder - fun pixelated mug style
export const PLACEHOLDER_IMAGE_URL = "https://placehold.co/600x600/1e293b/38bdf8?text=NERDY+MUG+%7C+Image+Coming+Soon&font=monospace";

/**
 * Get image URL with fallback to placeholder
 */
export function getImageWithPlaceholder(imageUrl: string | null | undefined): string {
  return imageUrl || PLACEHOLDER_IMAGE_URL;
}

/**
 * Check if an image URL is a placeholder
 */
export function isPlaceholder(imageUrl: string | null | undefined): boolean {
  return !imageUrl || imageUrl === PLACEHOLDER_IMAGE_URL;
}
