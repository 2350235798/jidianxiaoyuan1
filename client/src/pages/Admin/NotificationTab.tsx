import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendNotification } from '@/api/admin';

export default function NotificationTab() {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('system');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userId.trim() || !title.trim() || !content.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    setSubmitting(true);
    try {
      await sendNotification({ userId, title, content, type });
      toast.success('通知已发送');
      setUserId('');
      setTitle('');
      setContent('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl border border-card-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold mb-4">发送系统通知</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm mb-1.5 block">用户ID</label>
            <Input placeholder="请输入用户ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div>
            <label className="text-sm mb-1.5 block">通知类型</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="system">系统通知</option>
              <option value="like">点赞通知</option>
              <option value="comment">评论通知</option>
              <option value="follow">关注通知</option>
            </select>
          </div>
          <div>
            <label className="text-sm mb-1.5 block">通知标题</label>
            <Input placeholder="请输入通知标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm mb-1.5 block">通知内容</label>
            <textarea
              className="w-full min-h-32 rounded-md border border-input bg-transparent p-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
              placeholder="请输入通知内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? '发送中...' : '发送通知'}
          </Button>
        </div>
      </div>
    </div>
  );
}
