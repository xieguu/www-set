import { navBarConfig, siteConfig } from "@/config";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { NavBarLink } from "@/types/navBarConfig";
import { resolveNavbarLinks } from "@/utils/navbar-i18n";
import { url } from "@/utils/url-utils";

/** 右上角跳转按钮的解析结果，Navbar 与 NavMenuPanel 共用 */
export type ResolvedTopRightLink = {
	/** 是否显示（enable 且配置了 url） */
	show: boolean;
	/** 最终跳转地址：外部链接原样，站内路径经 url() 处理 base */
	href: string;
	/** 是否在新标签页打开 */
	openNewTab: boolean;
	/** 悬停提示与无障碍标签文本 */
	title: string;
	/** 图标名，回退到默认火箭图标 */
	icon: string;
	/** 是否在移动端隐藏 */
	hideOnMobile: boolean;
	/** 图标是否跟随主题色 */
	followTheme: boolean;
};

/** 解析右上角跳转按钮配置，统一 href / 新标签页 / 标题 / 图标的推导逻辑 */
export function resolveTopRightLink(): ResolvedTopRightLink {
	const cfg = siteConfig.navbar.topRightLink;
	const rawUrl = cfg?.url ?? "";
	const isExternal = /^https?:\/\//.test(rawUrl);
	return {
		show: !!(cfg?.enable && rawUrl),
		href: rawUrl ? (isExternal ? rawUrl : url(rawUrl)) : "#",
		// external 未显式设置时，外部链接默认新开、站内链接当前页跳转
		openNewTab: cfg?.external ?? isExternal,
		title: cfg?.title || i18n(I18nKey.more),
		icon: cfg?.icon || "material-symbols:rocket-launch-outline",
		hideOnMobile: cfg?.hideOnMobile ?? false,
		followTheme: cfg?.followTheme ?? false,
	};
}

/** 解析导航栏链接：按 siteConfig.pages 过滤 + i18n 名称解析。Navbar 与 NavMenuPanel 共用。 */
export function resolveNavMenuLinks(): NavBarLink[] {
	const pages = siteConfig.pages;

	function isPageEnabled(link: NavBarLink): boolean {
		if (!link.pageKey) return true;
		return pages[link.pageKey as keyof typeof pages] !== false;
	}

	function filterLinks(link: NavBarLink): NavBarLink | null {
		if (!link.children) {
			return isPageEnabled(link) ? link : null;
		}

		const filteredChildren = link.children.filter(isPageEnabled);

		if (filteredChildren.length === 0) return null;
		if (filteredChildren.length === 1) return filteredChildren[0];
		return { ...link, children: filteredChildren };
	}

	return resolveNavbarLinks(
		navBarConfig.links
			.map(filterLinks)
			.filter((link): link is NavBarLink => link !== null),
	);
}
