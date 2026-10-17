import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'ghost';

type ButtonProps =
  | ({ variant?: Variant; href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ variant?: Variant; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>);

const base =
  'inline-flex h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-md px-6 text-base font-semibold transition-colors';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-on-brand hover:bg-brand-hover disabled:bg-line disabled:text-disabled-ink disabled:cursor-not-allowed',
  ghost:
    'border border-ink bg-transparent text-ink hover:bg-selected disabled:border-line disabled:text-disabled-ink disabled:cursor-not-allowed',
};

export function buttonClasses(variant: Variant = 'primary', className?: string) {
  return cn(base, variants[variant], className);
}

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant, className, ...rest } = props;
    return <a className={buttonClasses(variant, className)} {...rest} />;
  }
  const { variant, className, type = 'button', ...rest } = props;
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
