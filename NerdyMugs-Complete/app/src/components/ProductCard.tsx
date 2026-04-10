import { useState } from 'react';
import { ArrowUpRight, Tag } from 'lucide-react';
import type { Post, Product } from '@/types';

interface ProductCardProps {
  post: Post;
  product: Product;
  index: number;
  onClick: () => void;
}

export function ProductCard({ post, product, index, onClick }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Get a placeholder image URL - nerdy/coffee themed
  const getPlaceholderImage = () => {
    const images = [
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop',
    ];
    return images[index % images.length];
  };

  const staggerIdx = (index % 6) + 1;
  const staggerClass = `stagger-${staggerIdx}`;

  return (
    <article 
      onClick={onClick}
      className={`masonry-item group cursor-pointer slide-up ${staggerClass}`}
    >
      <div className="card-hover bg-[#11141A] rounded-xl overflow-hidden border border-[rgba(242,242,242,0.06)]">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#1a1f2e] to-[#0f1419]">
          {!imageError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover image-zoom ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <img
              src={getPlaceholderImage()}
              alt={product.name}
              className="w-full h-full object-cover image-zoom"
              loading="lazy"
              decoding="async"
            />
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Read more indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Read more</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-[#F2F2F2] line-clamp-2 mb-1 group-hover:text-[#FF6A3D] transition-colors duration-200">
            {post.title}
          </h3>
          
          {/* Caption (scroll-stopper) */}
          <p className="text-sm text-[#A6A7AD] line-clamp-2 mb-3 italic">
            "{post.caption}"
          </p>
          
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.tags.slice(0, 2).map((tag) => (
              <span 
                key={tag}
                className="inline-flex items-center gap-1 text-xs text-[#A6A7AD] bg-[rgba(242,242,242,0.06)] px-2 py-1 rounded-full capitalize"
              >
                <Tag className="w-3 h-3" />
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
            {product.price && (
              <span className="text-xs font-medium text-[#FF6A3D] ml-auto">
                {product.price}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
