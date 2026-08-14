'use client';

import { useEffect, useState } from 'react';
import { db, type PendingOrder } from '@/lib/localDb';
import axiosBase from 'axios';
import { persistGetCache, replayQueuedMutations } from '@/lib/offlineSync';
import toast from 'react-hot-toast';

function getTodayRangeForOrders() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const toLocalIso = (value: Date) => {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  return {
    startDate: toLocalIso(start),
    endDate: toLocalIso(end),
  };
}

export default function SyncManager() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const rawClient = axiosBase.create({ timeout: 15000 });

    const syncQueuedApiMutations = async () => {
      if (!navigator.onLine) return 0;

      return replayQueuedMutations(async (item) => {
        await rawClient.request({
          method: item.method,
          url: item.url,
          data: item.body,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });
    };

    const syncOrders = async () => {
      if (!navigator.onLine) return;

      try {
        const pendingOrders = await db.pendingOrders.toArray();
        const queuedMutations = await db.syncQueue.count();

        if (pendingOrders.length === 0 && queuedMutations === 0) return;

        toast.loading(
          `Syncing ${pendingOrders.length} orders and ${queuedMutations} queued changes...`,
          { id: 'sync' }
        );

        for (const order of pendingOrders) {
          try {
            const payload = { ...(order as PendingOrder) } as Record<string, unknown>;
            delete payload.id;
            delete payload.tempId;
            delete payload.createdAt;
            await rawClient.post('/api/orders', payload);

            if (order.id) {
              await db.pendingOrders.delete(order.id);
            }
          } catch (err) {
            console.error('Failed to sync order', order.tempId, err);
            break;
          }
        }

        const syncedMutations = await syncQueuedApiMutations();

        try {
          const { startDate, endDate } = getTodayRangeForOrders();
          const [ordersRes, customersRes, statsRes] = await Promise.all([
            rawClient.get(`/api/orders?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
            rawClient.get('/api/customers'),
            rawClient.get('/api/dashboard/stats'),
          ]);

          await Promise.all([
            persistGetCache(`/api/orders?startDate=${startDate}&endDate=${endDate}`, ordersRes.data),
            persistGetCache('/api/customers', customersRes.data),
            persistGetCache('/api/dashboard/stats', statsRes.data),
          ]);
        } catch (refreshError) {
          console.warn('Post-sync cache refresh failed:', refreshError);
        }

        const remainingOrders = await db.pendingOrders.count();
        const remainingMutations = await db.syncQueue.count();

        if (remainingOrders === 0 && remainingMutations === 0) {
          const message = syncedMutations > 0
            ? `Synced ${syncedMutations} queued changes. App is fully online.`
            : 'All offline orders synced successfully!';
          toast.success(message, { id: 'sync' });
        } else {
          toast.error(
            `${remainingOrders} orders and ${remainingMutations} queued changes still pending.`,
            { id: 'sync' }
          );
        }
      } catch (error) {
        console.error('Sync failed', error);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet reconnected. Syncing offline data...', { icon: '🟢' });
      syncOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Orders will be saved locally.', { icon: '🔴', duration: 4000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
