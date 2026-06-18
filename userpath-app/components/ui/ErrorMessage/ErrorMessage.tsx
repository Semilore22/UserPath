'use client';

import { type HTMLAttributes } from 'react';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps extends HTMLAttributes<HTMLDivElement> {
  error: string;
  type?: string;
}

export function ErrorMessage({
  error,
  type,
  className,
  ...props
}: ErrorMessageProps) {
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  return (
    <div
      className={rootClassName}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <span className={styles.icon} aria-hidden="true">!</span>
      <div>
        {type ? (
          <p className={styles.type}>{type}</p>
        ) : null}
        <p className={styles.message}>{error}</p>
      </div>
    </div>
  );
}
