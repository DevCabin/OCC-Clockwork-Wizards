// NerdyMugs - WordPress Import Component
// Imports existing WP posts and generates 301 redirects

import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, Download, ExternalLink } from 'lucide-react';
import type { Product, Post, Category } from '@/types';
import { generateId } from '@/lib/supabase';

interface WPImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  redirects: Record<string, string>;
  posts: Post[];
  products: Product[];
}

interface WordPressImportProps {
  existingCategories: Category[];
  onImport: (products: Product[], posts: Post[]) => void;
}

// Parse WordPress XML (WXR format)
function parseWordPressXML(xmlString: string): Array<{
  title: string;
  link: string;
  pubDate: string;
  categories: string[];
  tags: string[];
  content: string;
  excerpt: string;
}> {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');
  
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    categories: string[];
    tags: string[];
    content: string;
    excerpt: string;
  }> = [];
  
  const itemNodes = xml.querySelectorAll('item');
  
  itemNodes.forEach((node) => {
    const title = node.querySelector('title')?.textContent || '';
    const link = node.querySelector('link')?.textContent || '';
    const pubDate = node.querySelector('pubDate')?.textContent || '';
    
    // Get content:encoded (WordPress content)
    let content = '';
    const contentEncoded = node.getElementsByTagNameNS('*', 'encoded')[0];
    if (contentEncoded) {
      content = contentEncoded.textContent || '';
    }
    
    // Get excerpt
    let excerpt = '';
    const excerptEncoded = node.getElementsByTagNameNS('*', 'encoded')[1];
    if (excerptEncoded) {
      excerpt = excerptEncoded.textContent || '';
    }
    
    // Get categories (domain="category")
    const categories: string[] = [];
    node.querySelectorAll('category').forEach((cat) => {
      const domain = cat.getAttribute('domain');
      if (domain === 'category' && cat.textContent) {
        categories.push(cat.textContent);
      }
    });
    
    // Get tags (domain="post_tag")
    const tags: string[] = [];
    node.querySelectorAll('category').forEach((tag) => {
      const domain = tag.getAttribute('domain');
      if (domain === 'post_tag' && tag.textContent) {
        tags.push(tag.textContent);
      }
    });
    
    items.push({ title, link, pubDate, categories, tags, content, excerpt });
  });
  
  return items;
}

// Extract Amazon info from content
function extractAmazonInfo(content: string): {
  productUrl?: string;
  imageUrl?: string;
  price?: string;
} {
  // Look for Amazon links
  const amazonRegex = /https?:\/\/(?:www\.)?amazon\.com\/[\w\-\/]+(?:\?[^\s"<>]+)?/gi;
  const amazonLinks = content.match(amazonRegex) || [];
  
  // Look for images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1]);
  }
  
  // Look for price patterns
  const priceRegex = /\$[\d,]+(?:\.\d{2})?/;
  const priceMatch = content.match(priceRegex);
  
  return {
    productUrl: amazonLinks[0],
    imageUrl: images[0],
    price: priceMatch ? priceMatch[0] : undefined,
  };
}

// Map WP category to NerdyMugs category
function mapCategory(wpCategories: string[], existingCategories: Category[]): string {
  const categoryMap: Record<string, string> = {
    'star-trek': 'Star Trek',
    'star trek': 'Star Trek',
    'startrek': 'Star Trek',
    'star-trek-mugs': 'Star Trek',
    'star-wars': 'Star Wars',
    'star wars': 'Star Wars',
    'starwars': 'Star Wars',
    'marvel': 'Marvel',
    'avengers': 'Marvel',
    'gaming': 'Retro Gaming',
    'retro-gaming': 'Retro Gaming',
    'video-games': 'Retro Gaming',
    'nintendo': 'Retro Gaming',
  };
  
  for (const wpCat of wpCategories) {
    const slug = wpCat.toLowerCase().replace(/\s+/g, '-');
    const mapped = categoryMap[slug] || categoryMap[wpCat.toLowerCase()];
    if (mapped) return mapped;
  }
  
  // Default to first active category
  const active = existingCategories.find(c => c.isActive);
  return active?.name || 'Star Trek';
}

// Strip HTML tags
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Generate caption from content
function generateCaption(content: string, excerpt: string): string {
  if (excerpt) {
    return stripHtml(excerpt).substring(0, 160);
  }
  
  // Get first sentence
  const text = stripHtml(content);
  const firstSentence = text.split(/[.!?]/)[0];
  return firstSentence.substring(0, 160);
}

export function WordPressImport({ existingCategories, onImport }: WordPressImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<WPImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setResult(null);
    
    try {
      const text = await file.text();
      const wpItems = parseWordPressXML(text);
      
      const products: Product[] = [];
      const posts: Post[] = [];
      const redirects: Record<string, string> = {};
      const errors: string[] = [];
      let imported = 0;
      let skipped = 0;
      
      for (const item of wpItems) {
        // Skip if no title
        if (!item.title.trim()) {
          skipped++;
          continue;
        }
        
        try {
          const { productUrl, imageUrl, price } = extractAmazonInfo(item.content);
          const category = mapCategory(item.categories, existingCategories);
          
          // Create product
          const product: Product = {
            id: generateId('prod-'),
            name: item.title,
            description: stripHtml(item.excerpt || item.content).substring(0, 200),
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=600&fit=crop',
            productUrl: productUrl || '#',
            price: price || '$19.99',
            category,
            tags: item.tags.length > 0 ? item.tags : ['coffee', 'mug'],
            createdAt: new Date(item.pubDate).getTime() || Date.now(),
            updatedAt: Date.now(),
          };
          
          // Create post
          const post: Post = {
            id: generateId('post-'),
            productId: product.id,
            title: item.title,
            caption: generateCaption(item.content, item.excerpt),
            description: stripHtml(item.content).substring(0, 1000),
            suggestedTags: item.tags.slice(0, 4),
            videoSuggestion: `Search YouTube for: ${category} best moments`,
            clicks: 0,
            publishedAt: new Date(item.pubDate).getTime() || Date.now(),
            isPublished: true,
            category,
          };
          
          products.push(product);
          posts.push(post);
          
          // Create redirect mapping
          if (item.link) {
            redirects[item.link] = `/post/${post.id}`;
          }
          
          imported++;
        } catch (err) {
          errors.push(`${item.title}: ${err}`);
          skipped++;
        }
      }
      
      const importResult: WPImportResult = {
        imported,
        skipped,
        errors,
        redirects,
        posts,
        products,
      };
      
      setResult(importResult);
      onImport(products, posts);
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [`Failed to parse XML: ${err}`],
        redirects: {},
        posts: [],
        products: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xml')) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const downloadRedirects = () => {
    if (!result) return;
    
    const redirectConfig = Object.entries(result.redirects).map(([source, destination]) => ({
      source: new URL(source).pathname,
      destination,
      permanent: true,
    }));
    
    const blob = new Blob([JSON.stringify(redirectConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redirects.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadNextConfig = () => {
    if (!result) return;
    
    const entries = Object.entries(result.redirects).map(([source, destination]) => {
      const sourcePath = new URL(source).pathname;
      return `    {
      source: '${sourcePath}',
      destination: '${destination}',
      permanent: true,
    }`;
    });
    
    const config = `/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
${entries.join(',\n')}
    ];
  },
};

module.exports = nextConfig;`;
    
    const blob = new Blob([config], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'next.config.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging 
              ? 'border-[#FF6A3D] bg-[#FF6A3D]/10' 
              : 'border-[rgba(242,242,242,0.2)] hover:border-[rgba(242,242,242,0.4)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-[#FF6A3D]/30 border-t-[#FF6A3D] rounded-full animate-spin mb-4" />
              <p className="text-[#A6A7AD]">Processing WordPress export...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-[#A6A7AD] mx-auto mb-4" />
              <p className="text-[#F2F2F2] font-medium mb-2">
                Drop your WordPress export file here
              </p>
              <p className="text-sm text-[#A6A7AD]">
                Or click to browse (XML files only)
              </p>
              <p className="text-xs text-[#A6A7AD]/60 mt-4">
                Export from WordPress: Tools → Export → All Content
              </p>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{result.imported}</div>
              <div className="text-xs text-green-400/70">Imported</div>
            </div>
            <div className="bg-[#0B0D10] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#A6A7AD]">{result.skipped}</div>
              <div className="text-xs text-[#A6A7AD]/70">Skipped</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${result.errors.length > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#0B0D10]'}`}>
              <div className={`text-2xl font-bold ${result.errors.length > 0 ? 'text-red-400' : 'text-[#A6A7AD]'}`}>
                {result.errors.length}
              </div>
              <div className="text-xs text-[#A6A7AD]/70">Errors</div>
            </div>
          </div>

          {/* Success Message */}
          {result.imported > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-green-400">
                Successfully imported {result.imported} posts! 
                They'll appear in your feed after you save.
              </p>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-medium">Errors</span>
              </div>
              <ul className="text-sm text-red-400/80 space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Redirects */}
          {Object.keys(result.redirects).length > 0 && (
            <div className="bg-[#0B0D10] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-[#FF6A3D]" />
                <span className="text-[#F2F2F2] font-medium">301 Redirects</span>
              </div>
              <p className="text-sm text-[#A6A7AD] mb-3">
                {Object.keys(result.redirects).length} redirects generated. 
                Download and add to your Vercel config.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={downloadRedirects}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6A3D] hover:bg-[#ff7a52] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  redirects.json
                </button>
                <button
                  onClick={downloadNextConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgba(242,242,242,0.1)] hover:bg-[rgba(242,242,242,0.15)] text-[#F2F2F2] rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  next.config.js
                </button>
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => { setResult(null); }}
            className="w-full py-3 text-[#A6A7AD] hover:text-[#F2F2F2] transition-colors"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
