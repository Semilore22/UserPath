'use client';

import { type HTMLAttributes } from 'react';
import styles from './CharacterCounter.module.css';

interface CharacterCounterProps extends HTMLAttributes<HTMLDivElement> {
  current: number;
  max: number;
  min?: number;
  hasError?: boolean;
}

export function CharacterCounter({
  current,
  max,
  min = 0,
  hasError = false,
  className,
  ...props
}: CharacterCounterProps) {
  const isError = current > max;
  const isWarning = current < min;
  const rootClassName = [
    styles.root,
    isError ? styles.error : '',
    isWarning && hasError ? styles.submittedError : '',
    isWarning && !hasError ? styles.warning : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} aria-live="polite" {...props}>
      <span>
        {current} / {max}
      </span>
      {isError ? (
        <span className={styles.hint}>Too long</span>
      ) : isWarning ? (
        <span className={styles.hint}>Minimum {min} characters</span>
      ) : null}
    </div>
  );
}
