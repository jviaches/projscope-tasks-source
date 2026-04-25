import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from "@angular/cdk/drag-drop";
import { Project, Task } from "../../core/models/project.model";
import { NotificationService } from "../../core/services/notification.service";
import { TaskViewComponent } from "../../task/task-view/task-view.component";
import { ElectronService } from "../../core/services";
import { Priority, PriorityColor } from "../../core/models/priority.model";
import { UtilsService } from "../../core/services/utils.service";
import { FormControl } from "@angular/forms";
import { Observable, Subject } from "rxjs";
import { debounceTime, map, startWith, takeUntil } from "rxjs/operators";
import { MatAutocompleteTrigger } from "@angular/material/autocomplete";

interface Dictionary {
  [key: string]: Task[];
}

export interface TaskSection {
  taskId: number;
  taskName: string;
  taskPriorityColor: string;
  sectionId: number;
  sectionName: string;
}

@Component({
  selector: "app-project-management",
  templateUrl: "./project-management.component.html",
  styleUrls: ["./project-management.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementComponent implements OnInit, OnDestroy {
  @ViewChild("autoCompleteInput", { read: MatAutocompleteTrigger })
  autoComplete?: MatAutocompleteTrigger;

  public project: Project = null;
  public connectedSections: Array<string> = [];
  public sectionsTasks: Dictionary = {};
  public editProjectName: boolean = false;
  public isLightTheme = this.electronService.getActiveThemeId() === 1;

  searchTasksCtrl = new FormControl();
  taskSections: TaskSection[] = [];
  filteredTasks: Observable<TaskSection[]>;

  private destroy$ = new Subject<void>();

  quillConfiguration = {
    toolbar: [
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ],
  };

  editorStyle = {
    height: "260px",
  };

  constructor(
    private electronService: ElectronService,
    private notificationService: NotificationService,
    public utilsService: UtilsService,
    private cdr: ChangeDetectorRef
  ) {
    this.filteredTasks = this.searchTasksCtrl.valueChanges.pipe(
      startWith(""),
      debounceTime(300),
      map((task) => (task ? this._filterTasks(task) : this.taskSections.slice()))
    );
  }

  ngOnInit(): void {
    this.electronService.project
      .pipe(takeUntil(this.destroy$))
      .subscribe((project) => {
        this.project = project;
        this.recalculateData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changedTheme() {
    this.electronService.updateTheme(this.isLightTheme ? 1 : 2);
  }

  public get sectiondIds(): string[] {
    return Object.keys(this.sectionsTasks);
  }

  public get projectCopletionPercentage(): number {
    if (this.project === null) return 0;
    let taskAmount = 0;
    this.project.sections.forEach((s) => (taskAmount += s.tasks.length));
    if (taskAmount === 0) return 0;
    const lastSection = this.project.sections[this.project.sections.length - 1];
    return Math.round((lastSection.tasks.length / taskAmount) * 100);
  }

  taskDrop(event: CdkDragDrop<Task[], Task[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const sectionOrderId = event.container.id.replace("cdk-drop-list-", "");
      this.project.sections[Number(sectionOrderId) - 1].tasks = [...event.container.data];
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const prevSectionId = Number(event.previousContainer.id.replace("cdk-drop-list-", ""));
      const movedTask = event.container.data[event.currentIndex];
      const taskIndex = this.project.sections[prevSectionId - 1].tasks.indexOf(movedTask);
      if (taskIndex !== -1) {
        this.project.sections[prevSectionId - 1].tasks.splice(taskIndex, 1);
      }

      const sectionOrderId = event.container.id.replace("cdk-drop-list-", "");
      this.project.sections[Number(sectionOrderId) - 1].tasks = [...event.container.data];
    }

    this.recalculateData();
    this.electronService.setDataChange();
  }

  viewTaskById(taskId: number, sectionIndex: number) {
    const viewedTask = this.getTaskById(taskId);
    this.viewTask(viewedTask, sectionIndex);
  }

  viewTask(task: Task, sectionIndex: number) {
    sectionIndex -= 1;
    this.notificationService
      .showModalComponent(TaskViewComponent, "", { task, sectionIndex })
      .subscribe((result) => {
        if (result !== "FAIL") {
          const viewedTask = this.getTaskById(task.id);

          for (let index = 0; index < this.project.sections.length; index++) {
            const section = this.project.sections[index];
            const indexResult = section.tasks.findIndex((t) => t.id === viewedTask.id);

            if (indexResult !== -1) {
              if (section.tasks[indexResult].title !== result.caption) {
                section.tasks[indexResult].title = result.caption;
                this.electronService.setDataChange();
                this.recalculateData();
              }

              if (section.tasks[indexResult].content !== result.text) {
                section.tasks[indexResult].content = result.text;
                this.electronService.setDataChange();
                this.recalculateData();
              }

              if (section.tasks[indexResult].priority !== result.priority.value) {
                section.tasks[indexResult].priority = result.priority.value;
                this.electronService.setDataChange();
                this.recalculateData();
              }

              if (section.orderIndex - 1 !== result.section.value) {
                this.project.sections[index].tasks.splice(indexResult, 1);
                this.project.sections[result.section.value].tasks.push(viewedTask);
                this.electronService.setDataChange();
                this.recalculateData();
              }

              break;
            }
          }
        }
      });
  }

  deleteTask(taskId: number, sectionIndex: number) {
    this.electronService.deleteTask(taskId, sectionIndex);
  }

  createTask() {
    this.electronService.createTask();
  }

  onContentChanged = (event: { html: string }) => {
    this.project.notes = event.html;
    this.electronService.setDataChange();
  };

  setProjectNameEditMode() {
    if (this.editProjectName) {
      this.electronService.updateProjectName(this.project.name);
    }
    this.editProjectName = !this.editProjectName;
  }

  private recalculateData() {
    if (this.project === null) return;

    this.connectedSections = [];
    this.sectionsTasks = {};

    if (this.project.sections.length > 0) {
      this.project.sections.forEach((section) => {
        this.connectedSections.push("cdk-drop-list-" + section.orderIndex);
        this.sectionsTasks["cdk-drop-list-" + section.orderIndex] = [];
      });

      this.project.sections.forEach((section) => {
        section.tasks.forEach((task) => {
          this.sectionsTasks["cdk-drop-list-" + section.orderIndex].push(task);
        });
      });
    }

    this.taskSections = [];
    for (const section of this.project.sections) {
      section.tasks.forEach((task) => {
        this.taskSections.push({
          sectionId: section.orderIndex,
          sectionName: section.name,
          taskId: task.id,
          taskName: task.title,
          taskPriorityColor: this.setTaskColor(task.priority),
        });
      });
    }

    if (this.autoComplete) {
      this.searchTasksCtrl.setValue("");
      this.autoComplete.closePanel();
    }

    this.cdr.markForCheck();
  }

  sectionId(id: number): number {
    return this.sectionsTasks["cdk-drop-list-" + id]?.length ?? 0;
  }

  setTaskColor(priority: Priority): PriorityColor {
    if (priority === Priority.Minor) return PriorityColor.Minor;
    if (priority === Priority.Normal) return PriorityColor.Normal;
    if (priority === Priority.High) return PriorityColor.High;
    if (priority === Priority.Critical) return PriorityColor.Critical;
  }

  deleteSection(sectionId: number) {
    this.notificationService
      .showYesNoModalMessage("Delete this section and all its tasks?")
      .subscribe((result) => {
        if (result === "yes") {
          this.project.sections = this.project.sections.filter(
            (sec) => sec.orderIndex !== sectionId
          );
          this.electronService.setDataChange();
          this.recalculateData();
        }
      });
  }

  private getTaskById(taskId: number): Task {
    for (const section of this.project.sections) {
      const index = section.tasks.findIndex((task) => task.id === taskId);
      if (index !== -1) return section.tasks[index];
    }
    return null;
  }

  private _filterTasks(value: string): TaskSection[] {
    const filterValue = value.toLowerCase();
    return this.taskSections.filter((task) =>
      task.taskName.toLowerCase().includes(filterValue)
    );
  }
}
