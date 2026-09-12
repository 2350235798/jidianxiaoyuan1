import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Megaphone, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api/admin';
import type { Announcement } from '@shared/api.interface';
import { Pagination, Modal } from './AdminCommon';
import { showConfirm } from '@/utils/show-confirm';

export default function AnnouncementTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expireAt, setExpireAt] = useState('');

  const load = () => {
    setLoading(true);
    getAnnouncements({ page, pageSize })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => toast.error(err?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const openCreate = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setExpireAt('');
    setShowForm(true);
  };

  const openEdit = (item: Announcement) => {
    setEditId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setExpireAt(item.expireAt ? item.expireAt.slice(0, 10) : '');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    try {
      const dto = {
        title,
        content,
        ...(expireAt ? { expireAt: new Date(expireAt).toISOString() } : {}),
      };
      if (editId) {
        await updateAnnouncement(editId, dto);
        toast.success('已更新');
      } else {
        await createAnnouncement(dto);
        toast.success('已发布');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定删除该公告？')) return;
    try {
      await deleteAnnouncement(id);
      toast.success('已删除');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">公告管理</h3>
        <Button size="sm" onClick={openCreate}>
          <Megaphone className="h-3.5 w-3.5 mr-1" />发布公告
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">暂无公告</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">标题</th>
                <th className="text-left p-3 font-medium">发布人</th>
                <th className="text-left p-3 font-medium">状态</th>
                <th className="text-left p-3 font-medium">过期时间</th>
                <th className="text-left p-3 font-medium">发布时间</th>
                <th className="text-left p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3">{item.admin?.nickname || '管理员'}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                      item.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.isActive ? '生效中' : '已过期'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {item.expireAt ? new Date(item.expireAt).toLocaleDateString() : '永久有效'}
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />编辑
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />

      {showForm && (
        <Modal title={editId ? '编辑公告' : '发布公告'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm mb-1.5 block">标题</label>
              <Input placeholder="请输入公告标题" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm mb-1.5 block">内容</label>
              <textarea
                className="w-full min-h-32 rounded-md border border-input bg-transparent p-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
                placeholder="请输入公告内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm mb-1.5 block">过期时间（可选）</label>
              <Input
                type="date"
                value={expireAt}
                onChange={(e) => setExpireAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>取消</Button>
              <Button variant="default" size="sm" onClick={handleSubmit}>
                {editId ? '保存' : '发布'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
