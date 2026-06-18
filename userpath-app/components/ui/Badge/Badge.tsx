import { type HTMLAttributes } from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  const rootClassName = [styles.root, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={rootClassName} {...props}>
      {children}
    </span>
  );
}
