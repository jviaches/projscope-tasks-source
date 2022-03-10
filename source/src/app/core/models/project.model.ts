import { Priority } from "./priority.model";

export interface Project {
    version: string;
    name: string;
    notes: string;
    sections: Section[];
    tags: Tag[];
}

export interface Section {
    orderIndex: number;
    name: string;
    tasks: Task[];
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
}

