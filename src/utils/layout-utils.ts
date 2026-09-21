import { backgroundWallpaper } from "../config";

export type BackgroundImages = {
	desktop: string[];
	mobile: string[];
	isMultiple: boolean;
};

// 将单个值或数组统一为数组
const toArray = (src: string | string[] | undefined): string[] => {
	if (!src) return [];
	if (Array.isArray(src)) return src;
	return [src];
};

// ---- 壁纸目录自动扫描 ----------------------------------------------------
// 把 src.desktop / src.mobile 配成 "auto"，即可自动收录对应目录下的全部图片，
// 无需在配置里逐个写文件名（文件名随意、多少都行，多张时每次刷新随机一张）。
// import.meta.glob 要求静态字面量路径，所以扫描目录固定为下面两个；
// 扩展名与 ImageWrapper 的 glob 保持一致（png/jpg/jpeg/webp/avif 均会被优化）。
const AUTO = "auto";
const desktopWallpaperFiles = import.meta.glob(
	"../assets/images/DesktopWallpaper/*.{png,jpg,jpeg,webp,avif}",
);
const mobileWallpaperFiles = import.meta.glob(
	"../assets/images/MobileWallpaper/*.{png,jpg,jpeg,webp,avif}",
);

// glob 键形如 "../assets/images/.../x.png"，转成 ImageWrapper 认识的 src 相对路径
const globToSrcPaths = (files: Record<string, unknown>): string[] =>
	Object.keys(files)
		.map((key) => key.replace(/^\.\.\//, ""))
		.sort();

// 解析单侧配置：命中 "auto" 走目录扫描，否则按原样归一化为数组
const resolveSrc = (
	src: string | string[] | undefined,
	autoFiles: Record<string, unknown>,
): string[] => (src === AUTO ? globToSrcPaths(autoFiles) : toArray(src));

// 背景图片处理工具函数
// 返回所有配置的图片（用于构建时渲染所有图片）
export const getBackgroundImages = (): BackgroundImages => {
	const bgSrc = backgroundWallpaper.src;

	if (
		typeof bgSrc === "object" &&
		bgSrc !== null &&
		!Array.isArray(bgSrc) &&
		("desktop" in bgSrc || "mobile" in bgSrc)
	) {
		const srcObj = bgSrc as {
			desktop?: string | string[];
			mobile?: string | string[];
		};
		const desktopImages = resolveSrc(srcObj.desktop, desktopWallpaperFiles);
		const mobileImages = resolveSrc(srcObj.mobile, mobileWallpaperFiles);
		return {
			desktop: desktopImages.length > 0 ? desktopImages : mobileImages,
			mobile: mobileImages.length > 0 ? mobileImages : desktopImages,
			isMultiple: desktopImages.length > 1 || mobileImages.length > 1,
		};
	}
	// 如果是字符串或数组，同时用于桌面端和移动端；"auto" 默认扫描桌面壁纸目录
	const images =
		bgSrc === AUTO
			? globToSrcPaths(desktopWallpaperFiles)
			: toArray(bgSrc as string | string[]);
	return {
		desktop: images,
		mobile: images,
		isMultiple: images.length > 1,
	};
};

// 检查是否为首页
export const isHomePage = (pathname: string): boolean => {
	// 获取 base URL
	const baseUrl = import.meta.env.BASE_URL || "/";
	const baseUrlNoSlash = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

	if (pathname === baseUrl) return true;
	if (pathname === baseUrlNoSlash) return true;
	if (pathname === "/") return true;

	return false;
};
