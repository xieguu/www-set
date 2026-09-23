<script lang="ts">
import { onMount, tick } from "svelte";
import chapter01 from "@/assets/images/comic-game/chapter-01.webp?url";
import chapter02 from "@/assets/images/comic-game/chapter-02.webp?url";
import chapter03 from "@/assets/images/comic-game/chapter-03.webp?url";
import {
	type StatKey,
	type StoryChoiceOption,
	type StoryCondition,
	type StoryEnding,
	type StoryFlagValue,
	statLabels,
	storyEndings,
	storyMeta,
	storyScenes,
} from "./story";

export let homeHref: string;

type GameScreen = "cover" | "playing" | "ending";
type PlayableScreen = Exclude<GameScreen, "cover">;

interface GameStats {
	truth: number;
	warmth: number;
}

interface ChoiceRecord {
	sceneId: string;
	choiceId: string;
	label: string;
}

interface SavedGame {
	version: 1;
	screen: PlayableScreen;
	sceneIndex: number;
	panelIndex: number;
	stats: GameStats;
	flags: Record<string, StoryFlagValue>;
	history: ChoiceRecord[];
}

const STORAGE_KEY = "firefly:comic-game:the-moon-editor:v1";
const SAVE_VERSION = 1;
const chapterArt = {
	"chapter-01": chapter01,
	"chapter-02": chapter02,
	"chapter-03": chapter03,
} as const;

let rootElement: HTMLElement;
let panelHeading: HTMLElement;
let screen: GameScreen = "cover";
let sceneIndex = 0;
let panelIndex = 0;
let stats: GameStats = { truth: 0, warmth: 0 };
let flags: Record<string, StoryFlagValue> = {};
let history: ChoiceRecord[] = [];
let savedSnapshot: SavedGame | null = null;
let storageNotice = "";
let lastResponse = "";
let responseTimer: number | undefined;

$: currentScene = storyScenes[sceneIndex];
$: currentPanel = currentScene.panels[panelIndex];
$: currentArt = chapterArt[currentScene.art];
$: isChoiceOpen =
	screen === "playing" && panelIndex === currentScene.panels.length - 1;
$: readingProgress = Math.round(
	((sceneIndex + (panelIndex + 1) / currentScene.panels.length) /
		storyScenes.length) *
		100,
);
$: currentEnding = screen === "ending" ? resolveEnding(flags.finalAct) : null;

function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		},
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSavedGame(value: unknown): value is SavedGame {
	if (!isPlainObject(value) || value.version !== SAVE_VERSION) return false;
	if (value.screen !== "playing" && value.screen !== "ending") return false;
	if (
		typeof value.sceneIndex !== "number" ||
		!Number.isInteger(value.sceneIndex) ||
		value.sceneIndex < 0 ||
		value.sceneIndex >= storyScenes.length
	)
		return false;

	const savedScene = storyScenes[value.sceneIndex];
	if (
		typeof value.panelIndex !== "number" ||
		!Number.isInteger(value.panelIndex) ||
		value.panelIndex < 0 ||
		value.panelIndex >= savedScene.panels.length
	)
		return false;

	if (!isPlainObject(value.stats)) return false;
	for (const key of ["truth", "warmth"] as const) {
		const stat = value.stats[key];
		if (
			typeof stat !== "number" ||
			!Number.isInteger(stat) ||
			stat < 0 ||
			stat > 8
		)
			return false;
	}

	if (!isPlainObject(value.flags) || !Array.isArray(value.history))
		return false;
	if (
		value.screen === "ending" &&
		value.flags.finalAct !== "publish" &&
		value.flags.finalAct !== "return" &&
		value.flags.finalAct !== "coauthor"
	)
		return false;

	return value.history.every(
		(record) =>
			isPlainObject(record) &&
			typeof record.sceneId === "string" &&
			typeof record.choiceId === "string" &&
			typeof record.label === "string",
	);
}

function makeSnapshot(): SavedGame {
	if (screen === "cover") {
		throw new Error("封面状态不能写入游戏存档。 ");
	}

	return {
		version: SAVE_VERSION,
		screen,
		sceneIndex,
		panelIndex,
		stats: { ...stats },
		flags: { ...flags },
		history: history.map((record) => ({ ...record })),
	};
}

function persistGame() {
	if (screen === "cover") return;
	const snapshot = makeSnapshot();
	localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
	savedSnapshot = snapshot;
}

function loadSnapshot(snapshot: SavedGame) {
	screen = snapshot.screen;
	sceneIndex = snapshot.sceneIndex;
	panelIndex = snapshot.panelIndex;
	stats = { ...snapshot.stats };
	flags = { ...snapshot.flags };
	history = snapshot.history.map((record) => ({ ...record }));
	focusCurrentPanel();
}

function startNewGame() {
	if (responseTimer !== undefined) window.clearTimeout(responseTimer);
	localStorage.removeItem(STORAGE_KEY);
	screen = "playing";
	sceneIndex = 0;
	panelIndex = 0;
	stats = { truth: 0, warmth: 0 };
	flags = {};
	history = [];
	savedSnapshot = null;
	lastResponse = "";
	persistGame();
	focusCurrentPanel();
}

function resumeGame() {
	if (!savedSnapshot) return;
	loadSnapshot(savedSnapshot);
}

function conditionMet(condition?: StoryCondition): boolean {
	if (!condition) return true;
	if ("all" in condition) {
		return condition.all.every((item) => conditionMet(item));
	}
	return stats[condition.stat] >= condition.gte;
}

function applyChoice(option: StoryChoiceOption) {
	if (!conditionMet(option.condition)) return;

	const nextStats = { ...stats };
	const nextFlags = { ...flags };
	for (const effect of option.effects) {
		if (effect.type === "stat") {
			nextStats[effect.stat] = Math.min(
				8,
				nextStats[effect.stat] + effect.amount,
			);
		} else {
			nextFlags[effect.flag] = effect.value;
		}
	}

	stats = nextStats;
	flags = nextFlags;
	history = [
		...history,
		{
			sceneId: currentScene.id,
			choiceId: option.id,
			label: option.label,
		},
	];
	lastResponse = option.response;
	if (responseTimer !== undefined) window.clearTimeout(responseTimer);
	responseTimer = window.setTimeout(() => {
		lastResponse = "";
	}, 5200);

	if (nextFlags.finalAct) {
		screen = "ending";
	} else {
		sceneIndex += 1;
		panelIndex = 0;
	}
	persistGame();
	focusCurrentPanel();
}

function resolveEnding(finalAct: StoryFlagValue | undefined): StoryEnding {
	if (
		finalAct !== "publish" &&
		finalAct !== "return" &&
		finalAct !== "coauthor"
	) {
		throw new Error("最终母版状态无效，无法解析结局。 ");
	}

	const matches = storyEndings.filter((ending) => ending.id === finalAct);
	if (matches.length !== 1) {
		throw new Error("结局状态必须且只能匹配一个结局。 ");
	}
	return matches[0];
}

function advancePanel() {
	if (screen !== "playing" || isChoiceOpen) return;
	panelIndex += 1;
	persistGame();
	focusCurrentPanel();
}

function rewindPanel() {
	if (screen !== "playing" || panelIndex === 0) return;
	panelIndex -= 1;
	persistGame();
	focusCurrentPanel();
}

async function focusCurrentPanel() {
	await tick();
	panelHeading?.focus({ preventScroll: true });
}

function handleKeydown(event: KeyboardEvent) {
	const target = event.target as HTMLElement;
	const isControl =
		target.closest("button, a, input, textarea, select") !== null;
	if (isControl) return;

	if (
		screen === "playing" &&
		!isChoiceOpen &&
		(event.key === "ArrowRight" || event.key === " ")
	) {
		event.preventDefault();
		advancePanel();
	}
	if (screen === "playing" && event.key === "ArrowLeft") {
		event.preventDefault();
		rewindPanel();
	}
}

function statPercent(stat: StatKey) {
	return `${Math.min(100, (stats[stat] / 8) * 100)}%`;
}

onMount(() => {
	const previousOverflow = document.body.style.overflow;
	const previousOverscroll = document.body.style.overscrollBehavior;
	document.body.style.overflow = "hidden";
	document.body.style.overscrollBehavior = "none";

	for (const source of Object.values(chapterArt)) {
		const image = new Image();
		image.src = source;
	}

	const rawSave = localStorage.getItem(STORAGE_KEY);
	if (rawSave) {
		try {
			const parsed: unknown = JSON.parse(rawSave);
			if (!isSavedGame(parsed)) {
				throw new Error("存档结构或版本不匹配。 ");
			}
			savedSnapshot = parsed;
		} catch {
			localStorage.removeItem(STORAGE_KEY);
			storageNotice = "检测到不兼容存档，已明确清除；新故事将从第一页开始。";
		}
	}

	rootElement.focus({ preventScroll: true });

	return () => {
		document.body.style.overflow = previousOverflow;
		document.body.style.overscrollBehavior = previousOverscroll;
		if (responseTimer !== undefined) window.clearTimeout(responseTimer);
	};
});
</script>

<div
	use:portal
	bind:this={rootElement}
	class="moon-game"
	class:is-reading={screen === "playing"}
	data-pagefind-ignore
	role="application"
	aria-label="折月人互动漫画游戏"
	tabindex="-1"
	on:keydown={handleKeydown}
>
	<div class="paper-grain" aria-hidden="true"></div>

	{#if screen === "cover"}
		<section class="cover-screen" aria-labelledby="game-title">
			<img
				class="cover-art"
				src={chapter01}
				alt="雨夜的折潮城中，成年补页师砚手持青色提灯，望向远处的纸月印厂。"
				fetchpriority="high"
			/>
			<div class="cover-vignette" aria-hidden="true"></div>
			<div class="cover-grid" aria-hidden="true">
				<span></span><span></span><span></span>
			</div>

			<a class="cover-exit" href={homeHref} aria-label="返回网站首页">
				<span aria-hidden="true">←</span>
				<span class="cover-exit-label">返回站点</span>
			</a>

			<div class="cover-copy">
				<p class="cover-label">AN INTERACTIVE COMIC / 互动叙事</p>
				<h1 id="game-title">{storyMeta.title}</h1>
				<p class="english-title">{storyMeta.englishTitle}</p>
				<p class="cover-tagline">{storyMeta.tagline}</p>
				<p class="cover-description">{storyMeta.description}</p>

				<div class="cover-meta" aria-label="游戏信息">
					<span>{storyMeta.estimatedMinutes}</span>
					<span>3 章</span>
					<span>3 个结局</span>
					<span>自动存档</span>
				</div>

				{#if storageNotice}
					<p class="storage-notice" role="status">{storageNotice}</p>
				{/if}

				<div class="cover-actions">
					<button class="primary-action" type="button" on:click={startNewGame}>
						<span>翻开第一页</span>
						<span aria-hidden="true">↗</span>
					</button>
					{#if savedSnapshot}
						<button class="secondary-action" type="button" on:click={resumeGame}>
							继续未完的版本
						</button>
					{/if}
				</div>
			</div>

			<div class="cover-folio" aria-hidden="true">
				<span>折潮城 · 月版纪事</span>
				<span>VOL. 01</span>
			</div>
		</section>
	{:else if screen === "playing"}
		<header class="game-header">
			<div class="brand-lockup">
				<span class="brand-mark" aria-hidden="true">月</span>
				<div>
					<strong>{storyMeta.title}</strong>
					<span>{storyMeta.englishTitle}</span>
				</div>
			</div>

			<div class="chapter-lockup">
				<span>CHAPTER {String(currentScene.chapter).padStart(2, "0")}</span>
				<strong>{currentScene.chapterTitle}</strong>
			</div>

			<div class="header-actions">
				<button class="text-button" type="button" on:click={startNewGame}>
					重新装订
				</button>
				<a class="exit-button" href={homeHref}>退出阅读</a>
			</div>
			<div class="header-progress" aria-hidden="true">
				<span style:width={`${readingProgress}%`}></span>
			</div>
		</header>

		<div class="game-shell">
			<aside class="chapter-rail" aria-label="章节与状态">
				<div class="rail-heading">
					<span>CONTENTS</span>
					<strong>目录</strong>
				</div>
				<ol class="scene-list">
					{#each storyScenes as scene, index}
						<li
							class:is-current={index === sceneIndex}
							class:is-complete={index < sceneIndex}
						>
							<span>{String(index + 1).padStart(2, "0")}</span>
							<div>
								<small>第 {scene.chapter} 章</small>
								<strong>{scene.title}</strong>
							</div>
						</li>
					{/each}
				</ol>

				<div class="stat-card">
					<p class="stat-card-label">你的版本</p>
					{#each ["truth", "warmth"] as stat (stat)}
						<div class="stat-row">
							<div class="stat-row-heading">
								<span>{statLabels[stat as StatKey].label}</span>
								<strong>{stats[stat as StatKey]}</strong>
							</div>
							<div class="stat-track" aria-hidden="true">
								<span style:width={statPercent(stat as StatKey)}></span>
							</div>
							<small>{statLabels[stat as StatKey].hint}</small>
						</div>
					{/each}
				</div>

				<p class="keyboard-hint">← → 翻格 · 空格继续</p>
			</aside>

			<section class="comic-column" aria-label="互动漫画画页">
				<div class="scene-heading">
					<div>
						<p>{currentScene.subtitle}</p>
						<h2 bind:this={panelHeading} tabindex="-1">{currentScene.title}</h2>
					</div>
					<span>{String(sceneIndex + 1).padStart(2, "0")} / {String(storyScenes.length).padStart(2, "0")}</span>
				</div>

				<div class={`comic-page layout-${currentScene.layout}`}>
					{#each currentScene.panels as panel, index (panel.id)}
						<article
							class={`comic-panel tone-${panel.tone}`}
							class:is-revealed={index <= panelIndex}
							class:is-active={index === panelIndex}
							aria-hidden={index > panelIndex}
						>
							<div
								class="panel-art"
								role="img"
								aria-label={panel.visual}
								style={`background-image: url("${currentArt}"); background-position: ${panel.focus};`}
							></div>
							<div class="panel-wash" aria-hidden="true"></div>
							{#if index <= panelIndex}
								<span class="panel-kicker">{panel.kicker}</span>
								<div class="panel-caption">
									<strong>{panel.title}</strong>
									{#if panel.sfx}<em>{panel.sfx}</em>{/if}
								</div>
								{#if panel.dialogue}
									<blockquote class="speech-balloon">
										<span>{panel.speaker}</span>
										{panel.dialogue}
									</blockquote>
								{/if}
							{/if}
							{#if index > panelIndex}
								<span class="unread-mark" aria-hidden="true">未印</span>
							{/if}
						</article>
					{/each}
					<div class="page-number" aria-hidden="true">
						{String(sceneIndex * 3 + panelIndex + 1).padStart(2, "0")}
					</div>
				</div>
			</section>

			<aside class="narrative-rail" aria-label="旁白与选择">
				<div class="panel-copy" aria-live="polite">
					<div class="copy-index">
						<span>{currentPanel.kicker}</span>
						<span>{panelIndex + 1} / {currentScene.panels.length}</span>
					</div>
					<h3>{currentPanel.title}</h3>
					<p>{currentPanel.narration}</p>
					{#if currentPanel.dialogue}
						<blockquote>
							<span>{currentPanel.speaker}</span>
							“{currentPanel.dialogue}”
						</blockquote>
					{/if}
				</div>

				{#if isChoiceOpen}
					<div class="choice-card">
						<div class="choice-heading">
							<span>MAKE THE EDIT / 落笔</span>
							<h3>{currentScene.choice.prompt}</h3>
							<p>{currentScene.choice.detail}</p>
						</div>
						<div class="choice-list">
							{#each currentScene.choice.options as option, optionIndex (option.id)}
								{@const unlocked = conditionMet(option.condition)}
								<button
									class="choice-option"
									class:is-locked={!unlocked}
									type="button"
									disabled={!unlocked}
									on:click={() => applyChoice(option)}
								>
									<span class="choice-number">{String(optionIndex + 1).padStart(2, "0")}</span>
									<span class="choice-body">
										<strong>{option.label}</strong>
										<small>{unlocked ? option.description : option.lockedText}</small>
									</span>
									<span class="choice-arrow" aria-hidden="true">{unlocked ? "↗" : "×"}</span>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="reader-controls">
						<button
							class="previous-panel"
							type="button"
							disabled={panelIndex === 0}
							on:click={rewindPanel}
						>
							← 上一格
						</button>
						<button class="next-panel" type="button" on:click={advancePanel}>
							<span>印出下一格</span>
							<span aria-hidden="true">→</span>
						</button>
					</div>
				{/if}

				<div class="mobile-stats" aria-label="当前属性">
					<span>见证 <strong>{stats.truth}</strong></span>
					<span>余温 <strong>{stats.warmth}</strong></span>
				</div>
			</aside>
		</div>

		{#if lastResponse}
			<div class="choice-response" role="status">
				<span>你的选择留下了边注</span>
				<p>{lastResponse}</p>
			</div>
		{/if}
	{:else if currentEnding}
		<section class={`ending-screen ending-${currentEnding.id}`} aria-labelledby="ending-title">
			<img
				class="ending-art"
				src={chapter03}
				alt={currentEnding.visual}
			/>
			<div class="ending-wash" aria-hidden="true"></div>
			<div class="ending-sheet">
				<p class="ending-folio">{currentEnding.folio}</p>
				<h1 id="ending-title">{currentEnding.title}</h1>
				<p class="ending-tone">{currentEnding.tone}</p>
				<div class="ending-rule" aria-hidden="true"><span></span></div>
				<div class="ending-copy">
					{#each currentEnding.lines as line}
						<p>{line}</p>
					{/each}
				</div>
				<blockquote>{currentEnding.lastLine}</blockquote>

				<div class="ending-stats">
					<div><span>见证</span><strong>{stats.truth}</strong></div>
					<div><span>余温</span><strong>{stats.warmth}</strong></div>
					<div><span>落笔</span><strong>{history.length}</strong></div>
				</div>

				<details class="edition-notes">
					<summary>查看你的六次落笔</summary>
					<ol>
						{#each history as record}
							<li>{record.label}</li>
						{/each}
					</ol>
				</details>

				<div class="ending-actions">
					<button class="primary-action" type="button" on:click={startNewGame}>重读此夜</button>
					<a class="secondary-action" href={homeHref}>合上漫画</a>
				</div>
			</div>
			<p class="ending-stamp" aria-hidden="true">THE END?</p>
		</section>
	{/if}
</div>

<style>
	:global(body:has(.moon-game)) {
		background: #070b0d;
	}

	:global(body:has(.moon-game) > :not(.moon-game)) {
		pointer-events: none;
	}

	.moon-game {
		--paper: #f1e9d8;
		--paper-deep: #d8cdb7;
		--ink: #111b21;
		--ink-soft: #25343a;
		--night: #070b0d;
		--cyan: #72d8df;
		--cyan-deep: #2a8d98;
		--vermilion: #a6372f;
		--gold: #c69a51;
		position: fixed;
		inset: 0;
		z-index: 12000;
		display: flex;
		width: 100%;
		height: 100dvh;
		min-height: 100svh;
		flex-direction: column;
		overflow: hidden;
		isolation: isolate;
		background: var(--night);
		color: var(--paper);
		font-family:
			"Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
		font-size: 16px;
		line-height: 1.5;
		outline: none;
	}

	.moon-game *,
	.moon-game *::before,
	.moon-game *::after {
		box-sizing: border-box;
	}

	.moon-game button,
	.moon-game a {
		font: inherit;
	}

	.moon-game button:focus-visible,
	.moon-game a:focus-visible,
	.moon-game [tabindex="-1"]:focus-visible {
		outline: 2px solid var(--cyan);
		outline-offset: 4px;
	}

	.paper-grain {
		position: absolute;
		inset: 0;
		z-index: 50;
		pointer-events: none;
		opacity: 0.11;
		background-image:
			radial-gradient(circle at 20% 30%, #fff 0 0.6px, transparent 0.7px),
			radial-gradient(circle at 70% 60%, #000 0 0.7px, transparent 0.8px);
		background-size: 5px 5px, 7px 7px;
		mix-blend-mode: overlay;
	}

	.cover-screen,
	.ending-screen {
		position: relative;
		display: grid;
		width: 100%;
		height: 100%;
		place-items: center;
		overflow: hidden;
	}

	.cover-art,
	.ending-art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 58% 48%;
		filter: saturate(0.84) contrast(1.08) brightness(0.74);
		animation: cover-drift 18s ease-in-out infinite alternate;
	}

	.cover-vignette {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, rgba(5, 9, 11, 0.96) 0%, rgba(5, 9, 11, 0.82) 35%, rgba(5, 9, 11, 0.2) 72%, rgba(5, 9, 11, 0.5) 100%),
			linear-gradient(0deg, rgba(5, 9, 11, 0.9), transparent 42%);
	}

	.cover-grid {
		position: absolute;
		inset: clamp(18px, 3vw, 52px);
		z-index: 2;
		display: grid;
		grid-template-columns: 1.5fr 0.8fr 0.4fr;
		gap: clamp(8px, 1.2vw, 18px);
		pointer-events: none;
	}

	.cover-grid span {
		border: 1px solid rgba(241, 233, 216, 0.28);
		clip-path: polygon(3% 0, 100% 1%, 97% 100%, 0 98%);
	}

	.cover-grid span:nth-child(2) {
		clip-path: polygon(7% 2%, 100% 0, 94% 98%, 0 100%);
	}

	.cover-exit {
		position: absolute;
		top: max(24px, env(safe-area-inset-top));
		right: clamp(24px, 4vw, 64px);
		z-index: 5;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid rgba(241, 233, 216, 0.5);
		color: var(--paper);
		font-size: 0.78rem;
		letter-spacing: 0.16em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.cover-copy {
		position: relative;
		z-index: 4;
		width: min(680px, calc(100% - 48px));
		margin-right: min(46vw, 720px);
		padding: 30px 0 24px clamp(8px, 2vw, 34px);
	}

	.cover-label,
	.english-title,
	.cover-folio,
	.copy-index,
	.choice-heading > span,
	.ending-folio,
	.keyboard-hint {
		font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.cover-label {
		margin: 0 0 24px;
		color: var(--cyan);
		font-size: 0.72rem;
	}

	.cover-copy h1 {
		margin: 0;
		font-family: "Noto Serif SC", "Songti SC", SimSun, serif;
		font-size: clamp(4.5rem, 9.5vw, 10rem);
		font-weight: 900;
		letter-spacing: -0.08em;
		line-height: 0.88;
		text-shadow: 8px 10px 0 rgba(0, 0, 0, 0.35);
	}

	.english-title {
		margin: 16px 0 34px;
		color: rgba(241, 233, 216, 0.58);
		font-size: clamp(0.68rem, 1vw, 0.86rem);
	}

	.cover-tagline {
		max-width: 560px;
		margin: 0 0 14px;
		font-family: "Noto Serif SC", "Songti SC", SimSun, serif;
		font-size: clamp(1.35rem, 2.2vw, 2.1rem);
		font-weight: 700;
		line-height: 1.4;
	}

	.cover-description {
		max-width: 560px;
		margin: 0;
		color: rgba(241, 233, 216, 0.72);
		font-size: 0.94rem;
		line-height: 1.9;
	}

	.cover-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 28px 0;
	}

	.cover-meta span {
		padding: 7px 12px;
		border: 1px solid rgba(241, 233, 216, 0.22);
		background: rgba(8, 15, 18, 0.44);
		color: rgba(241, 233, 216, 0.78);
		font-size: 0.75rem;
		backdrop-filter: blur(8px);
	}

	.storage-notice {
		max-width: 560px;
		margin: -10px 0 20px;
		padding: 10px 14px;
		border-left: 3px solid var(--vermilion);
		background: rgba(166, 55, 47, 0.13);
		color: var(--paper-deep);
		font-size: 0.78rem;
	}

	.cover-actions,
	.ending-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.primary-action,
	.secondary-action {
		display: inline-flex;
		min-height: 50px;
		align-items: center;
		justify-content: center;
		gap: 28px;
		padding: 13px 20px;
		border: 1px solid transparent;
		cursor: pointer;
		font-weight: 800;
		text-decoration: none;
		transition: transform 180ms ease, background 180ms ease, color 180ms ease;
	}

	.primary-action {
		min-width: 210px;
		background: var(--paper);
		color: var(--ink);
		clip-path: polygon(0 4%, 100% 0, 97% 100%, 2% 96%);
	}

	.secondary-action {
		background: rgba(8, 15, 18, 0.52);
		border-color: rgba(241, 233, 216, 0.38);
		color: var(--paper);
	}

	.primary-action:hover,
	.secondary-action:hover {
		transform: translateY(-2px);
	}

	.cover-folio {
		position: absolute;
		right: clamp(24px, 4vw, 64px);
		bottom: max(22px, env(safe-area-inset-bottom));
		left: clamp(24px, 4vw, 64px);
		z-index: 4;
		display: flex;
		justify-content: space-between;
		color: rgba(241, 233, 216, 0.42);
		font-size: 0.64rem;
	}

	.game-header {
		position: relative;
		z-index: 10;
		display: grid;
		min-height: 76px;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 20px;
		padding: max(12px, env(safe-area-inset-top)) 24px 12px;
		border-bottom: 1px solid rgba(241, 233, 216, 0.18);
		background: rgba(7, 11, 13, 0.96);
	}

	.brand-lockup,
	.chapter-lockup,
	.header-actions {
		display: flex;
		align-items: center;
	}

	.brand-lockup {
		gap: 12px;
	}

	.brand-mark {
		display: grid;
		width: 40px;
		height: 40px;
		place-items: center;
		border: 1px solid var(--paper);
		border-radius: 50%;
		font-family: "Noto Serif SC", serif;
		font-size: 0.94rem;
	}

	.brand-lockup div,
	.chapter-lockup {
		flex-direction: column;
		align-items: flex-start;
	}

	.brand-lockup strong {
		font-family: "Noto Serif SC", serif;
		font-size: 1.05rem;
		letter-spacing: 0.12em;
	}

	.brand-lockup div span,
	.chapter-lockup span {
		color: rgba(241, 233, 216, 0.42);
		font-family: ui-monospace, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.12em;
	}

	.chapter-lockup {
		align-items: center;
	}

	.chapter-lockup strong {
		font-family: "Noto Serif SC", serif;
		font-size: 1.12rem;
		letter-spacing: 0.18em;
	}

	.header-actions {
		justify-content: flex-end;
		gap: 10px;
	}

	.text-button,
	.exit-button {
		padding: 9px 13px;
		border: 1px solid transparent;
		background: transparent;
		color: rgba(241, 233, 216, 0.66);
		cursor: pointer;
		font-size: 0.74rem;
		text-decoration: none;
	}

	.exit-button {
		border-color: rgba(241, 233, 216, 0.24);
		color: var(--paper);
	}

	.header-progress {
		position: absolute;
		right: 0;
		bottom: -1px;
		left: 0;
		height: 2px;
		background: rgba(241, 233, 216, 0.08);
	}

	.header-progress span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--cyan-deep), var(--cyan));
		transition: width 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.game-shell {
		position: relative;
		z-index: 2;
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: minmax(190px, 0.7fr) minmax(520px, 3fr) minmax(300px, 1.05fr);
		overflow: hidden;
	}

	.chapter-rail,
	.narrative-rail {
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(241, 233, 216, 0.2) transparent;
	}

	.chapter-rail {
		display: flex;
		flex-direction: column;
		padding: 26px 20px 22px;
		border-right: 1px solid rgba(241, 233, 216, 0.14);
		background:
			linear-gradient(rgba(7, 11, 13, 0.9), rgba(7, 11, 13, 0.94)),
			radial-gradient(circle at 30% 10%, rgba(114, 216, 223, 0.18), transparent 32%);
	}

	.rail-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 20px;
		padding-bottom: 12px;
		border-bottom: 1px solid rgba(241, 233, 216, 0.16);
	}

	.rail-heading span,
	.stat-card-label {
		color: var(--cyan);
		font-family: ui-monospace, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.14em;
	}

	.rail-heading strong {
		font-family: "Noto Serif SC", serif;
		font-size: 0.9rem;
	}

	.scene-list {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.scene-list li {
		display: grid;
		grid-template-columns: 26px 1fr;
		gap: 10px;
		padding: 9px 8px;
		border-left: 2px solid rgba(241, 233, 216, 0.12);
		color: rgba(241, 233, 216, 0.32);
		transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
	}

	.scene-list li > span {
		font-family: ui-monospace, monospace;
		font-size: 0.66rem;
	}

	.scene-list li div {
		display: grid;
		gap: 2px;
	}

	.scene-list small {
		font-size: 0.58rem;
	}

	.scene-list strong {
		font-size: 0.72rem;
		line-height: 1.4;
	}

	.scene-list li.is-current {
		border-color: var(--cyan);
		background: rgba(114, 216, 223, 0.07);
		color: var(--paper);
	}

	.scene-list li.is-complete {
		border-color: rgba(198, 154, 81, 0.5);
		color: rgba(241, 233, 216, 0.62);
	}

	.stat-card {
		margin-top: auto;
		padding: 16px;
		border: 1px solid rgba(241, 233, 216, 0.14);
		background: rgba(241, 233, 216, 0.035);
	}

	.stat-card-label {
		margin: 0 0 14px;
	}

	.stat-row + .stat-row {
		margin-top: 16px;
	}

	.stat-row-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.72rem;
	}

	.stat-row-heading strong {
		color: var(--cyan);
		font-family: ui-monospace, monospace;
	}

	.stat-track {
		height: 3px;
		margin: 7px 0 6px;
		background: rgba(241, 233, 216, 0.12);
	}

	.stat-track span {
		display: block;
		height: 100%;
		background: var(--cyan);
		transition: width 360ms ease;
	}

	.stat-row:nth-of-type(3) .stat-track span {
		background: var(--gold);
	}

	.stat-row small {
		display: block;
		color: rgba(241, 233, 216, 0.32);
		font-size: 0.58rem;
		line-height: 1.5;
	}

	.keyboard-hint {
		margin: 14px 0 0;
		color: rgba(241, 233, 216, 0.24);
		font-size: 0.52rem;
		text-align: center;
	}

	.comic-column {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		padding: 20px clamp(14px, 2vw, 32px) 24px;
		background:
			radial-gradient(circle at 80% 10%, rgba(114, 216, 223, 0.08), transparent 34%),
			linear-gradient(130deg, #10191d, #080d0f 60%);
	}

	.scene-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 14px;
	}

	.scene-heading p {
		margin: 0 0 3px;
		color: var(--cyan);
		font-family: ui-monospace, monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
	}

	.scene-heading h2 {
		margin: 0;
		font-family: "Noto Serif SC", "Songti SC", serif;
		font-size: clamp(1.2rem, 2vw, 1.85rem);
		line-height: 1.22;
		outline: none;
	}

	.scene-heading > span {
		color: rgba(241, 233, 216, 0.3);
		font-family: ui-monospace, monospace;
		font-size: 0.68rem;
	}

	.comic-page {
		position: relative;
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: 1.3fr 0.9fr;
		grid-template-rows: 1fr 1fr;
		gap: clamp(6px, 0.8vw, 12px);
		padding: clamp(7px, 1vw, 13px);
		border: 1px solid rgba(17, 27, 33, 0.75);
		background: var(--paper-deep);
		box-shadow: 0 22px 70px rgba(0, 0, 0, 0.46);
		transform: rotate(-0.25deg);
	}

	.comic-page::before {
		position: absolute;
		inset: 5px;
		border: 1px solid rgba(17, 27, 33, 0.28);
		content: "";
		pointer-events: none;
	}

	.comic-panel {
		position: relative;
		min-height: 0;
		overflow: hidden;
		border: clamp(2px, 0.25vw, 4px) solid var(--ink);
		background: var(--ink);
		clip-path: polygon(1% 0, 100% 1%, 99% 99%, 0 100%);
		opacity: 0.34;
		transform: translateY(8px) scale(0.985);
		filter: grayscale(1) brightness(0.26);
		transition: opacity 420ms ease, transform 420ms ease, filter 420ms ease;
	}

	.comic-panel.is-revealed {
		opacity: 0.82;
		transform: none;
		filter: none;
	}

	.comic-panel.is-active {
		z-index: 2;
		opacity: 1;
		box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--cyan-deep);
	}

	.layout-lead .comic-panel:first-child,
	.layout-depth .comic-panel:nth-child(2),
	.layout-fracture .comic-panel:first-child {
		grid-row: 1 / 3;
	}

	.layout-cut {
		grid-template-columns: 0.85fr 1.15fr;
	}

	.layout-cut .comic-panel:nth-child(3),
	.layout-mirror .comic-panel:nth-child(3) {
		grid-column: 1 / 3;
	}

	.layout-mirror {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 0.9fr 1.1fr;
	}

	.layout-fracture {
		grid-template-columns: 1.2fr 0.8fr;
	}

	.layout-finale {
		grid-template-columns: 0.8fr 1.2fr;
	}

	.layout-finale .comic-panel:nth-child(2) {
		grid-row: 1 / 3;
		grid-column: 2;
	}

	.panel-art,
	.panel-wash {
		position: absolute;
		inset: 0;
	}

	.panel-art {
		background-repeat: no-repeat;
		background-size: cover;
		filter: contrast(1.04) saturate(0.88);
		transition: transform 8s ease;
	}

	.comic-panel.is-active .panel-art {
		transform: scale(1.045);
	}

	.panel-wash {
		background: linear-gradient(180deg, rgba(5, 8, 10, 0.04) 20%, rgba(5, 8, 10, 0.78) 100%);
	}

	.tone-cyan .panel-wash {
		box-shadow: inset 0 0 72px rgba(76, 195, 207, 0.2);
	}

	.tone-vermillion .panel-wash {
		box-shadow: inset 0 0 72px rgba(166, 55, 47, 0.24);
	}

	.panel-kicker {
		position: absolute;
		top: 10px;
		left: 10px;
		padding: 5px 7px;
		background: var(--ink);
		color: var(--paper);
		font-family: ui-monospace, monospace;
		font-size: clamp(0.48rem, 0.65vw, 0.62rem);
		letter-spacing: 0.08em;
	}

	.panel-caption {
		position: absolute;
		right: 9px;
		bottom: 9px;
		left: 9px;
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 10px;
	}

	.panel-caption strong {
		max-width: 84%;
		padding: 7px 9px;
		background: rgba(241, 233, 216, 0.92);
		color: var(--ink);
		font-family: "Noto Serif SC", serif;
		font-size: clamp(0.68rem, 0.92vw, 0.94rem);
		line-height: 1.45;
		box-decoration-break: clone;
	}

	.panel-caption em {
		color: var(--paper);
		font-family: "Noto Serif SC", serif;
		font-size: clamp(0.85rem, 1.3vw, 1.35rem);
		font-style: normal;
		font-weight: 900;
		text-shadow: 2px 2px 0 var(--ink);
		transform: rotate(-6deg);
	}

	.speech-balloon {
		position: absolute;
		top: 16%;
		right: 7%;
		max-width: min(68%, 250px);
		margin: 0;
		padding: 10px 13px;
		border: 2px solid var(--ink);
		border-radius: 50% 48% 52% 45%;
		background: rgba(241, 233, 216, 0.94);
		color: var(--ink);
		font-family: "Noto Serif SC", serif;
		font-size: clamp(0.62rem, 0.75vw, 0.78rem);
		line-height: 1.5;
		transform: rotate(1.5deg);
	}

	.speech-balloon span {
		display: block;
		margin-bottom: 2px;
		color: var(--vermilion);
		font-size: 0.54rem;
		font-weight: 800;
	}

	.unread-mark {
		position: absolute;
		top: 50%;
		left: 50%;
		padding: 4px 8px;
		border: 1px solid rgba(241, 233, 216, 0.4);
		color: rgba(241, 233, 216, 0.5);
		font-family: ui-monospace, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.2em;
		transform: translate(-50%, -50%) rotate(-7deg);
	}

	.page-number {
		position: absolute;
		right: 15px;
		bottom: -24px;
		color: rgba(241, 233, 216, 0.4);
		font-family: ui-monospace, monospace;
		font-size: 0.58rem;
	}

	.narrative-rail {
		display: flex;
		flex-direction: column;
		padding: clamp(20px, 2vw, 32px);
		border-left: 1px solid rgba(241, 233, 216, 0.14);
		background: var(--paper);
		color: var(--ink);
	}

	.panel-copy {
		padding-bottom: 22px;
		border-bottom: 1px solid rgba(17, 27, 33, 0.18);
	}

	.copy-index {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
		color: var(--cyan-deep);
		font-size: 0.58rem;
	}

	.panel-copy h3,
	.choice-heading h3 {
		margin: 0;
		font-family: "Noto Serif SC", "Songti SC", serif;
		font-size: clamp(1.28rem, 2vw, 1.9rem);
		line-height: 1.35;
	}

	.panel-copy > p {
		margin: 18px 0 0;
		color: rgba(17, 27, 33, 0.72);
		font-family: "Noto Serif SC", serif;
		font-size: 0.94rem;
		line-height: 1.9;
	}

	.panel-copy blockquote {
		margin: 20px 0 0;
		padding: 14px 16px;
		border: 0;
		border-left: 3px solid var(--vermilion);
		background: rgba(166, 55, 47, 0.07);
		font-family: "Noto Serif SC", serif;
		font-size: 0.9rem;
		font-weight: 700;
		line-height: 1.8;
	}

	.panel-copy blockquote span {
		display: block;
		margin-bottom: 4px;
		color: var(--vermilion);
		font-family: ui-monospace, monospace;
		font-size: 0.56rem;
		letter-spacing: 0.12em;
	}

	.choice-card {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding-top: 22px;
		animation: ink-in 360ms ease both;
	}

	.choice-heading > span {
		color: var(--vermilion);
		font-size: 0.58rem;
	}

	.choice-heading h3 {
		margin-top: 8px;
	}

	.choice-heading p {
		margin: 9px 0 0;
		color: rgba(17, 27, 33, 0.54);
		font-size: 0.75rem;
	}

	.choice-list {
		display: grid;
		gap: 9px;
		margin-top: 18px;
	}

	.choice-option {
		display: grid;
		min-height: 66px;
		grid-template-columns: 30px 1fr 22px;
		align-items: center;
		gap: 10px;
		padding: 12px;
		border: 1px solid rgba(17, 27, 33, 0.28);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		text-align: left;
		transition: background 160ms ease, color 160ms ease, transform 160ms ease;
	}

	.choice-option:hover:not(:disabled) {
		background: var(--ink);
		color: var(--paper);
		transform: translateX(3px);
	}

	.choice-number {
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
	}

	.choice-body {
		display: grid;
		gap: 3px;
	}

	.choice-body strong {
		font-family: "Noto Serif SC", serif;
		font-size: 0.9rem;
	}

	.choice-body small {
		opacity: 0.62;
		font-size: 0.68rem;
		line-height: 1.45;
	}

	.choice-arrow {
		font-size: 1rem;
		text-align: right;
	}

	.choice-option.is-locked {
		border-style: dashed;
		cursor: not-allowed;
		opacity: 0.46;
	}

	.reader-controls {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px;
		margin-top: auto;
		padding-top: 24px;
	}

	.reader-controls button {
		min-height: 48px;
		padding: 12px 14px;
		border: 1px solid rgba(17, 27, 33, 0.25);
		cursor: pointer;
		font-size: 0.78rem;
	}

	.previous-panel {
		background: transparent;
		color: var(--ink);
	}

	.previous-panel:disabled {
		cursor: not-allowed;
		opacity: 0.28;
	}

	.next-panel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		background: var(--ink);
		color: var(--paper);
		font-weight: 800;
	}

	.mobile-stats {
		display: none;
	}

	.choice-response {
		position: fixed;
		right: clamp(20px, 2vw, 34px);
		bottom: max(22px, env(safe-area-inset-bottom));
		z-index: 40;
		width: min(420px, calc(100% - 40px));
		padding: 14px 17px;
		border-left: 4px solid var(--cyan);
		background: rgba(7, 11, 13, 0.94);
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.42);
		animation: note-in 420ms ease both;
	}

	.choice-response span {
		color: var(--cyan);
		font-family: ui-monospace, monospace;
		font-size: 0.56rem;
		letter-spacing: 0.12em;
	}

	.choice-response p {
		margin: 5px 0 0;
		font-family: "Noto Serif SC", serif;
		font-size: 0.82rem;
		line-height: 1.65;
	}

	.ending-art {
		object-position: 52% 42%;
		filter: saturate(0.78) contrast(1.1) brightness(0.46);
	}

	.ending-wash {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, rgba(5, 8, 10, 0.92) 0%, rgba(5, 8, 10, 0.68) 56%, rgba(5, 8, 10, 0.34)),
			radial-gradient(circle at 75% 20%, rgba(114, 216, 223, 0.18), transparent 40%);
	}

	.ending-sheet {
		position: relative;
		z-index: 3;
		width: min(720px, calc(100% - 48px));
		max-height: calc(100dvh - 64px);
		margin-right: min(38vw, 560px);
		overflow-y: auto;
		padding: clamp(30px, 4vw, 60px);
		border: 1px solid rgba(241, 233, 216, 0.18);
		background: rgba(7, 11, 13, 0.82);
		box-shadow: 18px 22px 0 rgba(0, 0, 0, 0.2);
		backdrop-filter: blur(18px);
	}

	.ending-folio {
		margin: 0 0 8px;
		color: var(--cyan);
		font-size: 0.62rem;
	}

	.ending-sheet h1 {
		margin: 0;
		font-family: "Noto Serif SC", "Songti SC", serif;
		font-size: clamp(3rem, 6vw, 6.5rem);
		letter-spacing: -0.06em;
		line-height: 1;
	}

	.ending-tone {
		margin: 10px 0 0;
		color: rgba(241, 233, 216, 0.48);
		font-size: 0.74rem;
	}

	.ending-rule {
		height: 1px;
		margin: 24px 0;
		background: rgba(241, 233, 216, 0.18);
	}

	.ending-rule span {
		display: block;
		width: 22%;
		height: 3px;
		background: var(--cyan);
		transform: translateY(-1px);
	}

	.ending-copy {
		display: grid;
		gap: 12px;
	}

	.ending-copy p {
		margin: 0;
		color: rgba(241, 233, 216, 0.75);
		font-family: "Noto Serif SC", serif;
		font-size: 0.91rem;
		line-height: 1.9;
	}

	.ending-sheet blockquote {
		margin: 24px 0;
		padding: 16px 18px;
		border: 0;
		border-left: 3px solid var(--cyan);
		background: rgba(114, 216, 223, 0.06);
		font-family: "Noto Serif SC", serif;
		font-size: clamp(1rem, 1.5vw, 1.25rem);
		font-weight: 700;
		line-height: 1.65;
	}

	.ending-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		margin: 22px 0;
		border: 1px solid rgba(241, 233, 216, 0.16);
	}

	.ending-stats div {
		display: grid;
		gap: 4px;
		padding: 12px;
		text-align: center;
	}

	.ending-stats div + div {
		border-left: 1px solid rgba(241, 233, 216, 0.16);
	}

	.ending-stats span {
		color: rgba(241, 233, 216, 0.45);
		font-size: 0.62rem;
	}

	.ending-stats strong {
		color: var(--cyan);
		font-family: ui-monospace, monospace;
		font-size: 1.15rem;
	}

	.edition-notes {
		margin-bottom: 22px;
		border-top: 1px solid rgba(241, 233, 216, 0.14);
		border-bottom: 1px solid rgba(241, 233, 216, 0.14);
	}

	.edition-notes summary {
		padding: 12px 0;
		cursor: pointer;
		color: rgba(241, 233, 216, 0.62);
		font-size: 0.72rem;
	}

	.edition-notes ol {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 5px 24px;
		margin: 0 0 12px;
		padding-left: 24px;
		color: rgba(241, 233, 216, 0.6);
		font-size: 0.68rem;
	}

	.ending-stamp {
		position: absolute;
		right: 5vw;
		bottom: 5vh;
		z-index: 3;
		margin: 0;
		color: rgba(241, 233, 216, 0.16);
		font-family: ui-monospace, monospace;
		font-size: clamp(2rem, 5vw, 6rem);
		font-weight: 900;
		letter-spacing: 0.08em;
		transform: rotate(-7deg);
	}

	@keyframes cover-drift {
		from { transform: scale(1.01) translate3d(0, 0, 0); }
		to { transform: scale(1.06) translate3d(-0.8%, -0.6%, 0); }
	}

	@keyframes ink-in {
		from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
		to { opacity: 1; transform: none; filter: none; }
	}

	@keyframes note-in {
		from { opacity: 0; transform: translateY(14px); }
		to { opacity: 1; transform: none; }
	}

	@media (max-width: 1180px) {
		.game-shell {
			grid-template-columns: minmax(0, 1fr) minmax(310px, 0.48fr);
		}

		.chapter-rail {
			display: none;
		}

		.cover-copy {
			margin-right: 38vw;
		}
	}

	@media (max-width: 760px) {
		.moon-game {
			overflow: auto;
		}

		.cover-screen,
		.ending-screen {
			min-height: 100dvh;
			height: auto;
			place-items: end start;
		}

		.cover-art {
			object-position: 64% 42%;
		}

		.cover-vignette {
			background: linear-gradient(0deg, rgba(5, 9, 11, 0.98) 0%, rgba(5, 9, 11, 0.82) 50%, rgba(5, 9, 11, 0.14) 100%);
		}

		.cover-grid {
			display: none;
		}

		.cover-exit {
			right: 16px;
			display: grid;
			width: 42px;
			height: 42px;
			place-items: center;
			padding: 0;
			border: 1px solid rgba(241, 233, 216, 0.48);
			border-radius: 50%;
			background: rgba(7, 11, 13, 0.48);
		}

		.cover-exit-label {
			display: none;
		}

		.cover-copy {
			width: 100%;
			margin: 0;
			padding: 44vh 22px max(72px, calc(env(safe-area-inset-bottom) + 54px));
		}

		.cover-copy h1 {
			font-size: clamp(4rem, 25vw, 7rem);
		}

		.cover-label {
			margin-bottom: 14px;
		}

		.english-title {
			margin: 10px 0 18px;
		}

		.cover-description {
			font-size: 0.84rem;
			line-height: 1.7;
		}

		.cover-meta {
			margin: 18px 0;
		}

		.cover-folio {
			display: none;
		}

		.cover-actions,
		.cover-actions .primary-action,
		.cover-actions .secondary-action {
			width: 100%;
		}

		.game-header {
			position: sticky;
			top: 0;
			grid-template-columns: 1fr auto;
			padding-right: 14px;
			padding-left: 14px;
		}

		.chapter-lockup,
		.text-button,
		.brand-lockup div span {
			display: none;
		}

		.brand-mark {
			width: 34px;
			height: 34px;
		}

		.exit-button {
			padding: 8px 10px;
		}

		.game-shell {
			display: block;
			overflow: visible;
		}

		.comic-column {
			min-height: 64svh;
			padding: 16px 12px 22px;
		}

		.scene-heading {
			align-items: start;
		}

		.scene-heading h2 {
			font-size: 1.2rem;
		}

		.comic-page {
			min-height: 50svh;
			transform: none;
		}

		.panel-caption strong {
			font-size: 0.62rem;
		}

		.speech-balloon {
			display: none;
		}

		.narrative-rail {
			min-height: 42svh;
			overflow: visible;
			padding: 24px 20px max(28px, env(safe-area-inset-bottom));
			border-top: 5px solid var(--ink);
			border-left: 0;
		}

		.panel-copy > p {
			font-size: 0.86rem;
		}

		.reader-controls {
			margin-top: 24px;
		}

		.choice-option {
			min-height: 70px;
		}

		.mobile-stats {
			display: flex;
			justify-content: space-between;
			margin-top: 18px;
			padding-top: 12px;
			border-top: 1px solid rgba(17, 27, 33, 0.16);
			font-size: 0.68rem;
		}

		.mobile-stats strong {
			color: var(--cyan-deep);
			font-family: ui-monospace, monospace;
		}

		.choice-response {
			right: 14px;
			bottom: max(14px, env(safe-area-inset-bottom));
			width: calc(100% - 28px);
		}

		.ending-screen {
			place-items: end stretch;
		}

		.ending-art {
			object-position: 52% 25%;
		}

		.ending-wash {
			background: linear-gradient(0deg, rgba(5, 8, 10, 0.98) 0%, rgba(5, 8, 10, 0.82) 66%, rgba(5, 8, 10, 0.18));
		}

		.ending-sheet {
			width: calc(100% - 24px);
			max-height: none;
			margin: 36vh 12px 12px;
			padding: 28px 22px max(28px, env(safe-area-inset-bottom));
		}

		.ending-sheet h1 {
			font-size: clamp(3.2rem, 18vw, 5rem);
		}

		.edition-notes ol {
			grid-template-columns: 1fr;
		}

		.ending-actions,
		.ending-actions .primary-action,
		.ending-actions .secondary-action {
			width: 100%;
		}

		.ending-stamp {
			display: none;
		}
	}

	@media (max-height: 720px) and (min-width: 761px) {
		.game-header {
			min-height: 62px;
		}

		.game-shell {
			grid-template-columns: 170px minmax(440px, 1fr) minmax(280px, 0.62fr);
		}

		.chapter-rail,
		.narrative-rail {
			padding-top: 17px;
			padding-bottom: 17px;
		}

		.scene-list li {
			padding-top: 5px;
			padding-bottom: 5px;
		}

		.stat-card {
			padding: 10px 12px;
		}

		.scene-heading {
			margin-bottom: 8px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cover-art,
		.ending-art,
		.choice-card,
		.choice-response {
			animation: none;
		}

		.comic-panel,
		.panel-art,
		.header-progress span,
		.stat-track span {
			transition-duration: 0.01ms;
		}
	}
</style>
