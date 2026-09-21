import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

process.env.BIND_HOST = "127.0.0.1";
process.env.PORT = process.env.CMS_PORT || "8081";
process.env.MODE = "fs";
process.env.GIT_REPO_DIRECTORY = fileURLToPath(new URL("../", import.meta.url));

createRequire(import.meta.url)("decap-server");
