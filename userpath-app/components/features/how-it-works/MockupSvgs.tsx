'use client';

import * as React from 'react';

const svgStyles = `
@keyframes mFadeSlide { from { opacity: 0; } to { opacity: 1; } }
@keyframes mDash { to { stroke-dashoffset: 0; } }
@keyframes loop1 {
  0%   { opacity: 0; }
  4%   { opacity: 1; }
  82%  { opacity: 1; }
  88%  { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes loop2 {
  0%   { opacity: 0; }
  5%   { opacity: 1; }
  88%  { opacity: 1; }
  95%  { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes loop3 {
  0%   { opacity: 0; }
  5%   { opacity: 1; }
  88%  { opacity: 1; }
  95%  { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes cursor3 {
  0%   { opacity: 0; transform: translate(0, 0); }
  45%  { opacity: 0; transform: translate(0, 0); }
  48%  { opacity: 1; transform: translate(0, 0); }
  54%  { opacity: 1; transform: translate(-42px, -42px); }
  86%  { opacity: 1; transform: translate(-42px, -42px); }
  92%  { opacity: 0; transform: translate(-42px, -42px); }
  100% { opacity: 0; transform: translate(-42px, -42px); }
}
@keyframes dropdown3 {
  0%   { opacity: 0; }
  54%  { opacity: 0; }
  56%  { opacity: 1; }
  88%  { opacity: 1; }
  92%  { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes ripple3 {
  0%   { opacity: 0; r: 0; }
  54%  { opacity: 0; r: 0; }
  55%  { opacity: 0.4; r: 6; }
  58%  { opacity: 0; r: 14; }
  100% { opacity: 0; r: 14; }
}
@keyframes cursorBlink { 50% { opacity: 0; } }
@keyframes formFadeUp {
  0%   { opacity: 0; transform: translateY(6px); }
  8%   { opacity: 0; transform: translateY(6px); }
  20%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes drawEdge {
  from { stroke-dashoffset: 200; }
  to   { stroke-dashoffset: 0; }
}
@keyframes nodeIn {
  0%   { opacity: 0; transform: scale(0.8); }
  10%  { opacity: 1; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes glowPulse {
  0%, 100% { filter: drop-shadow(0 0 4px var(--color-primary)); }
  50%      { filter: drop-shadow(0 0 12px var(--color-primary)); }
}
@keyframes checkDraw {
  from { stroke-dashoffset: 20; }
  to   { stroke-dashoffset: 0; }
}
@keyframes drawEdge2 {
  from { stroke-dashoffset: 200; }
  to   { stroke-dashoffset: 0; }
}
@keyframes c0 {
  0%, 4% { opacity: 1; }
  4.1%, 100% { opacity: 0; }
}
@keyframes c12 {
  0%, 4% { opacity: 0; }
  4.1%, 10% { opacity: 1; }
  10.1%, 100% { opacity: 0; }
}
@keyframes c24 {
  0%, 10% { opacity: 0; }
  10.1%, 17% { opacity: 1; }
  17.1%, 100% { opacity: 0; }
}
@keyframes c36 {
  0%, 17% { opacity: 0; }
  17.1%, 24% { opacity: 1; }
  24.1%, 100% { opacity: 0; }
}
@keyframes c48 {
  0%, 24% { opacity: 0; }
  24.1%, 31% { opacity: 1; }
  31.1%, 100% { opacity: 0; }
}
@keyframes c60 {
  0%, 31% { opacity: 0; }
  31.1%, 38% { opacity: 1; }
  38.1%, 100% { opacity: 0; }
}
@keyframes c72 {
  0%, 38% { opacity: 0; }
  38.1%, 100% { opacity: 1; }
}

.stage1 { animation: loop1 4s ease infinite; }
.stage2 { animation: loop2 4s ease infinite; }
.stage3 { animation: loop3 4s ease infinite; }
.cursor3 { animation: cursor3 4s ease infinite; }
.dropdown3 { animation: dropdown3 4s ease infinite; }
.ripple3 { animation: ripple3 4s ease infinite; }

.cursor { animation: cursorBlink 0.6s step-end infinite; opacity: 0; }

.c0 { animation: c0 4s ease infinite; }
.c12 { animation: c12 4s ease infinite; }
.c24 { animation: c24 4s ease infinite; }
.c36 { animation: c36 4s ease infinite; }
.c48 { animation: c48 4s ease infinite; }
.c60 { animation: c60 4s ease infinite; }
.c72 { animation: c72 4s ease infinite; }

.fr1 { animation: formFadeUp 4s ease 0.5s infinite; }
.fr2 { animation: formFadeUp 4s ease 0.7s infinite; }
.fr3 { animation: formFadeUp 4s ease 0.9s infinite; }
.fr4 { animation: formFadeUp 4s ease 1.1s infinite; }
.fr5 { animation: formFadeUp 4s ease 1.3s infinite; }

.fr1 .check, .fr2 .check, .fr3 .check, .fr4 .check { animation: checkDraw 0.3s ease 2s forwards; stroke-dasharray: 20; stroke-dashoffset: 20; }

.n1 { animation: nodeIn 4s ease 0.3s infinite; }
.n2 { animation: nodeIn 4s ease 0.7s infinite; }
.n3 { animation: nodeIn 4s ease 1.1s infinite; }
.n4 { animation: nodeIn 4s ease 1.6s infinite; }
.n5 { animation: nodeIn 4s ease 2.1s infinite; }
.n6 { animation: nodeIn 4s ease 2.6s infinite; }

.eg1 { animation: drawEdge 0.6s ease 0.6s forwards; stroke-dasharray: 200; stroke-dashoffset: 200; }
.eg2 { animation: drawEdge 0.6s ease 1s forwards; stroke-dasharray: 200; stroke-dashoffset: 200; }
.eg3 { animation: drawEdge 0.6s ease 1.5s forwards; stroke-dasharray: 200; stroke-dashoffset: 200; }
.eg4 { animation: drawEdge 0.6s ease 2s forwards; stroke-dasharray: 200; stroke-dashoffset: 200; }
.eg5 { animation: drawEdge2 0.6s ease 2.5s forwards; stroke-dasharray: 200; stroke-dashoffset: 200; }


.glow-happy { animation: glowPulse 2s ease 2.5s infinite; }
`;

/* ── Browser frame ─────────────────────────────────────────────────────── */

function BrowserFrame({ children, width = 540, height = 380, label }: { children: React.ReactNode; width?: number; height?: number; label?: string }) {
  return (
    <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label}>
      <defs><style>{svgStyles}</style></defs>
      <rect x={0} y={0} width={width} height={height} rx={10} fill="var(--color-surface-container-lowest)" />
      <rect x={0} y={0} width={width} height={32} rx={10} fill="var(--color-surface-container)" />
      <rect x={0} y={20} width={width} height={12} fill="var(--color-surface-container)" />
      <circle cx={16} cy={16} r={5} fill="hsl(0, 100%, 72%)" />
      <circle cx={32} cy={16} r={5} fill="hsl(40, 100%, 70%)" />
      <circle cx={48} cy={16} r={5} fill="hsl(130, 60%, 65%)" />
      <rect x={width / 2 - 90} y={7} width={180} height={18} rx={9} fill="var(--color-surface-container-highest)" />
      <text x={width / 2} y={20} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="system-ui">UserPath.app</text>
      {children}
    </svg>
  );
}

/* ── Step 1: Generate page ──────────────────────────────────────────────── */

export function Step1Mockup() {
  return (
    <BrowserFrame width={600} height={600} label="Animated product description form with fields for product name, flow type, target user, and key action">
      {/* ── Static frame (always visible) ── */}
      <text x={30} y={56} fill="var(--color-on-background)" fontSize={20} fontFamily="system-ui" fontWeight={600}>
        Generate User-Flow
      </text>

      <rect x={30} y={76} width={540} height={500} rx={16} fill="var(--color-surface-container-high)" stroke="var(--color-outline)" strokeWidth={1} />

      <text x={62} y={108} fill="var(--color-on-background)" fontSize={14} fontFamily="system-ui" fontWeight={600}>
        Describe your product
      </text>

      <rect x={62} y={116} width={476} height={120} rx={4} fill="var(--color-surface-container-high)" stroke="var(--color-outline)" strokeWidth={1} />

      {/* ── Looping content (typing animation) ── */}
      <g className="stage1">
        <text x={74} y={142} fill="var(--color-on-surface-variant)" fontSize={14} fontFamily="system-ui" opacity={0.6}>
          I am designing a fintech app that helps users
        </text>
        <text x={74} y={164} fill="var(--color-on-surface-variant)" fontSize={14} fontFamily="system-ui" opacity={0.6}>
          save money automatically...
        </text>

        <clipPath id="tp">
          <rect x={0} y={0} width={0} height={200}>
            <animate attributeName="width" values="0;0;500;500;0;0" keyTimes="0;0.04;0.42;0.82;0.88;1" dur="4s" repeatCount="indefinite" />
          </rect>
        </clipPath>
        <g clipPath="url(#tp)">
          <text x={74} y={142} fill="var(--color-on-background)" fontSize={14} fontFamily="system-ui">
            I am designing a fintech app that helps users
          </text>
          <text x={74} y={164} fill="var(--color-on-background)" fontSize={14} fontFamily="system-ui">
            save money automatically...
          </text>
        </g>

        <rect x={256} y={159} width={2} height={16} fill="var(--color-primary)" className="cursor" />

        <g className="c0"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">0 / 500</text></g>
        <g className="c12"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">12 / 500</text></g>
        <g className="c24"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">24 / 500</text></g>
        <g className="c36"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">36 / 500</text></g>
        <g className="c48"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">48 / 500</text></g>
        <g className="c60"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">60 / 500</text></g>
        <g className="c72"><text x={530} y={228} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">72 / 500</text></g>
      </g>

      {/* ── Form fields (loop with stage1) ── */}
      <g className="stage1">
        <g className="fr1">
          <text x={62} y={270} fill="var(--color-on-surface-variant)" fontSize={14} fontFamily="system-ui" fontWeight={600}>Product Name</text>
          <rect x={62} y={278} width={230} height={38} rx={19} fill="var(--color-surface-container-high)" stroke="var(--color-outline)" strokeWidth={1} />
          <text x={74} y={303} fill="var(--color-on-background)" fontSize={14} fontFamily="system-ui">GoalSave</text>
        </g>

        <g className="fr2">
          <text x={308} y={270} fill="var(--color-on-surface-variant)" fontSize={14} fontFamily="system-ui" fontWeight={600}>Flow Type</text>
          <rect x={308} y={278} width={230} height={38} rx={19} fill="var(--color-surface-container-high)" stroke="var(--color-outline)" strokeWidth={1} />
          <text x={320} y={303} fill="var(--color-on-background)" fontSize={14} fontFamily="system-ui">Full Product Flow</text>
          <path d="M 514 293 L 520 301 L 526 293" stroke="var(--color-on-surface-variant)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        <g className="fr3">
          <text x={62} y={348} fill="var(--color-on-surface-variant)" fontSize={14} fontFamily="system-ui" fontWeight={600}>Target User</text>
          <text x={530} y={348} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">Select all that apply</text>
          <rect x={62} y={356} width={116} height={28} rx={14} fill="var(--color-primary)" />
          <text x={120} y={375} textAnchor="middle" fill="var(--color-on-primary)" fontSize={12} fontFamily="system-ui" fontWeight={500}>First-time User</text>
          <rect x={186} y={356} width={144} height={28} rx={14} fill="var(--color-primary)" />
          <text x={258} y={375} textAnchor="middle" fill="var(--color-on-primary)" fontSize={12} fontFamily="system-ui" fontWeight={500}>Returning Customer</text>
          <rect x={340} y={356} width={66} height={28} rx={14} fill="transparent" stroke="var(--color-outline)" strokeWidth={1} />
          <text x={373} y={375} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={12} fontFamily="system-ui">Admin</text>
        </g>

        <g className="fr4">
          <text x={62} y={416} fill="var(--color-on-surface-variant)" fontSize={14} fontFamily="system-ui" fontWeight={600}>Key Action</text>
          <rect x={62} y={424} width={476} height={38} rx={19} fill="var(--color-surface-container-high)" stroke="var(--color-outline)" strokeWidth={1} />
          <text x={74} y={449} fill="var(--color-on-background)" fontSize={14} fontFamily="system-ui">Set a savings goal, complete a purchase</text>
        </g>

        <g className="fr5">
          <rect x={62} y={490} width={476} height={44} rx={22} fill="var(--color-primary)" />
          <text x={300} y={518} textAnchor="middle" fill="var(--color-on-primary)" fontSize={14} fontFamily="system-ui" fontWeight={600}>
            Generate Flow
          </text>
        </g>
      </g>
    </BrowserFrame>
  );
}

/* ── Step 2: Flow diagram drawing itself ───────────────────────────────── */

export function Step2Mockup() {
  return (
    <BrowserFrame width={660} label="Animated user flow diagram with start, browse items, decision diamond, and view menu nodes connected by edges">
      <g className="stage2">
        {/* Title */}
        <text x={24} y={60} fill="var(--color-on-background)" fontSize={16} fontFamily="system-ui" fontWeight={600}>User Flow Diagram</text>

        {/* Action buttons */}
        <rect x={334} y={44} width={74} height={28} rx={14} fill="none" stroke="var(--color-outline)" strokeWidth={1} />
        <text x={371} y={63} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={11} fontFamily="system-ui" fontWeight={500}>✎ Edit</text>

        <rect x={416} y={44} width={86} height={28} rx={14} fill="none" stroke="var(--color-outline)" strokeWidth={1} />
        <text x={459} y={63} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={11} fontFamily="system-ui" fontWeight={500}>+ New Flow</text>

        <rect x={510} y={44} width={86} height={28} rx={14} fill="var(--color-primary)" />
        <text x={553} y={63} textAnchor="middle" fill="var(--color-on-primary)" fontSize={11} fontFamily="system-ui" fontWeight={600}>↓ Download</text>

        {/* Flow diagram nodes (tightened spacing) */}
        {/* Start pill */}
        <g className="n1">
          <rect x={20} y={144} width={80} height={36} rx={18} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
          <text x={60} y={167} textAnchor="middle" fill="var(--color-on-background)" fontSize={12} fontFamily="system-ui" fontWeight={600}>Start</text>
        </g>
        <line x1={100} y1={162} x2={115} y2={162} stroke="var(--color-primary)" strokeWidth={2} className="eg1" />

        {/* Opens App */}
        <g className="n2">
          <rect x={115} y={142} width={82} height={38} rx={6} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
          <text x={156} y={166} textAnchor="middle" fill="var(--color-on-background)" fontSize={12} fontFamily="system-ui">Opens App</text>
        </g>
        <line x1={197} y1={161} x2={212} y2={161} stroke="var(--color-primary)" strokeWidth={2} className="eg2" />

        {/* Browse Items */}
        <g className="n3">
          <rect x={212} y={142} width={82} height={38} rx={6} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
          <text x={253} y={166} textAnchor="middle" fill="var(--color-on-background)" fontSize={12} fontFamily="system-ui">Browse Items</text>
        </g>
        <line x1={294} y1={161} x2={334} y2={161} stroke="var(--color-primary)" strokeWidth={2} className="eg3" />

        {/* Available? diamond */}
        <g className="n4">
          <polygon points="334,161 362,133 390,161 362,189" fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
          <text x={362} y={165} textAnchor="middle" fill="var(--color-on-background)" fontSize={9} fontFamily="system-ui">Available?</text>
        </g>

        {/* Yes branch (happy) */}
        <path d="M 377 148 L 400 133 L 415 133" stroke="var(--color-primary)" strokeWidth={2} fill="none" className="eg4" />
        <text x={397} y={129} fill="var(--color-primary)" fontSize={9} fontWeight={700}>Yes</text>

        {/* View Menu (happy terminal) */}
        <g className="glow-happy">
          <g className="n5">
            <rect x={415} y={117} width={82} height={32} rx={16} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
            <text x={456} y={138} textAnchor="middle" fill="var(--color-primary)" fontSize={11} fontFamily="system-ui" fontWeight={600}>View Menu</text>
          </g>
        </g>

        {/* No branch (other) */}
        <path d="M 375 176 L 400 189 L 415 189" stroke="var(--color-outline)" strokeWidth={1.5} fill="none" className="eg5" />
        <text x={397} y={203} fill="var(--color-on-surface-variant)" fontSize={9}>No</text>

        {/* Show Error */}
        <g className="n6">
          <rect x={415} y={173} width={72} height={32} rx={6} fill="var(--color-surface-container)" stroke="var(--color-outline)" strokeWidth={1.5} />
          <text x={451} y={194} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="system-ui">Show Error</text>
        </g>
      </g>
    </BrowserFrame>
  );
}

/* ── Step 3: Flow with download feature ────────────────────────────────── */

export function Step3Mockup() {
  return (
    <BrowserFrame width={640} height={420} label="User flow diagram with download button dropdown menu showing flow diagram and user journey export options">
      <g className="stage3">
        {/* Title */}
        <text x={24} y={60} fill="var(--color-on-background)" fontSize={16} fontFamily="system-ui" fontWeight={600}>User Flow Diagram</text>

        {/* Edit button */}
        <rect x={310} y={44} width={74} height={28} rx={14} fill="none" stroke="var(--color-outline)" strokeWidth={1} />
        <text x={347} y={63} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={11} fontFamily="system-ui" fontWeight={500}>✎ Edit</text>

        {/* New Flow button */}
        <rect x={392} y={44} width={86} height={28} rx={14} fill="none" stroke="var(--color-outline)" strokeWidth={1} />
        <text x={435} y={63} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={11} fontFamily="system-ui" fontWeight={500}>+ New Flow</text>

        {/* Download split button (matches product ExportButton) */}
        <rect x={486} y={44} width={94} height={28} rx={14} fill="var(--color-primary)" />
        <rect x={486} y={44} width={68} height={28} rx={14} fill="var(--color-primary)" />
        <text x={520} y={63} textAnchor="middle" fill="var(--color-on-primary)" fontSize={11} fontFamily="system-ui" fontWeight={600}>Download</text>

        {/* Chevron divider line */}
        <line x1={554} y1={48} x2={554} y2={68} stroke="color-mix(in srgb, #fff 30%, transparent)" strokeWidth={1} />

        {/* Chevron button */}
        <path d="M 564 55 L 568 61 L 572 55" stroke="var(--color-on-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* Click ripple on chevron */}
        <circle cx={568} cy={58} r={0} fill="var(--color-primary)" className="ripple3" />

        {/* Cursor pointer */}
        <g className="cursor3">
          <path d="M 610 100 L 610 118 L 616 113 L 622 122 L 625 120 L 619 111 L 628 111 Z" fill="#fff" stroke="#222" strokeWidth={1.5} strokeLinejoin="round" />
        </g>

        {/* Flow diagram (pre-drawn, full opacity) */}
        <rect x={24} y={160} width={592} height={130} rx={8} fill="var(--color-surface-container-low)" stroke="var(--color-outline-variant)" strokeWidth={1} />

        {/* Start */}
        <rect x={40} y={196} width={70} height={30} rx={15} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
        <text x={75} y={216} textAnchor="middle" fill="var(--color-on-background)" fontSize={11} fontWeight={600}>Start</text>
        <line x1={110} y1={211} x2={130} y2={211} stroke="var(--color-primary)" strokeWidth={2} />

        {/* Opens App */}
        <rect x={130} y={194} width={78} height={34} rx={4} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
        <text x={169} y={215} textAnchor="middle" fill="var(--color-on-background)" fontSize={11}>Opens App</text>
        <line x1={208} y1={211} x2={228} y2={211} stroke="var(--color-primary)" strokeWidth={2} />

        {/* Browse */}
        <rect x={228} y={194} width={78} height={34} rx={4} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
        <text x={267} y={215} textAnchor="middle" fill="var(--color-on-background)" fontSize={11}>Browse Items</text>
        <line x1={306} y1={211} x2={356} y2={211} stroke="var(--color-primary)" strokeWidth={2} />

        {/* Diamond: Available? */}
        <polygon points="356,211 380,187 404,211 380,235" fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
        <text x={380} y={215} textAnchor="middle" fill="var(--color-on-background)" fontSize={9}>Available?</text>

        {/* Yes branch */}
        <path d="M 393 200 L 412 186 L 434 186" stroke="var(--color-primary)" strokeWidth={2} fill="none" />
        <text x={410} y={182} fill="var(--color-primary)" fontSize={9} fontWeight={700}>Yes</text>
        <rect x={434} y={172} width={82} height={28} rx={14} fill="var(--color-surface-container)" stroke="var(--color-primary)" strokeWidth={2} />
        <text x={475} y={191} textAnchor="middle" fill="var(--color-primary)" fontSize={11} fontWeight={600}>View Menu</text>

        {/* No branch */}
        <path d="M 391 224 L 412 236 L 434 236" stroke="var(--color-outline)" strokeWidth={1.5} fill="none" />
        <text x={410} y={250} fill="var(--color-on-surface-variant)" fontSize={9}>No</text>
        <rect x={434} y={222} width={70} height={28} rx={14} fill="var(--color-surface-container)" stroke="var(--color-outline)" strokeWidth={1.5} />
        <text x={469} y={241} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={10}>Show Error</text>

        {/* Download dropdown (on top of flow diagram) */}
        <g className="dropdown3">
          <rect x={360} y={78} width={224} height={108} rx={10} fill="var(--color-surface-container)" stroke="var(--color-surface-container-high)" strokeWidth={1} />

          <rect x={366} y={84} width={212} height={42} rx={6} fill="transparent" />
          <rect x={374} y={92} width={22} height={22} rx={4} fill="color-mix(in srgb, var(--color-primary) 15%, transparent)" />
          <rect x={378} y={96} width={14} height={14} rx={2} stroke="var(--color-primary)" strokeWidth={1.5} fill="none" />
          <circle cx={387} cy={101} r={2} fill="var(--color-primary)" />
          <path d="M 378 108 L 383 103 L 388 108 L 392 104" stroke="var(--color-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x={404} y={100} fill="var(--color-on-background)" fontSize={12} fontFamily="system-ui" fontWeight={500}>Download Flow Diagram</text>
          <text x={404} y={116} fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="system-ui">Exports the visual flow as PNG</text>

          <rect x={366} y={130} width={212} height={42} rx={6} fill="transparent" />
          <rect x={374} y={138} width={22} height={22} rx={4} fill="color-mix(in srgb, var(--color-primary) 15%, transparent)" />
          <line x1={380} y1={142} x2={390} y2={142} stroke="var(--color-primary)" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={380} y1={146} x2={390} y2={146} stroke="var(--color-primary)" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={380} y1={150} x2={390} y2={150} stroke="var(--color-primary)" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={380} y1={154} x2={390} y2={154} stroke="var(--color-primary)" strokeWidth={1.5} strokeLinecap="round" />
          <text x={404} y={146} fill="var(--color-on-background)" fontSize={12} fontFamily="system-ui" fontWeight={500}>Download User Journey</text>
          <text x={404} y={162} fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="system-ui">Exports the step-by-step table as PNG</text>
        </g>
      </g>
    </BrowserFrame>
  );
}
