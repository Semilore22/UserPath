import Link from 'next/link';
import styles from './WhoItsForSection.module.css';

export function WhoItsForSection() {
  return (
    <section className={styles.section} id="who-its-for">
      <div className={styles.sectionLabel}>Who it&apos;s for</div>
      <h2 className={styles.headline}>Built for every designer.</h2>
      <p className={styles.subheadline}>
        Whether you are freelancing, learning, or leading a product team — UserPath meets you where you are.
      </p>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.pill}>Freelance Designer</div>
          <span className={styles.quoteMark}>&ldquo;</span>
          <p className={styles.quote}>
            I just need a solid starting point so I can focus on the actual design, not on placing boxes.
          </p>
          <div className={styles.divider} />
          <div className={styles.outcome}>
            <svg className={styles.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Gets client-ready flows in minutes instead of hours.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.pill}>Junior Designer</div>
          <span className={styles.quoteMark}>&ldquo;</span>
          <p className={styles.quote}>
            I always feel like I am missing something. I don&apos;t know what I don&apos;t know.
          </p>
          <div className={styles.divider} />
          <div className={styles.outcome}>
            <svg className={styles.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Gets complete flows with decision branches and error states already included.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.pill}>Design Student</div>
          <span className={styles.quoteMark}>&ldquo;</span>
          <p className={styles.quote}>
            I know what I want the app to do. I just don&apos;t know how to turn that into a proper diagram.
          </p>
          <div className={styles.divider} />
          <div className={styles.outcome}>
            <svg className={styles.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Gets professional UX notation without needing to know the rules.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.pill}>Product Manager</div>
          <span className={styles.quoteMark}>&ldquo;</span>
          <p className={styles.quote}>
            I need to map this flow but I don&apos;t have time to learn Figma or Miro.
          </p>
          <div className={styles.divider} />
          <div className={styles.outcome}>
            <svg className={styles.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Maps user journeys without any design tool experience.
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.closing}>Sound like you?</p>
        <Link href="/generate" className={styles.cta}>
          Start Building &rarr;
        </Link>
      </div>
    </section>
  );
}
