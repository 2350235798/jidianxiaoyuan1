import { useState, useEffect } from 'react';
import { Search, Flame, Sparkles, Megaphone, UserPlus, Calendar, MapPin, Hash } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/utils/axios';
import { useAuth } from '@client/src/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import type { ApiResponse, User } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import { logger } from '@/utils/logger';

const HOT_TOPICS = [
  { name: '期末复习', color: 'bg-red-100 text-red-600 border-red-200' },
  { name: '校园美食', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { name: '社团招新', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  { name: '考研交流', color: 'bg-green-100 text-green-600 border-green-200' },
  { name: '二手交易', color: 'bg-teal-100 text-teal-600 border-teal-200' },
  { name: '失物招领', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { name: '表白墙', color: 'bg-pink-100 text-pink-600 border-pink-200' },
  { name: '实习招聘', color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { name: '运动健身', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
];

const RECOMMENDED_USERS: User[] = [
  {
    id: 'rec_1',
    phone: '13800000001',
    nickname: '校园小助手',
    avatarUrl: null,
    bio: '分享校园资讯，有问必答',
    role: 'user',
    status: 'active',
    lastNameChangeAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'rec_2',
    phone: '13800000002',
    nickname: '机械系学长',
    avatarUrl: null,
    bio: '机械工程专业，热爱机器人',
    role: 'user',
    status: 'active',
    lastNameChangeAt: null,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'rec_3',
    phone: '13800000003',
    nickname: '电气小姐姐',
    avatarUrl: null,
    bio: '电气工程在读，喜欢摄影',
    role: 'user',
    status: 'active',
    lastNameChangeAt: null,
    createdAt: '2024-01-03T00:00:00.000Z',
  },
  {
    id: 'rec_4',
    phone: '13800000004',
    nickname: '计算机极客',
    avatarUrl: null,
    bio: '代码与咖啡☕',
    role: 'user',
    status: 'active',
    lastNameChangeAt: null,
    createdAt: '2024-01-04T00:00:00.000Z',
  },
];

const CAMPUS_ACTIVITIES = [
  {
    id: 1,
    title: '2024秋季运动会',
    date: '10月15日 - 10月17日',
    location: '学校体育场',
    tag: '体育',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 2,
    title: '新生迎新晚会',
    date: '9月20日 19:00',
    location: '大礼堂',
    tag: '文艺',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 3,
    title: '校园编程大赛',
    date: '10月1日 报名截止',
    location: '线上 + 线下',
    tag: '竞赛',
    gradient: 'from-blue-500 to-cyan-500',
  },
];

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function UserAvatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium shrink-0 overflow-hidden`}>
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        user.nickname.charAt(0)
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const res = await axios.get<ApiResponse<User[]>>('/api/users/search', {
        params: { keyword: keyword.trim() },
      });
      if (res.data?.success && res.data.data) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      logger.error('搜索用户失败', String(err));
    } finally {
      setSearching(false);
      setHasSearched(true);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (isGuest || !user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    setAddingId(friendId);
    try {
      const res = await axios.post<ApiResponse>('/api/friends/request', { friendId });
      if (res.data?.success) {
        toast.success('好友请求已发送');
      } else {
        toast.error(res.data?.message || '发送失败');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '发送失败');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索用户（手机号或昵称）"
          className="pl-12 h-12 rounded-xl bg-card border-card-border shadow-sm text-base"
        />
      </div>

      {/* 搜索结果 */}
      {hasSearched && keyword.trim() && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
            <span className="font-medium">搜索结果</span>
            <span className="text-xs text-muted-foreground">{searchResults.length} 人</span>
          </div>
          {searching ? (
            <div className="p-8 text-center text-muted-foreground text-sm">搜索中...</div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">未找到相关用户</div>
          ) : (
            <div className="divide-y divide-border/50">
              {searchResults.map((item: User) => (
                <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                  <UserAvatar user={item} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nickname}</p>
                    <p className="text-xs text-muted-foreground">{maskPhone(item.phone)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddFriend(item.id)}
                    disabled={addingId === item.id}
                    className="shrink-0"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    {addingId === item.id ? '发送中' : '加好友'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 未搜索时展示发现内容 */}
      {(!hasSearched || !keyword.trim()) && (
        <>
          {/* 热门话题 */}
          <Card>
            <div className="px-5 py-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="font-semibold">热门话题</h2>
            </div>
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              {HOT_TOPICS.map((topic) => (
                <button
                  key={topic.name}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all hover:scale-105 active:scale-95 ${topic.color}`}
                >
                  <Hash className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                  {topic.name}
                </button>
              ))}
            </div>
          </Card>

          {/* 推荐关注 */}
          <Card>
            <div className="px-5 py-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">推荐关注</h2>
            </div>
            <div className="px-3 pb-5 grid grid-cols-4 gap-2">
              {RECOMMENDED_USERS.map((item) => (
                <div key={item.id} className="flex flex-col items-center">
                  <div className="relative">
                    <UserAvatar user={item} size="lg" />
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      推荐
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium truncate w-full text-center">{item.nickname}</p>
                  <Button
                    size="sm"
                    variant="default"
                    className="mt-2 w-full h-7 text-xs"
                    onClick={() => handleAddFriend(item.id)}
                    disabled={addingId === item.id}
                  >
                    <UserPlus className="w-3 h-3 mr-0.5" />
                    关注
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* 校园活动 */}
          <Card>
            <div className="px-5 py-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">校园活动</h2>
            </div>
            <div className="px-5 pb-5 space-y-3">
              {CAMPUS_ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  className={`rounded-xl p-4 text-white bg-gradient-to-r ${activity.gradient} shadow-md cursor-pointer hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{activity.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/90">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {activity.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {activity.location}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                      {activity.tag}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
