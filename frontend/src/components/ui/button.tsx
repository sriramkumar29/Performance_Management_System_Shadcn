 import * as React from "react"
 import { Slot } from "@radix-ui/react-slot"
 import { cva, type VariantProps } from "class-variance-authority"
 import { cn } from "../../utils/cn"

 const buttonVariants = cva(
   "group inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out active:scale-95 motion-reduce:transition-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background gap-2",
   {
    variants: {
      variant: {
         // default visual primary
         default: "bg-primary text-primary-foreground hover:opacity-90",
         // safe alias; some pages may use variant=\"primary\"
         primary: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
         // subtle emphasis using current color system
         soft: "bg-primary/10 text-primary hover:bg-primary/15",
         // slight elevation + stronger hover shadow
         elevated: "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:opacity-95",
      },
      size: {
         // responsive tweaks without breaking existing sizing
         default: "h-9 md:h-10 px-3.5 md:px-4 py-2 md:py-2 md:text-base",
         sm: "h-8 rounded-md px-3 py-1.5",
         lg: "h-10 md:h-11 rounded-md px-6 md:px-8",
         xl: "h-12 rounded-lg px-8",
         xs: "h-7 rounded-md px-2.5 text-xs",
         icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
   asChild?: boolean
   // show a spinner and set aria-busy while preventing clicks
   loading?: boolean
   // optional accessible text for loading state; falls back to "Loading..."
   loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        data-loading={loading ? "true" : undefined}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <span className="inline-flex items-center" aria-hidden>
            <svg
              className="mr-1.5 h-4 w-4 animate-spin text-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="sr-only">{loadingText ?? "Loading..."}</span>
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap",
            loading && "opacity-0"
          )}
        >
          {children}
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
