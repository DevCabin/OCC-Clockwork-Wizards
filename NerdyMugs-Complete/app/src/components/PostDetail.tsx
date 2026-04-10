import { useEffect, useRef } from 'react';
import { X, Tag, ArrowUpRight, Play, Coffee } from 'lucide-react';
import type { Post, Product } from '@/types';

interface PostDetailProps {
  post: Post;
  product: Product;
  onClose: () => void;
  onTrackClick: () => void;
}

export function PostDetail({ post, product, onClose, onTrackClick }: PostDetailProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) onClose();
  };

  // Handle buy click
  const handleBuyClick = () => {
    onTrackClick();
    window.open(product.productUrl, '_blank', 'noopener,noreferrer');
  };

  // Get placeholder image
  const getPlaceholderImage = () => {
    return `https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=1200&h=675&fit=crop`;
  };

  return (
    <div 
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(11,13,16,0.92)] backdrop-blur-sm overflow-y-auto"
    >
      {/* Modal Content */}
      <div className="relative w-full max-w-[900px] min-h-screen md:min-h-0 md:my-8 bg-[#0B0D10] md:rounded-2xl border border-[rgba(242,242,242,0.06)] overflow-hidden fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[rgba(11,13,16,0.8)] text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(11,13,16,0.95)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getPlaceholderImage();
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="px-6 py-8 md:px-10 md:py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#A6A7AD] mb-4">
            <Coffee className="w-4 h-4" />
            <span>{product.category}</span>
            <span>•</span>
            <span className="capitalize">{product.tags[0]?.replace(/-/g, ' ') || 'Featured'}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Caption */}
          <p className="text-lg text-[#FF6A3D] font-medium mb-8 italic">
            &ldquo;{post.caption}&rdquo;
          </p>

          {/* Body */}
          <div className="prose prose-invert max-w-none mb-10">
            {post.description.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-[#A6A7AD] leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Video Suggestion */}
          <div className="bg-[#11141A] rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 text-sm text-[#A6A7AD] mb-2">
              <Play className="w-4 h-4 text-[#FF6A3D]" />
              <span className="mono uppercase tracking-widest">Watch Next</span>
            </div>
            <p className="text-[#F2F2F2]">{post.videoSuggestion}</p>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap mb-8">
            {post.suggestedTags.map((tag) => (
              <span 
                key={tag}
                className="inline-flex items-center gap-1.5 text-sm text-[#A6A7AD] bg-[rgba(242,242,242,0.06)] px-3 py-1.5 rounded-full capitalize"
              >
                <Tag className="w-3.5 h-3.5" />
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-6 border-t border-[rgba(242,242,242,0.06)]">
            <button
              onClick={handleBuyClick}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FF6A3D] hover:bg-[#ff7a52] text-white font-semibold py-4 px-8 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF6A3D]/20"
            >
              <span>Check price on Amazon</span>
              <ArrowUpRight className="w-5 h-5" />
            </button>
            
            {product.price && (
              <div className="text-center sm:text-right">
                <span className="text-2xl font-bold text-[#F2F2F2]">{product.price}</span>
              </div>
            )}
          </div>

          {/* Affiliate disclosure */}
          <p className="text-xs text-[#A6A7AD]/60 text-center mt-4">
            We may earn a commission when you purchase through our links. 
            This helps keep {post.category} fans caffeinated.
          </p>
        </div>
      </div>
    </div>
  );
}
