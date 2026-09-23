export type StatKey = "truth" | "warmth";

export type StoryFlagValue = boolean | "publish" | "return" | "coauthor";

export type StoryCondition =
	| { stat: StatKey; gte: number }
	| { all: StoryCondition[] };

export type StoryEffect =
	| { type: "stat"; stat: StatKey; amount: number }
	| { type: "flag"; flag: string; value: StoryFlagValue };

export interface StoryChoiceOption {
	id: string;
	label: string;
	description: string;
	response: string;
	condition?: StoryCondition;
	lockedText?: string;
	effects: StoryEffect[];
}

export interface StoryChoice {
	prompt: string;
	detail: string;
	options: StoryChoiceOption[];
}

export interface StoryPanel {
	id: string;
	kicker: string;
	title: string;
	visual: string;
	narration: string;
	speaker?: string;
	dialogue?: string;
	sfx?: string;
	focus: string;
	tone: "paper" | "cyan" | "vermillion";
}

export interface StoryScene {
	id: string;
	chapter: number;
	chapterTitle: string;
	title: string;
	subtitle: string;
	art: "chapter-01" | "chapter-02" | "chapter-03";
	layout: "lead" | "cut" | "depth" | "mirror" | "fracture" | "finale";
	panels: StoryPanel[];
	choice: StoryChoice;
}

export interface StoryEnding {
	id: "publish" | "return" | "coauthor";
	folio: string;
	title: string;
	tone: string;
	visual: string;
	lines: string[];
	lastLine: string;
}

export const storyMeta = {
	title: "折月人",
	englishTitle: "THE MOON EDITOR",
	tagline: "这座城用被删掉的痛苦，印刷月亮。",
	description:
		"一部约十分钟的互动漫画。你将以补页师砚的身份，决定真相应当如何回到每个人手中。",
	estimatedMinutes: "8—12 分钟",
} as const;

export const statLabels: Record<StatKey, { label: string; hint: string }> = {
	truth: {
		label: "见证",
		hint: "保存证据，追问删改者",
	},
	warmth: {
		label: "余温",
		hint: "尊重个体，照看真相抵达的方式",
	},
};

export const storyScenes: StoryScene[] = [
	{
		id: "bad-frame",
		chapter: 1,
		chapterTitle: "坏格",
		title: "有些空白，不是忘记",
		subtitle: "折潮城 · 零点前二十七分",
		art: "chapter-01",
		layout: "lead",
		panels: [
			{
				id: "midnight-cut",
				kicker: "01 / 零点剪页",
				title: "折潮城没有完整的昨天。",
				visual:
					"纸月压在层叠屋檐上，雨滴从街面逆流向天空，行人的额角都缺着一枚整齐方格。",
				narration:
					"每到零时，月版社会会从所有人脑中剪走一格痛苦，再把它印成照亮城市的月页。",
				sfx: "咔——",
				focus: "48% 22%",
				tone: "paper",
			},
			{
				id: "page-mender",
				kicker: "02 / 补页师",
				title: "砚把剪口修得像从未发生。",
				visual: "银针穿过老妇记忆里的白洞，针尖下却渗出一小格不受控制的黑墨。",
				narration:
					"她修过一万三千处遗忘。自己的童年，却只剩一页没有编号的空白。",
				focus: "70% 52%",
				tone: "cyan",
			},
			{
				id: "black-memory",
				kicker: "03 / 禁止补缀",
				title: "黑格在说话。",
				visual: "墨面浮出成千上万张微小的脸，它们被排成同一枚月亮的网点。",
				narration: "一段本应被删净的记忆，正从针孔里向现实生长。",
				speaker: "黑色画格",
				dialogue: "别补我。月亮在吃人。",
				focus: "84% 76%",
				tone: "vermillion",
			},
		],
		choice: {
			prompt: "黑色记忆正在消散。",
			detail: "针尖只能落下一次。",
			options: [
				{
					id: "copy-fragment",
					label: "拓印黑格",
					description: "先留下能证明月亮真相的证据。",
					response: "黑墨藏进砚的袖口，在布料里长出一扇向下的门。",
					effects: [
						{ type: "stat", stat: "truth", amount: 2 },
						{ type: "flag", flag: "keptBlackPage", value: true },
					],
				},
				{
					id: "return-fragment",
					label: "拆开缝线",
					description: "把这段痛苦原样还给它的主人。",
					response: "老妇流下眼泪：原来我曾经这样爱过一个人。",
					effects: [
						{ type: "stat", stat: "warmth", amount: 2 },
						{ type: "flag", flag: "returnedMemory", value: true },
					],
				},
			],
		},
	},
	{
		id: "red-proof",
		chapter: 1,
		chapterTitle: "坏格",
		title: "一张没有获准存在的原稿",
		subtitle: "补页诊室 · 警报已抵达",
		art: "chapter-01",
		layout: "cut",
		panels: [
			{
				id: "paper-glider",
				kicker: "04 / 破窗",
				title: "栖从画框外落了进来。",
				visual:
					"一架折纸滑翔翼割开窗纸，成年地下信使栖抱着一卷违禁原稿跌进诊室。",
				narration: "朱砂警报紧随其后，把墙壁一格格染红。",
				speaker: "栖",
				dialogue: "你修的是删改痕。想看原稿吗？",
				focus: "18% 34%",
				tone: "cyan",
			},
			{
				id: "waste-copy",
				kicker: "05 / 废稿",
				title: "审查章从天花板压下。",
				visual: "红色印章把诊室切成越来越窄的画格，裸露印版在格缝里闪着冷光。",
				narration: "整间诊室被判为废稿。画框将在三秒后闭合。",
				sfx: "禁版——",
				focus: "54% 52%",
				tone: "vermillion",
			},
			{
				id: "closing-frame",
				kicker: "06 / 二选一",
				title: "栖与证据，被留在画框两侧。",
				visual:
					"栖悬在断裂边框外，伸出的手逐渐失去颜色；完整印版只差一次快门。",
				narration: "二。一。砚听见自己的心跳像印刷机落版。",
				focus: "70% 82%",
				tone: "paper",
			},
		],
		choice: {
			prompt: "画框即将闭合。",
			detail: "你只能先抓住一样东西。",
			options: [
				{
					id: "pull-qi",
					label: "抓住栖的手",
					description: "原稿会被红章吞去一角。",
					response: "两个人跌进同一格里。栖没有道谢，只把手握得更紧。",
					effects: [
						{ type: "stat", stat: "warmth", amount: 1 },
						{ type: "flag", flag: "savedQi", value: true },
					],
				},
				{
					id: "copy-plate",
					label: "拍下印版",
					description: "证据完整，栖必须自己翻回画格。",
					response: "快门留下全部编号。栖翻回来时，掌心多了一道红痕。",
					effects: [
						{ type: "stat", stat: "truth", amount: 1 },
						{ type: "flag", flag: "copiedPlate", value: true },
						{ type: "flag", flag: "qiInjured", value: true },
					],
				},
			],
		},
	},
	{
		id: "undersea-press",
		chapter: 2,
		chapterTitle: "海下印厂",
		title: "被删掉的昨天，都沉在城下",
		subtitle: "黑海下层 · 库存区",
		art: "chapter-02",
		layout: "depth",
		panels: [
			{
				id: "descent",
				kicker: "07 / 下潜",
				title: "排水沟尽头，藏着被裁掉的海。",
				visual: "水面下倒悬着另一座城市，鱼群像一串没有文字的对白框。",
				narration:
					"砚袖中的黑格遇水展开；老妇归还记忆背面的水印，也在此处拼成同一扇门。",
				focus: "20% 80%",
				tone: "cyan",
			},
			{
				id: "rotary-press",
				kicker: "08 / 真正的历史",
				title: "七十年的哭声，被编号、压平、装订。",
				visual:
					"巨型轮转机悬在黑海上空，每张发光纸页都映着某个人被删除的一刻。",
				narration: "纸带升向地表，在所有人的头顶汇成一枚人造月亮。",
				speaker: "栖",
				dialogue: "我们脚下，才是这座城真正的历史。",
				focus: "58% 30%",
				tone: "paper",
			},
			{
				id: "inventory",
				kicker: "09 / 17,603,211",
				title: "库存编号原本都是名字。",
				visual:
					"数以千万计的纸页从两人身边掠过；“自愿捐赠”栏全部印着同一枚指纹。",
				narration: "警报正在靠近。只够记录一种东西。",
				focus: "80% 62%",
				tone: "vermillion",
			},
		],
		choice: {
			prompt: "印厂将在四十秒后封库。",
			detail: "留下人，还是留下拆掉机器的方法？",
			options: [
				{
					id: "record-names",
					label: "抄下名字",
					description: "让库存编号重新变成人。",
					response: "砚写满整条手臂。每写下一个名字，一张纸便停止颤抖。",
					effects: [
						{ type: "stat", stat: "truth", amount: 1 },
						{ type: "stat", stat: "warmth", amount: 1 },
						{ type: "flag", flag: "recordedNames", value: true },
					],
				},
				{
					id: "map-machine",
					label: "描出回路",
					description: "找到控制整座印厂的三块母版。",
					response: "总闸只认三种指令：公开、归还、拆版。",
					effects: [
						{ type: "stat", stat: "truth", amount: 2 },
						{ type: "flag", flag: "mappedMachine", value: true },
					],
				},
			],
		},
	},
	{
		id: "blank-editor",
		chapter: 2,
		chapterTitle: "海下印厂",
		title: "总编把自己也删成了空白",
		subtitle: "主机台 · 纸月投影下",
		art: "chapter-02",
		layout: "mirror",
		panels: [
			{
				id: "editor-cen",
				kicker: "10 / 总编岑",
				title: "他的脸，是一块未经印刷的白纸。",
				visual: "岑站在机器中央，影子却由无数市民的侧脸拼成。",
				narration: "他主动删去姓名与面孔，把秩序当作自己最后的署名。",
				speaker: "岑",
				dialogue: "我没有删掉痛苦。我让这座城能在明天醒来。",
				focus: "76% 34%",
				tone: "paper",
			},
			{
				id: "consent",
				kicker: "11 / 同意书",
				title: "每个人都签过同意。",
				visual: "一份份契约穿过滚轮，签名相同，纸背却残留不同的指温。",
				narration: "只是“同意”本身，也在第二天被剪掉了。",
				speaker: "砚",
				dialogue: "代价是谁替他们决定？",
				focus: "48% 58%",
				tone: "vermillion",
			},
			{
				id: "last-recording",
				kicker: "12 / 十秒录音",
				title: "纸月裂开第一道缝。",
				visual:
					"黑海沿画格沟槽倒灌，无数对白框同时挤进现实。岑递出最后一枚录音筒。",
				narration: "它只能容下一段声音。",
				focus: "18% 24%",
				tone: "cyan",
			},
		],
		choice: {
			prompt: "录音筒还剩十秒。",
			detail: "制度的供词，或一个人的最后一句话。",
			options: [
				{
					id: "record-confession",
					label: "交代删改系统",
					description: "留下每一道命令和每一枚公章。",
					response:
						"责任链被完整刻进蜡筒。岑的空白面孔上，第一次出现一道裂纹。",
					effects: [
						{ type: "stat", stat: "truth", amount: 1 },
						{ type: "flag", flag: "recordedConfession", value: true },
					],
				},
				{
					id: "hear-message",
					label: "留下私人留言",
					description: "允许岑以一个人的身份结束。",
					response: "岑对着空白轻声说：女儿，对不起，我终于记得你了。",
					effects: [
						{ type: "stat", stat: "warmth", amount: 1 },
						{ type: "flag", flag: "heardCen", value: true },
					],
				},
			],
		},
	},
	{
		id: "memory-tide",
		chapter: 3,
		chapterTitle: "最后一版",
		title: "真相来得太突然时，也是洪水",
		subtitle: "纸月内环 · 回潮倒计时 04:12",
		art: "chapter-03",
		layout: "fracture",
		panels: [
			{
				id: "city-mosaic",
				kicker: "13 / 回潮",
				title: "整座城市化为同时震动的小画格。",
				visual:
					"死者、旧爱、暴力与温柔从雨中落回人群，每扇窗后都是不同版本的昨天。",
				narration: "纸月正在失稳。四分钟后，全部记忆会同时回到全部人脑中。",
				focus: "50% 10%",
				tone: "vermillion",
			},
			{
				id: "paper-stairs",
				kicker: "14 / 向月心",
				title: "每一级台阶，都是陌生人的昨天。",
				visual:
					"砚与栖沿旋转纸带奔向月心，碎页从脚下飞散，露出没有边框的天空。",
				narration: "栖受伤的手仍攥着印版；那只曾被砚拉住的手，也再次伸向她。",
				speaker: "栖",
				dialogue: "走到总闸，我们还是得替所有人选一次。",
				focus: "48% 54%",
				tone: "cyan",
			},
			{
				id: "first-sight",
				kicker: "15 / 先看见什么",
				title: "城市正在醒来。",
				visual: "责任链像闪电投上云层，人名则化作一盏盏即将亮起的窗灯。",
				narration: "在全部记忆回归前，还来得及决定它们抵达的顺序。",
				focus: "22% 78%",
				tone: "paper",
			},
		],
		choice: {
			prompt: "先让城市看见什么？",
			detail: "回潮已经开始，没有暂停键。",
			options: [
				{
					id: "paced-release",
					label: "逐区播报名单",
					description: "给每扇门三十秒，先听见自己的名字。",
					response: "窗灯一盏盏亮起。城市先学会辨认声音，再面对内容。",
					effects: [
						{ type: "stat", stat: "warmth", amount: 1 },
						{ type: "flag", flag: "pacedRelease", value: true },
					],
				},
				{
					id: "public-mechanism",
					label: "投出责任链",
					description: "让每一道命令、每一枚红章无处藏身。",
					response: "月亮变成一张巨大的流程图。第一次，空白也有了签名。",
					effects: [
						{ type: "stat", stat: "truth", amount: 1 },
						{ type: "flag", flag: "publicMechanism", value: true },
					],
				},
			],
		},
	},
	{
		id: "final-edition",
		chapter: 3,
		chapterTitle: "最后一版",
		title: "结局不该只有一个作者",
		subtitle: "月心总闸 · 倒计时归零",
		art: "chapter-03",
		layout: "finale",
		panels: [
			{
				id: "no-throne",
				kicker: "16 / 月心",
				title: "这里没有王座。",
				visual: "圆形大厅中央只有一支朱砂编辑笔，和三块等待落版的空白母版。",
				narration: "公开。归还。拆版。每一种答案都有代价。",
				focus: "50% 82%",
				tone: "paper",
			},
			{
				id: "break-pen",
				kicker: "17 / 停笔",
				title: "砚第一次没有修补画格。",
				visual: "朱砂笔在她掌心折断，笔直的边框随之消失，碎页露出真正的晨光。",
				narration: "她把最后一次编辑权，留给尚未被写下的答案。",
				speaker: "栖",
				dialogue: "原来空白，也可以不是删除。",
				focus: "50% 48%",
				tone: "vermillion",
			},
			{
				id: "three-plates",
				kicker: "18 / 最后一版",
				title: "请选择母版。",
				visual:
					"左格向全城倾倒原稿，中格把记忆折成私人信封，右格让印刷机裂成千万枚活字。",
				narration: "倒计时归零。机器等待砚落下最后一掌。",
				sfx: "三、二、一——",
				focus: "50% 65%",
				tone: "cyan",
			},
		],
		choice: {
			prompt: "最后一版如何印刷？",
			detail: "此前的每次选择，决定哪些母版能承受落印。",
			options: [
				{
					id: "publish-all",
					label: "公开",
					description: "让所有人看见全部原稿。",
					response: "纸月的外壳开始剥落。",
					condition: { stat: "truth", gte: 3 },
					lockedText: "需要「见证」达到 3",
					effects: [
						{ type: "stat", stat: "truth", amount: 1 },
						{ type: "flag", flag: "finalAct", value: "publish" },
					],
				},
				{
					id: "return-private",
					label: "归还",
					description: "每段记忆只交给它的主人。",
					response: "千万只信封从月心振翅而起。",
					condition: { stat: "warmth", gte: 3 },
					lockedText: "需要「余温」达到 3",
					effects: [
						{ type: "stat", stat: "warmth", amount: 1 },
						{ type: "flag", flag: "finalAct", value: "return" },
					],
				},
				{
					id: "distribute-press",
					label: "拆版",
					description: "把印刷权交给每一个人。",
					response: "三块母版裂成了千万枚可以追问的活字。",
					condition: {
						all: [
							{ stat: "truth", gte: 3 },
							{ stat: "warmth", gte: 3 },
						],
					},
					lockedText: "需要「见证」与「余温」都达到 3",
					effects: [
						{ type: "stat", stat: "truth", amount: 1 },
						{ type: "stat", stat: "warmth", amount: 1 },
						{ type: "flag", flag: "finalAct", value: "coauthor" },
					],
				},
			],
		},
	},
];

export const storyEndings: StoryEnding[] = [
	{
		id: "publish",
		folio: "ENDING 01 / 公开",
		title: "无影之城",
		tone: "锋利、诚实、代价未决",
		visual:
			"纸月在晨钟中碎成漫天原稿，阳光第一次直落街面，所有人脚下都没有影子。",
		lines: [
			"每个人同时认出了死者、债、旧爱，也认出自己曾参与的沉默。",
			"折潮城第一次拥有完整的昨天，却三个月没人敢说“明天见”。",
			"砚把最后一张名单钉在空中。最末一行，是她自己的名字。",
		],
		lastLine: "真相没有救下城市。它只是终于把城市交还给现实。",
	},
	{
		id: "return",
		folio: "ENDING 02 / 归还",
		title: "私人潮汐",
		tone: "温柔、克制、保留余憾",
		visual: "发光信封像候鸟飞进千家万户，纸月缩成天空中一枚安静的暗钉。",
		lines: [
			"有人隔门相认，有人读到一半便把纸烧掉。",
			"城里没有公开审判，只有整夜亮着的窗。",
			"砚与栖开了一间没有招牌的补页铺：真相仍在，但由当事人决定何时开口。",
		],
		lastLine: "不是所有沉默都是遗忘。有些沉默，是尚未准备好的声音。",
	},
	{
		id: "coauthor",
		folio: "ENDING 03 / 拆版",
		title: "万家续页",
		tone: "明亮、复杂、开放",
		visual:
			"三块母版裂成千万枚发光活字，落在每户窗台；天空从此不再悬挂唯一的月亮。",
		lines: [
			"任何人都能封存记忆，但每次删改都必须留下“由谁、为何”的边注。",
			"城市不再拥有统一版本，只拥有可以质问、补写与共同见证的无数草稿。",
			"每当两个人愿意一起读完一段过去，街上便亮起一盏小灯。",
		],
		lastLine: "结局没有被印下。它被分给了所有作者。",
	},
];
