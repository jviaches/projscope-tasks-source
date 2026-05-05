import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ElectronService } from '../core/services';

type UpdateState = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error';

const GITHUB_REPO = 'jviaches/projscope-tasks-source';
export const GITHUB_URL  = `https://github.com/${GITHUB_REPO}`;

export interface ContributorAvatar {
  login: string;
  initials: string;
  color: string;
}

const AVATAR_COLORS = [
  '#e57373','#f06292','#ba68c8','#9575cd','#7986cb',
  '#64b5f6','#4fc3f7','#4dd0e1','#4db6ac','#81c784',
  '#aed581','#ffb74d','#ffa726','#ff8a65','#a1887f',
];

function loginColor(login: string): string {
  let h = 0;
  for (let i = 0; i < login.length; i++) h = (h * 31 + login.charCodeAt(i)) & 0x7fffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function loginInitials(login: string): string {
  const parts = login.replace(/-/g, ' ').split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return login.slice(0, 2).toUpperCase();
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {

  checkState: UpdateState = 'idle';
  availableVersion = '';
  releaseNotes = '';
  errorMessage = '';

  contributors: ContributorAvatar[] = [];
  contributorCount = '–';

  readonly githubUrl = GITHUB_URL;

  private _sub: Subscription;

  constructor(
    private router: Router,
    public electronService: ElectronService
  ) {}

  ngOnInit() {
    this._sub = this.electronService.updateCheckState$.subscribe((state) => {
      if (state === 'checking') {
        this.checkState = 'checking';
        this.availableVersion = '';
        this.errorMessage = '';
      } else if (state === 'not-available') {
        this.checkState = 'up-to-date';
      } else if (state.startsWith('available:')) {
        this.availableVersion = state.slice('available:'.length);
        this.checkState = 'available';
      } else if (state.startsWith('error:')) {
        this.errorMessage = state.slice('error:'.length);
        this.checkState = 'error';
      }
    });

    // Pre-populate if an update was already downloaded before the screen opened.
    const msg = this.electronService.systemUpdateMessage.getValue();
    if (msg?.releaseName) {
      this.availableVersion = msg.releaseName;
      this.releaseNotes = msg.releaseNotes ?? '';
      this.checkState = 'available';
    }

    this.fetchGitHubStats();
  }

  ngOnDestroy() {
    this._sub?.unsubscribe();
  }

  private async fetchGitHubStats() {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=12`
      );
      if (res.ok) {
        const list = await res.json() as Array<{ login: string }>;
        this.contributors = list.map(c => ({
          login: c.login,
          initials: loginInitials(c.login),
          color: loginColor(c.login),
        }));
      }
    } catch { /* offline */ }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=1&anon=true`
      );
      if (res.ok) {
        const link = res.headers.get('Link') ?? '';
        const match = link.match(/page=(\d+)>; rel="last"/);
        this.contributorCount = match
          ? match[1]
          : String(this.contributors.length || '–');
      }
    } catch { /* offline */ }
  }

  checkForUpdates() {
    this.checkState = 'checking';
    this.availableVersion = '';
    this.errorMessage = '';
    this.electronService.checkForUpdates();
  }

  installUpdate() {
    this.electronService.ipcRenderer.send('restart_app');
  }

  open(url: string) {
    this.electronService.openExternal(url);
  }

  goBack() {
    this.router.navigateByUrl('/');
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}
