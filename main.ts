import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { cpu, mem, drive } from "node-os-utils";

// Remember to rename these classes and interfaces!

interface Settings extends Record<string, boolean | number> {
	CPUView: boolean;
	MemUsedView: boolean;
	MemfreeView: boolean;
	RefreshRate: number;
}

type SettingsTabSetting = {
	name: string;
	desc: string;
	setting: keyof Settings;
	type: "toggle" | "number";
};

const DEFAULT_SETTINGS: Settings = {
	CPUView: true,
	MemUsedView: true,
	MemfreeView: false,
	RefreshRate: 1000,
};

export default class MyPlugin extends Plugin {
	settings: Settings;
	statusBarElId = "obsidian-nerd-stats-status-bar-item";

	async updateInfo() {
		const statusBarEl = document.getElementById(this.statusBarElId);
		if (statusBarEl) {
			let displayText = "";
			if (this.settings.CPUView) {
				const cpuUsage = await cpu.usage();
				displayText += `CPU: ${cpuUsage}%`;
			}
			if (this.settings.MemUsedView) {
				const memUsage = await mem.info();
				displayText += ` Memory: ${
					100 - memUsage.freeMemPercentage
				}% used`;
			}
			if (this.settings.MemfreeView) {
				const memUsage = await mem.info();
				const res = `${memUsage.freeMemMb}Mb free`;
				// If memUsed is true, add parentheses. If not, add "Memory: " to the beginning
				displayText += this.settings.MemUsedView
					? ` (${res})`
					: ` Memory: ${res}`;
			}
			statusBarEl.setText(displayText);
		}
	}

	updateMinWidth() {
		const statusBarItemEl = document.getElementById(this.statusBarElId);
		if (!statusBarItemEl) return;
		statusBarItemEl.style.minWidth =
			[
				this.settings.CPUView,
				this.settings.MemUsedView,
				this.settings.MemfreeView,
			].filter((x) => x == true).length *
				100 +
			"px";
	}

	async onload() {
		await this.loadSettings();

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Loading...");
		statusBarItemEl.id = this.statusBarElId;

		this.updateInfo();

		this.registerInterval(
			window.setInterval(
				async () => await this.updateInfo(),
				// Math.max(this.settings.RefreshRate, 250) // Minimum refresh rate of 250ms
				1000
			)
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.updateInfo();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const settings: SettingsTabSetting[] = [
			{
				name: "CPU Usage",
				desc: "Adds the CPU usage to the status bar",
				setting: "CPUView",
				type: "toggle",
			},
			{
				name: "Memory Used Percentage",
				desc: "Adds the memory used percentage to the status bar",
				setting: "MemUsedView",
				type: "toggle",
			},
			{
				name: "Memory Free",
				desc: "Adds the memory free to the status bar",
				setting: "MemfreeView",
				type: "toggle",
			},
			{
				name: "Refresh Time (ms)",
				desc: "How often should the plugin update the status bar in milliseconds. Default: 250",
				setting: "RefreshRate",
				type: "number",
			},
		];

		for (const setting of settings) {
			const s = new Setting(containerEl)
				.setName(setting.name)
				.setDesc(setting.desc);
			if (setting.type === "toggle") {
				s.addToggle((value) =>
					value
						// TS is mad because there's both number and boolean settings
						.setValue(
							this.plugin.settings[
								setting.setting as keyof Settings
							] as boolean
						)
						.onChange(async (value) => {
							(this.plugin.settings[
								setting.setting as keyof Settings
							] as boolean) = value;
							await this.plugin.saveSettings();
							this.plugin.updateMinWidth();
						})
				);
			} else {
				s.addText((text) =>
					text
						.setValue(
							JSON.stringify(
								this.plugin.settings[
									setting.setting as keyof Settings
								]
							)
						)
						.onChange(async (value) => {
							try {
								parseInt(value);
							} catch (e) {
								console.error(e);
								console.error(
									"Couldn't parse value, got",
									value,
									typeof value
								);
								return;
							}
							(this.plugin.settings[
								setting.setting as keyof Settings
							] as number) = parseInt(value);
							await this.plugin.saveSettings();
						})
				);
			}
		}
	}
}
