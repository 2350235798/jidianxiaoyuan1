import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">页面不存在</h2>
        <p className="text-muted-foreground mb-8">你访问的页面可能已被删除或不存在</p>
        <Button onClick={() => navigate('/')}>
          <Home className="w-4 h-4 mr-2" />
          返回首页
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
