import { Component, OnInit } from "@angular/core";
import { ElectronService } from "../../core/services";
import { ThemeService } from "../../core/services/theme.service";
import { RecentProject } from "../../core/models/appsettings.model";

const GITHUB_REPO = "jviaches/projscope-tasks-source";
const GITHUB_URL  = `https://github.com/${GITHUB_REPO}`;

@Component({
  selector: "app-project-list",
  templateUrl: "./project-list.component.html",
  styleUrls: ["./project-list.component.scss"],
})
export class ProjectListComponent implements OnInit {
  githubStars = "–";
  githubContributors = "–";

  constructor(
    private themeService: ThemeService,
    private electronService: ElectronService
  ) {}

  ngOnInit(): void {
    this.fetchGitHubStats();
  }

  toggleTheme() {
    const newId = this.isDarkTheme ? 1 : 2;
    this.electronService.updateTheme(newId);
  }

  private async fetchGitHubStats() {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
      if (res.ok) {
        const data = await res.json();
        const stars = data.stargazers_count as number;
        this.githubStars = stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : `${stars}`;
      }
    } catch { /* offline or rate-limited — leave placeholder */ }

    try {
      // Fetch page 1 with 1-per-page and read the last page number from the Link header.
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=1&anon=true`
      );
      if (res.ok) {
        const link = res.headers.get("Link") ?? "";
        const match = link.match(/page=(\d+)>; rel="last"/);
        this.githubContributors = match ? match[1] : "–";
      }
    } catch { /* offline */ }
  }

  get recentProjects(): RecentProject[] {
    return this.electronService.appSettings?.recentProjects ?? [];
  }

  get version(): string {
    return this.electronService.appVersion;
  }

  get isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins  / 60);
    const days  = Math.floor(hours / 24);
    if (mins  <  1) return 'just now';
    if (mins  < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days  === 1) return 'yesterday';
    if (days  <  7) return `${days} days ago`;
    if (days  < 14) return 'last week';
    return new Date(dateStr).toLocaleDateString();
  }

  shortPath(fullPath: string): string {
    const normalized = fullPath.replace(/\\/g, '/');
    const dir = normalized.split('/').slice(0, -1).join('/');
    const home = (window as any).process?.env?.USERPROFILE ?? (window as any).process?.env?.HOME ?? '';
    if (home && dir.startsWith(home.replace(/\\/g, '/'))) {
      return '~' + dir.slice(home.length).replace(/\\/g, '/');
    }
    const parts = dir.split('/');
    return parts.length > 2 ? '~/' + parts.slice(-2).join('/') : dir;
  }

  loadProject() {
    this.electronService.loadProject().then((loaded) => {
      if (!loaded) return;
      this.electronService.ipcRenderer.send("close-project-enable", true);
      this.electronService.redirectTo("/project", true);
    });
  }

  newProject() {
    this.electronService.newProject().then(() => {
      this.electronService.redirectTo("/project", true);
    });
  }

  exitProject() {
    this.electronService.exitProgram();
  }

  openRecent(path: string) {
    this.electronService.loadProjectFromPath(path, { switchTo: true }).then((loaded) => {
      if (!loaded) return;
      this.electronService.ipcRenderer.send("close-project-enable", true);
      this.electronService.redirectTo("/project", true);
    });
  }

  openGitHub() {
    this.electronService.openExternal(GITHUB_URL);
  }

  openChangelog() {
    const tag = `v${this.electronService.appVersion}`;
    this.electronService.openExternal(`${GITHUB_URL}/releases/tag/${tag}`);
  }

  openCoffee() {
    this.electronService.openExternal("https://buymeacoffee.com/jviaches");
  }
}
