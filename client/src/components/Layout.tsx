import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageCircle, Users, User, Bell } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { useEffect, useState } from 'react';
import axios from '@/utils/axios';
import type { ApiResponse, Announcement } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

const Layout = () => {
  const { user, isGuest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get<ApiResponse<Announcement[]>>('/api/announcements');
      if (res.data?.success && res.data.data) {
        setAnnouncements(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/discover', icon: Compass, label: '发现' },
    { path: '/messages', icon: MessageCircle, label: '消息' },
    { path: '/friends', icon: Users, label: '好友' },
    { path: '/profile', icon: User, label: '我的' },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-background flex">
      {/* 左侧导航栏 - PC端 */}
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar fixed h-screen z-30">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold" style={{ background: 'var(--me-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            机电校园
          </h1>
          <p className="text-xs text-muted-foreground mt-1">分享校园生活的每一刻</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-destructive/10 text-destructive font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-destructive/5 hover:text-destructive'
                }`
              }
            >
              <Bell className="w-5 h-5" />
              <span>管理后台</span>
            </NavLink>
          )}
        </nav>

        {user && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
                 onClick={() => navigate('/profile')}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.nickname.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.nickname}</p>
                <p className="text-xs text-muted-foreground truncate">{user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        {/* 公告栏 */}
        {announcements.length > 0 && showAnnouncement && (
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-b border-primary/20 px-4 py-2">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <span className="shrink-0 bg-primary text-white text-xs px-2 py-0.5 rounded font-medium">公告</span>
              <p className="flex-1 text-sm text-foreground/80 truncate">{announcements[0].title}</p>
              <button onClick={() => setShowAnnouncement(false)} className="shrink-0 text-muted-foreground hover:text-foreground text-sm">
                收起
              </button>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* 底部导航栏 - 移动端 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* 游客模式提示 */}
      {isGuest && location.pathname !== '/login' && location.pathname !== '/register' && (
        <div className="fixed bottom-20 md:bottom-8 md:right-8 z-40">
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all font-medium text-sm"
          >
            登录 / 注册
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;
