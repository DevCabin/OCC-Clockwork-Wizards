import { useState } from 'react';
import { X, Plus, Trash2, Play, Settings, Tag, Coffee, Clock, Zap, Upload } from 'lucide-react';
import type { AppState, Category, SiteConfig, ScheduleConfig, Product, Post } from '@/types';
import { WordPressImport } from './WordPressImport';

interface AdminPanelProps {
  state: AppState;
  onClose: () => void;
  onUpdateSiteConfig: (updates: Partial<SiteConfig>) => void;
  onUpdateScheduleConfig: (updates: Partial<ScheduleConfig>) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onRunAutomation: (count?: number) => Promise<{ success: boolean; productsDiscovered: number; postsCreated: number; error?: string }>;
  onImportPosts?: (products: Product[], posts: Post[]) => void;
}

export function AdminPanel({ 
  state, 
  onClose, 
  onUpdateSiteConfig,
  onUpdateScheduleConfig,
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  onRunAutomation,
  onImportPosts 
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'site' | 'categories' | 'automation' | 'import'>('site');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryWeight, setNewCategoryWeight] = useState(2);
  const [newCategoryTags, setNewCategoryTags] = useState('');
  
  // Site config state
  const [siteName, setSiteName] = useState(state.siteConfig.name);
  const [tagline, setTagline] = useState(state.siteConfig.tagline);
  const [affiliateId, setAffiliateId] = useState(state.siteConfig.affiliateId);
  const [saved, setSaved] = useState(false);

  // Schedule config state
  const [postsPerDay, setPostsPerDay] = useState(state.scheduleConfig.postsPerDay);
  const [quietDays, setQuietDays] = useState(state.scheduleConfig.quietDays.join(', '));

  const handleSaveSiteConfig = () => {
    onUpdateSiteConfig({
      name: siteName,
      tagline,
      affiliateId,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveScheduleConfig = () => {
    onUpdateScheduleConfig({
      postsPerDay,
      quietDays: quietDays.split(',').map(d => d.trim()).filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRunAutomation = async () => {
    setIsRunning(true);
    setRunResult(null);
    const result = await onRunAutomation();
    setIsRunning(false);
    setRunResult({
      success: result.success,
      message: result.success 
        ? `Discovered ${result.productsDiscovered} mugs and created ${result.postsCreated} posts!`
        : `Error: ${result.error}`,
    });
    setTimeout(() => setRunResult(null), 5000);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-');
    const tags = newCategoryTags.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
    
    onAddCategory({
      name: newCategoryName.trim(),
      slug,
      weight: newCategoryWeight,
      searchTerms: [slug],
      tags: tags.length > 0 ? tags : ['general'],
      triviaHooks: ['fun facts'],
      isActive: true,
    });
    
    setNewCategoryName('');
    setNewCategoryWeight(2);
    setNewCategoryTags('');
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(11,13,16,0.92)] backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#11141A] rounded-2xl border border-[rgba(242,242,242,0.06)] overflow-hidden flex flex-col fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(242,242,242,0.06)]">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#FF6A3D]" />
            <h2 className="text-xl font-bold text-[#F2F2F2]">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(242,242,242,0.06)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-[rgba(242,242,242,0.06)]">
          <button
            onClick={() => setActiveTab('site')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'site' 
                ? 'bg-[#FF6A3D] text-white' 
                : 'text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(242,242,242,0.06)]'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Site & Schedule
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'categories' 
                ? 'bg-[#FF6A3D] text-white' 
                : 'text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(242,242,242,0.06)]'
            }`}
          >
            <Tag className="w-4 h-4" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'automation' 
                ? 'bg-[#FF6A3D] text-white' 
                : 'text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(242,242,242,0.06)]'
            }`}
          >
            <Zap className="w-4 h-4" />
            Automation
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'import' 
                ? 'bg-[#FF6A3D] text-white' 
                : 'text-[#A6A7AD] hover:text-[#F2F2F2] hover:bg-[rgba(242,242,242,0.06)]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'site' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#A6A7AD] mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full bg-[#0B0D10] border border-[rgba(242,242,242,0.12)] rounded-lg px-4 py-3 text-[#F2F2F2] placeholder-[#A6A7AD]/50 focus:outline-none focus:border-[#FF6A3D] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A6A7AD] mb-2">
                  Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-[#0B0D10] border border-[rgba(242,242,242,0.12)] rounded-lg px-4 py-3 text-[#F2F2F2] placeholder-[#A6A7AD]/50 focus:outline-none focus:border-[#FF6A3D] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A6A7AD] mb-2">
                  Amazon Affiliate ID
                </label>
                <input
                  type="text"
                  value={affiliateId}
                  onChange={(e) => setAffiliateId(e.target.value)}
                  className="w-full bg-[#0B0D10] border border-[rgba(242,242,242,0.12)] rounded-lg px-4 py-3 text-[#F2F2F2] placeholder-[#A6A7AD]/50 focus:outline-none focus:border-[#FF6A3D] transition-colors"
                />
              </div>

              <button
                onClick={handleSaveSiteConfig}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-all ${
                  saved 
                    ? 'bg-green-500 text-white' 
                    : 'bg-[#FF6A3D] hover:bg-[#ff7a52] text-white'
                }`}
              >
                {saved ? 'Saved!' : 'Save Site Config'}
              </button>

              <div className="border-t border-[rgba(242,242,242,0.06)] pt-6">
                <div>
                  <label className="block text-sm font-medium text-[#A6A7AD] mb-2">
                    Posts Per Day: <span className="text-[#FF6A3D]">{postsPerDay}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(Number(e.target.value))}
                    className="w-full accent-[#FF6A3D]"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#A6A7AD] mb-2">
                    Quiet Days (comma separated)
                  </label>
                  <input
                    type="text"
                    value={quietDays}
                    onChange={(e) => setQuietDays(e.target.value)}
                    placeholder="e.g., Sunday"
                    className="w-full bg-[#0B0D10] border border-[rgba(242,242,242,0.12)] rounded-lg px-4 py-3 text-[#F2F2F2] placeholder-[#A6A7AD]/50 focus:outline-none focus:border-[#FF6A3D] transition-colors"
                  />
                  <p className="text-xs text-[#A6A7AD]/60 mt-1">
                    Days when no posts will be auto-generated
                  </p>
                </div>

                <button
                  onClick={handleSaveScheduleConfig}
                  className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-[#FF6A3D] hover:bg-[#ff7a52] text-white rounded-lg font-semibold transition-all"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Add New Category */}
              <div className="bg-[#0B0D10] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#A6A7AD] mb-3">Add New Category</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="w-full bg-[#11141A] border border-[rgba(242,242,242,0.12)] rounded-lg px-4 py-2.5 text-[#F2F2F2] placeholder-[#A6A7AD]/50 focus:outline-none focus:border-[#FF6A3D] transition-colors"
                  />
                  <div>
                    <label className="text-xs text-[#A6A7AD]">Weight: {newCategoryWeight}</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={newCategoryWeight}
                      onChange={(e) => setNewCategoryWeight(Number(e.target.value))}
                      className="w-full accent-[#FF6A3D]"
                    />
                  </div>
                  <input
                    type="text"
                    value={newCategoryTags}
                    onChange={(e) => setNewCategoryTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="w-full bg-[#11141A] border border-[rgba(242,242,242,0.12)] rounded-lg px-4 py-2.5 text-[#F2F2F2] placeholder-[#A6A7AD]/50 focus:outline-none focus:border-[#FF6A3D] transition-colors"
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF6A3D] hover:bg-[#ff7a52] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>
              </div>

              {/* Existing Categories */}
              <div>
                <h3 className="text-sm font-medium text-[#A6A7AD] mb-3">Existing Categories</h3>
                <div className="space-y-2">
                  {state.categories.map((cat) => (
                    <div 
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-[#0B0D10] rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#F2F2F2]">{cat.name}</span>
                          <span className="text-xs text-[#A6A7AD] bg-[rgba(242,242,242,0.06)] px-2 py-0.5 rounded-full">
                            weight: {cat.weight}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {cat.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs text-[#A6A7AD] bg-[rgba(242,242,242,0.06)] px-2 py-0.5 rounded-full capitalize">
                              {tag.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateCategory(cat.id, { isActive: !cat.isActive })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            cat.isActive 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-[rgba(242,242,242,0.06)] text-[#A6A7AD]'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-2 text-[#A6A7AD] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-6">
              {/* Run Now */}
              <div className="bg-[#0B0D10] rounded-xl p-6 text-center">
                <Zap className="w-10 h-10 text-[#FF6A3D] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#F2F2F2] mb-2">Run Discovery Now</h3>
                <p className="text-sm text-[#A6A7AD] mb-4">
                  Manually trigger mug discovery and content generation
                </p>
                <button
                  onClick={handleRunAutomation}
                  disabled={isRunning}
                  className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-[#FF6A3D] hover:bg-[#ff7a52] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-all hover:-translate-y-0.5"
                >
                  {isRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Now
                    </>
                  )}
                </button>
                
                {runResult && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    runResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {runResult.message}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0B0D10] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#FF6A3D]">{state.products.length}</div>
                  <div className="text-xs text-[#A6A7AD] mt-1">Mugs</div>
                </div>
                <div className="bg-[#0B0D10] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#FF6A3D]">{state.posts.filter(p => p.isPublished).length}</div>
                  <div className="text-xs text-[#A6A7AD] mt-1">Posts</div>
                </div>
                <div className="bg-[#0B0D10] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#FF6A3D]">
                    {state.posts.reduce((acc, p) => acc + p.clicks, 0)}
                  </div>
                  <div className="text-xs text-[#A6A7AD] mt-1">Clicks</div>
                </div>
              </div>

              {/* Last Run */}
              <div className="bg-[#0B0D10] rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-[#A6A7AD] mb-2">
                  <Clock className="w-4 h-4" />
                  Last Run
                </div>
                <div className="text-[#F2F2F2]">
                  {formatTime(state.scheduleConfig.lastRunAt)}
                </div>
              </div>

              {/* Recent Logs */}
              <div>
                <h3 className="text-sm font-medium text-[#A6A7AD] mb-3">Recent Activity</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-hide">
                  {state.logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-xs py-2 border-b border-[rgba(242,242,242,0.04)] last:border-0">
                      <span className="mono text-[#A6A7AD]/50 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="mono text-[#FF6A3D]">{log.action}</span>
                      <span className="text-[#A6A7AD]">{log.details}</span>
                    </div>
                  ))}
                  {state.logs.length === 0 && (
                    <div className="text-xs text-[#A6A7AD]/50 py-2">No activity yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-[#0B0D10] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#F2F2F2] mb-2">
                  Import from WordPress
                </h3>
                <p className="text-sm text-[#A6A7AD] mb-4">
                  Import your existing WordPress posts and generate 301 redirects.
                </p>
                {onImportPosts && (
                  <WordPressImport 
                    existingCategories={state.categories} 
                    onImport={onImportPosts} 
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
