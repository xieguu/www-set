import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import concurrently from "concurrently";

function readPort(name: string, defaultPort: number): number {
	const port = Number(process.env[name] || defaultPort);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`${name} must be an integer between 1 and 65535.`);
	}
	return port;
}

async function ensurePortAvailable(port: number): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => server.close(() => resolve()));
	});
}

const blogPort = readPort("BLOG_PORT", 4321);
const cmsPort = readPort("CMS_PORT", 8081);
const commentsPort = readPort("TWIKOO_PORT", 8080);
const localSiteUrl = `http://127.0.0.1:${blogPort}`;
const ports = [blogPort, cmsPort, commentsPort];
if (new Set(ports).size !== ports.length) {
	throw new Error("BLOG_PORT, CMS_PORT and TWIKOO_PORT must be different.");
}
await Promise.all(ports.map(ensurePortAvailable));

console.log(`Blog: ${localSiteUrl}/`);
console.log(`Author dashboard: ${localSiteUrl}/admin/`);

const { result } = concurrently(
	[
		{
			name: "blog",
			command: "node --import tsx scripts/start-blog-site.ts",
			env: {
				BLOG_PORT: String(blogPort),
				PUBLIC_SITE_URL: localSiteUrl,
				PUBLIC_CMS_PROXY_URL: `http://127.0.0.1:${cmsPort}/api/v1`,
				PUBLIC_TWIKOO_ENV_ID: `http://127.0.0.1:${commentsPort}`,
			},
		},
		{ name: "cms", command: "pnpm cms", env: { CMS_PORT: String(cmsPort) } },
		{
			name: "comments",
			command: "pnpm comments",
			env: {
				TWIKOO_PORT: String(commentsPort),
				TWIKOO_HOST: "127.0.0.1",
				MONGODB_URI: "",
				MONGO_URL: "",
			},
		},
	],
	{
		cwd: fileURLToPath(new URL("../", import.meta.url)),
		killOthersOn: ["failure", "success"],
		prefix: "name",
	},
);

await result.catch(() => {
	process.exitCode = 1;
});
