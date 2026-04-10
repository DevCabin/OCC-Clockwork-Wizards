import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { FilterBar } from '@/components/FilterBar';
import { ProductCard } from '@/components/ProductCard';
import { PostDetail } from '@/components/PostDetail';
import { AdminPanel } from '@/components/AdminPanel';
import { EmptyState } from '@/components/EmptyState';
import { useAppState } from '@/hooks/useAppState';
import { initScheduler, formatTimeRemaining, getTimeUntilNextRun } from '@/lib/scheduler';
import type { Filter } from '@/types';
import { Toaster, toast } from 'sonner';

function App() {
  const {
    state,
    isLoaded,
    editSiteConfig,
    editScheduleConfig,
    addNewCategory,
    editCategory,
    removeCategory,
    trackClick,
    runAutomation,
    getFilteredPosts,
    getPostDetail,
    getCategories,
  } = useAppState();

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [nextRunTime, setNextRunTime] = useState<string>('');

  // Get categories
  const categories = useMemo(() => getCategories(), [getCategories, state?.categories]);

  // Get filtered posts
  const filter: Filter = useMemo(() => {
    if (activeTag) return { type: 'tag', value: activeTag };
    if (activeCategory) return { type: 'category', value: activeCategory };
    return { type: 'all', value: '' };
  }, [activeCategory, activeTag]);

  const posts = useMemo(() => getFilteredPosts(filter), [getFilteredPosts, filter, state?.posts]);

  // Get post with product for detail view
  const selectedPostDetail = useMemo(() => {
    if (!selectedPostId || !state) return null;
    return getPostDetail(selectedPostId);
  }, [selectedPostId, state, getPostDetail]);

  // Initialize scheduler
  useEffect(() => {
    if (!state) return;
    
    const cleanup = initScheduler(state, () => {
      toast.success('New mugs discovered!', {
        description: 'Check out the latest posts in your feed.',
      });
    });

    return cleanup;
  }, [state]);

  // Update next run time display
  useEffect(() => {
    if (!state) return;
    
    const updateTime = () => {
      const ms = getTimeUntilNextRun(state);
      setNextRunTime(formatTimeRemaining(ms));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [state]);

  // Handle category change
  const handleCategoryChange = useCallback((slug: string | null) => {
    setActiveCategory(slug);
    setActiveTag(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle tag change
  const handleTagChange = useCallback((tag: string | null) => {
    setActiveTag(tag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle post click
  const handlePostClick = useCallback((postId: string) => {
    setSelectedPostId(postId);
    document.body.style.overflow = 'hidden';
  }, []);

  // Handle close detail
  const handleCloseDetail = useCallback(() => {
    setSelectedPostId(null);
    document.body.style.overflow = '';
  }, []);

  // Handle buy click
  const handleBuyClick = useCallback(() => {
    if (selectedPostId) {
      trackClick(selectedPostId);
    }
  }, [selectedPostId, trackClick]);

  // Handle run automation from empty state
  const handleRunFromEmpty = useCallback(async () => {
    const result = await runAutomation(3);
    if (result.success) {
      toast.success(`Discovered ${result.productsDiscovered} mugs!`);
    } else {
      toast.error(result.error || 'Automation failed');
    }
  }, [runAutomation]);

  // Loading state
  if (!isLoaded || !state) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-[#FF6A3D]/30 border-t-[#FF6A3D] rounded-full animate-spin mb-4" />
          <p className="text-[#A6A7AD]">Brewing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10]">
      <Toaster 
        position="bottom-center" 
        toastOptions={{
          style: {
            background: '#11141A',
            border: '1px solid rgba(242,242,242,0.06)',
            color: '#F2F2F2',
          },
        }}
      />

      {/* Navigation */}
      <Navigation
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onAdminClick={() => setIsAdminOpen(true)}
        siteName={state.siteConfig.name}
        tagline={state.siteConfig.tagline}
      />

      {/* Filter Bar */}
      <div className="pt-20 md:pt-[72px]">
        <FilterBar
          categories={categories}
          activeTag={activeTag}
          onTagChange={handleTagChange}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Status Bar */}
        {state.posts.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#A6A7AD]">
              Showing <span className="text-[#F2F2F2] font-medium">{posts.length}</span> posts
              {activeCategory && <span> in <span className="text-[#FF6A3D]">{categories.find(c => c.slug === activeCategory)?.name}</span></span>}
              {activeTag && <span> tagged <span className="text-[#FF6A3D]">{activeTag.replace(/-/g, ' ')}</span></span>}
            </p>
            {nextRunTime && (
              <p className="text-xs text-[#A6A7AD]/60 mono">
                Next discovery in {nextRunTime}
              </p>
            )}
          </div>
        )}

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="masonry-grid">
            {posts.map((post, index) => {
              const product = state.products.find(p => p.id === post.productId);
              if (!product) return null;
              
              return (
                <ProductCard
                  key={post.id}
                  post={post}
                  product={product}
                  index={index}
                  onClick={() => handlePostClick(post.id)}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            type={state.posts.length === 0 ? 'empty' : 'no-results'}
            onRunDiscovery={state.posts.length === 0 ? handleRunFromEmpty : undefined}
          />
        )}
      </main>

      {/* Post Detail Modal */}
      {selectedPostDetail && (
        <PostDetail
          post={selectedPostDetail.post}
          product={selectedPostDetail.product}
          onClose={handleCloseDetail}
          onTrackClick={handleBuyClick}
        />
      )}

      {/* Admin Panel */}
      {isAdminOpen && (
        <AdminPanel
          state={state}
          onClose={() => setIsAdminOpen(false)}
          onUpdateSiteConfig={editSiteConfig}
          onUpdateScheduleConfig={editScheduleConfig}
          onAddCategory={addNewCategory}
          onUpdateCategory={editCategory}
          onDeleteCategory={removeCategory}
          onRunAutomation={runAutomation}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[rgba(242,242,242,0.06)] py-8 mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#A6A7AD]">
              {state.siteConfig.name} — {state.siteConfig.tagline}
            </p>
            <p className="text-xs text-[#A6A7AD]/50">
              {state.posts.filter(p => p.isPublished).length} posts • {state.products.length} mugs • {state.posts.reduce((acc, p) => acc + p.clicks, 0)} clicks
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
