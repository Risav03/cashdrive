import React, { InputHTMLAttributes } from 'react'
import { cn } from '@/app/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  className?: string
  labelClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, labelClassName, ...props }, ref) => {
    return (
      <div className="w-full flex-col flex gap-2">
        <input
          className={cn(
            "p-2 placeholder:text-gray-300/40 bg-gray-300/20 w-full",
            "peer focus:outline-none focus:border-black",
            "focus:border-2 rounded-lg text-white border-[1px] duration-200",
            error && "border-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && (
          <h2 className={cn("text-xs peer-focus:opacity-100 opacity-75 order-first duration-200 text-purple-500 font-bold ", labelClassName)}>
            {label}
          </h2>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
