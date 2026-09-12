import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Smartphone, Lock, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@client/src/hooks/use-auth';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, enterGuestMode } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { phone?: string; password?: string } = {};

    if (!phone) {
      newErrors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      newErrors.phone = '请输入正确的11位手机号';
    }

    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码长度不能少于6位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(phone, password);
      toast.success('登录成功');
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    enterGuestMode();
    toast.success('已进入游客模式');
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-indigo-200/40 to-purple-200/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* 登录卡片 */}
      <div className="relative w-full max-w-md slide-up">
        <div className="bg-white rounded-2xl shadow-xl border border-border/50 p-8 md:p-10">
          {/* Logo 和标题 */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center mb-4 shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">机电校园</h1>
            <p className="text-muted-foreground text-sm mt-2">分享校园生活的每一刻</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 手机号 */}
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  className={`pl-10 h-11 ${errors.phone ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20' : ''}`}
                  maxLength={11}
                />
              </div>
              {errors.phone && (
                <p className="text-destructive text-xs">{errors.phone}</p>
              )}
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-10 pr-10 h-11 ${errors.password ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs">{errors.password}</p>
              )}
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90 border-0 shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>

          {/* 底部链接 */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="text-sm text-muted-foreground">
              没有账号？
              <Link to="/register" className="text-primary hover:underline ml-1 font-medium">
                去注册
              </Link>
            </div>
            <button
              type="button"
              onClick={handleGuestMode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              游客模式浏览 →
            </button>
          </div>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 机电校园 · 校园社交平台
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
