export interface Theme {
  id: number;
  name: string;
  properties: any;
}

export const light: Theme = {
  id: 1,
  name: "light",
  properties: {
    "--bg": "#EDF2F9",
    "--header": "#fbf4f6",
    "--text": "#2e2e2f",
    "--white": "#ffffff",
    "--light-grey": "#c4cad3",
    "--tag-1": "#ceecfd",
    "--tag-1-text": "#2e87ba",
    "--tag-2": "#d6ede2",
    "--tag-2-text": "#13854e",
    "--tag-3": "#ceecfd",
    "--tag-3-text": "#2d86ba",
    "--tag-4": "#f2dcf5",
    "--tag-4-text": "#a734ba",
    "--purple": "#7784ee",
    "--section": "#F4F9FC",
    "--dialog": "white",
    "--task-bg": "white",
    "--button": "white",


    "--foreground-default": "#08090A",
    "--foreground-secondary": "#41474D",
    "--foreground-tertiary": "#797C80",
    "--foreground-quaternary": "#F4FAFF",
    "--foreground-light": "#41474D",

    "--background-default": "#F4FAFF",
    "--background-secondary": "#A3B9CC",
    "--background-tertiary": "#5C7D99",
    "--background-light": "#FFFFFF",

    "--primary-default": "#5DFDCB",
    "--primary-dark": "#24B286",
    "--primary-light": "#B2FFE7",

    "--error-default": "#EF3E36",
    "--error-dark": "#800600",
    "--error-light": "#FFCECC",

    "--background-tertiary-shadow": "0 1px 3px 0 rgba(92, 125, 153, 0.5)"
  }
};

export const dark: Theme = {
  id: 2,
  name: "dark",
  properties: {

    "--bg": "#0C1017",
    "--header": "#fbf4f6",
    "--text": "#C9D1D9",
    "--white": "#ffffff",
    "--light-grey": "#c4cad3",
    "--tag-1": "#ceecfd",
    "--tag-1-text": "#2e87ba",
    "--tag-2": "#d6ede2",
    "--tag-2-text": "#13854e",
    "--tag-3": "#ceecfd",
    "--tag-3-text": "#2d86ba",
    "--tag-4": "#f2dcf5",
    "--tag-4-text": "#a734ba",
    "--purple": "#7784ee",
    "--section": "#080D10",
    "--dialog": "#171B23",
    "--task-bg": "#171B23",
    "--button": "#20272D",







    "--foreground-default": "#5C7D99",
    "--foreground-secondary": "#A3B9CC",
    "--foreground-tertiary": "#F4FAFF",
    "--foreground-quaternary": "#E5E5E5",
    "--foreground-light": "#FFFFFF",

    "--background-default": "#797C80",
    "--background-secondary": "#41474D",
    "--background-tertiary": "#08090A",
    "--background-light": "#41474D",

    "--primary-default": "#5DFDCB",
    "--primary-dark": "#24B286",
    "--primary-light": "#B2FFE7",

    "--error-default": "#EF3E36",
    "--error-dark": "#800600",
    "--error-light": "#FFCECC",

    "--background-tertiary-shadow": "0 1px 3px 0 rgba(8, 9, 10, 0.5)"
  }
};