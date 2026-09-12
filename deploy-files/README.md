
# 部署前文件替换说明

由于原始项目是在妙搭平台上开发的，部分文件为平台保护文件。
在将代码推送到 GitHub 并部署到 Vercel 之前，请按以下步骤替换文件：

## 需要替换的文件

| 原始文件路径 | 替换为 deploy-files/ 中的 | 说明 |
|------------|--------------------------|------|
| `package.json` | `package.json` | 移除平台依赖，添加独立部署依赖 |
| `vite.config.ts` | `vite.config.ts` | 替换为标准 Vite + React 配置 |
| `tsconfig.json` | `tsconfig.json` | 标准 TypeScript 配置 |
| `tsconfig.node.json` | `tsconfig.node.json` | 后端 TypeScript 配置 |
| `tsconfig.app.json` | `tsconfig.app.json` | 前端 TypeScript 配置 |
| `tailwind.config.ts` | `tailwind.config.ts` | 标准 Tailwind v4 配置 |
| `postcss.config.js` | `postcss.config.js` | PostCSS 配置（已有，确认一致） |
| `nest-cli.json` | `nest-cli.json` | Nest CLI 配置，入口改为 bootstrap |
| `client/src/index.tsx` | `index.tsx` | 移除平台 AppContainer/ErrorRender |
| `.gitignore` | `gitignore`（重命名） | 标准 .gitignore |
| `server/bootstrap.ts` | `bootstrap.ts` | 已在 server 目录下，确认存在 |
| `server/modules/view/view.middleware.ts` | — | 已在 server 目录下，确认存在 |

## 替换命令（Linux / macOS）

```bash
# 在项目根目录执行
cp deploy-files/package.json ./package.json
cp deploy-files/vite.config.ts ./vite.config.ts
cp deploy-files/tsconfig.json ./tsconfig.json
cp deploy-files/tsconfig.node.json ./tsconfig.node.json
cp deploy-files/tsconfig.app.json ./tsconfig.app.json
cp deploy-files/tailwind.config.ts ./tailwind.config.ts
cp deploy-files/postcss.config.js ./postcss.config.js
cp deploy-files/nest-cli.json ./nest-cli.json
cp deploy-files/index.tsx ./client/src/index.tsx
cp deploy-files/gitignore ./.gitignore
```

## 需要删除的目录 / 文件

```bash
rm -rf client/src/components/business-ui
rm -rf server/modules/view
rm -rf server/modules/hello
rm server/main.ts  # 用 bootstrap.ts 替代
```

## 验证

替换完成后，执行以下命令验证：

```bash
npm install
npm run build
```

如果构建成功，就可以推送到 GitHub 并部署到 Vercel 了。
