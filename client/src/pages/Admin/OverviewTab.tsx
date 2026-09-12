import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  FileText,
  FilePlus,
  MessageSquare,
  Video,
  Flag,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { getStatsOverview } from '@/api/admin';
import type { AdminStatsOverview } from '@shared/api.interface';

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  delta: number;
  gradient: string;
}) {
  const up = delta >= 0;
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
          style={{ background: gradient }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-xs ${up ? 'text-success' : 'text-destructive'}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{up ? '+' : ''}{delta.toFixed(1)}%</span>
        <span className="text-muted-foreground">较昨日</span>
      </div>
    </div>
  );
}

export default function OverviewTab() {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getStatsOverview()
      .then(setStats)
      .catch((err) => toast.error(err?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const trendData = [
    { day: '周一', value: 120 },
    { day: '周二', value: 180 },
    { day: '周三', value: 150 },
    { day: '周四', value: 220 },
    { day: '周五', value: 260 },
    { day: '周六', value: 310 },
    { day: '周日', value: 280 },
  ];
  const max = Math.max(...trendData.map((d) => d.value));

  if (loading || !stats) {
    return <div className="p-8 text-center text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-ai-section-type="card-list">
        <StatCard icon={Users} label="用户总数" value={stats.totalUsers} delta={5.2} gradient="linear-gradient(135deg, #3b82f6, #60a5fa)" />
        <StatCard icon={UserPlus} label="今日新增用户" value={stats.todayNewUsers} delta={12.5} gradient="linear-gradient(135deg, #10b981, #34d399)" />
        <StatCard icon={FileText} label="帖子总数" value={stats.totalPosts} delta={3.1} gradient="linear-gradient(135deg, #8b5cf6, #a78bfa)" />
        <StatCard icon={FilePlus} label="今日新增帖子" value={stats.todayNewPosts} delta={-2.4} gradient="linear-gradient(135deg, #f59e0b, #fbbf24)" />
        <StatCard icon={MessageSquare} label="评论总数" value={stats.totalComments} delta={8.7} gradient="linear-gradient(135deg, #ec4899, #f472b6)" />
        <StatCard icon={Video} label="待审核视频" value={stats.pendingVideos} delta={-15.3} gradient="linear-gradient(135deg, #06b6d4, #22d3ee)" />
        <StatCard icon={Flag} label="待处理举报" value={stats.pendingReports} delta={20.1} gradient="linear-gradient(135deg, #ef4444, #f87171)" />
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
        <h3 className="text-base font-semibold mb-4">近7日用户活跃趋势</h3>
        <div className="flex items-end gap-2 h-48">
          {trendData.map((d) => {
            const h = (d.value / max) * 100;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary/70 to-primary transition-all hover:from-primary hover:to-primary/80"
                    style={{ height: `${h}%` }}
                    title={`${d.value} 人`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
