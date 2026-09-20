// VNDB 数据抓取（不依赖 i18n / Astro 虚拟模块）。
// 单独成文件，使构建脚本（scripts/generate-vndb-covers.ts，用 tsx 纯 Node 运行）
// 能直接 import 抓取逻辑，而不会连带拉入 translation.ts 里的
// `virtual:active-translation`（仅在 astro build/dev 期存在，Node 原生 loader 不识别）。
import type { VndbUlistResponse } from "@/types/vndb";

export const VNDB_ULIST_FIELDS: string = [
	"id",
	"vote",
	"notes",
	"started",
	"finished",
	"labels{label}",
	"vn{id,title,alttitle,released,languages,platforms,image{url,thumbnail,sexual,violence},rating,votecount,length,length_minutes,developers{name},tags{name}}",
].join(",");

const VNDB_TAGS_TO_KEEP = 3;

export type VndbUlistFetchOptions = {
	apiUrl: string;
	userId: string;
	apiToken?: string;
	results: number;
	page: number;
};

export async function fetchVndbUlist(
	options: VndbUlistFetchOptions,
): Promise<VndbUlistResponse> {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": "application/json",
	};
	if (options.apiToken) {
		headers.Authorization = `Token ${options.apiToken}`;
	}

	const response = await fetch(`${options.apiUrl}/ulist`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			user: options.userId,
			fields: VNDB_ULIST_FIELDS,
			results: options.results,
			page: options.page,
		}),
	});

	if (!response.ok) {
		throw new Error(`[VNDB] 无法获取数据 (状态码: ${response.status})`);
	}

	const data = (await response.json()) as VndbUlistResponse;
	return {
		...data,
		results: data.results.map((item) => {
			const tagNames = (item.vn?.tags || [])
				.map((tag) => tag.name)
				.filter(Boolean);
			return {
				...item,
				labels: (item.labels || []).map(({ label }) => ({ label })),
				vn: {
					...item.vn,
					developers: (item.vn?.developers || []).map(({ name }) => ({ name })),
					tags: tagNames.slice(0, VNDB_TAGS_TO_KEEP).map((name) => ({ name })),
					tagCount: tagNames.length,
				},
			};
		}),
	};
}
