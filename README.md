# 芙宁娜的独幕剧场

基于 Astro 7 构建的静态个人博客。项目使用 Svelte 岛屿组件、Tailwind CSS 4 与 TypeScript，站点内容围绕芙宁娜、芙卡洛斯与枫丹主题组织。

## 功能

- 响应式博客首页、文章页、归档、分类、标签与全文搜索
- 亮色、暗色和跟随系统三种主题模式
- Markdown / MDX 内容，支持数学公式、代码高亮、Mermaid、PlantUML 与提示块
- 创作中心 `/admin/`：可视化编写 Markdown、保存草稿、上传图片、发布与管理文章
- Twikoo 评论与回复，支持服务端持久化、评论审核和管理员设置
- 动态、友链、留言板、项目展示、相册、书签导航、打赏和关于页面
- RSS、Atom、Sitemap、robots.txt 与 Open Graph 元数据
- 本地图片优化、LQIP 占位和文章随机本地封面
- Cloudflare Workers、Vercel、Netlify 等静态部署支持

## 技术栈

- [Astro](https://astro.build/) 7
- [Svelte](https://svelte.dev/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4
- TypeScript 6
- Pagefind 全文搜索
- Biome 格式化与静态检查

## 环境要求

- Node.js `>= 22.23.0`
- pnpm `>= 11`

项目通过 `preinstall` 限制包管理器为 pnpm。

## 本地运行

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在 <http://localhost:4321/>。

```bash
pnpm check       # Astro 诊断
pnpm type-check  # TypeScript 类型检查
pnpm lint        # Biome 检查并执行安全修复
pnpm format      # 格式化 src 与 scripts
pnpm build       # 生成生产构建到 dist/
pnpm preview     # 本地预览生产构建
```

## 内容管理

### 可视化发布与评论

```bash
pnpm dev:blog
```

打开 `http://127.0.0.1:4321/admin/` 进入创作中心。在本地编辑器点击“登录”即可管理文章；新文章默认是草稿，关闭“草稿”并点击“发布 → 立即发布”后保存为 `src/content/posts/<文章地址>.md`。本地保存不会自动提交或推送 Git。

此命令一起启动博客、Decap 文件代理和 Twikoo 评论服务。评论默认存放在 `.local/twikoo/`，刷新页面或重启服务不会清空；请备份该目录。文章的“允许评论”开关决定是否显示评论区。

线上发布需要配置 GitHub OAuth 和评论服务地址，静态文件本身不能接收写入。完整步骤、端口配置、评论管理与部署说明见 [博客发布与评论](docs/blog-authoring.md)。

### 新建文章

文章位于 `src/content/posts/`。新建 Markdown 文件并添加 Frontmatter：

```yaml
---
title: 文章标题
published: 2026-09-20
description: 文章摘要，会用于列表与 SEO 描述。
image: "auto"
tags: [芙宁娜, 枫丹]
category: 剧情故事
draft: false
slug: post-slug
---
```

`draft: true` 的文章不会出现在生产站点中。

### 文章封面

| `image` 值 | 行为 |
| --- | --- |
| `"auto"` | 从 `src/assets/images/DesktopWallpaper/` 随机选取一张本地图片；浏览器每次完整加载都会重新选择，连续刷新不会重复上一张。 |
| `./cover.jpg` | 使用文章所在目录中的固定图片。 |
| 站内或远程 URL | 直接使用指定图片地址。 |
| `"api"` | 使用 `src/config/coverImageConfig.ts` 的远程随机图 API；当前默认关闭。 |

随机本地封面只读取 `src/assets/images/DesktopWallpaper/` 下的 `png`、`jpg`、`jpeg`、`webp` 与 `avif` 文件。将自己的图片放进此目录后，重启开发服务器即可加入封面池。

### 动态

动态内容存放在 `src/content/dynamic/`。可直接创建 Markdown 文件，或执行：

```bash
pnpm new-d 今天心情不错，出去吃了一顿火锅
```

`pnpm new-dynamic` 与 `pnpm new-d` 等价。

### 项目与其他内容

- 项目：`src/content/projects/`
- 友链：`src/content/spec/friends.mdx`
- 站点图片与图标：`src/assets/`、`public/`
- 页面路由：`src/pages/`

## 配置

站点配置集中在 `src/config/`：

| 文件 | 用途 |
| --- | --- |
| `siteConfig.ts` | 标题、描述、语言、主题色、导航、页面开关、文章列表布局与 SEO。 |
| `profileConfig.ts` | 作者资料、头像与社交链接。 |
| `coverImageConfig.ts` | 文章详情页封面和远程随机封面 API。 |
| `backgroundWallpaper.ts` | 桌面与移动端背景壁纸。 |
| `sidebarConfig.ts` | 左右侧栏模块与布局。 |
| `commentConfig.ts` | 评论系统。 |
| `dynamicConfig.ts` | 动态页设置与数据源。 |
| `fontConfig.ts` | 字体与字体子集。 |

当前已启用的独立页面包括：友链、留言板、动态、项目、相册、书签导航和打赏。页面开关在 `src/config/siteConfig.ts` 的 `pages` 配置中维护。

## 构建与部署

```bash
pnpm build
```

构建结果位于 `dist/`。构建会生成或更新图片 LQIP、GitHub 卡片数据、字体子集和 Pagefind 搜索索引。

部署到静态托管平台时，使用：

| 配置项 | 值 |
| --- | --- |
| 安装命令 | `pnpm install` |
| 构建命令 | `pnpm build` |
| 输出目录 | `dist` |
| Node.js | `22.23.0` 或更高版本 |

部署时必须将 `PUBLIC_SITE_URL` 设置为站点最终的 HTTPS origin（例如 `https://blog.example.com`，不带路径），用于 canonical、RSS、Sitemap、Open Graph 与线上创作中心配置。

Cloudflare Workers 使用 Wrangler 的静态资产发布：把 `PUBLIC_SITE_URL` 设置为最终 HTTPS origin 后运行 `pnpm deploy:cloudflare`。该命令会先校验域名、完成全量构建，再发布 `dist/`。

推送 `main` 后，GitHub Actions 会自动以 `/www-set/` 为基础路径部署 GitHub Pages：<https://xieguu.github.io/www-set/>。

## 项目结构

```text
src/
├── assets/       # 源图片、壁纸、Logo 和字体资源
├── components/   # Astro 与 Svelte 组件
├── config/       # 站点与功能配置
├── content/      # 文章、动态、项目和结构化内容
├── layouts/      # 页面布局
├── pages/        # 文件路由和 API 路由
├── plugins/      # Markdown、Remark、Rehype 插件
├── styles/       # 全局样式与页面样式
└── utils/        # 内容、图片、URL 与配置工具

public/           # 原样静态资源
scripts/          # 构建与内容生成脚本
docs/             # 补充文档
```

## 开发约定

- 使用 Tabs 缩进、双引号和 Biome 格式化。
- Astro/Svelte 组件使用 PascalCase；配置模块使用 camelCase。
- 修改页面、内容或图片后，至少执行 `pnpm check` 与 `pnpm type-check`。
- 提交信息使用 Conventional Commits，例如 `feat: add gallery filter`。

## 致谢与许可

本项目基于 [Firefly](https://github.com/CuteLeaf/Firefly) 主题，并继承 [Fuwari](https://github.com/saicaca/fuwari) 的部分设计与实现。

项目采用 [MIT License](LICENSE)。
