/**
 * 📋 Field Components
 * Form field components with validation support (shadcn/ui pattern)
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Field Context for state management
interface FieldContextValue {
  id: string
  invalid?: boolean
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

function useFieldContext() {
  const context = React.useContext(FieldContext)
  return context
}

// Field Container
interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'responsive'
  'data-invalid'?: boolean
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    const id = React.useId()
    const invalid = props['data-invalid']

    return (
      <FieldContext.Provider value={{ id, invalid }}>
        <div
          ref={ref}
          className={cn(
            'space-y-2',
            orientation === 'horizontal' && 'flex items-center gap-3 space-y-0',
            orientation === 'responsive' && 'sm:flex sm:items-start sm:gap-4 sm:space-y-0',
            invalid && 'text-destructive',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </FieldContext.Provider>
    )
  }
)
Field.displayName = 'Field'

// Field Group
const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-4', className)}
    {...props}
  />
))
FieldGroup.displayName = 'FieldGroup'

// FieldSet
interface FieldSetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  'data-invalid'?: boolean
}

const FieldSet = React.forwardRef<HTMLFieldSetElement, FieldSetProps>(
  ({ className, ...props }, ref) => (
    <fieldset
      ref={ref}
      className={cn('space-y-3', className)}
      {...props}
    />
  )
)
FieldSet.displayName = 'FieldSet'

// Field Label
interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    const context = useFieldContext()
    
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          context?.invalid && 'text-destructive',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
    )
  }
)
FieldLabel.displayName = 'FieldLabel'

// Field Legend (for fieldsets)
interface FieldLegendProps extends React.HTMLAttributes<HTMLLegendElement> {
  variant?: 'default' | 'label'
}

const FieldLegend = React.forwardRef<HTMLLegendElement, FieldLegendProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <legend
      ref={ref}
      className={cn(
        variant === 'label' && 'text-sm font-medium leading-none',
        variant === 'default' && 'text-base font-semibold',
        className
      )}
      {...props}
    />
  )
)
FieldLegend.displayName = 'FieldLegend'

// Field Description
const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
FieldDescription.displayName = 'FieldDescription'

// Field Content (for responsive layouts)
const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 space-y-1', className)}
    {...props}
  />
))
FieldContent.displayName = 'FieldContent'

// Field Error
interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  errors?: (string | { message?: string } | undefined)[]
}

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, errors, children, ...props }, ref) => {
    const errorMessages = errors
      ?.map(e => typeof e === 'string' ? e : e?.message)
      .filter(Boolean)
    
    if (!errorMessages?.length && !children) return null

    return (
      <p
        ref={ref}
        className={cn('text-sm font-medium text-destructive', className)}
        role="alert"
        {...props}
      >
        {errorMessages?.[0] || children}
      </p>
    )
  }
)
FieldError.displayName = 'FieldError'

// Field Separator
const FieldSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn('border-t border-border my-4', className)}
    {...props}
  />
))
FieldSeparator.displayName = 'FieldSeparator'

export {
  Field,
  FieldGroup,
  FieldSet,
  FieldLabel,
  FieldLegend,
  FieldDescription,
  FieldContent,
  FieldError,
  FieldSeparator,
  useFieldContext,
}
