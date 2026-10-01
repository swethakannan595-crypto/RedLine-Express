import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm transition-colors duration-200",
        className
      )}
      {...props}
    />
  );
}
