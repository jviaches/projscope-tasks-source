
import { AppConfig } from "../../../environments/environment";

export class AppSettings {
    version = AppConfig.version;
    themeId = 1;
    lastProjectPath = '';
    /** Paths of all projects open on last exit — restored on next launch */
    openProjectPaths: string[] = [];
}
