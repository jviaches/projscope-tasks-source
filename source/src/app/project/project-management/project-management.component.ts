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
import { Project, Tag, Task } from "../../core/models/project.model";
import { NotificationService } from "../../core/services/notification.service";
import { TaskViewComponent } from "../../task/task-view/task-view.component";
import { ElectronService, ProjectEntry } from "../../core/services/electron/electron.service";
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
  public editingSectionIndex: number | null = null;
  private editingSectionOriginalName = '';
  public newTagName = '';
  private readonly tagColors = [
    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0',
    '#F44336', '#00BCD4', '#FF5722', '#607D8B',
  ];
  public isLightTheme = this.electronService.getActiveThemeId() === 1;

  /** Drives the project tab bar. */
  openProjects$: Observable<ProjectEntry[]>;

  /** Per-column sort state. Key = section.orderIndex. */
  sectionSort = new Map<number, { field: 'name' | 'date'; dir: 'asc' | 'desc' }>();

  /** Global due-date range filter (ISO date strings, e.g. "2026-05-10"). */
  dateFrom: string = '';
  dateTo: string = '';

  get isDateFilterActive(): boolean {
    return !!this.dateFrom || !!this.dateTo;
  }

  /** Total tasks visible across all columns after the date filter is applied. */
  get filteredTaskCount(): number {
    return Object.values(this.sectionsTasks).reduce((sum, tasks) => sum + tasks.length, 0);
  }

  onDateFilterChange() {
    this.recalculateData();
  }

  clearDateFilter() {
    this.dateFrom = '';
    this.dateTo = '';
    this.recalculateData();
  }

  searchTasksCtrl = new FormControl();
  taskSections: TaskSection[] = [];
  filteredTasks: Observable<TaskSection[]>;

  private destroy$ = new Subject<void>();
  private deadlineTimer: ReturnType<typeof setInterval> | null = null;

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
    this.openProjects$ = this.electronService.openProjectsList$;
  }

  // ── Getters for tab bar ─────────────────────────────────────────────────
  get activeProjectPath(): string {
    return this.electronService.activeProjectPath;
  }

  ngOnInit(): void {
    this.electronService.project
      .pipe(takeUntil(this.destroy$))
      .subscribe((project) => {
        this.project = project;
        this.recalculateData();
      });

    // Refresh deadline border colours every minute (OnPush won't do it automatically)
    this.deadlineTimer = setInterval(() => this.cdr.markForCheck(), 60_000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.deadlineTimer !== null) {
      clearInterval(this.deadlineTimer);
    }
  }

  changedTheme() {
    this.electronService.updateTheme(this.isLightTheme ? 1 : 2);
  }

  // ── Tab bar actions ─────────────────────────────────────────────────────
  switchProject(path: string) {
    this.electronService.switchProject(path);
  }

  closeProjectTab(path: string, e: MouseEvent) {
    e.stopPropagation();
    this.electronService.closeProjectTab(path);
  }

  openAnotherProject() {
    this.electronService.addProject();
  }

  createNewProject() {
    this.electronService.newProject();
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

  public get totalTaskCount(): number {
    if (!this.project) return 0;
    return this.project.sections.reduce((sum, s) => sum + s.tasks.length, 0);
  }

  public get doneTaskCount(): number {
    if (!this.project || this.project.sections.length === 0) return 0;
    return this.project.sections[this.project.sections.length - 1].tasks.length;
  }

  public get highPriorityTaskCount(): number {
    if (!this.project) return 0;
    let count = 0;
    this.project.sections.forEach((s) =>
      s.tasks.forEach((t) => {
        if (t.priority === Priority.High || t.priority === Priority.Critical) count++;
      })
    );
    return count;
  }

  public get inProgressTaskCount(): number {
    if (!this.project || this.project.sections.length < 2) return 0;
    const middleSections = this.project.sections.slice(1, -1);
    return middleSections.reduce((sum, s) => sum + s.tasks.length, 0);
  }

  public get donutDashOffset(): number {
    const circumference = 175.93;
    return Math.round(circumference * (1 - this.projectCopletionPercentage / 100));
  }

  public sectionColor(index: number): string {
    const palette = ['#7c8db5', '#38bdf8', '#fbbf24', '#34d399', '#a855f7', '#fb923c', '#f87171', '#6c63ff'];
    return palette[index % palette.length];
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

              const incomingTagIds = (result.tags as Tag[]).map((t) => t.id).sort().join(',');
              const currentTagIds = section.tasks[indexResult]?.tags.map((t) => t.id).sort().join(',') ?? '';
              if (incomingTagIds !== currentTagIds) {
                section.tasks[indexResult].tags = result.tags;
                this.electronService.setDataChange();
                this.recalculateData();
              }

              if ((section.tasks[indexResult]?.dueDate ?? null) !== (result.dueDate ?? null)) {
                section.tasks[indexResult].dueDate = result.dueDate ?? null;
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

  createTask(sectionIndex: number = 0) {
    this.electronService.createTask(sectionIndex);
  }

  /* ── Drag-vs-click guard ───────────────────────────────────────────────── */
  private _dragging = false;

  onDragStarted() { this._dragging = true; }

  onDragEnded() {
    // defer reset so the (click) handler fires before the flag clears
    setTimeout(() => this._dragging = false, 0);
  }

  onCardClick(task: Task, sectionIndex: number) {
    if (!this._dragging) {
      this.viewTask(task, sectionIndex);
    }
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

  setSectionEditMode(orderIndex: number | null) {
    if (this.editingSectionIndex !== null) {
      const section = this.project.sections.find(s => s.orderIndex === this.editingSectionIndex);
      if (section) {
        const trimmed = section.name.trim();
        if (trimmed.length === 0) {
          section.name = this.editingSectionOriginalName;
        } else if (trimmed !== this.editingSectionOriginalName) {
          section.name = trimmed;
          this.electronService.setDataChange();
        }
        this.recalculateData();
      }
    }
    if (orderIndex !== null) {
      const section = this.project.sections.find(s => s.orderIndex === orderIndex);
      this.editingSectionOriginalName = section?.name ?? '';
    }
    this.editingSectionIndex = orderIndex;
    this.cdr.markForCheck();
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

      // Apply per-column sort
      this.project.sections.forEach((section) => {
        const sort = this.sectionSort.get(section.orderIndex);
        if (!sort) return;
        const key = "cdk-drop-list-" + section.orderIndex;
        this.sectionsTasks[key].sort((a, b) => {
          const cmp = sort.field === 'name'
            ? a.title.localeCompare(b.title)
            : new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      });

      // Apply global date range filter across all columns.
      // A task matches if its creationDate falls in range,
      // OR its dueDate (when set) falls in range.
      if (this.isDateFilterActive) {
        const from = this.dateFrom
          ? new Date(this.dateFrom + 'T00:00:00').getTime()
          : null;
        const to = this.dateTo
          ? new Date(this.dateTo + 'T23:59:59').getTime()
          : null;

        const inRange = (ms: number) =>
          (from === null || ms >= from) && (to === null || ms <= to);

        this.project.sections.forEach((section) => {
          const key = "cdk-drop-list-" + section.orderIndex;
          this.sectionsTasks[key] = this.sectionsTasks[key].filter((task) => {
            const creationMs = new Date(task.creationDate).getTime();
            if (inRange(creationMs)) return true;
            if (task.dueDate) {
              const dueMs = new Date(task.dueDate).getTime();
              if (inRange(dueMs)) return true;
            }
            return false;
          });
        });
      }
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

  createTag() {
    const name = this.newTagName.trim();
    if (!name) return;
    const nextId = this.project.tags.length > 0
      ? Math.max(...this.project.tags.map((t) => t.id)) + 1
      : 1;
    const color = this.tagColors[this.project.tags.length % this.tagColors.length];
    this.project.tags.push({ id: nextId, name, color });
    this.newTagName = '';
    this.electronService.setDataChange();
    this.cdr.markForCheck();
  }

  updateTagColor(tag: Tag, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    tag.color = color;
    // Cascade the new colour to all task copies of this tag
    this.project.sections.forEach((section) =>
      section.tasks.forEach((task) => {
        const t = task.tags.find((t) => t.id === tag.id);
        if (t) t.color = color;
      })
    );
    this.electronService.setDataChange();
    this.cdr.markForCheck();
  }

  deleteTag(tag: Tag) {
    this.project.tags = this.project.tags.filter((t) => t.id !== tag.id);
    this.project.sections.forEach((section) => {
      section.tasks.forEach((task) => {
        task.tags = task.tags.filter((t) => t.id !== tag.id);
      });
    });
    this.electronService.setDataChange();
    this.recalculateData();
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

  // ── Deadline helpers ────────────────────────────────────────────────────

  deadlineClass(task: Task, isDoneSection: boolean): string {
    if (!task.dueDate || isDoneSection) return '';
    const ms = new Date(task.dueDate).getTime() - Date.now();
    const day = 86_400_000;
    if (ms < 0)         return 'dl-overdue';
    if (ms < day)       return 'dl-urgent';
    if (ms < 3 * day)   return 'dl-warning';
    return 'dl-safe';
  }

  // ── Column sort ─────────────────────────────────────────────────────────

  /**
   * Toggle sort for a column. First click → ascending; second click on the
   * same field → descending; clicking again → clears.
   */
  setSectionSort(orderIndex: number, field: 'name' | 'date') {
    const current = this.sectionSort.get(orderIndex);
    if (current?.field === field) {
      if (current.dir === 'asc') {
        this.sectionSort.set(orderIndex, { field, dir: 'desc' });
      } else {
        // third state: clear
        this.sectionSort.delete(orderIndex);
      }
    } else {
      this.sectionSort.set(orderIndex, { field, dir: 'asc' });
    }
    this.recalculateData();
  }

  getSectionSort(orderIndex: number) {
    return this.sectionSort.get(orderIndex);
  }

  clearSectionSort(orderIndex: number) {
    this.sectionSort.delete(orderIndex);
    this.recalculateData();
  }
  // ────────────────────────────────────────────────────────────────────────

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
