/**
 * Cache Service for AI Interview App
 * Manages caching of:
 * - Job matches
 * - Generated questions
 * - Career roadmaps
 * - Resume text
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiryMs: number;
}

interface CacheConfig {
  jobMatches: number; // 24 hours
  questions: number;  // 24 hours
  roadmap: number;    // 24 hours
  resumeText: number; // 7 days
}

class CacheService {
  private cacheConfig: CacheConfig = {
    jobMatches: 24 * 60 * 60 * 1000,      // 24 hours
    questions: 24 * 60 * 60 * 1000,        // 24 hours
    roadmap: 24 * 60 * 60 * 1000,          // 24 hours
    resumeText: 7 * 24 * 60 * 60 * 1000,   // 7 days
  };

  private localStoragePrefix = 'ai_interview_';

  /**
   * Generate cache key
   */
  private getCacheKey(type: string, identifier: string): string {
    return `${this.localStoragePrefix}${type}_${identifier}`;
  }

  /**
   * Set cache entry with expiry
   */
  set<T>(type: 'jobMatches' | 'questions' | 'roadmap' | 'resumeText', 
         identifier: string, 
         data: T): void {
    try {
      const key = this.getCacheKey(type, identifier);
      const expiryMs = this.cacheConfig[type];
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiryMs,
      };

      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Failed to cache ${type}:`, error);
      // Silently fail - cache is not critical
    }
  }

  /**
   * Get cache entry if valid and not expired
   */
  get<T>(type: 'jobMatches' | 'questions' | 'roadmap' | 'resumeText', 
          identifier: string): T | null {
    try {
      const key = this.getCacheKey(type, identifier);
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if expired
      if (age > entry.expiryMs) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`Failed to retrieve cache for ${type}:`, error);
      return null;
    }
  }

  /**
   * Check if cache exists and is valid
   */
  has(type: 'jobMatches' | 'questions' | 'roadmap' | 'resumeText', 
      identifier: string): boolean {
    return this.get(type, identifier) !== null;
  }

  /**
   * Clear specific cache entry
   */
  clear(type: 'jobMatches' | 'questions' | 'roadmap' | 'resumeText', 
        identifier: string): void {
    try {
      const key = this.getCacheKey(type, identifier);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear cache for ${type}:`, error);
    }
  }

  /**
   * Clear all cache of a specific type
   */
  clearType(type: 'jobMatches' | 'questions' | 'roadmap' | 'resumeText'): void {
    try {
      const prefix = this.getCacheKey(type, '');
      const keysToDelete: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn(`Failed to clear ${type} cache:`, error);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    try {
      const keysToDelete: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.localStoragePrefix)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats(): { totalEntries: number; storageUsed: string } {
    try {
      let totalEntries = 0;
      let storageUsed = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.localStoragePrefix)) {
          totalEntries++;
          const value = localStorage.getItem(key);
          if (value) {
            storageUsed += value.length;
          }
        }
      }

      return {
        totalEntries,
        storageUsed: `${(storageUsed / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { totalEntries: 0, storageUsed: '0 KB' };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export type for external use
export type { CacheEntry, CacheConfig };
