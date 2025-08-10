export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const process = (val: ClassValue) => {
    if (!val) return;
    if (typeof val === "string" || typeof val === "number") {
      classes.push(String(val));
    } else if (Array.isArray(val)) {
      val.forEach(process);
    }
  };

  inputs.forEach(process);
  return classes.join(" ");
}
