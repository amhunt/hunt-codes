import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  // The spread param is forwarded, not a literal class list, so the classname
  // rule has nothing real to check here.
  // eslint-disable-next-line tailwindcss/no-custom-classname
  return twMerge(clsx(inputs));
}
