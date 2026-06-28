import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getPendingCount } from '../api/friends';
import { getUnreadCount as getNotifUnread } from '../api/notifications';
import { getUnreadCount as getMsgUnread } from '../api/messages';
import AdBanner from '../components/AdBanner';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['friendsPendingCount'],
    queryFn: getPendingCount,
    refetchInterval: 30000,
  });

  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: getNotifUnread,
    refetchInterval: 15000,
  });

  const { data: msgCount = 0 } = useQuery({
    queryKey: ['messagesUnread'],
    queryFn: getMsgUnread,
    refetchInterval: 15000,
  });

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold text-indigo-600">ToT</NavLink>
          <nav className="flex items-center gap-4">
            <NavLink to="/" className={navLinkClass}>Feed</NavLink>
            <NavLink to="/explore" className={navLinkClass}>Explore</NavLink>
            <NavLink to="/search" className={navLinkClass}>Search</NavLink>
            <NavLink to="/friends" className={({ isActive }) => `relative ${navLinkClass({ isActive })}`}>
              Friends
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => `relative ${navLinkClass({ isActive })}`} aria-label="Notifications">
              🔔
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/messages" className={({ isActive }) => `relative ${navLinkClass({ isActive })}`} aria-label="Messages">
              ✉
              {msgCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {msgCount > 9 ? '9+' : msgCount}
                </span>
              )}
            </NavLink>
            {user && (
              <>
                <NavLink to="/settings" className={navLinkClass} title="Settings">⚙</NavLink>
                <NavLink to={`/profile/${user.username}`} className="text-gray-600 hover:text-gray-900">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-sm">
                      {(user.display_name || user.username)[0]?.toUpperCase()}
                    </div>
                  )}
                </NavLink>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content with sidebar ad */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 flex gap-6">
        <main className="flex-1 max-w-2xl mx-auto min-w-0">
          <Outlet />
        </main>
        <aside className="hidden lg:block w-[300px] shrink-0">
          <div className="sticky top-20">
            <AdBanner slot="SIDEBAR_SLOT_1" format="rectangle" className="mb-4" />
            <AdBanner slot="SIDEBAR_SLOT_2" format="rectangle" />
          </div>
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden">
        <div className="flex justify-around py-2">
          <NavLink to="/" className={({ isActive }) => `text-sm ${isActive ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Feed">
            Feed
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `text-sm ${isActive ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Search">
            🔍
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `relative text-sm ${isActive ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Notifications">
            🔔
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `relative text-sm ${isActive ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Messages">
            ✉
            {msgCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {msgCount > 9 ? '9+' : msgCount}
              </span>
            )}
          </NavLink>
          {user && (
            <NavLink to={`/profile/${user.username}`} className={({ isActive }) => `text-sm ${isActive ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Profile">
              👤
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  );
}
