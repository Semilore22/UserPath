import styles from './ProblemSection.module.css';

export function ProblemSection() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionLabel}>Sound familiar?</div>
      <h2 className={styles.headline}>Every designer knows this feeling.</h2>
      <p className={styles.subheadline}>
        <span>User flows are foundational. Building them</span>
        <span>from scratch is not.</span>
      </p>

      <div className={styles.cards}>
        <div className={styles.card}>
          <svg className={styles.icon} viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <line x1="3" y1="10" x2="25" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="3" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <h3 className={styles.cardTitle}>The blank canvas problem</h3>
          <p className={styles.cardDesc}>
            You open Figma or FigJam, stare at an empty board, and spend the first hour just placing boxes.
          </p>
        </div>

        <div className={styles.card}>
          <svg className={styles.icon} viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M14 3L25 24H3L14 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="14" y1="12" x2="14" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14" cy="21" r="1" fill="currentColor" />
          </svg>
          <h3 className={styles.cardTitle}>Missed edge cases</h3>
          <p className={styles.cardDesc}>
            You build the happy path and forget the error states. Your design review finds them. Your client finds more.
          </p>
        </div>

        <div className={styles.card}>
          <svg className={styles.icon} viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" />
            <polyline points="14,7 14,14 19,19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className={styles.cardTitle}>Hours on the wrong thing</h3>
          <p className={styles.cardDesc}>
            You spend three hours on a flow diagram that should take twenty minutes. That is time you are not designing.
          </p>
        </div>
      </div>

      <p className={styles.transition}>There is a faster way.</p>
    </section>
  );
}
