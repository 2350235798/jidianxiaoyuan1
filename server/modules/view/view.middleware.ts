import type { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

const DEV_VITE_PATTERNS = [
  '/@vite/',
  '/@react-refresh',
  '/@error-overlay.js',
  '/@ws-watchdog.js',
  '/src/',
  '/node_modules/',
  '/.vite/',
];

export function viewMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const originalPath = req.path;

  if (originalPath.includes('/api/') || originalPath.endsWith('/api')) {
    next();
    return;
  }

  const basePath = (process.env.CLIENT_BASE_PATH || '').replace(/\/+$/, '');
  let relPath = originalPath;
  if (basePath && relPath.startsWith(basePath)) {
    relPath = relPath.slice(basePath.length);
  }
  relPath = relPath.replace(/^\/+/, '/');

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && DEV_VITE_PATTERNS.some((p) => relPath.startsWith(p))) {
    next();
    return;
  }

  const clientDir = join(process.cwd(), 'dist/client');
  const indexPath = join(clientDir, 'index.html');

  if (!existsSync(indexPath)) {
    next();
    return;
  }

  if (relPath === '/' || !relPath.includes('.')) {
    res.sendFile(indexPath);
    return;
  }

  const filePath = join(clientDir, relPath);
  if (filePath.startsWith(clientDir) && existsSync(filePath)) {
    res.sendFile(filePath);
    return;
  }

  res.sendFile(indexPath);
}
