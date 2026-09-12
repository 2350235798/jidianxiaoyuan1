import { useState, useEffect, useRef } from 'react';
import { Bell, MessageCircle, Send, ChevronLeft, CheckCheck, Clock, UserPlus, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/utils/axios';
import { useAuth } from '@client/src/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { ScrollArea } from '@client/src/components/ui/scroll-area';
import type { ApiResponse, Notification, Conversation, ChatMessage, User } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import { logger } from '@/utils/logger';

function formatTime(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
}

function formatChatTime(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'friend_request':
      return UserPlus;
    case 'audit':
      return Info;
    case 'system':
      return AlertCircle;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case 'friend_request':
      return 'bg-blue-100 text-blue-600';
    case 'audit':
      return 'bg-amber-100 text-amber-600';
    case 'system':
      return 'bg-purple-100 text-purple-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default function MessagesPage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'notifications' | 'conversations'>('conversations');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  // Chat state
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGuest || !user) return;
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isGuest, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get<ApiResponse<Notification[]>>('/api/notifications');
      if (res.data?.success && res.data.data) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      logger.error('获取通知失败', String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await axios.get<ApiResponse<Conversation[]>>('/api/chat/conversations');
      if (res.data?.success && res.data.data) {
        setConversations(res.data.data);
      }
    } catch (err) {
      logger.error('获取会话列表失败', String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await axios.post<ApiResponse>(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      logger.error('标记已读失败', String(err));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post<ApiResponse>('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('已全部标记为已读');
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const openChat = async (conv: Conversation) => {
    setActiveChat(conv);
    setMessages([]);
    try {
      const res = await axios.get<ApiResponse<ChatMessage[]>>(`/api/chat/messages/${conv.friendId}`);
      if (res.data?.success && res.data.data) {
        setMessages(res.data.data);
      }
    } catch (err) {
      logger.error('获取消息失败', String(err));
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat || sendingMsg) return;
    const content = messageInput.trim();
    setMessageInput('');
    setSendingMsg(true);

    // Optimistic
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: user!.id,
      receiverId: activeChat.friendId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await axios.post<ApiResponse<ChatMessage>>('/api/chat/messages', {
        receiverId: activeChat.friendId,
        content,
      });
      if (res.data?.success && res.data.data) {
        setMessages((prev) => prev.map((m) => (m.id.startsWith('temp_') ? res.data!.data! : m)));
      }
    } catch (err) {
      toast.error('发送失败');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp_')));
    } finally {
      setSendingMsg(false);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (isGuest || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">登录后查看消息</h2>
        <p className="text-muted-foreground mb-6">登录后即可查看通知和私信</p>
        <Button onClick={() => navigate('/login')}>去登录</Button>
      </div>
    );
  }

  // Chat view (mobile full screen)
  if (activeChat) {
    const friend: User = activeChat.friend;
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-auto md:min-h-[600px]">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <button
            onClick={() => setActiveChat(null)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors md:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium text-sm">
            {friend.avatarUrl ? (
              <Image src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              friend.nickname.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{friend.nickname}</p>
            <p className="text-xs text-muted-foreground">{maskPhone(friend.phone)}</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-muted/20">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">
                暂无消息，开始聊天吧
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-medium mr-2 shrink-0">
                      {friend.nickname.charAt(0)}
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-card border border-border rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {isMine && msg.isRead && <CheckCheck className="w-3 h-3 text-primary" />}
                      {formatChatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入消息..."
              className="rounded-full"
            />
            <Button onClick={handleSendMessage} disabled={!messageInput.trim() || sendingMsg} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-4 text-center font-medium relative transition-colors ${
              activeTab === 'notifications' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Bell className="w-4 h-4" />
              通知
              {unreadNotifications > 0 && (
                <span className="bg-red-500 text-white text-xs min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </span>
            {activeTab === 'notifications' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 py-4 text-center font-medium relative transition-colors ${
              activeTab === 'conversations' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              私信
              {unreadMessages > 0 && (
                <span className="bg-red-500 text-white text-xs min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </span>
            {activeTab === 'conversations' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading && notifications.length === 0 && conversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : activeTab === 'notifications' ? (
          <div className="space-y-3">
            {notifications.length > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                  全部已读
                </Button>
              </div>
            )}
            {notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">暂无通知</p>
              </Card>
            ) : (
              notifications.map((notif) => {
                const Icon = getNotificationIcon(notif.type);
                const colorClass = getNotificationColor(notif.type);
                return (
                  <Card
                    key={notif.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${!notif.isRead ? 'border-l-4 border-l-primary' : ''}`}
                    onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{notif.title}</p>
                          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notif.content}</p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" />
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">暂无会话</p>
                <p className="text-xs text-muted-foreground mt-1">添加好友后开始聊天吧</p>
                <Button size="sm" className="mt-4" onClick={() => navigate('/discover')}>
                  去发现
                </Button>
              </Card>
            ) : (
              conversations.map((conv) => (
                <Card
                  key={conv.friendId}
                  className="p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => openChat(conv)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium overflow-hidden">
                        {conv.friend.avatarUrl ? (
                          <Image src={conv.friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          conv.friend.nickname.charAt(0)
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center font-medium">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conv.friend.nickname}</p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {conv.lastMessage ? formatChatTime(conv.lastMessage.createdAt) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage?.content || '开始聊天吧'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
