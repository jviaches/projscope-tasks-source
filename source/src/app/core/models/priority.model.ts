export interface SelectionItem {
  value: any;
  viewValue: any;
}

export enum Priority {
  'Minor' = 0,
  'Normal' = 1,
  'High' = 2,
  'Critical' = 3
}

export enum PriorityColor {
  'Minor' = '#d8ecf3',
  'Normal' = 'var(--task-bg)',
  'High' = 'pink',
  'Critical' = 'red'
}
