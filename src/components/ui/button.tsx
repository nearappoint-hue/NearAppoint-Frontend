import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The button. Used ~200 times across the product.
 *
 * If you find yourself adding a one-off className to change its colour, add a
 * variant here instead. That is how screen #30 keeps matching screen #1.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-display font-bold ' +
  'tracking-tight transition-all active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ' +
  '[&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-brand hover:bg-brand-hover',
        secondary: 'bg-white text-ink border border-line2 hover:border-ink',
        dark: 'bg-navy text-white hover:bg-navy-soft',
        outlineLight: 'bg-transparent text-white border-[1.5px] border-white/30 hover:bg-white hover:text-navy',
        ghost: 'bg-transparent text-muted hover:bg-soft hover:text-ink',
        destructive: 'bg-bad text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-[22px] text-[0.94rem]',
        lg: 'h-[52px] px-[26px] text-base',
        icon: 'h-10 w-10',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild, loading, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, block }), className);

    /**
     * asChild renders through Radix's <Slot>, which merges its props onto its
     * ONE child. It requires exactly one React element — not an array, not a
     * fragment, not `[null, children]`.
     *
     * That is why the spinner cannot live in this branch: `{loading && <Spinner/>}`
     * plus `{children}` is two children, and Slot throws
     * "Slot failed to slot onto its children" AT BUILD TIME, during prerender.
     *
     * A link button doesn't need a spinner anyway — navigation isn't an async
     * action we own. So: asChild = pass the child straight through, untouched.
     */
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

function Spinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export { buttonVariants };
