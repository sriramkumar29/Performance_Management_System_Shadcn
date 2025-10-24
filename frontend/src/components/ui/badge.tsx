import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-soft hover:shadow-medium",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground border-2 hover:bg-accent",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-soft hover:shadow-medium",
        success:
          "border-transparent bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shadow-soft hover:shadow-medium",
        warning:
          "border-transparent bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] shadow-soft hover:shadow-medium",
        info: "border-transparent bg-blue-600 text-white shadow-soft hover:shadow-medium",
        muted:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
