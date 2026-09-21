// 在 astro build 之后运行 Pagefind，索引输出到 <root>/pagefind 并随站点部署。

import { spawnSync } from "node:child_process";
import { resolveSiteRoot } from "./site-root";

const siteRoot = resolveSiteRoot();

const result = spawnSync("pagefind", ["--site", siteRoot], {
	stdio: "inherit",
	// Windows 下 .bin 里是 .cmd 包装，需要 shell 才能解析到
	shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
