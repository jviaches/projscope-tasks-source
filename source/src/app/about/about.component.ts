import {Component, Inject, OnInit} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ElectronService} from '../core/services';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<AboutComponent>, @Inject(MAT_DIALOG_DATA) public data: any, public electronService: ElectronService) {
  }

  ngOnInit() {
  }

  cancel() {
    this.dialogRef.close();
  }
}
