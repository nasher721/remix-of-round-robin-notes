import { supabase } from '@/integrations/supabase/client';
import { offlineQueue, QueuedMutation, SyncResult } from './offlineQueue';
import { toast } from 'sonner';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  results: SyncResult[];
}

type SyncProgressCallback = (progress: SyncProgress) => void;

// Table name mapping for type safety
type TableName = 'patients' | 'autotexts' | 'clinical_phrases' | 'patient_todos' | 'templates' | 'user_dictionary' | 'patient_field_history';

class SyncService {
  private isSyncing = false;
  private progressListeners: Set<SyncProgressCallback> = new Set();
  
  // Execute a single mutation using raw SQL-like approach for flexibility
  private async executeMutation(mutation: QueuedMutation): Promise<SyncResult> {
    try {
      const { table, operation, payload, entityId } = mutation;
      const tableName = table as TableName;
      
      switch (operation) {
        case 'create': {
          // Use type assertion for dynamic table access
          const { error } = await (supabase.from(tableName) as ReturnType<typeof supabase.from>)
            .insert(payload);
          
          if (error) throw error;
          break;
        }
        
        case 'update': {
          if (!entityId) throw new Error('Missing entityId for update');
          
          const { error } = await (supabase.from(tableName) as ReturnType<typeof supabase.from>)
            .update(payload)
            .eq('id', entityId);
          
          if (error) throw error;
          break;
        }
        
        case 'delete': {
          if (!entityId) throw new Error('Missing entityId for delete');
          
          const { error } = await (supabase.from(tableName) as ReturnType<typeof supabase.from>)
            .delete()
            .eq('id', entityId);
          
          if (error) throw error;
          break;
        }
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return { success: true, mutationId: mutation.id };
    } catch (error) {
      console.error(`[SyncService] Mutation failed:`, error);
      return {
        success: false,
        mutationId: mutation.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Sync all pending mutations
  async syncAll(onProgress?: SyncProgressCallback): Promise<SyncProgress> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return {
        total: 0,
        completed: 0,
        failed: 0,
        current: '',
        results: [],
      };
    }
    
    if (!navigator.onLine) {
      console.log('[SyncService] Offline, skipping sync');
      return {
        total: 0,
        completed: 0,
        failed: 0,
        current: '',
        results: [],
      };
    }
    
    this.isSyncing = true;
    offlineQueue.setSyncInProgress(true);
    
    const queue = offlineQueue.getQueue();
    const progress: SyncProgress = {
      total: queue.length,
      completed: 0,
      failed: 0,
      current: '',
      results: [],
    };
    
    if (queue.length === 0) {
      this.isSyncing = false;
      offlineQueue.setSyncInProgress(false);
      return progress;
    }
    
    console.log(`[SyncService] Starting sync of ${queue.length} mutations`);
    
    // Sort by timestamp (oldest first)
    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
    
    for (const mutation of sortedQueue) {
      progress.current = `${mutation.type}/${mutation.operation}`;
      onProgress?.(progress);
      this.notifyProgress(progress);
      
      const result = await this.executeMutation(mutation);
      progress.results.push(result);
      
      if (result.success) {
        progress.completed++;
        offlineQueue.dequeue(mutation.id);
      } else {
        progress.failed++;
        const shouldRetry = offlineQueue.markFailed(mutation.id);
        
        if (!shouldRetry) {
          console.warn(`[SyncService] Mutation permanently failed: ${mutation.id}`);
        }
      }
      
      onProgress?.(progress);
      this.notifyProgress(progress);
    }
    
    this.isSyncing = false;
    offlineQueue.setSyncInProgress(false);
    
    console.log(`[SyncService] Sync complete: ${progress.completed}/${progress.total} succeeded`);
    
    return progress;
  }
  
  // Subscribe to progress updates
  subscribeProgress(callback: SyncProgressCallback): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }
  
  private notifyProgress(progress: SyncProgress): void {
    this.progressListeners.forEach(callback => callback(progress));
  }
  
  // Check if currently syncing
  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

// Singleton instance
export const syncService = new SyncService();

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    if (offlineQueue.hasPendingMutations()) {
      toast.info('Connection restored. Syncing changes...');
      
      const result = await syncService.syncAll();
      
      if (result.failed === 0 && result.completed > 0) {
        toast.success(`Synced ${result.completed} changes successfully`);
      } else if (result.failed > 0) {
        toast.warning(`Synced ${result.completed} changes, ${result.failed} failed`);
      }
    }
  });
}
