import { DatabaseStorage } from './db-storage';
import { MemStorage } from './storage';
import { config } from './config';

// Lazy initialization using central configuration
let storageInstance: DatabaseStorage | MemStorage | null = null;
let initializationAttempted = false;

const getStorageInstance = () => {
  if (storageInstance) {
    return storageInstance;
  }

  if (initializationAttempted) {
    // Prevent infinite loops - return MemStorage if we already tried
    return storageInstance || new MemStorage();
  }

  initializationAttempted = true;
  
  console.log('🔍 Storage initialization:');
  console.log('  - NODE_ENV:', config.NODE_ENV);
  console.log('  - DATABASE_URL present:', config.DATABASE_URL ? 'YES' : 'NO');
  
  if (config.DATABASE_URL) {
    try {
      console.log('  - Initializing DatabaseStorage with URL:', config.DATABASE_URL.replace(/\/\/[^@]*@/, '//***:***@'));
      storageInstance = new DatabaseStorage(config.DATABASE_URL);
      console.log('✅ Successfully initialized DatabaseStorage');
      return storageInstance;
    } catch (error) {
      console.error('❌ Failed to initialize DatabaseStorage:', error);
      console.warn('  - Falling back to MemStorage');
      storageInstance = new MemStorage();
      return storageInstance;
    }
  } else {
    console.warn('⚠️ No DATABASE_URL found, using MemStorage');
    storageInstance = new MemStorage();
    return storageInstance;
  }
};

// Create a proxy object that ensures lazy initialization
export const storage = new Proxy({} as DatabaseStorage | MemStorage, {
  get(target, prop) {
    const instance = getStorageInstance();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});