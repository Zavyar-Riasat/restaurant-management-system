'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/localDb';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SyncManager() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet reconnected. Syncing orders...', { icon: '🟢' });
      syncOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Orders will be saved locally.', { icon: '🔴', duration: 4000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const syncOrders = async () => {
      if (!navigator.onLine) return;
      
      try {
        const pendingOrders = await db.pendingOrders.toArray();
        if (pendingOrders.length === 0) return;

        toast.loading(`Syncing ${pendingOrders.length} offline orders...`, { id: 'sync' });

        for (const order of pendingOrders) {
          try {
            // Reconstruct the payload to match what the API expects
            const { id, tempId, createdAt, ...payload } = order as any;
            
            await axios.post('/api/orders', payload);
            
            // If successful, delete from local DB
            if (order.id) {
              await db.pendingOrders.delete(order.id);
            }
          } catch (err) {
            console.error('Failed to sync order', order.tempId, err);
          }
        }
        
        const remaining = await db.pendingOrders.count();
        if (remaining === 0) {
          toast.success('All offline orders synced successfully!', { id: 'sync' });
        } else {
          toast.error(`${remaining} orders failed to sync.`, { id: 'sync' });
        }
      } catch (error) {
        console.error('Sync failed', error);
      }
    };

    // Try syncing periodically every 2 minutes
    const interval = setInterval(syncOrders, 120000);
    
    // Initial check
    syncOrders();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-pulse">
          <span className="h-3 w-3 bg-white rounded-full"></span> Offline Mode Active
        </div>
      )}
    </>
  );
}
