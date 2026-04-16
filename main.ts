import { App, Modal, Notice, Plugin, setIcon } from "obsidian";

// ─── i18n ────────────────────────────────────────────────────────────────────

type Lang = "zh" | "en";

const I18N: Record<Lang, Record<string, string>> = {
	zh: {
		realWage: "主业真实时薪",
		blended: "综合",
		base: "原定",
		target: "目标",
		fish: "摸鱼",
		hustle: "副业",
		stopAll: "全部暂停",
		manual: "补录",
		settings: "设置",
		dailyPay: "主业日薪",
		workHours: "坐班时长",
		sideIncome: "副业收益",
		waterInterval: "喝水提醒(分钟)",
		lockDuration: "锁屏时长(秒)",
		trend: "身价趋势",
		history: "历史归档",
		noRecords: "暂无记录",
		archiveToday: "结束今日并归档",
		archiveConfirm: "归档后数据将重置，确定吗？",
		archived: "已归档！",
		calculating: "分析中...",
		exceededTarget: "已超额完成目标",
		targetTooHigh: "目标过高无法达成",
		targetReached: "目标达成，纯赚时刻",
		needMore: "还需摸鱼 {h}小时 {m}分",
		drinkWater: "该喝水了",
		doneDrinking: "已喝水",
		go: "开始！",
		manualTitle: "补录分钟数",
		manualPlaceholder: "\u00B1 分钟",
		confirm: "确定",
		cancel: "取消",
		langSwitch: "EN",
		deleteConfirm: "删除这条记录？",
		about: "关于",
		aboutAuthor: "by innerpure",
		aboutDesc: "一个帮你看清真实时薪的小工具。",
		aboutSite: "innerpure.cn",
		aboutDada: "和答答聊聊",
		archiveTitle: "确认归档",
		deleteTitle: "确认删除",
	},
	en: {
		realWage: "Actual hourly rate",
		blended: "Overall",
		base: "Nominal",
		target: "Goal",
		fish: "Slack off",
		hustle: "Side gig",
		stopAll: "Pause all",
		manual: "Log",
		settings: "Settings",
		dailyPay: "Daily salary",
		workHours: "Office hours",
		sideIncome: "Side income",
		waterInterval: "Water break (min)",
		lockDuration: "Break lock (sec)",
		trend: "Rate trend",
		history: "History",
		noRecords: "No records yet",
		archiveToday: "End day & archive",
		archiveConfirm: "Archive and reset today's data?",
		archived: "Archived!",
		calculating: "Calculating...",
		exceededTarget: "Goal already hit",
		targetTooHigh: "Goal unreachable",
		targetReached: "Goal reached!",
		needMore: "{h}h {m}m of slack left",
		drinkWater: "Water break",
		doneDrinking: "Done",
		go: "Go!",
		manualTitle: "Log minutes",
		manualPlaceholder: "\u00B1 minutes",
		confirm: "OK",
		cancel: "Cancel",
		langSwitch: "中",
		deleteConfirm: "Delete this record?",
		about: "About",
		aboutAuthor: "by innerpure",
		aboutDesc: "A tool that reveals your real hourly rate.",
		aboutSite: "innerpure.cn",
		aboutDada: "Chat with Dada",
		archiveTitle: "Confirm archive",
		deleteTitle: "Confirm delete",
	},
};

function t(lang: Lang, key: string, vars?: Record<string, string>): string {
	let s = I18N[lang][key] || I18N["en"][key] || key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			s = s.replace(`{${k}}`, v);
		}
	}
	return s;
}

// ─── Data ────────────────────────────────────────────────────────────────────

interface HistoryRecord {
	date: string;
	fishH: string;
	rate: string;
}

interface MoyuData {
	income: number;
	totalHours: number;
	sideIncome: number;
	targetWage: number;
	fishMs: number;
	hustleMs: number;
	activeMode: "fish" | "hustle" | null;
	startTime: number;
	waterInterval: number;
	waterLockDuration: number;
	lang: Lang;
	history: HistoryRecord[];
}

const DEFAULT_DATA: MoyuData = {
	income: 800,
	totalHours: 8.5,
	sideIncome: 0,
	targetWage: 150,
	fishMs: 0,
	hustleMs: 0,
	activeMode: null,
	startTime: 0,
	waterInterval: 45,
	waterLockDuration: 60,
	lang: "zh",
	history: [],
};

// Numeric keys that can be set from settings inputs
type NumericDataKey = "income" | "totalHours" | "sideIncome" | "waterInterval" | "waterLockDuration";

function msToTime(ms: number): string {
	const s = Math.floor(ms / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function pad(n: number): string {
	return n < 10 ? "0" + n : String(n);
}

// ─── Confirm Modal (replaces window.confirm) ─────────────────────────────────

class ConfirmModal extends Modal {
	private message: string;
	private title: string;
	private onConfirm: () => void;

	constructor(app: App, title: string, message: string, onConfirm: () => void) {
		super(app);
		this.title = title;
		this.message = message;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("moyu-confirm-content");

		contentEl.createEl("h3", { text: this.title, cls: "moyu-confirm-title" });
		contentEl.createEl("p", { text: this.message, cls: "moyu-confirm-msg" });

		const btnRow = contentEl.createDiv({ cls: "moyu-manual-btns" });

		const cancelBtn = btnRow.createEl("button", { text: "Cancel", cls: "moyu-btn-tool" });
		cancelBtn.addEventListener("click", () => this.close());

		const okBtn = btnRow.createEl("button", { text: "OK", cls: "moyu-btn-archive moyu-manual-ok" });
		okBtn.addEventListener("click", () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export default class MoyuPlugin extends Plugin {
	data: MoyuData = { ...DEFAULT_DATA };
	private statusBarEl: HTMLElement | null = null;
	private tickInterval: number | null = null;
	private waterTimerId: number | null = null;
	lastWaterTime: number = Date.now();

	get lang(): Lang {
		return this.data.lang;
	}

	async onload() {
		await this.loadSettings();

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("moyu-status");
		this.statusBarEl.addEventListener("click", () => {
			new MoyuModal(this.app, this).open();
		});

		this.updateStatusBar();

		this.tickInterval = window.setInterval(() => this.updateStatusBar(), 1000);
		this.registerInterval(this.tickInterval);

		this.lastWaterTime = Date.now();
		this.startWaterTimer();

		this.addCommand({
			id: "start-fish",
			name: "Start fish mode",
			callback: () => { void this.startMode("fish"); },
		});
		this.addCommand({
			id: "start-hustle",
			name: "Start hustle mode",
			callback: () => { void this.startMode("hustle"); },
		});
		this.addCommand({
			id: "open-panel",
			name: "Open panel",
			callback: () => new MoyuModal(this.app, this).open(),
		});
		this.addCommand({
			id: "stop-all",
			name: "Stop all timers",
			callback: () => { void this.stopAll(); },
		});
	}

	onunload() {
		if (this.waterTimerId !== null) {
			window.clearInterval(this.waterTimerId);
		}
	}

	async loadSettings() {
		const saved = await this.loadData();
		if (saved) {
			this.data = { ...DEFAULT_DATA, ...(saved as Partial<MoyuData>) };
		}
	}

	async save() {
		await this.saveData(this.data);
	}

	getCurrentFishMs(): number {
		let ms = this.data.fishMs;
		if (this.data.activeMode === "fish") {
			ms += Date.now() - this.data.startTime;
		}
		return ms;
	}

	getCurrentHustleMs(): number {
		let ms = this.data.hustleMs;
		if (this.data.activeMode === "hustle") {
			ms += Date.now() - this.data.startTime;
		}
		return ms;
	}

	async startMode(mode: "fish" | "hustle") {
		if (this.data.activeMode === mode) return;
		if (this.data.activeMode) {
			await this.stopAll();
		}
		this.data.activeMode = mode;
		this.data.startTime = Date.now();
		await this.save();
		this.updateStatusBar();
	}

	async stopAll() {
		if (this.data.activeMode) {
			const elapsed = Date.now() - this.data.startTime;
			if (this.data.activeMode === "fish") {
				this.data.fishMs += elapsed;
			} else {
				this.data.hustleMs += elapsed;
			}
		}
		this.data.activeMode = null;
		await this.save();
		this.updateStatusBar();
	}

	async manualAdd(minutes: number) {
		const mode = this.data.activeMode || "fish";
		if (mode === "fish") {
			this.data.fishMs += minutes * 60000;
			if (this.data.fishMs < 0) this.data.fishMs = 0;
		} else {
			this.data.hustleMs += minutes * 60000;
			if (this.data.hustleMs < 0) this.data.hustleMs = 0;
		}
		await this.save();
	}

	calcWages() {
		const fMs = this.getCurrentFishMs();
		const hMs = this.getCurrentHustleMs();
		const totalSlackH = (fMs + hMs) / 3600000;
		const effectiveH = this.data.totalHours - totalSlackH;
		const realWage = this.data.income / (effectiveH > 0 ? effectiveH : 0.01);
		const blended =
			(this.data.income + this.data.sideIncome) / this.data.totalHours;
		const base = this.data.income / this.data.totalHours;

		const target = this.data.targetWage;
		const neededEffective = this.data.income / target;
		const totalSlackNeeded = this.data.totalHours - neededEffective;
		const remainSlack = totalSlackNeeded - totalSlackH;

		let goalMsg: string;
		if (totalSlackNeeded <= 0)
			goalMsg = t(this.lang, "exceededTarget");
		else if (totalSlackNeeded >= this.data.totalHours)
			goalMsg = t(this.lang, "targetTooHigh");
		else if (remainSlack <= 0)
			goalMsg = t(this.lang, "targetReached");
		else {
			const h = Math.floor(remainSlack);
			const m = Math.ceil((remainSlack - h) * 60);
			goalMsg = t(this.lang, "needMore", {
				h: String(h),
				m: String(m),
			});
		}

		return { realWage, blended, base, goalMsg, fMs, hMs };
	}

	async archiveDay() {
		const fMs = this.getCurrentFishMs();
		const hMs = this.getCurrentHustleMs();
		const blended =
			(this.data.income + this.data.sideIncome) / this.data.totalHours;

		const now = new Date();
		const record: HistoryRecord = {
			date: `${pad(now.getMonth() + 1)}/${pad(now.getDate())}`,
			fishH: ((fMs + hMs) / 3600000).toFixed(1),
			rate: blended.toFixed(0),
		};

		this.data.history.push(record);
		if (this.data.history.length > 7) this.data.history.shift();
		this.data.fishMs = 0;
		this.data.hustleMs = 0;
		this.data.sideIncome = 0;
		this.data.activeMode = null;
		await this.save();
	}

	async deleteRecord(index: number) {
		this.data.history.splice(index, 1);
		await this.save();
	}

	updateStatusBar() {
		if (!this.statusBarEl) return;
		this.statusBarEl.empty();

		const iconSpan = this.statusBarEl.createSpan({ cls: "moyu-status-icon" });
		const timeSpan = this.statusBarEl.createSpan({ cls: "moyu-status-time" });

		if (this.data.activeMode === "fish") {
			setIcon(iconSpan, "coffee");
			timeSpan.setText(msToTime(this.getCurrentFishMs()));
		} else if (this.data.activeMode === "hustle") {
			setIcon(iconSpan, "zap");
			timeSpan.setText(msToTime(this.getCurrentHustleMs()));
		} else {
			setIcon(iconSpan, "pause");
			const total = this.getCurrentFishMs() + this.getCurrentHustleMs();
			timeSpan.setText(total > 0 ? msToTime(total) : "--:--:--");
		}
	}

	startWaterTimer() {
		if (this.waterTimerId !== null) {
			window.clearInterval(this.waterTimerId);
		}
		if (this.data.waterInterval <= 0) return;

		this.waterTimerId = window.setInterval(() => {
			const elapsed = (Date.now() - this.lastWaterTime) / 60000;
			if (elapsed >= this.data.waterInterval) {
				this.showWaterLock();
			}
		}, 10000);
		this.registerInterval(this.waterTimerId);
	}

	showWaterLock() {
		this.lastWaterTime = Date.now();
		new WaterLockModal(this.app, this).open();
	}
}

// ─── Manual Input Modal ──────────────────────────────────────────────────────

class ManualInputModal extends Modal {
	plugin: MoyuPlugin;
	private onSubmit: (value: number) => void;

	constructor(app: App, plugin: MoyuPlugin, onSubmit: (value: number) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("moyu-manual-content");

		contentEl.createEl("h3", {
			text: t(this.plugin.lang, "manualTitle"),
			cls: "moyu-manual-title",
		});

		const input = contentEl.createEl("input", {
			type: "number",
			cls: "moyu-manual-input",
			placeholder: t(this.plugin.lang, "manualPlaceholder"),
		});
		input.focus();

		const btnRow = contentEl.createDiv({ cls: "moyu-manual-btns" });

		const cancelBtn = btnRow.createEl("button", {
			text: t(this.plugin.lang, "cancel"),
			cls: "moyu-btn-tool",
		});
		cancelBtn.addEventListener("click", () => this.close());

		const okBtn = btnRow.createEl("button", {
			text: t(this.plugin.lang, "confirm"),
			cls: "moyu-btn-archive moyu-manual-ok",
		});
		okBtn.addEventListener("click", () => {
			const val = parseFloat(input.value);
			if (!isNaN(val)) {
				this.onSubmit(val);
			}
			this.close();
		});

		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				const val = parseFloat(input.value);
				if (!isNaN(val)) {
					this.onSubmit(val);
				}
				this.close();
			}
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Water Lock Modal ────────────────────────────────────────────────────────

class WaterLockModal extends Modal {
	plugin: MoyuPlugin;
	private countdownInterval: number | null = null;
	private remaining: number;

	constructor(app: App, plugin: MoyuPlugin) {
		super(app);
		this.plugin = plugin;
		this.remaining = plugin.data.waterLockDuration;
	}

	private locked = true;
	private escHandler = (e: KeyboardEvent) => {
		if (this.locked && e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	onOpen() {
		this.locked = true;
		this.modalEl.addClass("moyu-water-lock");

		document.addEventListener("keydown", this.escHandler, true);

		// Block clicking backdrop to close — use CSS class instead of inline style
		const bg = this.containerEl.querySelector(".modal-bg");
		if (bg) {
			bg.addClass("moyu-no-pointer");
		}

		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("moyu-water-content");

		const container = contentEl.createDiv({ cls: "moyu-water-container" });

		const iconEl = container.createDiv({ cls: "moyu-water-icon" });
		setIcon(iconEl, "droplets");

		container.createEl("h2", {
			text: t(this.plugin.lang, "drinkWater"),
			cls: "moyu-water-title",
		});

		const countdownEl = container.createDiv({ cls: "moyu-water-countdown" });
		countdownEl.setText(String(this.remaining));

		const btnContainer = container.createDiv({ cls: "moyu-water-btn-wrap" });
		const btn = btnContainer.createEl("button", {
			text: t(this.plugin.lang, "doneDrinking"),
			cls: "moyu-water-btn moyu-water-btn-locked",
		});
		btn.disabled = true;

		this.countdownInterval = window.setInterval(() => {
			this.remaining--;
			countdownEl.setText(String(this.remaining));
			if (this.remaining <= 0) {
				if (this.countdownInterval !== null) {
					window.clearInterval(this.countdownInterval);
				}
				countdownEl.setText(t(this.plugin.lang, "go"));
				btn.disabled = false;
				btn.removeClass("moyu-water-btn-locked");
				btn.addClass("moyu-water-btn-ready");
				this.locked = false;
			}
		}, 1000);

		btn.addEventListener("click", () => {
			if (!btn.disabled) {
				this.close();
			}
		});

		const closeBtn = this.modalEl.querySelector(".modal-close-button");
		if (closeBtn) {
			closeBtn.addClass("moyu-hidden");
		}
	}

	onClose() {
		document.removeEventListener("keydown", this.escHandler, true);
		if (this.countdownInterval !== null) {
			window.clearInterval(this.countdownInterval);
		}
		this.plugin.lastWaterTime = Date.now();
	}
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

class MoyuModal extends Modal {
	plugin: MoyuPlugin;
	private tickInterval: number | null = null;
	private wageEl: HTMLElement | null = null;
	private blendedEl: HTMLElement | null = null;
	private baseEl: HTMLElement | null = null;
	private goalEl: HTMLElement | null = null;
	private fishTimeEl: HTMLElement | null = null;
	private hustleTimeEl: HTMLElement | null = null;
	private fishUnit: HTMLElement | null = null;
	private hustleUnit: HTMLElement | null = null;

	private get lang(): Lang {
		return this.plugin.lang;
	}

	constructor(app: App, plugin: MoyuPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.modalEl.addClass("moyu-modal");
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("moyu-content");

		this.renderHeader(contentEl);
		this.renderDashboard(contentEl);
		this.renderGoal(contentEl);
		this.renderTimers(contentEl);
		this.renderToolbar(contentEl);
		this.renderSettings(contentEl);
		this.renderHistory(contentEl);

		this.tick();
		this.tickInterval = window.setInterval(() => this.tick(), 1000);
	}

	onClose() {
		if (this.tickInterval !== null) {
			window.clearInterval(this.tickInterval);
		}
	}

	private tick() {
		const w = this.plugin.calcWages();
		if (this.wageEl) this.wageEl.setText(w.realWage.toFixed(2));
		if (this.blendedEl) this.blendedEl.setText(w.blended.toFixed(0));
		if (this.baseEl) this.baseEl.setText(w.base.toFixed(0));
		if (this.goalEl) this.goalEl.setText(w.goalMsg);
		if (this.fishTimeEl) this.fishTimeEl.setText(msToTime(w.fMs));
		if (this.hustleTimeEl) this.hustleTimeEl.setText(msToTime(w.hMs));

		const mode = this.plugin.data.activeMode;
		if (this.fishUnit) {
			this.fishUnit.toggleClass("moyu-timer-active-fish", mode === "fish");
		}
		if (this.hustleUnit) {
			this.hustleUnit.toggleClass(
				"moyu-timer-active-hustle",
				mode === "hustle"
			);
		}
	}

	private renderHeader(parent: HTMLElement) {
		const header = parent.createDiv({ cls: "moyu-header" });
		const langBtn = header.createEl("button", {
			text: t(this.lang, "langSwitch"),
			cls: "moyu-btn-lang",
		});
		langBtn.addEventListener("click", () => {
			this.plugin.data.lang = this.plugin.data.lang === "zh" ? "en" : "zh";
			void this.plugin.save();
			this.onOpen();
		});
	}

	private renderDashboard(parent: HTMLElement) {
		const card = parent.createDiv({ cls: "moyu-card moyu-dashboard" });

		card.createDiv({ cls: "moyu-label", text: t(this.lang, "realWage") });

		const wageRow = card.createDiv({ cls: "moyu-wage-display" });
		wageRow.createSpan({ cls: "moyu-currency", text: "\uFFE5" });
		this.wageEl = wageRow.createSpan({ text: "0.00" });

		const capsuleRow = card.createDiv({ cls: "moyu-capsule-row" });

		const c1 = capsuleRow.createDiv({ cls: "moyu-capsule" });
		c1.appendText(t(this.lang, "blended") + " ");
		c1.createSpan({ cls: "moyu-capsule-val" }).appendText("\uFFE5");
		this.blendedEl = c1.createSpan({ cls: "moyu-capsule-val", text: "0" });

		const c2 = capsuleRow.createDiv({ cls: "moyu-capsule" });
		c2.appendText(t(this.lang, "base") + " ");
		c2.createSpan({ cls: "moyu-capsule-val" }).appendText("\uFFE5");
		this.baseEl = c2.createSpan({ cls: "moyu-capsule-val", text: "0" });
	}

	private renderGoal(parent: HTMLElement) {
		const bar = parent.createDiv({ cls: "moyu-goal-bar" });

		this.goalEl = bar.createDiv({ text: t(this.lang, "calculating") });

		const right = bar.createDiv({ cls: "moyu-goal-right" });
		right.appendText(t(this.lang, "target") + " ");
		const input = right.createEl("input", {
			type: "number",
			cls: "moyu-goal-input",
			value: String(this.plugin.data.targetWage),
		});
		input.addEventListener("change", () => {
			this.plugin.data.targetWage = parseFloat(input.value) || 150;
			void this.plugin.save();
		});
	}

	private renderTimers(parent: HTMLElement) {
		const grid = parent.createDiv({ cls: "moyu-timer-grid" });

		this.fishUnit = grid.createDiv({ cls: "moyu-timer-unit" });
		this.fishUnit.addEventListener("click", () => {
			void this.plugin.startMode("fish");
			this.tick();
		});
		const fishIcon = this.fishUnit.createDiv({ cls: "moyu-unit-icon" });
		setIcon(fishIcon, "coffee");
		this.fishUnit.createDiv({
			cls: "moyu-unit-name",
			text: t(this.lang, "fish"),
		});
		this.fishTimeEl = this.fishUnit.createDiv({
			cls: "moyu-unit-time",
			text: "00:00:00",
		});

		this.hustleUnit = grid.createDiv({ cls: "moyu-timer-unit" });
		this.hustleUnit.addEventListener("click", () => {
			void this.plugin.startMode("hustle");
			this.tick();
		});
		const hustleIcon = this.hustleUnit.createDiv({ cls: "moyu-unit-icon" });
		setIcon(hustleIcon, "zap");
		this.hustleUnit.createDiv({
			cls: "moyu-unit-name",
			text: t(this.lang, "hustle"),
		});
		this.hustleTimeEl = this.hustleUnit.createDiv({
			cls: "moyu-unit-time",
			text: "00:00:00",
		});

		const stopBtn = parent.createEl("button", {
			text: t(this.lang, "stopAll"),
			cls: "moyu-btn-stop",
		});
		stopBtn.addEventListener("click", () => {
			void this.plugin.stopAll();
			this.tick();
		});
	}

	private renderToolbar(parent: HTMLElement) {
		const row = parent.createDiv({ cls: "moyu-tools-row" });

		const quickBtns: Array<{ label: string; mins: number }> = [
			{ label: "-5m", mins: -5 },
			{ label: "+5m", mins: 5 },
			{ label: "+30m", mins: 30 },
		];

		for (const b of quickBtns) {
			const btn = row.createEl("button", {
				text: b.label,
				cls: "moyu-btn-tool",
			});
			btn.addEventListener("click", () => {
				void this.plugin.manualAdd(b.mins);
				this.tick();
			});
		}

		const manualBtn = row.createEl("button", {
			text: t(this.lang, "manual"),
			cls: "moyu-btn-tool",
		});
		manualBtn.addEventListener("click", () => {
			new ManualInputModal(this.app, this.plugin, (val) => {
				void this.plugin.manualAdd(val);
				this.tick();
			}).open();
		});
	}

	private renderSettings(parent: HTMLElement) {
		const wrapper = parent.createDiv({ cls: "moyu-settings-wrapper" });

		const toggle = wrapper.createEl("button", {
			text: t(this.lang, "settings"),
			cls: "moyu-btn-tool moyu-settings-toggle",
		});

		const panel = wrapper.createDiv({ cls: "moyu-settings-panel moyu-hidden" });

		toggle.addEventListener("click", () => {
			panel.toggleClass("moyu-hidden", !panel.hasClass("moyu-hidden"));
		});

		const fields: Array<{
			labelKey: string;
			key: NumericDataKey;
			icon: string;
		}> = [
			{ labelKey: "dailyPay", key: "income", icon: "banknote" },
			{ labelKey: "workHours", key: "totalHours", icon: "clock" },
			{ labelKey: "sideIncome", key: "sideIncome", icon: "trending-up" },
			{ labelKey: "waterInterval", key: "waterInterval", icon: "droplets" },
			{ labelKey: "lockDuration", key: "waterLockDuration", icon: "lock" },
		];

		for (const f of fields) {
			const row = panel.createDiv({ cls: "moyu-input-row" });
			const labelEl = row.createDiv({ cls: "moyu-input-label" });
			const iconEl = labelEl.createSpan({ cls: "moyu-input-icon" });
			setIcon(iconEl, f.icon);
			labelEl.createSpan({ text: ` ${t(this.lang, f.labelKey)}` });

			const input = row.createEl("input", {
				type: "number",
				cls: "moyu-input-ios",
				value: String(this.plugin.data[f.key]),
			});
			input.addEventListener("change", () => {
				this.plugin.data[f.key] = parseFloat(input.value) || 0;
				void this.plugin.save();
				if (f.key === "waterInterval" || f.key === "waterLockDuration") {
					this.plugin.startWaterTimer();
				}
			});
		}

		// About section
		const aboutSection = panel.createDiv({ cls: "moyu-about" });
		aboutSection.createDiv({
			cls: "moyu-about-title",
			text: t(this.lang, "about"),
		});
		aboutSection.createDiv({
			cls: "moyu-about-desc",
			text: t(this.lang, "aboutDesc"),
		});

		const linksRow = aboutSection.createDiv({ cls: "moyu-about-links" });

		const siteLink = linksRow.createEl("a", {
			text: t(this.lang, "aboutSite"),
			cls: "moyu-about-link",
			href: "https://innerpure.cn",
		});
		siteLink.addEventListener("click", (e) => {
			e.preventDefault();
			window.open("https://innerpure.cn", "_blank");
		});

		linksRow.createSpan({ text: " / ", cls: "moyu-about-sep" });

		const dadaLink = linksRow.createEl("a", {
			text: t(this.lang, "aboutDada"),
			cls: "moyu-about-link",
			href: "https://innerpure-askdada.vip",
		});
		dadaLink.addEventListener("click", (e) => {
			e.preventDefault();
			window.open("https://innerpure-askdada.vip", "_blank");
		});
	}

	private renderHistory(parent: HTMLElement) {
		const card = parent.createDiv({ cls: "moyu-card" });
		this.renderHistoryInner(card);

		// Footer signature
		const footer = parent.createDiv({ cls: "moyu-footer" });
		const link = footer.createEl("a", {
			text: "by innerpure",
			cls: "moyu-footer-link",
			href: "https://innerpure.cn",
		});
		link.addEventListener("click", (e) => {
			e.preventDefault();
			window.open("https://innerpure.cn", "_blank");
		});

		const archiveBtn = parent.createEl("button", {
			text: t(this.lang, "archiveToday"),
			cls: "moyu-btn-archive",
		});
		archiveBtn.addEventListener("click", () => {
			new ConfirmModal(
				this.app,
				t(this.lang, "archiveTitle"),
				t(this.lang, "archiveConfirm"),
				() => {
					void this.plugin.archiveDay().then(() => {
						this.tick();
						card.empty();
						this.renderHistoryInner(card);
						new Notice(t(this.lang, "archived"));
					});
				}
			).open();
		});
	}

	private renderHistoryInner(card: HTMLElement) {
		if (this.plugin.data.history.length > 1) {
			card.createDiv({
				cls: "moyu-section-title",
				text: t(this.lang, "trend"),
			});
			const chartContainer = card.createDiv({ cls: "moyu-chart-container" });
			this.buildSVGChart(chartContainer);
		}

		card.createDiv({
			cls: "moyu-section-title",
			text: t(this.lang, "history"),
		});
		const list = card.createEl("ul", { cls: "moyu-history-list" });
		const history = this.plugin.data.history;

		if (history.length === 0) {
			list.createEl("li", {
				cls: "moyu-history-empty",
				text: t(this.lang, "noRecords"),
			});
		} else {
			for (let i = history.length - 1; i >= 0; i--) {
				const item = history[i];
				const li = list.createEl("li", { cls: "moyu-history-item" });
				li.createSpan({ cls: "moyu-history-date", text: item.date });
				li.createSpan({ text: `${item.fishH}h` });
				li.createSpan({
					cls: "moyu-history-val",
					text: `\uFFE5${item.rate}`,
				});
				const del = li.createSpan({ cls: "moyu-del-icon", text: "x" });
				const idx = i;
				del.addEventListener("click", () => {
					new ConfirmModal(
						this.app,
						t(this.lang, "deleteTitle"),
						t(this.lang, "deleteConfirm"),
						() => {
							void this.plugin.deleteRecord(idx).then(() => {
								card.empty();
								this.renderHistoryInner(card);
							});
						}
					).open();
				});
			}
		}
	}

	// ── SVG Chart (DOM API instead of innerHTML) ──

	private buildSVGChart(container: HTMLElement): void {
		const history = this.plugin.data.history;
		if (history.length < 2) return;

		const rates = history.map((h) => parseFloat(h.rate));
		const minR = Math.min(...rates);
		const maxR = Math.max(...rates);
		const range = maxR - minR || 1;

		const W = 320;
		const H = 120;
		const padX = 30;
		const padY = 15;
		const plotW = W - padX * 2;
		const plotH = H - padY * 2;

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
		svg.classList.add("moyu-svg-chart");

		const pointsArr: string[] = [];

		for (let i = 0; i < history.length; i++) {
			const x = padX + (i / (history.length - 1)) * plotW;
			const y = padY + plotH - ((rates[i] - minR) / range) * plotH;
			pointsArr.push(`${x},${y}`);

			const circle = document.createElementNS(ns, "circle");
			circle.setAttribute("cx", String(x));
			circle.setAttribute("cy", String(y));
			circle.setAttribute("r", "3");
			circle.setAttribute("fill", "var(--interactive-accent)");
			svg.appendChild(circle);

			if (i === 0 || i === history.length - 1) {
				const text = document.createElementNS(ns, "text");
				text.setAttribute("x", String(x));
				text.setAttribute("y", String(H - 2));
				text.setAttribute("text-anchor", "middle");
				text.setAttribute("fill", "var(--text-muted)");
				text.setAttribute("font-size", "10");
				text.textContent = history[i].date;
				svg.appendChild(text);
			}
		}

		const polyline = document.createElementNS(ns, "polyline");
		polyline.setAttribute("points", pointsArr.join(" "));
		polyline.setAttribute("fill", "none");
		polyline.setAttribute("stroke", "var(--interactive-accent)");
		polyline.setAttribute("stroke-width", "2");
		polyline.setAttribute("stroke-linecap", "round");
		polyline.setAttribute("stroke-linejoin", "round");
		svg.insertBefore(polyline, svg.firstChild);

		container.appendChild(svg);
	}
}
