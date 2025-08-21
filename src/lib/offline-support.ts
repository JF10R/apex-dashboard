/**
 * Offline Support Module
 * 
 * Provides comprehensive offline functionality including:
 * - Network status detection
 * - Data synchronization
 * - Cached data fallbacks
 * - Background sync when online
 */

import { Driver, RecentRace } from '@/lib/iracing-types';

// Network status interface
export interface NetworkStatus {
  online: boolean;
  since: Date;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Sync queue item interface
export interface SyncQueueItem {
  id: string;
  type: 'driver_data' | 'race_result' | 'lap_data' | 'standings';
  action: 'fetch' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

// Offline data interface
export interface OfflineData {
  drivers: Map<number, { data: Driver; timestamp: Date }>;
  races: Map<string, { data: RecentRace; timestamp: Date }>;
  lastSync: Date | null;
  version: number;
}

class OfflineSupportManager {
  private networkStatus: NetworkStatus = {
    online: navigator.onLine,
    since: new Date(),
  };

  private syncQueue: SyncQueueItem[] = [];
  private offlineData: OfflineData = {
    drivers: new Map(),
    races: new Map(),
    lastSync: null,
    version: 1,
  };

  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private syncInProgress = false;
  private readonly STORAGE_KEY = 'apex-dashboard-offline-data';
  private readonly SYNC_QUEUE_KEY = 'apex-dashboard-sync-queue';
  private readonly MAX_OFFLINE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.initializeNetworkListeners();
    this.loadOfflineData();
    this.loadSyncQueue();
    this.startPeriodicSync();
  }

  private initializeNetworkListeners() {
    // Basic online/offline detection
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Enhanced network information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange);
        this.updateNetworkStatus();
      }
    }
  }

  private handleOnline = () => {
    const wasOffline = !this.networkStatus.online;
    this.networkStatus = {
      online: true,
      since: new Date(),
    };

    this.notifyListeners();
    this.updateNetworkStatus();

    if (wasOffline) {
      console.log('🌐 Back online - starting sync process');
      this.processSyncQueue();
    }
  };

  private handleOffline = () => {
    this.networkStatus = {
      online: false,
      since: new Date(),
    };

    this.notifyListeners();
    console.log('📴 Gone offline - using cached data');
  };

  private handleConnectionChange = () => {
    this.updateNetworkStatus();
    this.notifyListeners();
  };

  private updateNetworkStatus() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkStatus = {
          ...this.networkStatus,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.networkStatus));
  }

  private loadOfflineData() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Convert Maps back from JSON
        this.offlineData = {
          ...parsed,
          drivers: new Map(parsed.drivers || []),
          races: new Map(parsed.races || []),
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null,
        };

        // Clean up old data
        this.cleanupOldData();
        console.log(`💾 Loaded offline data: ${this.offlineData.drivers.size} drivers, ${this.offlineData.races.size} races`);
      }
    } catch (error) {
      console.warn('Could not load offline data:', error);
      this.offlineData = {
        drivers: new Map(),
        races: new Map(),
        lastSync: null,
        version: 1,
      };
    }
  }

  private saveOfflineData() {
    try {
      const toStore = {
        ...this.offlineData,
        drivers: Array.from(this.offlineData.drivers.entries()),
        races: Array.from(this.offlineData.races.entries()),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Could not save offline data:', error);
    }
  }

  private loadSyncQueue() {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        console.log(`🔄 Loaded sync queue: ${this.syncQueue.length} items`);
      }
    } catch (error) {
      console.warn('Could not load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Could not save sync queue:', error);
    }
  }

  private cleanupOldData() {
    const now = Date.now();
    let driversCleaned = 0;
    let racesCleaned = 0;

    // Clean up old driver data
    for (const [custId, entry] of this.offlineData.drivers.entries()) {
      if (now - entry.timestamp.getTime() > this.MAX_OFFLINE_AGE) {
        this.offlineData.drivers.delete(custId);
        driversCleaned++;
      }
    }

    // Clean up old race data
    for (const [raceId, entry] of this.offlineData.races.entries()) {
      if (now - entry.timestamp.getTime() > this.MAX_OFFLINE_AGE) {
        this.offlineData.races.delete(raceId);
        racesCleaned++;
      }
    }

    if (driversCleaned > 0 || racesCleaned > 0) {
      console.log(`🧹 Cleaned up ${driversCleaned} old drivers and ${racesCleaned} old races`);
      this.saveOfflineData();
    }
  }

  private startPeriodicSync() {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.networkStatus.online && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 5 * 60 * 1000);
  }

  // Public API

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Subscribe to network status changes
   */
  onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Check if we're currently online
   */
  isOnline(): boolean {
    return this.networkStatus.online;
  }

  /**
   * Check if we have a good connection (not slow)
   */
  hasGoodConnection(): boolean {
    if (!this.networkStatus.online) return false;
    
    // If we have connection info, check quality
    if (this.networkStatus.effectiveType) {
      return !['slow-2g', '2g'].includes(this.networkStatus.effectiveType);
    }
    
    // Default to true if we don't have detailed info
    return true;
  }

  /**
   * Store driver data for offline use
   */
  storeDriverData(custId: number, data: Driver): void {
    this.offlineData.drivers.set(custId, {
      data,
      timestamp: new Date(),
    });
    
    this.saveOfflineData();
    console.log(`💾 Stored offline data for driver ${custId}`);
  }

  /**
   * Get cached driver data
   */
  getCachedDriverData(custId: number): Driver | null {
    const entry = this.offlineData.drivers.get(custId);
    
    if (!entry) {
      return null;
    }

    // Check if data is too old
    if (Date.now() - entry.timestamp.getTime() > this.MAX_OFFLINE_AGE) {
      this.offlineData.drivers.delete(custId);
      this.saveOfflineData();
      return null;
    }

    console.log(`💾 Using cached driver data for ${custId} (${this.getDataAge(entry.timestamp)})`);
    return entry.data;
  }

  /**
   * Store race data for offline use
   */
  storeRaceData(raceId: string, data: RecentRace): void {
    this.offlineData.races.set(raceId, {
      data,
      timestamp: new Date(),
    });
    
    this.saveOfflineData();
    console.log(`💾 Stored offline data for race ${raceId}`);
  }

  /**
   * Get cached race data
   */
  getCachedRaceData(raceId: string): RecentRace | null {
    const entry = this.offlineData.races.get(raceId);
    
    if (!entry) {
      return null;
    }

    // Check if data is too old
    if (Date.now() - entry.timestamp.getTime() > this.MAX_OFFLINE_AGE) {
      this.offlineData.races.delete(raceId);
      this.saveOfflineData();
      return null;
    }

    console.log(`💾 Using cached race data for ${raceId} (${this.getDataAge(entry.timestamp)})`);
    return entry.data;
  }

  /**
   * Add item to sync queue
   */
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void {
    const syncItem: SyncQueueItem = {
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      timestamp: new Date(),
      retries: 0,
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();

    if (this.networkStatus.online) {
      // Try to process immediately if online
      setTimeout(() => this.processSyncQueue(), 100);
    }
  }

  /**
   * Process pending sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.networkStatus.online || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Processing sync queue: ${this.syncQueue.length} items`);

    const itemsToRemove: string[] = [];
    const itemsToRetry: SyncQueueItem[] = [];

    for (const item of this.syncQueue) {
      try {
        await this.processSyncItem(item);
        itemsToRemove.push(item.id);
        console.log(`✅ Synced: ${item.type} ${item.action}`);
      } catch (error) {
        console.warn(`❌ Sync failed for ${item.type} ${item.action}:`, error);
        
        if (item.retries < item.maxRetries) {
          itemsToRetry.push({
            ...item,
            retries: item.retries + 1,
          });
        } else {
          console.warn(`🚫 Giving up on sync item after ${item.maxRetries} retries:`, item);
          itemsToRemove.push(item.id);
        }
      }
    }

    // Update sync queue
    this.syncQueue = this.syncQueue
      .filter(item => !itemsToRemove.includes(item.id))
      .concat(itemsToRetry);

    this.saveSyncQueue();
    this.syncInProgress = false;

    if (itemsToRemove.length > 0) {
      console.log(`🔄 Sync complete: ${itemsToRemove.length} items processed`);
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // This would integrate with your actual API calls
    // For now, we'll just simulate the sync
    
    switch (item.type) {
      case 'driver_data':
        // Re-fetch driver data
        break;
      case 'race_result':
        // Re-fetch race results
        break;
      case 'lap_data':
        // Re-fetch lap data
        break;
      case 'standings':
        // Re-fetch standings
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get human-readable data age
   */
  private getDataAge(timestamp: Date): string {
    const now = Date.now();
    const age = now - timestamp.getTime();
    
    const minutes = Math.floor(age / (1000 * 60));
    const hours = Math.floor(age / (1000 * 60 * 60));
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} old`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} old`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} old`;
    } else {
      return 'just now';
    }
  }

  /**
   * Get offline data statistics
   */
  getOfflineStats() {
    const stats = {
      online: this.networkStatus.online,
      connection: this.networkStatus.effectiveType || 'unknown',
      driversStored: this.offlineData.drivers.size,
      racesStored: this.offlineData.races.size,
      syncQueueLength: this.syncQueue.length,
      lastSync: this.offlineData.lastSync,
      dataVersion: this.offlineData.version,
    };

    return stats;
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    this.offlineData = {
      drivers: new Map(),
      races: new Map(),
      lastSync: null,
      version: 1,
    };
    
    this.syncQueue = [];
    
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SYNC_QUEUE_KEY);
      console.log('🗑️ Cleared all offline data');
    } catch (error) {
      console.warn('Could not clear offline data:', error);
    }
  }

  /**
   * Force sync now (if online)
   */
  async forceSyncNow(): Promise<void> {
    if (this.networkStatus.online && !this.syncInProgress) {
      await this.processSyncQueue();
    }
  }

  // Cleanup
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }
  }
}

// Global instance
export const offlineManager = new OfflineSupportManager();

// React hook for components
export const useOfflineSupport = () => {
  const [networkStatus, setNetworkStatus] = React.useState(offlineManager.getNetworkStatus());

  React.useEffect(() => {
    return offlineManager.onNetworkStatusChange(setNetworkStatus);
  }, []);

  return {
    networkStatus,
    isOnline: offlineManager.isOnline(),
    hasGoodConnection: offlineManager.hasGoodConnection(),
    storeDriverData: offlineManager.storeDriverData.bind(offlineManager),
    getCachedDriverData: offlineManager.getCachedDriverData.bind(offlineManager),
    storeRaceData: offlineManager.storeRaceData.bind(offlineManager),
    getCachedRaceData: offlineManager.getCachedRaceData.bind(offlineManager),
    addToSyncQueue: offlineManager.addToSyncQueue.bind(offlineManager),
    getOfflineStats: offlineManager.getOfflineStats.bind(offlineManager),
    clearOfflineData: offlineManager.clearOfflineData.bind(offlineManager),
    forceSyncNow: offlineManager.forceSyncNow.bind(offlineManager),
  };
};

// Network status component
export const NetworkStatusIndicator: React.FC = () => {
  const { networkStatus, hasGoodConnection } = useOfflineSupport();

  if (networkStatus.online && hasGoodConnection) {
    return null; // Don't show anything when everything is good
  }

  return (
    <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-md text-sm font-medium ${
      networkStatus.online 
        ? 'bg-orange-500 text-white' 
        : 'bg-red-500 text-white'
    }`}>
      {networkStatus.online ? (
        `Slow Connection${networkStatus.effectiveType ? ` (${networkStatus.effectiveType})` : ''}`
      ) : (
        'Offline - Using Cached Data'
      )}
    </div>
  );
};