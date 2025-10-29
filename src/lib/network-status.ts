import { useState, useEffect } from 'react';
import { createErrorContext } from './error-types';

export interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface OfflineQueueItem {
  id: string;
  operation: () => Promise<any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}

class NetworkStatusManager {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private offlineQueue: OfflineQueueItem[] = [];
  private isProcessingQueue = false;
  private currentStatus: NetworkStatus = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeListeners();
      this.updateNetworkInfo();
    }
  }

  private initializeListeners(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', this.updateNetworkInfo);
    }
  }

  private handleOnline = (): void => {
    this.updateStatus({ online: true });
    this.processOfflineQueue();
  };

  private handleOffline = (): void => {
    this.updateStatus({ online: false });
  };

  private updateNetworkInfo = (): void => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    }
  };

  private updateStatus(status: Partial<NetworkStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  isOnline(): boolean {
    return this.currentStatus.online;
  }

  isSlowConnection(): boolean {
    const effectiveType = this.currentStatus.effectiveType;
    return effectiveType === 'slow-2g' || effectiveType === '2g';
  }

  addToOfflineQueue(
    operation: () => Promise<any>,
    metadata?: Record<string, any>,
    maxRetries = 3
  ): string {
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.offlineQueue.push({
      id,
      operation,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
      metadata,
    });

    this.saveQueueToStorage();

    if (this.isOnline()) {
      this.processOfflineQueue();
    }

    return id;
  }

  removeFromQueue(id: string): void {
    this.offlineQueue = this.offlineQueue.filter(item => item.id !== id);
    this.saveQueueToStorage();
  }

  getQueueLength(): number {
    return this.offlineQueue.length;
  }

  getQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline() || this.offlineQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.offlineQueue.length > 0 && this.isOnline()) {
      const item = this.offlineQueue[0];

      try {
        await item.operation();
        this.offlineQueue.shift();
        console.log(`Successfully processed offline queue item: ${item.id}`);
      } catch (error) {
        console.error(`Failed to process offline queue item: ${item.id}`, error);
        item.retries++;

        if (item.retries >= item.maxRetries) {
          console.error(`Max retries reached for offline queue item: ${item.id}, removing from queue`);
          this.offlineQueue.shift();
        } else {
          this.offlineQueue.shift();
          this.offlineQueue.push(item);
        }
      }

      this.saveQueueToStorage();
    }

    this.isProcessingQueue = false;
  }

  private saveQueueToStorage(): void {
    try {
      const serializedQueue = this.offlineQueue.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        retries: item.retries,
        maxRetries: item.maxRetries,
        metadata: item.metadata,
      }));
      localStorage.setItem('offline_queue', JSON.stringify(serializedQueue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  clearQueue(): void {
    this.offlineQueue = [];
    this.saveQueueToStorage();
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', this.updateNetworkInfo);
      }
    }
    this.listeners.clear();
  }
}

export const networkStatusManager = new NetworkStatusManager();

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(networkStatusManager.getStatus());

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

export function useOnlineStatus(): boolean {
  const status = useNetworkStatus();
  return status.online;
}

export function useOfflineQueue(): {
  queueLength: number;
  queue: OfflineQueueItem[];
  addToQueue: (operation: () => Promise<any>, metadata?: Record<string, any>) => string;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
} {
  const [queueLength, setQueueLength] = useState(networkStatusManager.getQueueLength());
  const [queue, setQueue] = useState(networkStatusManager.getQueue());

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueLength(networkStatusManager.getQueueLength());
      setQueue(networkStatusManager.getQueue());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    queueLength,
    queue,
    addToQueue: (operation, metadata) => {
      const id = networkStatusManager.addToOfflineQueue(operation, metadata);
      setQueueLength(networkStatusManager.getQueueLength());
      setQueue(networkStatusManager.getQueue());
      return id;
    },
    removeFromQueue: (id) => {
      networkStatusManager.removeFromQueue(id);
      setQueueLength(networkStatusManager.getQueueLength());
      setQueue(networkStatusManager.getQueue());
    },
    clearQueue: () => {
      networkStatusManager.clearQueue();
      setQueueLength(0);
      setQueue([]);
    },
  };
}

export function isOnline(): boolean {
  return networkStatusManager.isOnline();
}

export function isSlowConnection(): boolean {
  return networkStatusManager.isSlowConnection();
}

export function addToOfflineQueue(
  operation: () => Promise<any>,
  metadata?: Record<string, any>
): string {
  return networkStatusManager.addToOfflineQueue(operation, metadata);
}
