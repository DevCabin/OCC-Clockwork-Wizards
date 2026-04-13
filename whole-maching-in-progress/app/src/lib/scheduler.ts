// NerdyMugs - Automated Scheduler

import type { AppState } from '@/types';
import { runDiscoveryCycle } from './discovery';
import { generateContentForProducts } from './contentEngine';
import { addLog } from './db';

// Check if today is a quiet day
function isQuietDay(quietDays: string[]): boolean {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return quietDays.includes(today);
}

// Check if we should run a new cycle
export function shouldRunCycle(state: AppState): boolean {
  // Don't run on quiet days
  if (isQuietDay(state.scheduleConfig.quietDays)) {
    return false;
  }
  
  const { lastRunAt, postsPerDay } = state.scheduleConfig;
  const now = Date.now();
  const hoursSinceLastRun = (now - lastRunAt) / (1000 * 60 * 60);
  
  // Run if it's been more than 24 hours / postsPerDay
  const minimumHours = 24 / postsPerDay;
  return hoursSinceLastRun >= minimumHours;
}

// Get time until next scheduled run
export function getTimeUntilNextRun(state: AppState): number {
  // If today is quiet day, calculate until tomorrow
  if (isQuietDay(state.scheduleConfig.quietDays)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - Date.now();
  }
  
  const { lastRunAt, postsPerDay } = state.scheduleConfig;
  const minimumHours = 24 / postsPerDay;
  const nextRunTime = lastRunAt + (minimumHours * 60 * 60 * 1000);
  return Math.max(0, nextRunTime - Date.now());
}

// Format time remaining
export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Run the full automation cycle
export async function runAutomationCycle(
  state: AppState,
  targetCount?: number,
  options?: { bypassQuietDay?: boolean }
): Promise<{
  success: boolean;
  productsDiscovered: number;
  postsCreated: number;
  error?: string;
}> {
  try {
    const bypassQuietDay = Boolean(options?.bypassQuietDay);

    // Check quiet day
    if (!bypassQuietDay && isQuietDay(state.scheduleConfig.quietDays)) {
      return {
        success: false,
        productsDiscovered: 0,
        postsCreated: 0,
        error: 'Today is a quiet day - no posts scheduled',
      };
    }

    if (bypassQuietDay && isQuietDay(state.scheduleConfig.quietDays)) {
      addLog(state, 'QUIET_DAY_BYPASS', 'Manual run bypassed quiet day rule');
    }
    
    addLog(state, 'AUTOMATION_START', 'Starting automation cycle');
    
    const count = targetCount || state.scheduleConfig.postsPerDay;
    
    // Step 1: Discover products
    const products = await runDiscoveryCycle(state, count);
    
    // Step 2: Generate content
    const posts = generateContentForProducts(state, products);
    
    addLog(state, 'AUTOMATION_COMPLETE', `Discovered ${products.length} products, created ${posts.length} posts`);
    
    return {
      success: true,
      productsDiscovered: products.length,
      postsCreated: posts.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog(state, 'AUTOMATION_ERROR', errorMessage);
    return {
      success: false,
      productsDiscovered: 0,
      postsCreated: 0,
      error: errorMessage,
    };
  }
}

// Manual trigger for immediate run
export async function runNow(state: AppState, count?: number): Promise<{
  success: boolean;
  productsDiscovered: number;
  postsCreated: number;
  error?: string;
}> {
  addLog(state, 'MANUAL_TRIGGER', 'Manual automation cycle triggered');
  return runAutomationCycle(state, count, { bypassQuietDay: true });
}

// Initialize scheduler (checks periodically)
export function initScheduler(state: AppState, onCycle?: () => void): () => void {
  // Check every 5 minutes
  const intervalId = setInterval(async () => {
    if (shouldRunCycle(state)) {
      const result = await runAutomationCycle(state);
      if (result.success && onCycle) {
        onCycle();
      }
    }
  }, 5 * 60 * 1000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
