import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { InstallBanner } from './InstallBanner';
import { Footer } from './Footer';
import { A11yMenu } from './A11yMenu';
import { useAuth } from '../lib/auth';
import { syncRemoteNotifications } from '../lib/notifications';

export function Layout() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    syncRemoteNotifications(user.id).catch(() => {});
    const id = window.setInterval(() => {
      syncRemoteNotifications(user.id).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <div className="app-shell">
      <InstallBanner />
      <main className="app-main">
        <Outlet />
        <Footer />
      </main>
      <A11yMenu />
      <BottomNav />
    </div>
  );
}
