import { Step1Mockup, Step2Mockup, Step3Mockup } from './MockupSvgs';
import styles from './HowItWorksSection.module.css';

const STEPS = [
  {
    label: 'Step 01',
    headline: 'Describe your product and tell us who it\u2019s for.',
    subtext:
      'Write what your product does in plain language, then answer four quick fields , product name, flow type, target user, and key action. No templates, no blank canvas. This is what separates a generic diagram from one that actually matches your product.',
    mockup: <Step1Mockup />,
    alt: false,
  },
  {
    label: 'Step 02',
    headline: 'Get a complete flow diagram and user journey.',
    subtext:
      'UserPath generates a visual flow diagram with standard UX notation, a step-by-step user journey table with edge cases, and a flow summary , all at once. The happy path is highlighted so you can trace it instantly.',
    mockup: <Step2Mockup />,
    alt: true,
  },
  {
    label: 'Step 03',
    headline: 'Download your flow or journey as PNG.',
    subtext:
      'Export your finished flow diagram or step-by-step user journey as a high-resolution PNG in one click. Edit any node or branch if something needs adjusting , UserPath updates the diagram and refreshes your export automatically.',
    mockup: <Step3Mockup />,
    alt: false,
  },
];

export function HowItWorksSection() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.header}>
        <h2 className={styles.heading}>How it works</h2>
        <p className={styles.tagline}>
          From an idea to a shareable flow in three simple steps.
        </p>
      </div>
      {STEPS.map((step, i) => (
        <div key={step.label}>
          {i > 0 && <div className={styles.divider} />}
          <div className={step.alt ? styles.stepAlt : styles.step}>
            <div className={styles.textSide}>
              <span className={styles.stepLabel}>{step.label}</span>
              <h2 className={styles.headline}>{step.headline}</h2>
              <p className={styles.subtext}>{step.subtext}</p>
            </div>
            <div className={styles.mockupSide}>
              <div className={styles.glow} />
              <div className={step.alt ? styles.cardAlt : styles.card}>
                {step.mockup}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
