'use client';

import type { JourneyStep } from '@/types';
import styles from './JourneyTable.module.css';

interface JourneyTableProps {
  steps: JourneyStep[];
}

export function JourneyTable({ steps }: JourneyTableProps) {
  if (!steps?.length) {
    return (
      <p className={styles.empty}>
        No journey steps available.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>
        Step-by-Step User Journey
      </h3>
      <div className={styles.tableWrapper}>
        <div className={styles.tableInner}>
          <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" style={{ width: '60px', textAlign: 'center' }}>Step</th>
              <th scope="col" style={{ width: '20%' }}>User Action</th>
              <th scope="col" style={{ width: '22%' }}>System Response</th>
              <th scope="col" className={styles.edgeCaseHeader} aria-label="Edge Case">
                ⚠ Edge Case
              </th>
              <th scope="col" className={styles.edgeCaseResponseHeader}>
                System Response to Edge Case
              </th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step.step}>
                <td className={styles.stepCell}>
                  {step.step}
                </td>
                <td>
                  {step.userAction}
                </td>
                <td>
                  {step.systemResponse}
                </td>
                <td className={styles.edgeCaseCell}>
                  {step.edgeCase || '—'}
                </td>
                <td className={styles.edgeCaseResponseCell}>
                  {step.edgeCaseResponse || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
