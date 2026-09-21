import { fileURLToPath } from "node:url";
import { dev } from "astro";

const server = await dev({
	root: fileURLToPath(new URL("../", import.meta.url)),
	server: { host: "127.0.0.1", port: Number(process.env.BLOG_PORT) },
	vite: { cacheDir: "node_modules/.vite-blog", server: { strictPort: true } },
});

function stop(): void {
	void server.stop().catch((error) => {
		console.error("Failed to stop the blog server:", error);
		process.exitCode = 1;
	});
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
