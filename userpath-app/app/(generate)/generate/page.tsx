'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DescriptionInput } from '@/components/features/description-input';
import { FlowForm } from '@/components/features/flow-form';
import { Card } from '@/components/ui/Card';
import { useSession } from '@/components/hooks/useSession';
import { MIN_DESCRIPTION_LENGTH, MAX_DESCRIPTION_LENGTH, ERROR_MESSAGES } from '@/lib/constants';
import { sanitizeInput } from '@/lib/sanitize';
import { formatRetryTime } from '@/lib/utils';
import type { FlowType } from '@/types';
import styles from './page.module.css';

const PROGRESS_LABELS = [
  'Checking your description\u2026',
  'Designing your user flow\u2026',
  'Preparing your diagram\u2026',
];

export default function GeneratePage() {
  const router = useRouter();
  const { sessionId, ready: sessionReady, getHeaders } = useSession();
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const [productName, setProductName] = useState('');
  const [flowType, setFlowType] = useState('');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [keyAction, setKeyAction] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const userCancelledRef = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const canGenerate = useMemo(() => {
    const trimmed = description.trim();
    return (
      trimmed.length >= MIN_DESCRIPTION_LENGTH &&
      trimmed.length <= MAX_DESCRIPTION_LENGTH &&
      productName.trim().length > 0 &&
      flowType !== '' &&
      targetUsers.length > 0 &&
      keyAction.trim().length > 0
    );
  }, [description, productName, flowType, targetUsers, keyAction]);

  const handleCancel = () => {
    userCancelledRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setLoading(false);
    setProgressStep(0);
  };

  const generatingRef = useRef(false);

  const handleGenerate = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;

    setDescriptionError(null);
    setFormError(null);
    setFieldErrors({});
    const trimmed = description.trim();

    if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      setDescriptionError('ERR_INPUT_TOO_SHORT');
      return;
    }

    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      setDescriptionError('ERR_INPUT_TOO_LONG');
      return;
    }

    // Per-field validation
    const newFieldErrors: Record<string, string | null> = {};
    if (!productName.trim()) newFieldErrors.productName = 'Product name is required';
    if (!flowType) newFieldErrors.flowType = 'Select a flow type';
    if (targetUsers.length === 0) newFieldErrors.targetUsers = 'Select at least one target user';
    if (!keyAction.trim()) newFieldErrors.keyAction = 'Key action is required';
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    if (!sessionId) {
      setFormError('Could not create a session. Please try again or use a different browser.');
      return;
    }
    setLoading(true);
    setProgressStep(0);
    setShowSuccess(false);

    const controller = new AbortController();
    abortRef.current = controller;
    userCancelledRef.current = false;

    // 35-second frontend timeout
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    progressTimerRef.current = setTimeout(() => {
      setProgressStep(1);
    }, 1000);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: getHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          description: sanitizeInput(description),
          productName,
          flowType: flowType as FlowType,
          targetUsers,
          keyAction,
        }),
      });

      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgressStep(2);

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'ERR_OFF_TOPIC') {
          setDescriptionError('ERR_OFF_TOPIC');
          setLoading(false);
          setProgressStep(0);
          return;
        }
        if (result.error === 'ERR_RATE_LIMIT_EXCEEDED') {
          setFormError(
            `You\u2019ve reached the limit. Try again in ${formatRetryTime(result.retryAfter)}.`,
          );
          setLoading(false);
          setProgressStep(0);
          return;
        }
        setFormError(result.error || 'Something went wrong.');
        setLoading(false);
        setProgressStep(0);
        return;
      }

      try {
        localStorage.setItem(
          `userpath-flow-${result.flowId}`,
          JSON.stringify({
            flowId: result.flowId,
            productName: result.productName,
            nodes: result.nodes,
            edges: result.edges,
            userJourneySteps: result.userJourneySteps,
            createdAt: result.createdAt,
          }),
        );
      } catch {}

      setShowSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (mountedRef.current) {
        router.push(`/flow/${result.flowId}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (userCancelledRef.current) {
          userCancelledRef.current = false;
          return;
        }
        setFormError('Taking longer than expected. Please try again.');
        setLoading(false);
        setProgressStep(0);
        return;
      }
      setFormError('Network error. Please try again.');
      setLoading(false);
      setProgressStep(0);
    } finally {
      clearTimeout(timeoutId);
      generatingRef.current = false;
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink} aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <Link href="/" className={styles.logoLink}><span className={styles.logo}>UserPath</span></Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Generate User-Flow</h1>
        <Card className={styles.card} variant="outlined">
          <div className={styles.formBody}>
              {showSuccess ? (
                <div className={styles.successState}>
                  <div className={styles.successCheckmark}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className={styles.successTitle}>Your flow is ready!</p>
                  <p className={styles.successSubtitle}>
                    Redirecting you to your flow&hellip;
                  </p>
                  <div className={styles.statsRow}>
                    <span className={styles.statPill}>&#10022; Flow generated</span>
                    <span className={styles.statPill}>{flowType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <span className={styles.statPill}>{productName}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} />
                  </div>
                </div>
              ) : (
              <>
                <DescriptionInput
                  value={description}
                  onChange={(v) => { setDescription(v); setDescriptionError(null); }}
                  error={
                    descriptionError
                      ? ERROR_MESSAGES[descriptionError] ?? null
                      : null
                  }
                />

                <FlowForm
                  productName={productName}
                  onProductNameChange={(v) => { setProductName(v); setFieldErrors((e) => ({ ...e, productName: null })); }}
                  flowType={flowType}
                  onFlowTypeChange={(v) => { setFlowType(v); setFieldErrors((e) => ({ ...e, flowType: null })); }}
                  targetUsers={targetUsers}
                  onTargetUsersChange={(v) => { setTargetUsers(v); setFieldErrors((e) => ({ ...e, targetUsers: null })); }}
                  keyAction={keyAction}
                  onKeyActionChange={(v) => { setKeyAction(v); setFieldErrors((e) => ({ ...e, keyAction: null })); }}
                  fieldErrors={fieldErrors}
                />

                {formError ? (
                  <p className={styles.error} role="alert">
                    {formError}
                  </p>
                ) : null}

                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={`${styles.generateButton} ${loading ? styles.generateButtonLoading : ''}`}
                    onClick={handleGenerate}
                    disabled={!canGenerate || loading}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        {PROGRESS_LABELS[progressStep]}
                      </>
                    ) : (
                      'Generate Flow'
                    )}
                  </button>
                  {loading ? (
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
