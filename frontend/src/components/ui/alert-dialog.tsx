import * as React from "react"
import { cn } from "../../utils/cn"
import {
  Dialog as BaseDialog,
  DialogTrigger as BaseDialogTrigger,
  DialogContent as BaseDialogContent,
  DialogHeader as BaseDialogHeader,
  DialogFooter as BaseDialogFooter,
  DialogTitle as BaseDialogTitle,
  DialogDescription as BaseDialogDescription,
  DialogClose,
} from "./dialog"

const AlertDialog = BaseDialog

const AlertDialogTrigger = BaseDialogTrigger

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialogContent>,
  React.ComponentPropsWithoutRef<typeof BaseDialogContent>
>(({ className, ...props }, ref) => (
  <BaseDialogContent ref={ref} className={className} {...props} />
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <BaseDialogHeader className={cn("space-y-2", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <BaseDialogFooter className={className} {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof BaseDialogTitle>,
  React.ComponentPropsWithoutRef<typeof BaseDialogTitle>
>(({ className, ...props }, ref) => (
  <BaseDialogTitle ref={ref} className={className} {...props} />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof BaseDialogDescription>,
  React.ComponentPropsWithoutRef<typeof BaseDialogDescription>
>(({ className, ...props }, ref) => (
  <BaseDialogDescription ref={ref} className={className} {...props} />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const baseActionClass =
  "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof DialogClose>,
  React.ComponentPropsWithoutRef<typeof DialogClose>
>(({ className, ...props }, ref) => (
  <DialogClose
    ref={ref}
    className={cn("bg-primary text-primary-foreground hover:bg-primary/90", baseActionClass, className)}
    {...props}
  />
))
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof DialogClose>,
  React.ComponentPropsWithoutRef<typeof DialogClose>
>(({ className, ...props }, ref) => (
  <DialogClose
    ref={ref}
    className={cn("border bg-background hover:bg-muted", baseActionClass, className)}
    {...props}
  />
))
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
