import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'ghost';
/** `block` keeps the button full width at every size (for example in a sheet's action bar). */
type Options = { variant?: Variant; block?: boolean };

type ButtonProps =
  | (Options & { href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  | (Options & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>);

const base =
  'inline-flex h-[52px] items-center justify-center gap-2 rounded-md px-6 text-base font-semibold transition-colors';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-on-brand hover:bg-brand-hover disabled:bg-line disabled:text-disabled-ink disabled:cursor-not-allowed',
  ghost:
    'border border-ink bg-transparent text-ink hover:bg-selected disabled:border-line disabled:text-disabled-ink disabled:cursor-not-allowed',
};

export function buttonClasses({ variant = 'primary', block = false }: Options = {}, className?: string) {
  return cn(base, block ? 'w-full' : 'w-full sm:w-auto', variants[variant], className);
}

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant, block, className, ...rest } = props;
    return <a className={buttonClasses({ variant, block }, className)} {...rest} />;
  }
  const { variant, block, className, type = 'button', ...rest } = props;
  return <button type={type} className={buttonClasses({ variant, block }, className)} {...rest} />;
}
