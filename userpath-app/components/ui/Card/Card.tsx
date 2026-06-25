import { type HTMLAttributes } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined';
}

export function Card({
  variant = 'elevated',
  className,
  children,
  ...props
}: CardProps) {
  const rootClassName = [styles.root, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} {...props}>
      {children}
    </div>
  );
}

