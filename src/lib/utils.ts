import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and merges Tailwind CSS classes.
 * 
 * @example
 * cn("bg-red-500", condition && "text-white") 
 * → "bg-red-500 text-white"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}