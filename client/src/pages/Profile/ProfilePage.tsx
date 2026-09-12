import { useState, useEffect } from 'react';
import {
  User,
  Edit,
  FileText,
  Heart,
  Ban,
  Info,
  LogOut,
  ChevronRight,
  Camera,
  X,
  Clock,
  Sparkles,
  Users,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/utils/axios';
import { useAuth } from '@client/src/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
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
import type { ApiResponse, User as UserType, Post } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import { logger } from '@/utils/logger';

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

const NICKNAME_COOLDOWN_DAYS = 7;

function getDaysUntilNextChange(lastChangeAt: string | null): number {
  if (!lastChangeAt) return 0;
  const last = new Date(lastChangeAt).getTime();
  const now = Date.now();
  const cooldownMs = NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const remaining = cooldownMs - (now - last);
  return remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0;
}

export default function ProfilePage() {
  const { user, isGuest, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ posts: 0, likes: 0, friends: 0 });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [showMyPosts, setShowMyPosts] = useState(false);

  const daysLeft = user ? getDaysUntilNextChange(user.lastNameChangeAt) : 0;
  const canChangeNickname = daysLeft === 0;

  useEffect(() => {
    if (!user) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch posts count
      const postsRes = await axios.get<ApiResponse<{ items: Post[]; total: number }>>('/api/posts', {
        params: { userId: user?.id, pageSize: 1 },
      });
      // Fetch friends count
      const friendsRes = await axios.get<ApiResponse<{ items: unknown[]; total: number }>>('/api/friends', {
        params: { status: 'accepted' },
      });

      let postsTotal = 0;
      let likesTotal = 0;
      if (postsRes.data?.success) {
        postsTotal = postsRes.data.data?.total || 0;
      }

      // Try to get likes from posts
      if (postsTotal > 0) {
        const allPostsRes = await axios.get<ApiResponse<{ items: Post[]; total: number }>>('/api/posts', {
          params: { userId: user?.id, pageSize: 100 },
        });
        if (allPostsRes.data?.success && allPostsRes.data.data) {
          likesTotal = allPostsRes.data.data.items.reduce((sum: number, p: Post) => sum + p.likeCount, 0);
          setMyPosts(allPostsRes.data.data.items);
        }
      }

      const friendsTotal = friendsRes.data?.success ? friendsRes.data.data?.total || 0 : 0;

      setStats({ posts: postsTotal, likes: likesTotal, friends: friendsTotal });
    } catch (err) {
      logger.error('获取统计数据失败', String(err));
    }
  };

  const openEditDialog = () => {
    if (!user) return;
    setEditNickname(user.nickname);
    setEditBio(user.bio || '');
    setEditAvatarUrl(user.avatarUrl || '');
    setShowEditDialog(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editNickname.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    setSaving(true);
    try {
      const patch: { nickname?: string; avatarUrl?: string; bio?: string } = {};
      if (editNickname.trim() !== user.nickname && canChangeNickname) {
        patch.nickname = editNickname.trim();
      }
      if (editBio !== user.bio) {
        patch.bio = editBio;
      }
      if (editAvatarUrl !== (user.avatarUrl || '')) {
        patch.avatarUrl = editAvatarUrl || '';
      }

      if (Object.keys(patch).length === 0) {
        setShowEditDialog(false);
        return;
      }

      const res = await axios.patch<ApiResponse<UserType>>('/api/auth/profile', patch);
      if (res.data?.success && res.data.data) {
        updateUser(res.data.data);
        toast.success('资料已更新');
        setShowEditDialog(false);
      } else {
        toast.error(res.data?.message || '更新失败');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    setShowLogoutDialog(false);
    navigate('/');
  };

  const menuItems = [
    { icon: FileText, label: '我的帖子', onClick: () => setShowMyPosts(true) },
    { icon: Heart, label: '我的收藏', onClick: () => toast.info('功能开发中') },
    { icon: Ban, label: '黑名单', onClick: () => toast.info('功能开发中') },
    { icon: Info, label: '关于我们', onClick: () => toast.info('机电校园 v1.0.0') },
  ];

  if (isGuest || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">登录后查看个人中心</h2>
        <p className="text-muted-foreground mb-6">登录后管理你的个人信息和帖子</p>
        <Button onClick={() => navigate('/login')}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header banner */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-purple-600 px-4 pt-8 pb-16 text-white">
        <div className="absolute top-4 right-4">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={openEditDialog}>
            <Edit className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-end gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-white/30 shadow-lg">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user.nickname.charAt(0)
              )}
            </div>
            <button
              onClick={openEditDialog}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-primary rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl font-bold truncate">{user.nickname}</h1>
            <p className="text-sm text-white/80 mt-0.5">{maskPhone(user.phone)}</p>
          </div>
        </div>
        {user.bio && (
          <p className="mt-4 text-sm text-white/90 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 inline mr-1 -mt-0.5" />
            {user.bio}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 -mt-8">
        <Card className="shadow-lg">
          <div className="grid grid-cols-3 py-4">
            <div className="text-center border-r border-border/50">
              <p className="text-2xl font-bold" style={{ background: 'var(--me-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {stats.posts}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <FileText className="w-3 h-3" />
                发布
              </p>
            </div>
            <div className="text-center border-r border-border/50">
              <p className="text-2xl font-bold" style={{ background: 'var(--me-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {stats.likes}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                获赞
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ background: 'var(--me-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {stats.friends}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                好友
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Menu */}
      <div className="p-4 space-y-3">
        <Card className="overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left text-destructive hover:bg-destructive/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <span className="flex-1 font-medium">退出登录</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </Card>
      </div>

      {/* Edit profile dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
            <DialogDescription>修改你的个人信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                  {editAvatarUrl ? (
                    <Image src={editAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    editNickname.charAt(0) || 'U'
                  )}
                </div>
              </div>
              <div className="flex gap-2 w-full">
                <Input
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="头像图片链接"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <label className="text-sm font-medium">昵称</label>
              <Input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={20}
                disabled={!canChangeNickname}
                placeholder="请输入昵称"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {canChangeNickname ? (
                  <>
                    <Clock className="w-3 h-3" />
                    昵称每7天只能修改一次
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600">{daysLeft} 天后可修改昵称</span>
                  </>
                )}
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">简介</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={200}
                placeholder="介绍一下自己吧..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{editBio.length}/200</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* My posts dialog */}
      <Dialog open={showMyPosts} onOpenChange={setShowMyPosts}>
        <DialogContent className="sm:max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>我的帖子</DialogTitle>
            <DialogDescription>共 {myPosts.length} 条</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {myPosts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                还没有发布过帖子
              </div>
            ) : (
              <div className="space-y-3">
                {myPosts.map((post) => (
                  <Card key={post.id} className="p-3">
                    <p className="text-sm line-clamp-3">{post.content}</p>
                    {post.images && post.images.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {post.images.slice(0, 3).map((img: string, i: number) => (
                          <div key={i} className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
                            <Image src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>👍 {post.likeCount}</span>
                      <span>💬 {post.commentCount}</span>
                      <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMyPosts(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout confirm */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>退出登录</AlertDialogTitle>
            <AlertDialogDescription>确定要退出当前账号吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
