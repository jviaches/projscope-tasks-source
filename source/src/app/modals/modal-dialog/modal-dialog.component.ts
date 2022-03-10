import { Component, Inject } from '@angular/core';
import { DialogData } from './dialog-data';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-modal-dialog',
  templateUrl: './modal-dialog.component.html',
  styleUrls: ['./modal-dialog.component.scss']
})

export class ModalDialogComponent {

  public caption: 'Notification';
  public message = '';

  constructor(private dialogRef: MatDialogRef<ModalDialogComponent>, @Inject(MAT_DIALOG_DATA) { data }: DialogData) {
    this.caption = data.caption;
    this.message = data.message;
  }

  close() {
    this.dialogRef.close('close');
  }
}
