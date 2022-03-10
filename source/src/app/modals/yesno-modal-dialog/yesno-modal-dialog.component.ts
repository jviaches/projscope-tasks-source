import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogData } from '../modal-dialog/dialog-data';

@Component({
  selector: 'app-yesno-modal-dialog',
  templateUrl: 'yesno-modal-dialog.component.html',
  styleUrls: ['yesno-modal-dialog.component.scss']
})

export class ModalYesNoDialogComponent {

  public caption: 'Confirmation';
  public message: 'Are you sure ?';
  public additionalMessage: '';

  constructor(private dialogRef: MatDialogRef<ModalYesNoDialogComponent>, @Inject(MAT_DIALOG_DATA) { data }: DialogData) {
    this.additionalMessage = data.message;
  }

  yes() {
    this.dialogRef.close('yes');
  }

  no() {
    this.dialogRef.close('no');
  }
}
