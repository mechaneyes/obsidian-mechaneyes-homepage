import {
	App,
	Plugin,
	TFile,
	WorkspaceLeaf,
	ItemView,
	Notice,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface HomepageSettings {
	numberOfRecentFiles: number;
}

const DEFAULT_SETTINGS: HomepageSettings = {
	numberOfRecentFiles: 10,
};

const VIEW_TYPE_HOMEPAGE = "homepage-view";

class HomepageView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_HOMEPAGE;
	}

	getDisplayText(): string {
		return "Mechaneyes Homepage";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		const recentFiles = await this.getRecentFiles();

		container.createEl("h2", { text: "this wuts up" });

		const tableContainer = container.createEl("div", { cls: "homepage-table" });
		const table = tableContainer.createEl("table");
		const tbody = table.createEl("tbody");

		// Create rows with filename in col 1, date in col 2
		for (let i = 0; i < recentFiles.length; i++) {
			const row = tbody.createEl("tr");
			
			// First column - filename
			const cell1 = row.createEl("td");
			const link = cell1.createEl("a", {
				text: recentFiles[i].basename,
				href: recentFiles[i].path,
			});
			link.addEventListener("click", (event) => {
				event.preventDefault();
				this.app.workspace.openLinkText(recentFiles[i].path, "");
			});

			// Second column - date
			const cell2 = row.createEl("td");
			cell2.createEl("span", {
				text: new Date(recentFiles[i].stat.mtime).toLocaleString('en-US', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false,
					timeZoneName: 'shortOffset'
				}).replace(/(\d+)\/(\d+)\/(\d+), (\d+:\d+:\d+) (GMT[+-]\d+)/, 
					(_, month, day, year, time, timezone) => 
					`${year}.${month}.${day} - ${time} — ${new Date(recentFiles[i].stat.mtime).toLocaleString('en-US', {weekday: 'long'})}`),
				cls: "nav-file-title-content",
			});
		}
	}

	async getRecentFiles(): Promise<TFile[]> {
		const files = this.app.vault.getFiles();

		// Sort by last modified time, most recent first
		return files
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(
				0,
				(this.app as any).plugins.plugins["mechaneyes-homepage"]
					.settings.numberOfRecentFiles
			);
	}
}

export default class HomepagePlugin extends Plugin {
	settings: HomepageSettings;

	async onload() {
		await this.loadSettings();

		// Register view
		this.registerView(VIEW_TYPE_HOMEPAGE, (leaf) => new HomepageView(leaf));

		// Add the home command
		this.addCommand({
			id: "open-homepage",
			name: "Open Homepage",
			callback: async () => {
				const { workspace } = this.app;

				// Check if view is already open
				let leaf = workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE)[0];

				if (!leaf) {
					// Create new leaf and view
					leaf = workspace.getLeaf("tab");
					await leaf.setViewState({
						type: VIEW_TYPE_HOMEPAGE,
						active: true,
					});
				}

				// Reveal the leaf in the workspace
				workspace.revealLeaf(leaf);
			},
		});

		// Add settings tab
		this.addSettingTab(new HomepageSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HomepageSettingTab extends PluginSettingTab {
	plugin: HomepagePlugin;

	constructor(app: App, plugin: HomepagePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Number of recent files")
			.setDesc("How many recently modified files to show")
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(
						this.plugin.settings.numberOfRecentFiles.toString()
					)
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue)) {
							this.plugin.settings.numberOfRecentFiles = numValue;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
