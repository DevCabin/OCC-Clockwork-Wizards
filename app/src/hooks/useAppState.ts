// NerdyMugs - Global State Hook

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Product, Post, Category, SiteConfig, ScheduleConfig, Filter } from '@/types';
import {
  loadState,
  saveState,
  addProduct,
  updateProduct,
  deleteProduct,
  addPost,
  updatePost,
  deletePost,
  incrementClicks,
  addCategory,
  updateCategory,
  deleteCategory,
  updateSiteConfig,
  updateScheduleConfig,
  addLog,
  getPublishedPosts,
  getPostWithProduct,
  getPostsByCategory,
  getPostsByTag,
  getAllTags,
  getActiveCategories,
} from '@/lib/db';
import { runNow } from '@/lib/scheduler';
import { createPost, regeneratePost } from '@/lib/contentEngine';

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef<AppState | null>(null);

  // Load state on mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    stateRef.current = loaded;
    setIsLoaded(true);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Helper to update state and save
  const updateAndSave = useCallback((updater: (s: AppState) => void) => {
    setState(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      updater(next);
      saveState(next);
      return next;
    });
  }, []);

  // Product operations
  const addNewProduct = useCallback((product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateAndSave(s => {
      addProduct(s, product);
    });
  }, [updateAndSave]);

  const editProduct = useCallback((id: string, updates: Partial<Product>) => {
    updateAndSave(s => {
      updateProduct(s, id, updates);
    });
  }, [updateAndSave]);

  const removeProduct = useCallback((id: string) => {
    updateAndSave(s => {
      deleteProduct(s, id);
    });
  }, [updateAndSave]);

  // Post operations
  const addNewPost = useCallback((post: Omit<Post, 'id' | 'publishedAt' | 'clicks'>) => {
    updateAndSave(s => {
      addPost(s, post);
    });
  }, [updateAndSave]);

  const editPost = useCallback((id: string, updates: Partial<Post>) => {
    updateAndSave(s => {
      updatePost(s, id, updates);
    });
  }, [updateAndSave]);

  const removePost = useCallback((id: string) => {
    updateAndSave(s => {
      deletePost(s, id);
    });
  }, [updateAndSave]);

  const trackClick = useCallback((postId: string) => {
    updateAndSave(s => {
      incrementClicks(s, postId);
    });
  }, [updateAndSave]);

  // Category operations
  const addNewCategory = useCallback((category: Omit<Category, 'id'>) => {
    updateAndSave(s => {
      addCategory(s, category);
    });
  }, [updateAndSave]);

  const editCategory = useCallback((id: string, updates: Partial<Category>) => {
    updateAndSave(s => {
      updateCategory(s, id, updates);
    });
  }, [updateAndSave]);

  const removeCategory = useCallback((id: string) => {
    updateAndSave(s => {
      deleteCategory(s, id);
    });
  }, [updateAndSave]);

  // Site config operations
  const editSiteConfig = useCallback((updates: Partial<SiteConfig>) => {
    updateAndSave(s => {
      updateSiteConfig(s, updates);
    });
  }, [updateAndSave]);

  // Schedule config operations
  const editScheduleConfig = useCallback((updates: Partial<ScheduleConfig>) => {
    updateAndSave(s => {
      updateScheduleConfig(s, updates);
    });
  }, [updateAndSave]);

  // Log operations
  const addNewLog = useCallback((action: string, details: string) => {
    updateAndSave(s => {
      addLog(s, action, details);
    });
  }, [updateAndSave]);

  // Content generation
  const generatePostForProduct = useCallback((product: Product) => {
    if (!stateRef.current) return null;
    return createPost(stateRef.current, product);
  }, []);

  const regeneratePostContent = useCallback((postId: string) => {
    if (!stateRef.current) return null;
    const result = regeneratePost(stateRef.current, postId);
    if (result) {
      setState({ ...stateRef.current });
    }
    return result;
  }, []);

  // Automation
  const runAutomation = useCallback(async (count?: number) => {
    if (!stateRef.current) return { success: false, productsDiscovered: 0, postsCreated: 0, error: 'State not loaded' };
    const result = await runNow(stateRef.current, count);
    setState({ ...stateRef.current });
    return result;
  }, []);

  // Query helpers
  const getFilteredPosts = useCallback((filter: Filter): Post[] => {
    if (!state) return [];
    
    switch (filter.type) {
      case 'category':
        return getPostsByCategory(state, filter.value);
      case 'tag':
        return getPostsByTag(state, filter.value);
      default:
        return getPublishedPosts(state);
    }
  }, [state]);

  const getPostDetail = useCallback((postId: string) => {
    if (!state) return null;
    return getPostWithProduct(state, postId);
  }, [state]);

  const getTags = useCallback(() => {
    if (!state) return [];
    return getAllTags(state);
  }, [state]);

  const getCategories = useCallback(() => {
    if (!state) return [];
    return getActiveCategories(state);
  }, [state]);

  return {
    state,
    isLoaded,
    // Product ops
    addNewProduct,
    editProduct,
    removeProduct,
    // Post ops
    addNewPost,
    editPost,
    removePost,
    trackClick,
    // Category ops
    addNewCategory,
    editCategory,
    removeCategory,
    // Config ops
    editSiteConfig,
    editScheduleConfig,
    // Log ops
    addNewLog,
    // Content
    generatePostForProduct,
    regeneratePostContent,
    // Automation
    runAutomation,
    // Queries
    getFilteredPosts,
    getPostDetail,
    getTags,
    getCategories,
  };
}
