'use client';

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';
import { toPng } from 'html-to-image';
import type { ReactFlowInstance } from 'reactflow';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  journeyRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  productName: string;
  reactFlowRef?: React.MutableRefObject<ReactFlowInstance | null>;
}

export function ExportButton({
  canvasRef,
  journeyRef,
  disabled = false,
  productName = 'user-flow',
  reactFlowRef,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  const sanitizeName = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-');

  const handleDownloadFlowDiagram = async () => {
    if (!canvasRef.current) return;
    setDropdownOpen(false);
    setExporting(true);
    setError(null);

    let prevViewport: { x: number; y: number; zoom: number } | null = null;
    let prevContainerSize: { w: string; h: string } | null = null;

    try {
      if (reactFlowRef?.current) {
        prevViewport = reactFlowRef.current.getViewport();

        const container = canvasRef.current;
        prevContainerSize = {
          w: container.style.width,
          h: container.style.height,
        };
        const origW = container.offsetWidth;
        const origH = container.offsetHeight;

        // Fit all nodes into view
        reactFlowRef.current.fitView({ padding: 0.15, duration: 0 });
        await new Promise(resolve => setTimeout(resolve, 50));

        const fitted = reactFlowRef.current.getViewport();
        const MIN_ZOOM = 1.5;
        const MAX_MULTIPLIER = 4;
        const mult = Math.max(1, Math.min(MAX_MULTIPLIER, MIN_ZOOM / fitted.zoom));

        if (mult > 1.01) {
          // Enlarge container so same content fits at higher zoom
          container.style.width = `${Math.round(origW * mult)}px`;
          container.style.height = `${Math.round(origH * mult)}px`;

          reactFlowRef.current.setViewport({
            x: Math.round(fitted.x * mult),
            y: Math.round(fitted.y * mult),
            zoom: fitted.zoom * mult,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const bgColor = typeof document !== 'undefined'
        ? (getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() || 'hsl(288, 15%, 8%)')
        : 'hsl(288, 15%, 8%)';

      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: bgColor,
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${sanitizeName(productName)}-flow-diagram.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      if (mountedRef.current) {
        if (reactFlowRef?.current && prevViewport) {
          reactFlowRef.current.setViewport(prevViewport, { duration: 0 });
        }
        if (canvasRef.current && prevContainerSize) {
          canvasRef.current.style.width = prevContainerSize.w;
          canvasRef.current.style.height = prevContainerSize.h;
        }
        setExporting(false);
      }
    }
  };

  const handleDownloadUserJourney = async () => {
    if (!journeyRef.current) return;
    setDropdownOpen(false);
    setExporting(true);
    setError(null);

    try {
      const bgColor = typeof document !== 'undefined'
        ? (getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() || 'hsl(288, 15%, 8%)')
        : 'hsl(288, 15%, 8%)';

      const dataUrl = await toPng(journeyRef.current, {
        backgroundColor: bgColor,
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${sanitizeName(productName)}-user-journey.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      if (mountedRef.current) setExporting(false);
    }
  };

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <div className={styles.splitButton}>
        <button
          className={styles.mainButton}
          onClick={handleDownloadFlowDiagram}
          disabled={disabled || exporting}
          aria-busy={exporting}
        >
          {exporting ? 'Downloading...' : 'Download'}
        </button>
        <button
          className={styles.chevronButton}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={disabled || exporting}
          aria-label="Download options"
          aria-expanded={dropdownOpen}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {dropdownOpen && (
        <div className={styles.dropdown} role="menu">
          <button
            className={styles.dropdownItem}
            onClick={handleDownloadFlowDiagram}
            role="menuitem"
          >
            <svg className={styles.dropdownIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <div className={styles.dropdownItemContent}>
              <span className={styles.dropdownItemLabel}>Download Flow Diagram</span>
              <span className={styles.dropdownItemSublabel}>Exports the visual flow as PNG</span>
            </div>
          </button>
          <button
            className={styles.dropdownItem}
            onClick={handleDownloadUserJourney}
            role="menuitem"
          >
            <svg className={styles.dropdownIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <div className={styles.dropdownItemContent}>
              <span className={styles.dropdownItemLabel}>Download User Journey</span>
              <span className={styles.dropdownItemSublabel}>Exports the step-by-step table as PNG</span>
            </div>
          </button>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">{error}</p>
      )}
    </div>
  );
}
