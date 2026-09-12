import { useState, useEffect } from 'react';
import { Users, UserPlus, MessageCircle, MoreHorizontal, Check, X, Ban, Trash2, Search, UserX } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/utils/axios';
import { useAuth } from '@client/src/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Input } from '@client/src/components/ui/input';
import type { ApiResponse, Friendship } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import { logger } from '@/utils/logger';

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

export default function FriendsPage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingFriends, setPendingFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Friendship | null>(null);
  const [blockTarget, setBlockTarget] = useState<Friendship | null>(null);

  useEffect(() => {
    if (isGuest || !user) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isGuest, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'friends') {
        const res = await axios.get<ApiResponse<Friendship[]>>('/api/friends', {
          params: { status: 'accepted' },
        });
        if (res.data?.success && res.data.data) {
          setFriends(res.data.data);
        }
      } else {
        const res = await axios.get<ApiResponse<Friendship[]>>('/api/friends', {
          params: { status: 'pending' },
        });
        if (res.data?.success && res.data.data) {
          setPendingFriends(res.data.data);
        }
      }
    } catch (err) {
      logger.error('获取好友列表失败', String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await axios.post<ApiResponse>(`/api/friends/${id}/accept`);
      if (res.data?.success) {
        toast.success('已添加好友');
        setPendingFriends((prev) => prev.filter((f) => f.id !== id));
      } else {
        toast.error(res.data?.message || '操作失败');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await axios.post<ApiResponse>(`/api/friends/${id}/reject`);
      if (res.data?.success) {
        toast.success('已拒绝');
        setPendingFriends((prev) => prev.filter((f) => f.id !== id));
      } else {
        toast.error(res.data?.message || '操作失败');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      const res = await axios.delete<ApiResponse>(`/api/friends/${deleteTarget.id}`);
      if (res.data?.success) {
        toast.success('已删除好友');
        setFriends((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      } else {
        toast.error(res.data?.message || '操作失败');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const handleBlock = async () => {
    if (!blockTarget) return;
    setActionLoading(blockTarget.id);
    try {
      const res = await axios.post<ApiResponse>(`/api/friends/${blockTarget.id}/block`);
      if (res.data?.success) {
        toast.success('已拉黑');
        setFriends((prev) => prev.filter((f) => f.id !== blockTarget.id));
      } else {
        toast.error(res.data?.message || '操作失败');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
      setBlockTarget(null);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend.phone.includes(searchQuery)
  );

  if (isGuest || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">登录后查看好友</h2>
        <p className="text-muted-foreground mb-6">登录后即可管理你的好友列表</p>
        <Button onClick={() => navigate('/login')}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">好友</h1>
          <Button size="sm" onClick={() => navigate('/discover')}>
            <UserPlus className="w-4 h-4 mr-1" />
            添加好友
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-center font-medium relative transition-colors ${
              activeTab === 'friends' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            好友列表
            <span className="ml-1 text-xs">({friends.length})</span>
            {activeTab === 'friends' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-center font-medium relative transition-colors ${
              activeTab === 'requests' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            好友请求
            {pendingFriends.length > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {pendingFriends.length}
              </span>
            )}
            {activeTab === 'requests' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading && activeTab === 'friends' && friends.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : activeTab === 'friends' ? (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索好友"
                className="pl-10"
              />
            </div>

            {friends.length === 0 ? (
              <Card className="p-12 text-center">
                <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">暂无好友</p>
                <p className="text-xs text-muted-foreground mt-1">快去发现页添加好友吧</p>
                <Button size="sm" className="mt-4" onClick={() => navigate('/discover')}>
                  去添加
                </Button>
              </Card>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">未找到匹配的好友</div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friendship) => {
                  const friend = friendship.friend;
                  const isOnline = Math.random() > 0.5; // mock
                  return (
                    <Card key={friendship.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium overflow-hidden">
                            {friend.avatarUrl ? (
                              <Image src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              friend.nickname.charAt(0)
                            )}
                          </div>
                          <div
                            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${
                              isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{friend.nickname}</p>
                          <p className="text-sm text-muted-foreground">{maskPhone(friend.phone)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => navigate('/messages')}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          消息
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="shrink-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onClick={() => setBlockTarget(friendship)}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              拉黑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onClick={() => setDeleteTarget(friendship)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除好友
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {pendingFriends.length === 0 ? (
              <Card className="p-12 text-center">
                <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">暂无好友请求</p>
              </Card>
            ) : (
              pendingFriends.map((friendship) => {
                const friend = friendship.friend;
                return (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium overflow-hidden">
                        {friend.avatarUrl ? (
                          <Image src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          friend.nickname.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.nickname}</p>
                        <p className="text-sm text-muted-foreground">申请加你为好友</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(friendship.id)}
                          disabled={actionLoading === friendship.id}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(friendship.id)}
                          disabled={actionLoading === friendship.id}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除好友</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除好友 <span className="font-medium text-foreground">{deleteTarget?.friend.nickname}</span> 吗？删除后聊天记录也将被清除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading === deleteTarget?.id}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirm */}
      <AlertDialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拉黑好友</AlertDialogTitle>
            <AlertDialogDescription>
              确定要拉黑 <span className="font-medium text-foreground">{blockTarget?.friend.nickname}</span> 吗？拉黑后对方将无法再向你发送消息和好友请求。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading === blockTarget?.id}
            >
              确认拉黑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
