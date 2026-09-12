import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Ban, CheckCircle, Shield, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminUsers, banUser, unbanUser, setUserRole } from '@/api/admin';
import type { User } from '@shared/api.interface';
import { Pagination } from './AdminCommon';

export default function UserManagementTab() {
  const [items, setItems] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [searchKw, setSearchKw] = useState('');
  const [searchRole, setSearchRole] = useState('');
  const [searchStatus, setSearchStatus] = useState('');

  const load = () => {
    setLoading(true);
    getAdminUsers({ page, pageSize, keyword: searchKw, role: searchRole, status: searchStatus })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => toast.error(err?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, searchKw, searchRole, searchStatus]);

  const handleSearch = () => {
    setPage(1);
    setSearchKw(keyword);
    setSearchRole(role);
    setSearchStatus(status);
  };

  const handleBan = async (id: string, banned: boolean) => {
    try {
      if (banned) await unbanUser(id);
      else await banUser(id);
      toast.success(banned ? '已解封' : '已封禁');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleSetRole = async (id: string, r: 'user' | 'admin') => {
    try {
      await setUserRole(id, r);
      toast.success('角色已更新');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input placeholder="手机号 / 昵称..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">全部角色</option>
          <option value="user">用户</option>
          <option value="admin">管理员</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="banned">封禁</option>
        </select>
        <Button size="sm" onClick={handleSearch}>
          <Search className="h-3.5 w-3.5 mr-1" />搜索
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">暂无用户</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">用户</th>
                <th className="text-left p-3 font-medium">手机号</th>
                <th className="text-left p-3 font-medium">角色</th>
                <th className="text-left p-3 font-medium">状态</th>
                <th className="text-left p-3 font-medium">注册时间</th>
                <th className="text-left p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {item.nickname?.[0] || '?'}
                      </div>
                      <span>{item.nickname}</span>
                    </div>
                  </td>
                  <td className="p-3">{item.phone}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                      item.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                      item.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {item.status === 'active' ? '正常' : '封禁'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      {item.status === 'active' ? (
                        <Button size="sm" variant="destructive" onClick={() => handleBan(item.id, false)}>
                          <Ban className="h-3.5 w-3.5 mr-1" />封禁
                        </Button>
                      ) : (
                        <Button size="sm" variant="default" onClick={() => handleBan(item.id, true)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />解封
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetRole(item.id, item.role === 'admin' ? 'user' : 'admin')}
                      >
                        {item.role === 'admin' ? (
                          <><ShieldOff className="h-3.5 w-3.5 mr-1" />降级</>
                        ) : (
                          <><Shield className="h-3.5 w-3.5 mr-1" />设管理员</>
                        )}
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
    </div>
  );
}
