export type KonamiConfig = {
	enable: boolean; // 是否启用秘技码彩蛋
	sequence?: string[]; // 触发用的按键序列（KeyboardEvent.key，忽略大小写），留空则用经典秘技码
	emojis?: string[]; // 触发时飘落的 emoji，留空则用默认组合
	duration?: number; // 提示气泡停留时长（毫秒），默认 4000
};
