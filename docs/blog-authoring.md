# 博客发布与评论

## 本地使用

在项目根目录执行：

```bash
pnpm install
pnpm dev:blog
```

默认服务地址：

| 服务 | 地址 | 用途 |
| --- | --- | --- |
| 博客 | `http://127.0.0.1:4321/` | 浏览文章、发表评论与回复 |
| 创作中心 | `http://127.0.0.1:4321/admin/` | 进入编辑器和评论管理 |
| 文章代理 | `http://127.0.0.1:8081/api/v1` | Decap CMS 读写本地 Markdown 和图片 |
| 评论服务 | `http://127.0.0.1:8080/` | Twikoo 服务端与持久化存储 |

三个服务随同一命令启动，按 `Ctrl+C` 一起停止；任一服务退出时其余服务也停止。不会自动选择备用端口。若已经运行 `pnpm dev`，请先停止它，或按后文更改 `BLOG_PORT`。

本地代理固定绑定 `127.0.0.1`，使用文件系统模式，不自动创建提交、切换分支或推送仓库。本地评论模式始终使用本地数据库，不连接环境中配置的 MongoDB。

### 写一篇文章

1. 打开创作中心，点击“开始写文章”，在本地编辑器点击“登录”。
2. 填写标题和文章地址。地址使用小写英文、数字和连字符，例如 `my-first-post`。
3. 设置发布日期、摘要、封面、分类和标签；正文可切换富文本或 Markdown 编辑。
4. 保持“草稿”开启时保存的是草稿。关闭后点击“发布 → 立即发布”，保存为正式文章。
5. 返回首页查看，或访问 `/posts/my-first-post/`。本地开发环境包含草稿预览，生产构建会排除草稿。

管理文章入口也可从站点导航“我的 → 创作中心”打开。该入口在新标签页中打开独立后台，不会触发前台的 Swup 切页。

文章保存在 `src/content/posts/`，上传的媒体保存在 `public/uploads/`，封面及正文图片路径为 `/uploads/...`。这些文件应和代码一起提交。文章地址一旦发布请保持稳定，因为链接、搜索和评论都按文章地址关联。

后台当前管理 `.md` 文章。现有 `.mdx` 渲染能力保持不变，可继续直接编辑文件。文章中的 `published` 和 `updated` 支持 YAML 日期、ISO 日期字符串及带时区的 ISO 时间。

### 发表评论与回复

打开文章并滚动到评论区，填写昵称、邮箱和内容，然后发送。点击评论上的回复图标可以继续讨论。每篇文章使用独立的评论路径；留言板使用独立路径。

评论脚本只在评论区接近可视区域时加载，使用项目内的 Twikoo 资源，不依赖第三方脚本 CDN。网络错误会显示失败信息，不使用模拟评论代替服务端结果。

首次管理时在评论区点击管理图标，设置自己的管理员密码，再登录进行评论审核、删除和站点配置。公开部署前应先完成管理员初始化，并在 Twikoo 配置中设置站点域名与所需的审核规则。

默认评论数据目录是 `.local/twikoo/`，已排除出 Git。定期备份整个目录；不要把该目录放到 `public/` 或 `dist/`。停止服务后备份，恢复时将完整目录放回原位置。

### 修改端口

复制 `.env.example` 为 `.env`，按需修改端口。各端口必须不同且未被占用。也可在 PowerShell 中运行：

```powershell
$env:BLOG_PORT = "4323"
$env:CMS_PORT = "8082"
$env:TWIKOO_PORT = "8083"
pnpm dev:blog
```

本地一键启动会自动把实际站点、代理和评论地址传入博客，不必另外修改页面配置。

如需单独运行服务：

```bash
pnpm cms
pnpm comments
```

单独使用 `pnpm dev` 时，在 `.env` 中设置 `PUBLIC_TWIKOO_ENV_ID=http://127.0.0.1:8080`，并手动启动以上两个服务。默认编辑代理为 `http://127.0.0.1:8081/api/v1`，可用 `PUBLIC_CMS_PROXY_URL` 更改。

## 线上发布

博客继续使用静态构建，不在公开静态站点上启动本地文件代理。文章发布通过 GitHub，评论使用独立的 Twikoo 服务。

### GitHub 文章发布

1. 将仓库关联到现有静态部署平台，构建命令使用 `pnpm build`，发布目录为 `dist/`。
2. 按 Decap CMS 的 GitHub 后端说明配置 OAuth 服务；OAuth 应用的客户端密钥只保存在 OAuth 服务端。
3. 在部署平台设置下表中的 `PUBLIC_CMS_*` 变量，然后重新构建。
4. 打开线上 `/admin/`，进入编辑器并使用有仓库写入权限的 GitHub 账号登录。保存后由 GitHub 后端提交文件，再由部署平台重新构建发布。

| 变量 | 含义 |
| --- | --- |
| `PUBLIC_SITE_URL` | 线上站点的 HTTPS origin，例如 `https://blog.example.com`，不带路径 |
| `PUBLIC_CMS_REPO` | GitHub 仓库，默认 `xieguu/www-set` |
| `PUBLIC_CMS_BRANCH` | 内容分支，默认 `main`，应与部署平台监听分支一致 |
| `PUBLIC_CMS_AUTH_BASE_URL` | 与 Decap 兼容的 OAuth 服务根地址，例如 `https://auth.example.com` |
| `PUBLIC_TWIKOO_ENV_ID` | Twikoo 服务的公网 HTTPS 地址，例如 `https://comments.example.com` |

`PUBLIC_` 变量会进入页面，只填写公开地址与仓库信息，不填写令牌或客户端密钥。未配置 OAuth 时，线上编辑器明确显示配置提示，不会尝试访问访客电脑上的本地代理。

使用 Cloudflare Workers 静态资产托管时，先完成 Wrangler 登录并把 `PUBLIC_SITE_URL` 设置为最终 HTTPS origin，然后执行 `pnpm deploy:cloudflare`。该命令会先校验域名、运行完整生产构建，再发布 `dist/`；缺少域名、使用 HTTP 或本机地址时会直接停止。

仓库的 `main` 分支也配置了 GitHub Pages 自动部署，线上地址为 `https://xieguu.github.io/www-set/`。工作流使用 `PUBLIC_SITE_URL=https://xieguu.github.io` 与 `BASE_PATH=/www-set` 构建子路径站点。

### 评论服务部署

在持有持久化磁盘的 Node.js 主机上安装项目依赖，配置 `.env` 后执行：

```bash
pnpm comments
```

默认监听 `127.0.0.1:8080`。使用反向代理向公网提供 HTTPS，并将博客的 `PUBLIC_TWIKOO_ENV_ID` 设置为该 HTTPS 地址，重新构建博客。该地址必须真实可访问；未配置时评论保持关闭，不连接示例服务。

`TWIKOO_DATA` 指定持久化目录。`pnpm comments` 也支持 Twikoo 原生的 `MONGODB_URI` / `MONGO_URL`；这些服务端变量不带 `PUBLIC_` 前缀。也可使用 Twikoo 官方支持的独立部署方式，不必在静态托管平台上运行此进程。

文章更新需要重新构建，评论提交则直接写入评论服务，不需要重建博客。更换静态托管平台时保持文章地址和评论服务地址不变即可保留原有讨论。

## 验证命令

```bash
pnpm check
pnpm type-check
pnpm build
```

手动检查：保存草稿 → 关闭草稿并发布 → 上传封面 → 打开文章 → 评论与回复 → 刷新页面 → 重启评论服务后再次查看。正式构建中草稿不应出现在首页、文章路由、RSS 或搜索索引中。

## 上游文档

- Decap 本地代理：`https://decapcms.org/docs/decap-proxy/`
- Decap GitHub 后端：`https://decapcms.org/docs/github-backend/`
- Decap OAuth 服务：`https://decapcms.org/docs/external-oauth-clients/`
- Twikoo 自建服务：`https://twikoo.js.org/backend.html`
