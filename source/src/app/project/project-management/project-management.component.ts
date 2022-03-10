import { AfterViewChecked, Component, OnInit, ViewChild } from "@angular/core";
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from "@angular/cdk/drag-drop";
import { Project, Tag, Task } from "../../core/models/project.model";
import { NotificationService } from "../../core/services/notification.service";
import { TaskViewComponent } from "../../task/task-view/task-view.component";
import { ElectronService } from "../../core/services";
import { Priority, PriorityColor } from "../../core/models/priority.model";
import { UtilsService } from "../../core/services/utils.service";
import { FormControl } from '@angular/forms';
import { Observable } from "rxjs";
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteTrigger } from "@angular/material/autocomplete";

interface Dictionary<T> {
  [Key: string]: Task[];
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
})
export class ProjectManagementComponent implements OnInit {

  @ViewChild('autoCompleteInput', { read: MatAutocompleteTrigger }) autoComplete: MatAutocompleteTrigger;

  public project: Project = null;
  public connectedSections: Array<string> = [];
  public sectionsTasks: Dictionary<string> = {};
  public editProjectName: boolean = false;
  public isLightTheme =  this.electronService.getActiveThemeId() === 1;

  searchTasksCtrl = new FormControl();
  taskSections: TaskSection[] = [];
  filteredTasks: Observable<TaskSection[]>;

  caption = "";
  quillConfiguration = {
    toolbar: [
      ["bold", "italic", "underline", "strike"],
      // ['blockquote', 'code-block'],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      // [{ color: [] }, { background: [] }],
      // ['link'],
      // ['clean'],
    ],
  };

  editorStyle = {
    height: "260px",
  };

  constructor(
    private electronService: ElectronService,
    private notificationService: NotificationService,
    public utilsService: UtilsService,
  ) {
    this.filteredTasks = this.searchTasksCtrl.valueChanges
    .pipe(
      startWith(''),
      map(task => task ? this._filterTasks(task) : this.taskSections.slice())
    );
  }
  
  ngOnInit(): void {

    this.electronService.project.subscribe((project) => {
        this.project = project;
        this.recalculateData();
      },
      (error) => {}
    );
  }
  
  changedTheme() {
    if (this.isLightTheme) {
      this.electronService.updateTheme(1);
    } else {
      this.electronService.updateTheme(2);
    }
  }

  public get sectiondIds(): string[] {
    return Object.keys(this.sectionsTasks);
  }

  public get projectCopletionPecentage(): Number {
    let taskAmount = 0;
    this.project.sections.map((a) => (taskAmount += a.tasks.length));

    if (this.project === null || taskAmount === 0) {
      return 0;
    }

    const lastSection = this.project.sections[this.project.sections.length - 1];

    return Math.round((lastSection.tasks.length / taskAmount) * 100);
  }

  tags: Tag[] = [
    { id: 1, name: "Ui design", color: "blue" },
    { id: 2, name: "First Bug", color: "red" },
    { id: 3, name: "Wont Fix", color: "yellow" },
  ];

  taskDrop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const startIndex = "cdk-drop-list-".length;
      const sectionOrderId = event.container.id.substring(startIndex, event.container.id.length);

      let sectionTasks: Task[] = [];
      event.container.data.map((str, index) =>
        sectionTasks.push(JSON.parse(JSON.stringify(str)))
      );
      this.project.sections[Number(sectionOrderId) - 1].tasks = sectionTasks;
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // remove task from old section
      const prevSectionId = Number(event.previousContainer.id.replace("cdk-drop-list-", ""));
      const movedTask: Task = <Task>(event.container.data[event.currentIndex] as unknown);

      const taskIndex = this.project.sections[Number(prevSectionId) - 1].tasks.indexOf(movedTask); 
      if (taskIndex !== -1) {
        this.project.sections[Number(prevSectionId) - 1].tasks.splice(taskIndex, 1);
      }

      // add task to new section
      const startIndex = "cdk-drop-list-".length;
      const sectionOrderId = event.container.id.substring(startIndex, event.container.id.length);

      let sectionTasks: Task[] = [];
      event.container.data.map((str, index) =>
        sectionTasks.push(JSON.parse(JSON.stringify(str)))
      );
      this.project.sections[Number(sectionOrderId) - 1].tasks = sectionTasks;
    }

    this.recalculateData();
    this.electronService.setDataChange();

    if (this.electronService.autosave) {
      this.electronService.saveProject(JSON.stringify(this.project));
    }
  }

  tagDrop(event: CdkDragDrop<string[]>) {
    // console.log(
    //   "tag `" +
    //     event.item.element.nativeElement.textContent +
    //     `' + dropped on ` +
    //     event.container.id
    // ); 

    // transferArrayItem(event.previousContainer.data,
    //      event.container.data,
    //      event.previousIndex,
    //      event.currentIndex);
  }

  viewTaskById(taskId: number, sectionIndex: number) {
    const viewedTask = this.getTaskById(taskId);
    this.viewTask(viewedTask, sectionIndex);
  }

  viewTask(task: Task, sectionIndex: number) {
    sectionIndex -=1;
    this.notificationService
      .showModalComponent(TaskViewComponent, "", { task, sectionIndex })
      .subscribe((result) => {
        if (result !== "FAIL") {
          const viewedTask = this.getTaskById(task.id);

          for (let index = 0; index < this.project.sections.length; index++) {
            const section = this.project.sections[index];
            const indexResult = section.tasks.findIndex((task) => task.id === viewedTask.id );

            if (indexResult !== -1) {
              // task found

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

              if (section.orderIndex-1 !== result.section.value) {
                
                //remove task from a prev section 
                this.project.sections[index].tasks.splice(indexResult, 1);

                //add task to new a section
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

  onContentChanged = (event) => {
    this.project.notes = event.html;
    this.electronService.setDataChange();

    if (this.electronService.autosave) {
      this.electronService.saveProject(JSON.stringify(this.project));
    }
  };

  setProjectNameEditMode() {
    if (this.editProjectName) {
      this.electronService.updateProjectName(this.project.name);
    }
    this.editProjectName = !this.editProjectName;
  }

  private recalculateData() {
    if (this.project === null) {
      return;
    }

    this.connectedSections = [];
    this.sectionsTasks = {};

    if (this.project.sections.length > 0) {
      this.project.sections.map((section) =>
        this.connectedSections.push("cdk-drop-list-" + section.orderIndex)
      );
      this.project.sections.map((section) =>
          (this.sectionsTasks["cdk-drop-list-" + section.orderIndex] = [])
      );

      this.project.sections.forEach((section) => {
        section.tasks.forEach((task) => {
          this.sectionsTasks["cdk-drop-list-" + section.orderIndex].push(task);
        });
      });
    }

    this.taskSections = [];
    for (let index = 0; index < this.project.sections.length; index++) {
      const section = this.project.sections[index];
      section.tasks.forEach(task => {
        this.taskSections.push( {
          sectionId: section.orderIndex,
          sectionName: section.name,          
          taskId: task.id,
          taskName: task.title,
          taskPriorityColor: this.setTaskColor(task.priority)
        });
      });
    }

    if (this.autoComplete) {
      this.searchTasksCtrl.setValue('');
      this.autoComplete.closePanel();
    }
  }

  sectionId(id: string): Number {
    return this.sectionsTasks["cdk-drop-list-" + id]
      ? this.sectionsTasks["cdk-drop-list-" + id].length
      : 0;
  }

  taskPriority(task: Task) {
    return task ? task.priority : "";
  }

  setTaskColor(priority: Priority): PriorityColor {
    if (priority == Priority.Minor) {
      return PriorityColor.Minor;
    }

    if (priority == Priority.Normal) {
      return PriorityColor.Normal;
    }

    if (priority == Priority.High) {
      return PriorityColor.High;
    }

    if (priority == Priority.Critical) {
      return PriorityColor.Critical;
    }
  }

  private getTaskById(taskId: number): Task {
    let foundTask = null;

    for (let index = 0; index < this.project.sections.length; index++) {
      const element = this.project.sections[index];
      const indexResult = element.tasks.findIndex((task) => task.id === taskId);
      if (indexResult !== -1) {
        // task found
        foundTask = this.project.sections[index].tasks[indexResult];
        break;
      }
    }

    return foundTask;
  }

  private _filterTasks(value: string): TaskSection[] {
    const filterValue = value.toLowerCase();
    return this.taskSections.filter(task => task.taskName.toLowerCase().indexOf(filterValue) === 0);
  }
}
