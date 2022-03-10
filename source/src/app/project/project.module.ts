import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from '../shared/shared.module';
import { MaterialModule } from '../material.module';
import { ProjectManagementComponent } from './project-management/project-management.component';
import { ProjectListComponent } from './project-list/project-list.component';
import { TaskViewComponent } from '../task/task-view/task-view.component';
import { QuillModule } from 'ngx-quill';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';

@NgModule({
  declarations: [ProjectManagementComponent, ProjectListComponent, TaskViewComponent],
  imports: [BrowserAnimationsModule, CommonModule, SharedModule, MaterialModule, RouterModule, FormsModule, QuillModule.forRoot(),
    ReactiveFormsModule,
    MatSelectModule,
    HttpClientModule],
  exports: [ProjectListComponent],
  providers: []
})
export class ProjectModule { }
