import {Component, Inject, OnInit} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {SelectionItem} from "../../core/models/priority.model";
import {Project} from "../../core/models/project.model";
import {ElectronService} from "../../core/services";
import {NotificationService} from "../../core/services/notification.service";
import {UtilsService} from "../../core/services/utils.service";

@Component({
  selector: "app-task-view",
  templateUrl: "./task-view.component.html",
  styleUrls: ["./task-view.component.scss"],
})
export class TaskViewComponent implements OnInit {
  public project: Project = null;

  public caption = "";
  public taskId = 0;
  public selectedPriority: SelectionItem;
  public selectedSection: SelectionItem;

  editorText: "";
  quillConfiguration = {
    toolbar: [
      ["bold", "italic", "underline", "strike"],
      // ['blockquote', 'code-block'],
      [{list: "ordered"}, {list: "bullet"}],
      [{header: [1, 2, 3, 4, 5, 6, false]}],
      // [{ color: [] }, { background: [] }],
      // ['link'],
      // ['clean'],
    ],
  };

  editorStyle = {
    height: "260px",
  };

  constructor(
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<TaskViewComponent>,
    public utilsService: UtilsService,
    public electronService: ElectronService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (this.data.task) {
      this.selectedPriority = this.utilsService.priorities.find(
        (item) => item.value === this.data.task.priority
      );

      this.selectedSection = this.utilsService.sections.find(
        (item) => item.value === this.data.sectionIndex
      );

      this.caption = this.data.task.title;
      this.taskId = this.data.task.id;
      this.editorText = this.data.task.content;
    } else {
      this.selectedPriority = this.utilsService.priorities[1];
      this.selectedSection = this.utilsService.sections[0];
    }
  }

  ngOnInit() {
  }

  onContentChanged = (event) => {
    this.editorText = event.html;
  };

  updateTask() {
    if (this.caption.trim().length !== 0) {
      this.dialogRef.close({
        caption: this.caption,
        text: this.editorText,
        priority: this.selectedPriority,
        section: this.selectedSection,
      });
    }
  }

  cancel() {
    this.dialogRef.close("FAIL");
  }
}
