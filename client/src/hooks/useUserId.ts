import { useState, useEffect } from 'react';

const USER_ID_STORAGE_KEY = 'revolut_demo_user_id';

/**
 * Generate a random UUID v4
 */
function generateUUID(): string {
  // Simple UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Hook to manage anonymous user ID
 * - Generates a unique ID for each user
 * - Stores it in localStorage for persistence
 * - Creates a new ID if localStorage is cleared
 */
export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Get existing userId from localStorage or generate new one
    let existingUserId = localStorage.getItem(USER_ID_STORAGE_KEY);

    if (!existingUserId) {
      existingUserId = generateUUID();
      localStorage.setItem(USER_ID_STORAGE_KEY, existingUserId);
      console.log('[useUserId] Generated new user ID:', existingUserId);
    } else {
      console.log('[useUserId] Using existing user ID:', existingUserId);
    }

    setUserId(existingUserId);
    setIsInitialized(true);
  }, []);

  return {
    userId,
    isInitialized,
  };
}

/**
 * Get userId synchronously (for use outside of React components)
 * Returns null if not yet initialized
 */
export function getUserIdSync(): string | null {
  return localStorage.getItem(USER_ID_STORAGE_KEY);
}

/**
 * Generate a new userId (for testing purposes)
 */
export function regenerateUserId(): string {
  const newUserId = generateUUID();
  localStorage.setItem(USER_ID_STORAGE_KEY, newUserId);
  console.log('[useUserId] Regenerated user ID:', newUserId);
  return newUserId;
}
