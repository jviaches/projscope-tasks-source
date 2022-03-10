import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ModalDialogComponent } from '../../modals/modal-dialog/modal-dialog.component';
import { ModalYesNoDialogComponent } from '../../modals/yesno-modal-dialog/yesno-modal-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    snackConfig: MatSnackBarConfig;

    constructor(private snackBar: MatSnackBar, private dialog: MatDialog) {
        this.snackConfig = {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom'
        };
    }

    public showActionConfirmationSuccess(text: string) {
        this.snackConfig.panelClass = ['snackBar-success-style'];
        this.snackBar.open(text, null, this.snackConfig);
    }

    public showActionConfirmationWarning(text: string) {
        this.snackConfig.panelClass = ['snackBar-warning-style'];
        this.snackBar.open(text, null, this.snackConfig);
    }

    public showActionConfirmationFail(text: string) {
        this.snackConfig.panelClass = ['snackBar-fail-style'];
        this.snackBar.open(text, null, this.snackConfig).afterDismissed();
    }

    public showYesNoModalMessage(textMessage: string): Observable<any> {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.disableClose = true;
        dialogConfig.autoFocus = true;
        dialogConfig.data = { data: { message: textMessage } };
        const dialogRef = this.dialog.open(ModalYesNoDialogComponent, dialogConfig);

        return dialogRef.afterClosed();
    }

    public showModalMessage(textCaption: string, textMessage: string): Observable<any> {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.disableClose = true;
        dialogConfig.autoFocus = true;
        dialogConfig.data = { data: { message: textMessage, caption: textCaption } };

        const dialogRef = this.dialog.open(ModalDialogComponent, dialogConfig);

        return dialogRef.afterClosed();
    }

    public showModalComponent(component: any, textCaption: string, data: any): Observable<any> {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.disableClose = true;
        dialogConfig.autoFocus = true;
        dialogConfig.data = { data: { caption: textCaption } };

        if (data) {
            dialogConfig.data = data;
        }

        dialogConfig.data.caption = textCaption;
        const dialogRef = this.dialog.open(component, dialogConfig);

        return dialogRef.afterClosed();
    }
}
