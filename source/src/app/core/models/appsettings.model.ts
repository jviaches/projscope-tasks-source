
import { AppConfig } from "../../../environments/environment";

export interface RecentProject {
  path: string;
  name: string;
  taskCount: number;
  openedAt: string; // ISO date string
}

export class AppSettings {
    version = AppConfig.version;
    themeId = 1;
    lastProjectPath = '';
    /** Paths of all projects open on last exit — restored on next launch */
    openProjectPaths: string[] = [];
    /** Last 5 opened project files for the welcome screen */
    recentProjects: RecentProject[] = [];
}
