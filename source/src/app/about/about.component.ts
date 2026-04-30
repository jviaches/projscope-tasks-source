import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ElectronService } from '../core/services';

type UpdateState = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {

  checkState: UpdateState = 'idle';
  availableVersion = '';
  errorMessage = '';

  private _sub: Subscription;

  constructor(
    private dialogRef: MatDialogRef<AboutComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
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
  }

  ngOnDestroy() {
    this._sub?.unsubscribe();
  }

  checkForUpdates() {
    this.checkState = 'checking';
    this.availableVersion = '';
    this.errorMessage = '';
    this.electronService.checkForUpdates();
  }

  cancel() {
    this.dialogRef.close();
  }
}
