'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/http';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, RefreshCw, Trash } from 'lucide-react';
import Link from 'next/link';

export default function RecoveryPage() {
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoringAll, setRestoringAll] = useState(false);

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const res = await axios.get('/api/recovery');
      setTrashItems(res.data);
    } catch (error) {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string, type: string) => {
    setRestoringId(id);
    try {
      await axios.post('/api/recovery', { id, type });
      toast.success(`${type} restored successfully`);
      fetchTrash();
    } catch (error) {
      toast.error('Failed to restore item');
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreAll = async () => {
    if (trashItems.length === 0) return;
    if (!confirm('Are you sure you want to restore all items in the trash?')) return;
    
    setRestoringAll(true);
    const toastId = toast.loading('Restoring all items...');
    try {
      // Create a batch request or loop through
      for (const item of trashItems) {
        await axios.post('/api/recovery', { id: item.id, type: item.type });
      }
      toast.success('All items restored successfully!', { id: toastId });
      fetchTrash();
    } catch (error) {
      toast.error('Some items failed to restore', { id: toastId });
      fetchTrash();
    } finally {
      setRestoringAll(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Trash / Recovery</h1>
            <p className="text-muted-foreground text-sm mt-1">View and restore accidentally deleted items.</p>
          </div>
        </div>
        
        {trashItems.length > 0 && (
          <button 
            onClick={handleRestoreAll}
            disabled={restoringAll}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            {restoringAll ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Restore All
          </button>
        )}
      </div>
      
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : trashItems.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground opacity-70">
            <Trash size={48} className="mb-4" />
            <p>The trash is completely empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Item Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Deleted At</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trashItems.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{item.name || 'Unnamed Item'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium border border-border">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(item.deletedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleRestore(item.id, item.type)}
                        disabled={restoringId === item.id}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium transition disabled:opacity-50"
                      >
                        {restoringId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
