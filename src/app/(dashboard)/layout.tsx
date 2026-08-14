import { LayoutDashboard, ShoppingCart, ListOrdered, Users, Settings, LogOut, Tags, Coffee, Flame } from 'lucide-react';
import { cookies } from 'next/headers';

import SyncManager from '@/components/SyncManager';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import LogoutButton from '@/components/LogoutButton';
import MobileSidebar from '@/components/MobileSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_auth')?.value === 'true';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SyncManager />
      <ServiceWorkerRegister />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col print:hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">RestoPOS</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem href="/pos" icon={<ShoppingCart size={20} />} label="POS" />
          <NavItem href="/orders" icon={<ListOrdered size={20} />} label="Orders" />
          <NavItem href="/customers" icon={<Users size={20} />} label="Customers" />
          
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Menu</p>
              </div>
              <NavItem href="/categories" icon={<Tags size={20} />} label="Categories" />
              <NavItem href="/sub-categories" icon={<Tags size={20} />} label="Sub Categories" />
              <NavItem href="/menu-items" icon={<Coffee size={20} />} label="Menu Items" />
              <NavItem href="/deals" icon={<Flame size={20} />} label="Deals" />
              
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">System</p>
              </div>
              <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-border">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <MobileSidebar isAdmin={isAdmin} />
            <h1 className="md:hidden text-lg font-bold text-primary">RestoPOS</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-foreground">{isAdmin ? 'Admin User' : 'Cashier User'}</p>
              <p className="text-muted-foreground text-xs">{isAdmin ? 'Admin' : 'Cashier'}</p>
            </div>
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {isAdmin ? 'A' : 'C'}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-muted-foreground rounded-lg hover:bg-secondary hover:text-foreground transition-colors"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
