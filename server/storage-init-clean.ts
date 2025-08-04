import { DatabaseStorage } from './db-storage';
import { MemStorage } from './storage';
import { config } from './config';
import { logger } from './services/logger.service';

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
  
  logger.info('storage', 'Storage initialization', {
    nodeEnv: config.NODE_ENV,
    databaseUrlPresent: !!config.DATABASE_URL
  });
  
  if (config.DATABASE_URL) {
    try {
      const maskedUrl = config.DATABASE_URL.replace(/\/\/[^@]*@/, '//***:***@');
      logger.info('storage', 'Initializing DatabaseStorage', { url: maskedUrl });
      
      storageInstance = new DatabaseStorage(config.DATABASE_URL);
      logger.info('storage', 'Successfully initialized DatabaseStorage');
      return storageInstance;
    } catch (error) {
      logger.error('storage', 'Failed to initialize DatabaseStorage', { error });
      logger.warn('storage', 'Falling back to MemStorage');
      
      storageInstance = new MemStorage();
      return storageInstance;
    }
  } else {
    logger.warn('storage', 'No DATABASE_URL found, using MemStorage');
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