'use client';

import { useState } from 'react';
import { Menu, X, LayoutDashboard, ShoppingCart, ListOrdered, Users, Settings, Tags, Coffee } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { usePathname } from 'next/navigation';

function NavItem({
  href,
  icon,
  label,
  isActive,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export default function MobileSidebar({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="md:hidden p-2 -ml-2 text-foreground transition-colors hover:bg-secondary rounded-lg">
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={closeSidebar}
        />
      )}

      {/* Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">RestoPOS</h1>
          <button onClick={closeSidebar} className="p-1 text-muted-foreground hover:bg-secondary rounded-md hover:text-foreground transition-colors">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} onNavigate={closeSidebar} />
          <NavItem href="/pos" icon={<ShoppingCart size={20} />} label="POS" isActive={pathname === '/pos'} onNavigate={closeSidebar} />
          <NavItem href="/orders" icon={<ListOrdered size={20} />} label="Orders" isActive={pathname === '/orders'} onNavigate={closeSidebar} />
          <NavItem href="/customers" icon={<Users size={20} />} label="Customers" isActive={pathname === '/customers'} onNavigate={closeSidebar} />
          
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Menu</p>
              </div>
              <NavItem href="/categories" icon={<Tags size={20} />} label="Categories" isActive={pathname === '/categories'} onNavigate={closeSidebar} />
              <NavItem href="/sub-categories" icon={<Tags size={20} />} label="Sub Categories" isActive={pathname === '/sub-categories'} onNavigate={closeSidebar} />
              <NavItem href="/menu-items" icon={<Coffee size={20} />} label="Menu Items" isActive={pathname === '/menu-items'} onNavigate={closeSidebar} />
              
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">System</p>
              </div>
              <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" isActive={pathname === '/settings'} onNavigate={closeSidebar} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-border">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
