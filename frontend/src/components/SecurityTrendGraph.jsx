import React, { useState } from 'react';
import { TrendingUp, ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function SecurityTrendGraph({ trend = [92, 88, 95, 84, 84] }) {
  const [hoveredIdx, setHoveredIdx] = useState(trend.length - 1); // default to today (last index)

  const scores = trend && trend.length >= 2 ? trend : [92, 88, 95, 84, 84];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri (Today)'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday (Today)'];

  // Dimensions & bounds
  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 52;
  const padRight = 32;
  const padTop = 30;
  const padBottom = 45;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;
  const chartBottomY = padTop + chartHeight;

  // Scale: 60% to 100%
  const minScore = 60;
  const maxScore = 100;

  const getY = (val) => {
    const clamped = Math.max(minScore, Math.min(maxScore, val));
    return padTop + ((maxScore - clamped) / (maxScore - minScore)) * chartHeight;
  };

  const getX = (idx) => {
    return padLeft + (idx / (scores.length - 1)) * chartWidth;
  };

  // Generate coordinates for data points
  const points = scores.map((s, idx) => ({
    x: getX(idx),
    y: getY(s),
    score: s,
    day: dayLabels[idx] || `Day ${idx + 1}`,
    fullDay: fullDayNames[idx] || `Day ${idx + 1}`
  }));

  // Cubic Bezier Spline generation for organic, realistic graph curve
  const getSplinePath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const pPrev = i > 0 ? pts[i - 1] : pts[i];
      const pCurr = pts[i];
      const pNext = pts[i + 1];
      const pNextNext = i < pts.length - 2 ? pts[i + 2] : pNext;

      const tension = 0.22;
      const cp1x = pCurr.x + (pNext.x - pPrev.x) * tension;
      const cp1y = pCurr.y + (pNext.y - pPrev.y) * tension;
      const cp2x = pNext.x - (pNextNext.x - pCurr.x) * tension;
      const cp2y = pNext.y - (pNextNext.y - pCurr.y) * tension;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pNext.x.toFixed(1)},${pNext.y.toFixed(1)}`;
    }
    return d;
  };

  const linePath = getSplinePath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x},${chartBottomY} L ${points[0].x},${chartBottomY} Z`
    : '';

  // Stats
  const currentScore = scores[scores.length - 1];
  const peakScore = Math.max(...scores);
  const peakIndex = scores.indexOf(peakScore);
  const minObserved = Math.min(...scores);
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const weeklyDelta = currentScore - scores[0];

  const activePoint = points[hoveredIdx !== null ? hoveredIdx : points.length - 1];
  const baselineY = getY(80);

  // Status helper
  const getScoreStatus = (val) => {
    if (val >= 90) return { label: 'Optimal Posture', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
    if (val >= 80) return { label: 'Guarded Posture', color: '#00f5ff', bg: 'rgba(0, 245, 255, 0.15)', border: 'rgba(0, 245, 255, 0.35)' };
    return { label: 'Elevated Risk', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' };
  };

  const activeStatus = getScoreStatus(activePoint.score);

  return (
    <div className="zt-card zt-trend-graph-card" style={{
      background: 'linear-gradient(180deg, rgba(13, 27, 62, 0.7) 0%, rgba(3, 9, 30, 0.85) 100%)',
      border: '1px solid rgba(0, 245, 255, 0.25)',
      borderRadius: '12px',
      padding: '1.25rem 1.25rem 1rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 245, 255, 0.06)',
      position: 'relative'
    }}>
      {/* Header telemetry and stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <TrendingUp size={20} color="#00f5ff" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9', letterSpacing: '0.3px' }}>
              Corporate Security Score Trend
            </span>
            <span style={{
              fontSize: '0.68rem',
              color: '#00f5ff',
              background: 'rgba(0, 245, 255, 0.12)',
              border: '1px solid rgba(0, 245, 255, 0.3)',
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Weekly Analytics
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Continuous machine learning evaluation across 11 behavioural threat vectors
          </div>
        </div>

        {/* Quick KPI badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="zt-kpi-pill" style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px 12px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>7-Day Mean</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{avgScore}%</div>
          </div>

          <div className="zt-kpi-pill" style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px 12px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Peak Score</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>{peakScore}% <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>({dayLabels[peakIndex]})</span></div>
          </div>

          <div style={{
            background: activeStatus.bg,
            border: `1px solid ${activeStatus.border}`,
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <div style={{ fontSize: '0.66rem', color: activeStatus.color, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeStatus.color }}></span>
              Current Posture
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: activeStatus.color }}>
              {currentScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Realistic Interactive SVG Chart */}
      <div style={{ width: '100%', position: 'relative', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '480px', display: 'block' }}
        >
          <defs>
            {/* Area gradient under the trend line */}
            <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#0050b3" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#001433" stopOpacity="0.0" />
            </linearGradient>

            {/* Line stroke gradient */}
            <linearGradient id="scoreLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#00f5ff" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Neon bloom filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background grid lines & Y-axis scale */}
          {[100, 90, 80, 70, 60].map((level) => {
            const yPos = getY(level);
            const isBaseline = level === 80;
            return (
              <g key={level}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={svgWidth - padRight}
                  y2={yPos}
                  stroke={isBaseline ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.06)'}
                  strokeDasharray={isBaseline ? '5 4' : 'none'}
                  strokeWidth={isBaseline ? '1.2' : '1'}
                />
                <text
                  className={`chart-axis-level ${isBaseline ? 'baseline' : ''}`}
                  x={padLeft - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  fill={isBaseline ? '#f59e0b' : '#64748b'}
                  fontSize="11"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={isBaseline ? '600' : '400'}
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Baseline compliance label on right edge */}
          <text
            className="chart-baseline-text"
            x={svgWidth - padRight}
            y={baselineY - 6}
            textAnchor="end"
            fill="#f59e0b"
            fontSize="10"
            fontFamily="'Outfit', sans-serif"
            fontWeight="500"
            opacity="0.85"
          >
            ── SOC2 Baseline Threshold (80%)
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill="url(#scoreAreaGrad)" />

          {/* Main Curved Spline Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#scoreLineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />

          {/* Active hover guideline */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={chartBottomY}
              stroke="rgba(0, 245, 255, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points and Interactivity */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            const isToday = idx === points.length - 1;

            return (
              <g
                key={idx}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
              >
                {/* Invisible hover capture column */}
                <rect
                  x={p.x - 28}
                  y={padTop}
                  width="56"
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Pulsing ring for today's node */}
                {isToday && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? '14' : '10'}
                    fill="none"
                    stroke="#00f5ff"
                    strokeWidth="1.5"
                    opacity="0.4"
                  >
                    <animate
                      attributeName="r"
                      values="8;16;8"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.1;0.6"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Outer halo */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? '9' : '6'}
                  fill="rgba(0, 245, 255, 0.25)"
                />

                {/* Main node point */}
                <circle
                  className={`chart-node-point ${isHovered ? 'hovered' : ''}`}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? '5.5' : '4.5'}
                  fill="#03091e"
                  stroke={isHovered ? '#ffffff' : '#00f5ff'}
                  strokeWidth="2.5"
                />

                {/* Score badge above node */}
                <g transform={`translate(${p.x}, ${p.y - 14})`}>
                  <rect
                    className={`chart-score-badge-bg ${isHovered ? 'hovered' : ''}`}
                    x="-18"
                    y="-16"
                    width="36"
                    height="18"
                    rx="4"
                    fill={isHovered ? '#00f5ff' : 'rgba(3, 9, 30, 0.88)'}
                    stroke={isHovered ? '#ffffff' : 'rgba(0, 245, 255, 0.3)'}
                    strokeWidth="1"
                  />
                  <text
                    className={`chart-score-badge-text ${isHovered ? 'hovered' : ''}`}
                    x="0"
                    y="-4"
                    textAnchor="middle"
                    fill={isHovered ? '#020617' : '#00f5ff'}
                    fontSize="11"
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight="700"
                  >
                    {p.score}%
                  </text>
                </g>

                {/* X-axis Day labels */}
                <text
                  className={`chart-day-label ${isHovered ? 'hovered' : ''} ${isToday ? 'today' : ''}`}
                  x={p.x}
                  y={chartBottomY + 22}
                  textAnchor="middle"
                  fill={isToday ? '#00f5ff' : isHovered ? '#f1f5f9' : '#64748b'}
                  fontSize="12"
                  fontFamily="'Outfit', sans-serif"
                  fontWeight={isToday || isHovered ? '700' : '500'}
                >
                  {p.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Cyber Telemetry Info Pill for Active/Hovered Point */}
        {activePoint && (
          <div className="zt-telemetry-pill" style={{
            marginTop: '0.4rem',
            background: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${activeStatus.border}`,
            borderRadius: '8px',
            padding: '0.6rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={16} color="#00f5ff" />
              <div>
                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.85rem' }}>
                  {activePoint.fullDay}:
                </span>{' '}
                <span style={{ color: activeStatus.color, fontWeight: 700, fontSize: '0.85rem' }}>
                  {activePoint.score}% Security Score
                </span>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: activeStatus.bg,
                  color: activeStatus.color,
                  border: `1px solid ${activeStatus.border}`,
                  fontWeight: 600
                }}>
                  {activeStatus.label}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>
                Day Trend:{' '}
                {hoveredIdx > 0 ? (
                  scores[hoveredIdx] >= scores[hoveredIdx - 1] ? (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      +{scores[hoveredIdx] - scores[hoveredIdx - 1]}% vs previous day
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {scores[hoveredIdx] - scores[hoveredIdx - 1]}% vs previous day
                    </span>
                  )
                ) : (
                  <span style={{ color: '#94a3b8' }}>Baseline start of week</span>
                )}
              </span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ color: activePoint.score >= 80 ? '#10b981' : '#f59e0b' }}>
                {activePoint.score >= 80 ? '✓ Above Baseline' : '⚠ Action Required'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
