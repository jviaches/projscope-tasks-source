import { Injectable } from "@angular/core";
import {
  Priority,
  PriorityColor,
  SelectionItem,
} from "../models/priority.model";
import { Section } from '../models/section.model';

@Injectable({
  providedIn: "root",
})
export class UtilsService {
  priorities: SelectionItem[] = [
    { value: Priority.Minor.valueOf(), viewValue: Priority[0] },
    { value: Priority.Normal.valueOf(), viewValue: Priority[1] },
    { value: Priority.High.valueOf(), viewValue: Priority[2] },
    { value: Priority.Critical.valueOf(), viewValue: Priority[3] },
  ];

  priorityColors = new Map<string, string>([
    [PriorityColor.Minor, "Minor"],
    [PriorityColor.Normal, "Normal"],
    [PriorityColor.High, "High"],
    [PriorityColor.Critical, "Critical"],
  ]);

  getColorByPriority(priority: string): string {
    return [...this.priorityColors].find(([key, val]) => val == priority)[0];
  }

  sections: SelectionItem[] = [
    { value: Section.Backlog.valueOf(), viewValue: Section[0] },
    { value: Section.Todo.valueOf(), viewValue: Section[1] },
    { value: Section["In progress"].valueOf(), viewValue: Section[2] },
    { value: Section.Done.valueOf(), viewValue: Section[3] },
  ];
}
