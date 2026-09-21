import { siteConfig } from "./siteConfig";

export const cmsConfig: Record<string, unknown> = {
	load_config_file: false,
	locale: "zh_Hans",
	site_url: siteConfig.site_url,
	display_url: import.meta.env.BASE_URL,
	backend: import.meta.env.DEV
		? {
				name: "proxy",
				proxy_url:
					import.meta.env.PUBLIC_CMS_PROXY_URL ||
					"http://127.0.0.1:8081/api/v1",
			}
		: {
				name: "github",
				repo: import.meta.env.PUBLIC_CMS_REPO || "xieguu/www-set",
				branch: import.meta.env.PUBLIC_CMS_BRANCH || "main",
				base_url: import.meta.env.PUBLIC_CMS_AUTH_BASE_URL,
			},
	media_folder: "public/uploads",
	public_folder: `${import.meta.env.BASE_URL}uploads`,
	publish_mode: "simple",
	slug: { encoding: "ascii", clean_accents: true },
	collections: [
		{
			name: "posts",
			label: "文章",
			label_singular: "文章",
			folder: "src/content/posts",
			create: true,
			delete: true,
			extension: "md",
			format: "yaml-frontmatter",
			slug: "{{fields.slug}}",
			preview_path: "posts/{{fields.slug}}/",
			summary: "{{title}} · {{published}}",
			sortable_fields: ["published", "title"],
			view_filters: [
				{ label: "草稿", field: "draft", pattern: true },
				{ label: "已发布", field: "draft", pattern: false },
			],
			fields: [
				{ label: "标题", name: "title", widget: "string" },
				{
					label: "文章地址",
					name: "slug",
					widget: "string",
					pattern: ["^[a-z0-9]+(?:-[a-z0-9]+)*$", "使用小写英文、数字和连字符"],
					hint: "例如 my-first-post，发布后请保持不变，以保留链接和评论。",
				},
				{
					label: "发布日期",
					name: "published",
					widget: "datetime",
					default: "{{now}}",
					date_format: "YYYY-MM-DD",
					time_format: false,
					format: "YYYY-MM-DD",
				},
				{
					label: "草稿（关闭后对外发布）",
					name: "draft",
					widget: "boolean",
					default: true,
				},
				{ label: "摘要", name: "description", widget: "text", required: false },
				{
					label: "封面",
					name: "image",
					widget: "image",
					required: false,
					hint: "支持上传图片或填写图片地址；填写 auto 使用本地随机封面。",
				},
				{ label: "分类", name: "category", widget: "string", required: false },
				{
					label: "标签",
					name: "tags",
					widget: "list",
					default: [],
					required: false,
				},
				{ label: "置顶", name: "pinned", widget: "boolean", default: false },
				{
					label: "允许评论",
					name: "comment",
					widget: "boolean",
					default: true,
				},
				{ label: "作者", name: "author", widget: "string", required: false },
				{ label: "正文", name: "body", widget: "markdown" },
			],
		},
	],
};
