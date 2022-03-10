import { IpcRendererEvent } from "electron/main";

export interface ProgramUpdate {
    releaseNotes: IpcRendererEvent;
    releaseName: any;
}