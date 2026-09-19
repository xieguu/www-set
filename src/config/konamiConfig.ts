import type { KonamiConfig } from "../types/konamiConfig";

// 秘技码彩蛋：依次按下按键序列即可触发一段有趣的庆祝动画。
// 经典秘技码为 ↑ ↑ ↓ ↓ ← → ← → B A。
export const konamiConfig: KonamiConfig = {
	// 是否启用
	enable: true,

	// 触发序列（KeyboardEvent.key，忽略大小写）；留空则使用经典秘技码
	sequence: [
		"ArrowUp",
		"ArrowUp",
		"ArrowDown",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"ArrowLeft",
		"ArrowRight",
		"b",
		"a",
	],

	// 飘落的 emoji（芙宁娜风格：戏剧 + 水元素）
	emojis: ["🎭", "💧", "🌊", "🫧", "✨", "🎩", "🐟", "💎"],

	// 提示气泡停留时长（毫秒）
	duration: 4000,
};
