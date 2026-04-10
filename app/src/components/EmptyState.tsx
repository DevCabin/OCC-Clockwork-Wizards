import { Search, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  type: 'loading' | 'empty' | 'no-results';
  onRunDiscovery?: () => void;
}

export function EmptyState({ type, onRunDiscovery }: EmptyStateProps) {
  if (type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-[#FF6A3D]/30" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-[#FF6A3D] radar-ring" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-[#FF6A3D] radar-ring" style={{ animationDelay: '1.1s' }} />
        </div>
        <h3 className="text-xl font-semibold text-[#F2F2F2] mb-2">Hunting for gems...</h3>
        <p className="text-[#A6A7AD] text-center max-w-md">
          Our content machine is searching for the best products in your niche.
          Check back soon!
        </p>
      </div>
    );
  }

  if (type === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-full bg-[#11141A] flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-[#FF6A3D]" />
        </div>
        <h3 className="text-xl font-semibold text-[#F2F2F2] mb-2">Ready to discover</h3>
        <p className="text-[#A6A7AD] text-center max-w-md mb-6">
          Your content machine is set up and ready to find amazing products. 
          Run your first discovery cycle to get started.
        </p>
        {onRunDiscovery && (
          <button
            onClick={onRunDiscovery}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF6A3D] hover:bg-[#ff7a52] text-white rounded-full font-semibold transition-all hover:-translate-y-0.5"
          >
            <Search className="w-4 h-4" />
            Start Discovery
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 rounded-full bg-[#11141A] flex items-center justify-center mb-6">
        <Search className="w-8 h-8 text-[#A6A7AD]" />
      </div>
      <h3 className="text-xl font-semibold text-[#F2F2F2] mb-2">No matches found</h3>
      <p className="text-[#A6A7AD] text-center max-w-md">
        Try adjusting your filters or check back later for new content.
      </p>
    </div>
  );
}
