import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default:
      "bg-muted text-muted-foreground",
    primary:
      "bg-primary/15 text-primary border border-primary/20",
    outline:
      "border border-border text-muted-foreground",
    citation:
      "bg-citation/10 text-citation border border-citation/25 hover:bg-citation/20 cursor-pointer transition-colors duration-150",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
