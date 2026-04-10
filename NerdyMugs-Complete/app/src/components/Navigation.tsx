import { useState, useEffect } from 'react';
import { Settings, Coffee } from 'lucide-react';
import type { Category } from '@/types';

interface NavigationProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
  onAdminClick: () => void;
  siteName?: string;
  tagline?: string;
}

export function Navigation({ 
  categories, 
  activeCategory, 
  onCategoryChange, 
  onAdminClick,
  siteName = "NerdyMugs",
  tagline = "Coffee Mugs for Nerds"
}: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'nav-blur border-b border-[rgba(242,242,242,0.06)]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Coffee className="w-5 h-5 text-[#FF6A3D]" />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none">
                {siteName}
              </span>
              <span className="text-[10px] text-[#A6A7AD] leading-none mt-0.5">
                {tagline}
              </span>
            </div>
          </div>
          
          {/* Category Chips - Desktop */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => onCategoryChange(null)}
              className={`chip ${activeCategory === null ? 'chip-active' : 'chip-inactive'}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.slug)}
                className={`chip whitespace-nowrap ${activeCategory === cat.slug ? 'chip-active' : 'chip-inactive'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          
          {/* Admin Button */}
          <button
            onClick={onAdminClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(242,242,242,0.06)] transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Admin</span>
          </button>
        </div>
        
        {/* Category Chips - Mobile */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 -mt-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={`chip flex-shrink-0 ${activeCategory === null ? 'chip-active' : 'chip-inactive'}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.slug)}
              className={`chip flex-shrink-0 whitespace-nowrap ${activeCategory === cat.slug ? 'chip-active' : 'chip-inactive'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
