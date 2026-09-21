interface TwikooOptions {
	envId: string;
	region?: string;
	lang?: string;
	path: string;
	el: string;
}

interface TwikooClient {
	init: (options: TwikooOptions) => Promise<void>;
}

const browser = window as Window & { twikoo?: TwikooClient };
let scriptLoading: Promise<TwikooClient> | undefined;

function loadTwikoo(scriptUrl: string): Promise<TwikooClient> {
	if (browser.twikoo) return Promise.resolve(browser.twikoo);
	if (scriptLoading) return scriptLoading;

	scriptLoading = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = scriptUrl;
		script.async = true;
		script.onload = () => {
			if (browser.twikoo) {
				resolve(browser.twikoo);
			} else {
				scriptLoading = undefined;
				script.remove();
				reject(new Error("Twikoo script did not expose its client."));
			}
		};
		script.onerror = () => {
			scriptLoading = undefined;
			script.remove();
			reject(new Error("Unable to load the Twikoo client."));
		};
		document.head.append(script);
	});
	return scriptLoading;
}

export function registerTwikooComments(): void {
	if (customElements.get("firefly-twikoo")) return;

	class TwikooComments extends HTMLElement {
		private observer?: IntersectionObserver;
		private initializing = false;

		connectedCallback() {
			this.querySelector("[data-comment-retry]")?.addEventListener(
				"click",
				this.initialize,
			);
			this.observer = new IntersectionObserver(
				(entries) => {
					if (!entries.some((entry) => entry.isIntersecting)) return;
					this.observer?.disconnect();
					void this.initialize();
				},
				{ rootMargin: "240px" },
			);
			this.observer.observe(this);
		}

		disconnectedCallback() {
			this.observer?.disconnect();
			this.querySelector("[data-comment-retry]")?.removeEventListener(
				"click",
				this.initialize,
			);
		}

		private initialize = async (): Promise<void> => {
			if (this.initializing || this.dataset.initialized === "true") return;
			const status = this.querySelector<HTMLElement>("[data-comment-status]");
			const retry = this.querySelector<HTMLButtonElement>(
				"[data-comment-retry]",
			);
			if (!status || !retry) return;
			this.initializing = true;
			status.hidden = false;
			status.textContent = "正在加载评论…";
			retry.hidden = true;

			try {
				const config = JSON.parse(this.dataset.config ?? "") as TwikooOptions;
				const scriptUrl = this.dataset.scriptUrl;
				if (!scriptUrl || !config.envId)
					throw new Error("Missing comment configuration.");
				const requestedPath = new URLSearchParams(window.location.search).get(
					"path",
				);
				const commentPath =
					config.path.endsWith("/dynamic/") &&
					requestedPath?.startsWith(config.path)
						? requestedPath
						: config.path;
				const client = await loadTwikoo(scriptUrl);
				if (!this.isConnected) return;
				await client.init({
					...config,
					path: commentPath.replace(/\/+$/, "") || "/",
					el: "#tcomment",
				});
				if (!this.isConnected) return;
				this.dataset.initialized = "true";
				status.hidden = true;
			} catch (error) {
				if (!this.isConnected) return;
				console.error("[Twikoo] Initialization failed:", error);
				status.textContent = "评论加载失败，请确认评论服务已启动，然后重试。";
				retry.hidden = false;
			} finally {
				this.initializing = false;
			}
		};
	}

	customElements.define("firefly-twikoo", TwikooComments);
}
