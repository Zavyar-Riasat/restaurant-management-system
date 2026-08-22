'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/http';
import toast from 'react-hot-toast';
import { Loader2, Download, Upload, Trash2, Lock } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Order-delete password (Security card) — kept fully separate from the
  // General Information form/state above so nothing else is affected.
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (error: any) {
      // Log the real error so it's visible in the browser console — the
      // toast alone doesn't tell you *why* the request failed.
      console.error('GET /api/settings failed:', error?.response?.data || error);
      setLoadError(error?.response?.data?.error || 'Failed to load settings');
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeletePassword = async () => {
    if (!deletePasswordInput.trim()) {
      toast.error('Please enter a password');
      return;
    }
    setSavingPassword(true);
    try {
      await axios.put('/api/settings', { ...settings, deletePassword: deletePasswordInput.trim() });
      toast.success('Delete password updated');
      setDeletePasswordInput('');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const toastId = toast.loading('Generating backup...');
      const res = await axios.get('/api/backup');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restopos-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to download backup');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('WARNING: This will permanently overwrite your entire live database with the contents of this file! Are you absolutely sure?')) {
      e.target.value = '';
      return;
    }

    try {
      const toastId = toast.loading('Restoring database...');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          await axios.post('/api/backup', data);
          toast.success('Database restored successfully! Please refresh the page.', { id: toastId, duration: 8000 });
        } catch (err) {
          toast.error('Invalid backup file format', { id: toastId });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error('Failed to restore backup');
    }
    e.target.value = '';
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!settings) {
    return (
      <div className="max-w-4xl">
        <div className="bg-card border border-destructive/30 rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-destructive font-medium">
            Could not load settings{loadError ? `: ${loadError}` : '.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Check your server terminal for the actual error from GET /api/settings (e.g. a database connection issue).
          </p>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">General Information</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Restaurant Name</label>
              <input type="text" required value={settings.restaurantName || ''} onChange={(e) => setSettings({...settings, restaurantName: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <input type="text" value={settings.phone || ''} onChange={(e) => setSettings({...settings, phone: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <input type="text" value={settings.address || ''} onChange={(e) => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax Percentage (%)</label>
              <input type="number" required value={settings.taxPercentage || 0} onChange={(e) => setSettings({...settings, taxPercentage: Number(e.target.value)})} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency Symbol</label>
              <input type="text" required value={settings.currency || ''} onChange={(e) => setSettings({...settings, currency: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Receipt Footer Message</label>
            <textarea rows={3} value={settings.receiptFooter || ''} onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security: order-delete password, fully separate from General Information above */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Lock size={20} className="text-primary" /> Security
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Set a password that must be entered before an order can be deleted from the Orders page.
          This stops cashiers from deleting orders without your approval.
        </p>
        <div className="space-y-2 max-w-sm">
          <label className="text-sm font-medium">Order Delete Password</label>
          <input
            type="password"
            value={deletePasswordInput}
            onChange={(e) => setDeletePasswordInput(e.target.value)}
            placeholder={settings.deletePassword ? 'Enter a new password to change it' : 'Set a password'}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            {settings.deletePassword
              ? 'A delete password is currently set.'
              : 'No delete password is set yet — any cashier can delete orders.'}
          </p>
          <button
            type="button"
            onClick={handleSaveDeletePassword}
            disabled={savingPassword}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 mt-2"
          >
            {savingPassword ? <Loader2 className="animate-spin" size={18} /> : 'Save Password'}
          </button>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">Data Management & Recovery</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="border border-border p-5 rounded-xl bg-secondary/30 flex flex-col items-start gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Download size={24} />
            </div>
            <div>
              <h3 className="font-bold">Backup Data</h3>
              <p className="text-xs text-muted-foreground mt-1">Download a full snapshot of your entire database.</p>
            </div>
            <button onClick={handleDownloadBackup} className="mt-auto w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition">Download Backup</button>
          </div>

          <div className="border border-border p-5 rounded-xl bg-secondary/30 flex flex-col items-start gap-3">
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="font-bold">Restore Data</h3>
              <p className="text-xs text-muted-foreground mt-1">Upload a backup file to completely overwrite the current system.</p>
            </div>
            <label className="mt-auto w-full py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition text-center cursor-pointer">
              Restore File
              <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
            </label>
          </div>

          <div className="border border-border p-5 rounded-xl bg-secondary/30 flex flex-col items-start gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold">Trash / Recovery</h3>
              <p className="text-xs text-muted-foreground mt-1">View and restore soft-deleted items.</p>
            </div>
            <a href="/settings/recovery" className="mt-auto w-full py-2 border border-border bg-background text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition text-center">Open Trash</a>
          </div>

        </div>
      </div>
    </div>
  );
}
