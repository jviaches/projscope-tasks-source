export interface Theme {
  id: number;
  name: string;
  properties: any;
}

export const light: Theme = {
  id: 1,
  name: "light",
  properties: {
    "--bg":          "#EDF2F9",
    "--surface":     "#fbf4f6",
    "--surface-2":   "#ffffff",
    "--surface-3":   "#e8edf5",
    "--border":      "#d1d9e6",
    "--border-soft": "#e0e7f0",
    "--text":        "#2e2e2f",
    "--text-muted":  "#5a6a8a",
    "--text-dim":    "#a0aabf",
    "--accent":      "#6c63ff",
    "--accent-glow": "rgba(108,99,255,.2)",
    "--white":       "#ffffff",
    "--light-grey":  "#c4cad3",
    "--purple":      "#6c63ff",
    "--task-bg":     "#ffffff",
    "--section":     "#F4F9FC",
    "--header":      "#fbf4f6",
    "--dialog":      "#ffffff",
    "--button":      "#ffffff",
    "--radius-sm":   "6px",
    "--radius-md":   "10px",
    "--radius-lg":   "16px",

    "--tag-1": "#ceecfd", "--tag-1-text": "#2e87ba",
    "--tag-2": "#d6ede2", "--tag-2-text": "#13854e",
    "--tag-3": "#ceecfd", "--tag-3-text": "#2d86ba",
    "--tag-4": "#f2dcf5", "--tag-4-text": "#a734ba",

    "--foreground-default":   "#08090A",
    "--foreground-secondary": "#41474D",
    "--foreground-tertiary":  "#797C80",
    "--foreground-quaternary":"#F4FAFF",
    "--foreground-light":     "#41474D",
    "--background-default":   "#F4FAFF",
    "--background-secondary": "#A3B9CC",
    "--background-tertiary":  "#5C7D99",
    "--background-light":     "#FFFFFF",
    "--primary-default":      "#5DFDCB",
    "--primary-dark":         "#24B286",
    "--primary-light":        "#B2FFE7",
    "--error-default":        "#EF3E36",
    "--error-dark":           "#800600",
    "--error-light":          "#FFCECC",
    "--background-tertiary-shadow": "0 1px 3px 0 rgba(92, 125, 153, 0.5)"
  }
};

export const dark: Theme = {
  id: 2,
  name: "dark",
  properties: {
    "--bg":          "#0f1117",
    "--surface":     "#181c24",
    "--surface-2":   "#1f2430",
    "--surface-3":   "#252b3a",
    "--border":      "#2a3147",
    "--border-soft": "#1e2638",
    "--text":        "#e2e8f0",
    "--text-muted":  "#7c8db5",
    "--text-dim":    "#4a5680",
    "--accent":      "#6c63ff",
    "--accent-glow": "rgba(108,99,255,.25)",
    "--white":       "#ffffff",
    "--light-grey":  "#7c8db5",
    "--purple":      "#6c63ff",
    "--task-bg":     "#1f2430",
    "--section":     "#1f2430",
    "--header":      "#181c24",
    "--dialog":      "#1f2430",
    "--button":      "#252b3a",
    "--radius-sm":   "6px",
    "--radius-md":   "10px",
    "--radius-lg":   "16px",

    "--tag-1": "#ceecfd", "--tag-1-text": "#2e87ba",
    "--tag-2": "#d6ede2", "--tag-2-text": "#13854e",
    "--tag-3": "#ceecfd", "--tag-3-text": "#2d86ba",
    "--tag-4": "#f2dcf5", "--tag-4-text": "#a734ba",

    "--foreground-default":   "#5C7D99",
    "--foreground-secondary": "#A3B9CC",
    "--foreground-tertiary":  "#F4FAFF",
    "--foreground-quaternary":"#E5E5E5",
    "--foreground-light":     "#FFFFFF",
    "--background-default":   "#797C80",
    "--background-secondary": "#41474D",
    "--background-tertiary":  "#08090A",
    "--background-light":     "#41474D",
    "--primary-default":      "#5DFDCB",
    "--primary-dark":         "#24B286",
    "--primary-light":        "#B2FFE7",
    "--error-default":        "#EF3E36",
    "--error-dark":           "#800600",
    "--error-light":          "#FFCECC",
    "--background-tertiary-shadow": "0 1px 3px 0 rgba(8, 9, 10, 0.5)"
  }
};
