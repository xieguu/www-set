import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

process.env.TWIKOO_HOST ||= "127.0.0.1";
process.env.TWIKOO_PORT ||= "8080";
process.env.TWIKOO_DATA = path.resolve(
	process.env.TWIKOO_DATA || ".local/twikoo",
);
mkdirSync(process.env.TWIKOO_DATA, { recursive: true });

createRequire(import.meta.url)("tkserver");
