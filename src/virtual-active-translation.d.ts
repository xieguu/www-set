// 构建期虚拟模块：只导出当前站点语言的翻译对象。
// 由 astro.config.mjs 的 activeTranslationPlugin 按 siteConfig.lang 在 Vite 构建期生成，
// 让 src/i18n/translation.ts 无需静态引入全部语言包（避免客户端全量打包）。
declare module "virtual:active-translation" {
	export const activeTranslation: import("./i18n/translation").Translation;
}
