import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        open: "border-amber-200 bg-amber-50 text-amber-800",
        assigned: "border-blue-200 bg-blue-50 text-blue-800",
        inProgress: "border-indigo-200 bg-indigo-50 text-indigo-800",
        onHold: "border-purple-200 bg-purple-50 text-purple-800",
        completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
        verified: "border-teal-200 bg-teal-50 text-teal-800",
        closed: "border-slate-200 bg-slate-50 text-slate-600",
        emergency: "border-red-200 bg-red-50 text-red-700",
        urgent: "border-amber-200 bg-amber-50 text-amber-700",
        routine: "border-blue-200 bg-blue-50 text-blue-700",
        scheduled: "border-violet-200 bg-violet-50 text-violet-700",
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

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
