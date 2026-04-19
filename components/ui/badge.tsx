import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Segment-specific
        new: "border-transparent bg-blue-100 text-blue-700",
        returning: "border-transparent bg-emerald-100 text-emerald-700",
        loyal: "border-transparent bg-green-100 text-green-700",
        inactive: "border-transparent bg-orange-100 text-orange-700",
        active: "border-transparent bg-blue-50 text-blue-600",
        completed: "border-transparent bg-green-50 text-green-600",
        scheduled: "border-transparent bg-amber-50 text-amber-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
