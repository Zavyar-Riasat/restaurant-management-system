'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/http';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, ShoppingBag, CreditCard, Users, Loader2, Lock } from "lucide-react";
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password gate — reuses the same admin "delete order" password from
  // Settings (verified via /api/settings/verify-delete-password). If no
  // password has been set yet, that endpoint always returns valid:true,
  // so the dashboard opens immediately with no prompt, same as today.
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Silent check on first load: if no password is configured, this
  // unlocks automatically without ever showing a prompt.
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await axios.post('/api/settings/verify-delete-password', { password: '' });
        if (res.data?.valid) {
          setUnlocked(true);
        }
      } catch (error) {
        // If the check itself fails, fall back to showing the password
        // prompt rather than silently granting access.
      } finally {
        setCheckingAccess(false);
      }
    };
    checkAccess();
  }, []);

  const handleUnlock = async () => {
    setIsVerifying(true);
    try {
      const res = await axios.post('/api/settings/verify-delete-password', { password: passwordInput });
      if (res.data?.valid) {
        setUnlocked(true);
        setPasswordInput('');
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      toast.error('Failed to verify password');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/dashboard/stats');
        setStats(res.data);
      } catch (error) {
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [unlocked]);

  // Still checking whether a password is even required.
  if (checkingAccess) {
    return <div className="p-8 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  }

  // A password is required and hasn't been entered correctly yet —
  // show the lock screen instead of any dashboard content or data.
  if (!unlocked) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Lock size={22} />
          </div>
          <div>
            <h2 className="font-bold text-lg">Dashboard Locked</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter the admin password to view the dashboard.</p>
          </div>
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
            placeholder="Admin password"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center"
          />
          <button
            onClick={handleUnlock}
            disabled={isVerifying}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isVerifying ? <Loader2 className="animate-spin" size={16} /> : 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return <div className="p-8 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Revenue" value={`Rs. ${stats.todaysRevenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} trend="Live from DB" />
        <StatCard title="Today's Orders" value={stats.todaysOrderCount.toString()} icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />} trend="Live from DB" />
        <StatCard title="Pending Payments" value={`Rs. ${stats.pendingPayments.toLocaleString()}`} icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} trend="Across all orders" />
        <StatCard title="Total Customers" value={stats.totalCustomers.toString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} trend="Registered in system" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Revenue Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs${value}`} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-3 bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Top Selling Categories</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </div>
    </div>
  );
}
