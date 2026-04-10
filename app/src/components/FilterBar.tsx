import { useMemo } from 'react';
import type { Category } from '@/types';

interface FilterBarProps {
  categories: Category[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export function FilterBar({ categories, activeTag, onTagChange }: FilterBarProps) {
  // Collect all tags from active categories
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    categories.forEach(cat => {
      cat.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [categories]);

  if (allTags.length === 0) return null;

  return (
    <div className="sticky top-16 md:top-[72px] z-40 bg-[#0B0D10] border-b border-[rgba(242,242,242,0.06)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onTagChange(null)}
            className={`chip flex-shrink-0 ${activeTag === null ? 'chip-active' : 'chip-inactive'}`}
          >
            All tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagChange(tag)}
              className={`chip flex-shrink-0 whitespace-nowrap capitalize ${activeTag === tag ? 'chip-active' : 'chip-inactive'}`}
            >
              {tag.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
