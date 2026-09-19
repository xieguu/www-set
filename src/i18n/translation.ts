// 只包含「当前站点语言」这一个语言包，由 astro.config.mjs 的
// activeTranslationPlugin 在构建期按 siteConfig.lang 解析生成。
// 这样客户端 island 不再打包用不到的其余语言（此前 6 种全量打进 translation chunk）。
import { activeTranslation } from "virtual:active-translation";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";

export type Translation = {
	[K in I18nKey]: string;
};

// en 作为最终兜底：当前语言缺某个 key（留空）时回退，保证不出现空串。
const defaultTranslation = en;

// 站点语言在构建期固定，运行时只存在 activeTranslation。
// 保留形参仅为兼容旧签名（此前会按传入语言查表）。
export function getTranslation(_lang?: string): Translation {
	return activeTranslation;
}

export function i18n(key: I18nKey): string {
	return activeTranslation[key] || defaultTranslation[key];
}
