import { useState } from 'react';
import {
  TrendingUp,
  Video,
  Flag,
  FileText,
  Users,
  Megaphone,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import OverviewTab from './OverviewTab';
import VideoReviewTab from './VideoReviewTab';
import ReportReviewTab from './ReportReviewTab';
import PostManagementTab from './PostManagementTab';
import UserManagementTab from './UserManagementTab';
import AnnouncementTab from './AnnouncementTab';
import NotificationTab from './NotificationTab';

const TABS = [
  { key: 'overview', label: '数据概览', icon: TrendingUp },
  { key: 'videos', label: '视频审核', icon: Video },
  { key: 'reports', label: '举报审核', icon: Flag },
  { key: 'posts', label: '帖子管理', icon: FileText },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'announcements', label: '公告管理', icon: Megaphone },
  { key: 'notifications', label: '通知发送', icon: Bell },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">无权限访问</h2>
        <p className="text-muted-foreground text-sm">您不是管理员，无法访问该页面</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'videos':
        return <VideoReviewTab />;
      case 'reports':
        return <ReportReviewTab />;
      case 'posts':
        return <PostManagementTab />;
      case 'users':
        return <UserManagementTab />;
      case 'announcements':
        return <AnnouncementTab />;
      case 'notifications':
        return <NotificationTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理员后台</h1>
        <p className="text-muted-foreground text-sm mt-1">管理用户、内容、举报和系统通知</p>
      </div>

      {/* Tab Navigation */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 border-b border-border min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {renderContent()}
      </div>
    </div>
  );
}
