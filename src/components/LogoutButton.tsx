'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/pos');
      router.refresh();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex w-full items-center gap-3 px-3 py-2 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
    >
      <LogOut size={20} />
      <span>Logout</span>
    </button>
  );
}
