export const delay = (timeInMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeInMs));
