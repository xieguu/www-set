import { spawn } from "node:child_process";
import { resolveSiteUrl } from "../src/utils/site-config-utils";

const cliArgs = process.argv.slice(2);
const dryRun = cliArgs.length === 1 && cliArgs[0] === "--dry-run";
if (cliArgs.length > 0 && !dryRun) {
	throw new Error("Usage: pnpm deploy:cloudflare [--dry-run]");
}

const configuredSiteUrl = process.env.PUBLIC_SITE_URL?.trim();
if (!configuredSiteUrl) {
	throw new Error(
		"PUBLIC_SITE_URL is required for deployment, for example https://blog.example.com",
	);
}

const siteUrl = resolveSiteUrl(configuredSiteUrl);
const parsedSiteUrl = new URL(siteUrl);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (
	parsedSiteUrl.protocol !== "https:" ||
	localHosts.has(parsedSiteUrl.hostname)
) {
	throw new Error(
		`PUBLIC_SITE_URL must be the final public HTTPS origin, received: ${siteUrl}`,
	);
}

function readPnpmCli(): string {
	const value = process.env.npm_execpath;
	if (!value) {
		throw new Error("Run this script through pnpm deploy:cloudflare.");
	}
	return value;
}

const pnpmCli = readPnpmCli();

process.env.PUBLIC_SITE_URL = siteUrl;
console.log(`Deploying ${siteUrl} from a fresh production build.`);

async function runPnpm(args: string[]): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(process.execPath, [pnpmCli, ...args], {
			env: process.env,
			stdio: "inherit",
		});
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new Error(
					signal
						? `pnpm ${args.join(" ")} stopped by ${signal}`
						: `pnpm ${args.join(" ")} exited with code ${code ?? "unknown"}`,
				),
			);
		});
	});
}

await runPnpm(["build"]);
await runPnpm(["exec", "wrangler", "deploy", ...(dryRun ? ["--dry-run"] : [])]);
