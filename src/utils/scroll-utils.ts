import { navbarMode } from "@/config";
import {
	BANNER_HEIGHT,
	BANNER_HEIGHT_HOME,
	BANNER_HEIGHT_NON_HOME,
} from "@/constants/constants";
import { isBannerMode, isFullscreenMode } from "@/utils/banner-utils";
import { updateSidebarStickySpacing } from "@/utils/grid-layout-utils";

const backToTopBtn = document.getElementById("back-to-top-btn");
const navbar = document.getElementById("navbar-wrapper");

// 动态导航栏：记录上一次滚动位置，用于判断滚动方向（下滑隐藏 / 上滑显示）
let lastScrollTop = 0;

/** 优化的滚动处理函数（从 Layout.astro 迁出；visit:end 切页后也会调用） */
export function scrollFunction(): void {
	if (document.documentElement.classList.contains("is-page-transitioning")) {
		return;
	}

	const scrollTop = document.documentElement.scrollTop;
	const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);
	const navbarElement = document.getElementById("navbar");

	// 根据滚动位置动态更新侧边栏 sticky 间距
	updateSidebarStickySpacing();

	if (backToTopBtn) {
		backToTopBtn.classList.toggle("hide", scrollTop <= bannerHeight);
	}

	if (navbarMode === "fixed" && navbar) {
		navbar.classList.remove("navbar-hidden");
	} else if (navbarMode === "dynamic" && navbar) {
		// 动态：下滑隐藏 / 轻微上滑立即显示 / 滚回顶部(<80px)常显
		const delta = scrollTop - lastScrollTop;
		lastScrollTop = scrollTop;
		const isHome = document.body.classList.contains("is-home");
		// 壁纸/hero 边界：banner 首页 65vh、非首页 45vh；fullscreen 仅首页整屏（100lvh），非首页无 hero 为 0。
		// 越过该边界才启用「下滑隐藏 / 上滑显示」。overHero 不 gate isHome，故非首页 banner 也会跨壁纸保持
		const heroBoundary = isFullscreenMode()
			? isHome
				? window.innerHeight
				: 0
			: isBannerMode()
				? window.innerHeight *
					((isHome ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_NON_HOME) / 100)
				: 0;
		const overHero = scrollTop < heroBoundary;
		if (overHero || delta < 0 || scrollTop <= 80) {
			navbar.classList.remove("navbar-hidden");
		} else if (delta > 0 && scrollTop > 150) {
			navbar.classList.add("navbar-hidden");
		}
		document.body.classList.toggle(
			"dynamic-navbar-hidden",
			navbar.classList.contains("navbar-hidden"),
		);
	} else if (navbar && (isBannerMode() || isFullscreenMode())) {
		// static + banner / fullscreen：跨壁纸保持，滚到内容区才释放
		const isHome = document.body.classList.contains("is-home");
		// fullscreen 首页内容在 100lvh（视图顶）；banner 按横幅高度阈值
		const threshold = isFullscreenMode()
			? window.innerHeight - 88
			: window.innerHeight *
					((isHome ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_NON_HOME) / 100) -
				88;

		navbar.classList.toggle("navbar-hidden", scrollTop >= threshold);
	}

	if (navbarElement) {
		navbarElement.classList.toggle("navbar-sticky-shadow", scrollTop > 8);
	}
}

let scrollFrame: number | undefined;

/** 注册滚动 / 窗口尺寸监听并初始化滚动状态（从 Layout.astro 迁出） */
export function initScroll(): void {
	// 使用优化的滚动性能处理
	window.addEventListener(
		"scroll",
		() => {
			if (scrollFrame !== undefined) return;
			scrollFrame = requestAnimationFrame(() => {
				scrollFrame = undefined;
				scrollFunction();
			});
		},
		{ passive: true },
	);

	// 初始化滚动状态（例如从历史位置恢复时）
	scrollFunction();
}
