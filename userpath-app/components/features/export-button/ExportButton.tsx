'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
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
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

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
    setDropdownOpen(false);
    setExporting(true);
    setError(null);

    if (!reactFlowRef?.current) return;

    const previousViewport = reactFlowRef.current.getViewport();

    try {
      // Step 1: fit entire diagram into view before capture
      reactFlowRef.current.fitView({
        padding: 0.1,
        duration: 0,
        minZoom: 0.01,
        maxZoom: 1,
      });

      await new Promise<void>(resolve => setTimeout(resolve, 200));
      if (!mountedRef.current) return;

      // Step 2: get the viewport element
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) {
        throw new Error('Viewport not found');
      }

      // Step 3: get the FULL diagram bounds not just the visible area
      const allNodes = reactFlowRef.current.getNodes();
      if (allNodes.length === 0) {
        throw new Error('No nodes found');
      }

      // Calculate the bounding box of all nodes in the diagram
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      allNodes.forEach((node) => {
        const x = node.position.x;
        const y = node.position.y;
        const w = node.width ?? 200;
        const h = node.height ?? 56;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const padding = 80;
      const diagramWidth = (maxX - minX) + padding * 2;
      const diagramHeight = (maxY - minY) + padding * 2;

      // Step 4: capture at full dimensions
      const pixelRatio = 2;
      const dataUrl = await toPng(viewport, {
        quality: 1,
        pixelRatio: pixelRatio,
        width: diagramWidth,
        height: diagramHeight,
        canvasWidth: diagramWidth * pixelRatio,
        canvasHeight: diagramHeight * pixelRatio,
        cacheBust: true,
        style: {
          width: `${diagramWidth}px`,
          height: `${diagramHeight}px`,
          transform: `translate(${-minX + padding}px, ${-minY + padding}px)`,
        },
        filter: (node) => {
          if (node.classList) {
            return (
              !node.classList.contains('react-flow__controls') &&
              !node.classList.contains('react-flow__minimap') &&
              !node.classList.contains('react-flow__panel') &&
              !node.classList.contains('react-flow__background')
            );
          }
          return true;
        },
      });

      // Step 5: trigger download
      if (!mountedRef.current) return;

      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File(
          [blob],
          `${sanitizeName(productName)}-flow-diagram.png`,
          { type: 'image/png' }
        );
        if (
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: `${productName} Flow Diagram`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() =>
            URL.revokeObjectURL(url), 10000
          );
        }
      } else {
        const link = document.createElement('a');
        link.download = `${sanitizeName(productName)}-flow-diagram.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error('[export] PNG error:', e);
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      // Step 6: restore viewport after capture
      setTimeout(() => {
        reactFlowRef.current?.setViewport(previousViewport, { duration: 300 });
      }, 500);
      if (mountedRef.current) setExporting(false);
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

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const dataUrl = await toPng(journeyRef.current, {
        backgroundColor: bgColor,
        quality: 1,
        pixelRatio,
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
      {isMobile && (
        <p className={styles.exportHint}>
          On iPhone, tap Save Image from the share menu to save your diagram.
        </p>
      )}
    </div>
  );
}
