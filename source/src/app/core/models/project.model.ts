import { Priority } from "./priority.model";

export interface Project {
    schemaVersion: number;
    version: string;
    name: string;
    notes: string;
    sections: Section[];
    tags: Tag[];
}

export interface SectionSort {
    field: 'name' | 'date';
    dir: 'asc' | 'desc';
}

export interface Section {
    orderIndex: number;
    name: string;
    tasks: Task[];
    sort?: SectionSort;
}

export interface Tag {
    id: number;
    name: string;
    color: string;
}

export class Task {
    id: number;
    title: string = '';
    content: string = '';
    priority: Priority;
    tags: Tag[] = [];
    orderIndex: number;
    creationDate: Date;
    dueDate?: string | null;   // ISO-8601 string, null/undefined = no deadline
}
