/**
 * 📝 Input Group Components
 * Enhanced input with addons, icons, and textarea support
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Input Group Container
const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex flex-col', className)}
    {...props}
  />
))
InputGroup.displayName = 'InputGroup'

// Input Group Input (styled input within group)
interface InputGroupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasLeftAddon?: boolean
  hasRightAddon?: boolean
}

const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, hasLeftAddon, hasRightAddon, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive',
        hasLeftAddon && 'pl-10',
        hasRightAddon && 'pr-10',
        className
      )}
      {...props}
    />
  )
)
InputGroupInput.displayName = 'InputGroupInput'

// Input Group Textarea
interface InputGroupTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive',
        className
      )}
      {...props}
    />
  )
)
InputGroupTextarea.displayName = 'InputGroupTextarea'

// Input Group Addon (left/right icons or elements)
interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'block-end'
  position?: 'inside' | 'outside'
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = 'start', position = 'inside', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center',
        position === 'inside' && 'absolute top-0 bottom-0 z-10',
        position === 'inside' && align === 'start' && 'left-0 pl-3',
        position === 'inside' && align === 'end' && 'right-0 pr-3',
        align === 'block-end' && 'justify-end mt-1',
        className
      )}
      {...props}
    />
  )
)
InputGroupAddon.displayName = 'InputGroupAddon'

// Input Group Text (helper text within addon)
const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('text-xs text-muted-foreground', className)}
    {...props}
  />
))
InputGroupText.displayName = 'InputGroupText'

// Input Group Icon (icon within addon)
interface InputGroupIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg'
}

const InputGroupIcon = React.forwardRef<HTMLSpanElement, InputGroupIconProps>(
  ({ className, size = 'md', children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'flex items-center justify-center text-muted-foreground',
        size === 'sm' && '[&>svg]:h-3 [&>svg]:w-3',
        size === 'md' && '[&>svg]:h-4 [&>svg]:w-4',
        size === 'lg' && '[&>svg]:h-5 [&>svg]:w-5',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
)
InputGroupIcon.displayName = 'InputGroupIcon'

export {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupText,
  InputGroupIcon,
}
