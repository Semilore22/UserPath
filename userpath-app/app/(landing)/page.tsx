import type { Metadata } from 'next';
import Link from 'next/link';
import { HowItWorksSection } from '@/components/features/how-it-works';
import { ProblemSection } from '@/components/features/problem-section/ProblemSection';
import { WhoItsForSection } from '@/components/features/who-its-for/WhoItsForSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Navbar } from '@/components/features/navbar/Navbar';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'UserPath — AI-Powered User Flow Generator',
  description: 'Describe your product in plain language and get a production-ready user flow diagram, step-by-step journey, and downloadable PNG in under sixty seconds.',
};

export default function LandingPage() {
  return (
    <div className={styles.root}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero} id="see-output">
          <div className={styles.badge}>Your favourite AI user flow generator</div>
          <h1 className={styles.title}>
            <span className={styles.desktopInline}>Describe your product and get a</span>
            <span className={styles.mobileInline}>Describe your product</span>
            <br />
            <span className={styles.desktopInline}>production ready <span className={styles.titleBold}>User-Flow</span></span>
            <span className={styles.mobileInline}>and get a production ready <span className={styles.titleBold}>User-Flow</span></span>
          </h1>
          <p className={styles.subtitle}>
            Describe your product and get a complete
            visual flow diagram, step-by-step
            user journey, and a downloadable PNG.
          </p>
          <Link href="/generate" className={styles.cta}>
            Start Building
          </Link>
        </section>
      </main>

      <ErrorBoundary><ProblemSection /></ErrorBoundary>

      <ErrorBoundary><HowItWorksSection /></ErrorBoundary>

      <ErrorBoundary><WhoItsForSection /></ErrorBoundary>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>UserPath</div>
            <p className={styles.footerTagline}>
              Generate complete user flows from a plain-language description.
            </p>
          </div>
          <div className={styles.footerColumn}>
            <span className={styles.footerColumnHeader}>Product</span>
            <a href="#how-it-works" className={styles.footerLink}>How it works</a>
            <a href="#who-its-for" className={styles.footerLink}>Who it&rsquo;s for</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span className={styles.footerBottomLeft}>&copy; 2026 UserPath. All rights reserved.</span>
          <span className={styles.footerBottomRight}>Built for designers, by a designer.</span>
        </div>
      </footer>
    </div>
  );
}
