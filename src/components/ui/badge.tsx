import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/shadcn-utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--shadcn-primary))] text-[hsl(var(--shadcn-primary-foreground))] hover:bg-[hsl(var(--shadcn-primary))]/80",
        secondary:
          "border-transparent bg-[hsl(var(--shadcn-secondary))] text-[hsl(var(--shadcn-secondary-foreground))] hover:bg-[hsl(var(--shadcn-secondary))]/80",
        destructive:
          "border-transparent bg-[hsl(var(--shadcn-destructive))] text-[hsl(var(--shadcn-destructive-foreground))] hover:bg-[hsl(var(--shadcn-destructive))]/80",
        outline: "text-[hsl(var(--shadcn-foreground))]",
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
