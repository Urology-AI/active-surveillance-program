import React from 'react'

// ─── NODES ───────────────────────────────────────────────────────────────────
// SVG canvas: 540 wide × 2100 tall
const NODES = {
  // ── PART 1 ──
  start:                    { x: 185, y: 20,   w: 170, h: 48,  label: '1st Positive Bx',            shape: 'diamond' },
  step1:                    { x: 165, y: 112,  w: 210, h: 58,  label: 'Step 1\nPatient Intent / SDM' },
  end_refuse_defer:         { x: 416, y: 124,  w: 112, h: 46,  label: 'Refuse/Defer\n3-6 mo F/U',    color: 'info' },
  step2:                    { x: 165, y: 220,  w: 210, h: 58,  label: 'Step 2\nGleason Score' },
  step3:                    { x: 34,  y: 336,  w: 148, h: 58,  label: 'Step 3\nRisk Stratification' },
  step4:                    { x: 358, y: 336,  w: 148, h: 58,  label: 'Step 4\nMedical History' },
  end_definitive_treatment: { x: 358, y: 454,  w: 148, h: 60,  label: 'Definitive\nTreatment',        color: 'warning' },
  step5:                    { x: 34,  y: 454,  w: 148, h: 58,  label: 'Step 5\nSDM on AS' },
  end_active_surveillance:  { x: 34,  y: 572,  w: 148, h: 58,  label: 'AS Initiated\n→ Part 2',        color: 'success' },

  // ── PART 2 ──
  step6:                    { x: 165, y: 690,  w: 210, h: 58,  label: 'Step 6\nLife Expectancy > 10y?' },
  end_watchful_waiting:     { x: 404, y: 698,  w: 124, h: 50,  label: 'Watchful\nWaiting',             color: 'warning' },
  step7:                    { x: 165, y: 808,  w: 210, h: 68,  label: 'Step 7\nProvider Actions\n(Confirmatory Bx + Genomics)' },
  step8:                    { x: 165, y: 936,  w: 210, h: 58,  label: 'Step 8\nTR Confirmatory Bx' },
  end_definitive_p2:        { x: 404, y: 944,  w: 124, h: 50,  label: '→ Definitive\nTreatment',        color: 'warning' },
  step9:                    { x: 165, y: 1054, w: 210, h: 58,  label: 'Step 9\nConcerning Features?' },
  end_high_intensity_as:    { x: 404, y: 1054, w: 124, h: 68,  label: 'High Intensity\nAS Protocol\n+ Poly-ICLC?', color: 'info' },
  end_standard_as:          { x: 165, y: 1182, w: 210, h: 60,  label: 'Enrolled in AS\n→ Part 3',        color: 'success' },

  // ── PART 3 ──
  step10:                   { x: 165, y: 1310, w: 210, h: 58,  label: 'Step 10\nUroflow + PVR Check' },
  step11:                   { x: 165, y: 1428, w: 210, h: 68,  label: 'Step 11\nInitiate AS Protocol\n(Quarterly/Annual)' },
  step12:                   { x: 34,  y: 1556, w: 148, h: 58,  label: 'Step 12\nPSMA Assessment\n(No MRI)' },
  step13:                   { x: 358, y: 1556, w: 148, h: 58,  label: 'Step 13\nNew Positive\nFindings?' },
  step14:                   { x: 358, y: 1674, w: 148, h: 58,  label: 'Step 14\nEarly Bx Results' },
  end_continue_as:          { x: 165, y: 1792, w: 210, h: 60,  label: 'Continue on\nActive Surveillance', color: 'success' },
  end_definitive_p3:        { x: 358, y: 1792, w: 148, h: 50,  label: '→ Definitive\nTreatment',          color: 'warning' },
}

// ─── CONNECTIONS ─────────────────────────────────────────────────────────────
const CONNECTIONS = [
  // Part 1
  { from: 'start',                    to: 'step1' },
  { from: 'step1',                    to: 'end_refuse_defer',         label: 'Refuse' },
  { from: 'step1',                    to: 'step2',                    label: 'Proceed' },
  { from: 'step2',                    to: 'step3',                    label: 'Gleason 7\n(3+4)' },
  { from: 'step2',                    to: 'step4',                    label: 'Gleason 6\n(3+3)' },
  { from: 'step2',                    to: 'end_definitive_treatment', label: 'Gleason 7\n(4+3)+' },
  { from: 'step3',                    to: 'step4',                    label: 'Favorable' },
  { from: 'step3',                    to: 'end_definitive_treatment', label: 'Unfavorable' },
  { from: 'step4',                    to: 'end_definitive_treatment', label: 'High Risk' },
  { from: 'step4',                    to: 'step5',                    label: 'No High Risk' },
  { from: 'step5',                    to: 'end_active_surveillance',  label: 'Agrees to AS' },
  { from: 'step5',                    to: 'end_definitive_treatment', label: 'Declines AS' },
  // Part 1 → Part 2 bridge
  { from: 'end_active_surveillance',  to: 'step6',                    label: 'Continue\nPart 2' },
  // Part 2
  { from: 'step6',                    to: 'end_watchful_waiting',     label: 'No (≤10y)' },
  { from: 'step6',                    to: 'step7',                    label: 'Yes (>10y)' },
  { from: 'step7',                    to: 'step8',                    label: 'Confirmed' },
  { from: 'step8',                    to: 'end_definitive_p2',        label: 'Gleason 7\n(3+4)+' },
  { from: 'step8',                    to: 'step9',                    label: 'Neg / G6' },
  { from: 'step9',                    to: 'end_high_intensity_as',    label: 'Yes' },
  { from: 'step9',                    to: 'end_standard_as',          label: 'No concerns' },
  // Part 2 → Part 3 bridge
  { from: 'end_standard_as',          to: 'step10',                   label: 'Continue\nPart 3' },
  // Part 3
  { from: 'step10',                   to: 'step11',                   label: 'Proceed' },
  { from: 'step11',                   to: 'step12',                   label: 'No MRI' },
  { from: 'step11',                   to: 'step13',                   label: 'MRI OK' },
  { from: 'step12',                   to: 'end_continue_as',          label: 'PSMA done' },
  { from: 'step13',                   to: 'end_continue_as',          label: 'No findings' },
  { from: 'step13',                   to: 'step14',                   label: 'Yes' },
  { from: 'step14',                   to: 'end_continue_as',          label: 'Gleason 6' },
  { from: 'step14',                   to: 'end_definitive_p3',        label: '≥ G7' },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getColors(colorHint, isCurrent, isVisited) {
  if (isCurrent)  return { fill: '#06ABEB', stroke: '#212070', text: '#ffffff', sw: 3 }
  if (isVisited)  return { fill: '#059669', stroke: '#047857', text: '#ffffff', sw: 2 }
  switch (colorHint) {
    case 'success': return { fill: '#d1fae5', stroke: '#6ee7b7', text: '#065f46', sw: 1.5 }
    case 'warning': return { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e', sw: 1.5 }
    case 'info':    return { fill: '#e0f2fe', stroke: '#7dd3fc', text: '#0c4a6e', sw: 1.5 }
    default:        return { fill: '#f1f5f9', stroke: '#94a3b8', text: '#334155', sw: 1.5 }
  }
}

function isOnActivePath(fromId, toId, stepHistory, currentStep) {
  const path = [...stepHistory, currentStep]
  const fi = path.indexOf(fromId)
  const ti = path.indexOf(toId)
  return fi !== -1 && ti !== -1 && ti === fi + 1
}

function getConnectionPoints(conn) {
  const from = NODES[conn.from]
  const to   = NODES[conn.to]
  if (!from || !to) return null

  const fcx = from.x + from.w / 2
  const fcy = from.y + from.h / 2
  const tcx = to.x   + to.w   / 2
  const tcy = to.y   + to.h   / 2

  // default: bottom → top
  let x1 = fcx, y1 = from.y + from.h
  let x2 = tcx, y2 = to.y

  // Overrides
  if (conn.from === 'step1'                   && conn.to === 'end_refuse_defer')         { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }
  if (conn.from === 'step2'                   && conn.to === 'step3')                    { x1 = from.x + from.w * 0.22; y1 = from.y + from.h }
  if (conn.from === 'step2'                   && conn.to === 'step4')                    { x1 = from.x + from.w * 0.78; y1 = from.y + from.h }
  if (conn.from === 'step2'                   && conn.to === 'end_definitive_treatment') { x1 = from.x + from.w; y1 = fcy;            x2 = tcx;             y2 = to.y }
  if (conn.from === 'step3'                   && conn.to === 'step4')                    { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }
  if (conn.from === 'step3'                   && conn.to === 'end_definitive_treatment') { x1 = from.x + from.w; y1 = from.y + from.h; x2 = to.x;           y2 = tcy }
  if (conn.from === 'step4'                   && conn.to === 'step5')                    { x1 = from.x;          y1 = fcy;            x2 = to.x + to.w;     y2 = tcy }
  if (conn.from === 'step5'                   && conn.to === 'end_definitive_treatment') { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }
  // Part 2
  if (conn.from === 'step6'                   && conn.to === 'end_watchful_waiting')     { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }
  if (conn.from === 'step8'                   && conn.to === 'end_definitive_p2')        { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }
  if (conn.from === 'step9'                   && conn.to === 'end_high_intensity_as')    { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }
  // Part 3
  if (conn.from === 'step11'                  && conn.to === 'step12')                  { x1 = from.x + from.w * 0.22; y1 = from.y + from.h }
  if (conn.from === 'step11'                  && conn.to === 'step13')                  { x1 = from.x + from.w * 0.78; y1 = from.y + from.h }
  if (conn.from === 'step14'                  && conn.to === 'end_definitive_p3')       { x1 = from.x + from.w; y1 = fcy;            x2 = to.x;            y2 = tcy }

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return { x1, y1, x2, y2, mx, my }
}

// ─── DRAW CONNECTION ──────────────────────────────────────────────────────────
function DrawConnection({ conn, stepHistory, currentStep }) {
  const pts = getConnectionPoints(conn)
  if (!pts) return null
  const { x1, y1, x2, y2, mx, my } = pts

  // For the Part1→Part2 bridge, treat end_active_surveillance → step6
  // as "active" if both are in the path (even non-adjacent)
  let active = isOnActivePath(conn.from, conn.to, stepHistory, currentStep)
  if (conn.from === 'end_active_surveillance' && conn.to === 'step6') {
    const path = [...stepHistory, currentStep]
    active = path.includes('end_active_surveillance') && path.includes('step6')
  }

  const color  = active ? '#06ABEB' : '#cbd5e1'
  const sw     = active ? 2.5 : 1
  const marker = active ? 'url(#arr-active)' : 'url(#arr-default)'
  const label  = conn.label || ''
  const lines  = label.split('\n')

  return React.createElement('g', null,
    React.createElement('path', {
      d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,
      stroke: color, strokeWidth: sw, fill: 'none',
      markerEnd: marker,
      className: 'transition-all duration-300'
    }),
    label && React.createElement('text', {
      x: mx, y: my - 3,
      textAnchor: 'middle', fontSize: 9,
      fill: active ? '#0369a1' : '#94a3b8',
      fontWeight: active ? 'bold' : 'normal',
      className: 'pointer-events-none select-none'
    },
      lines.map((line, i) =>
        React.createElement('tspan', { key: i, x: mx, dy: i === 0 ? 0 : 11 }, line)
      )
    )
  )
}

// ─── DRAW NODE ────────────────────────────────────────────────────────────────
function DrawNode({ nodeId, node, isCurrent, isVisited, onStepClick }) {
  const colors = getColors(node.color, isCurrent, isVisited)
  const cx = node.x + node.w / 2
  const lines = node.label.split('\n')
  const lineH = 13
  const totalH = lines.length * lineH
  const startY = node.y + node.h / 2 - totalH / 2 + lineH * 0.6
  const handleClick = () => onStepClick && onStepClick(nodeId)

  if (node.shape === 'diamond') {
    const cx2 = node.x + node.w / 2, cy2 = node.y + node.h / 2
    const pts = `${cx2},${node.y} ${node.x + node.w},${cy2} ${cx2},${node.y + node.h} ${node.x},${cy2}`
    return React.createElement('g', { onClick: handleClick, style: { cursor: 'pointer' } },
      React.createElement('polygon', {
        points: pts,
        fill: isCurrent ? '#DC298D' : '#f9a8d4',
        stroke: isCurrent ? '#212070' : '#be185d',
        strokeWidth: isCurrent ? 3 : 1.5,
        className: 'transition-all duration-300 hover:opacity-80'
      }),
      lines.map((line, i) => React.createElement('text', {
        key: i, x: cx2, y: startY + i * lineH,
        textAnchor: 'middle', dominantBaseline: 'middle',
        fontSize: 10, fontWeight: 'bold', fill: '#3b0764',
        className: 'pointer-events-none select-none'
      }, line)),
      isCurrent && React.createElement('circle', {
        cx: node.x + node.w - 8, cy: node.y + 8,
        r: 5, fill: '#212070', className: 'animate-pulse pointer-events-none'
      })
    )
  }

  return React.createElement('g', { onClick: handleClick, style: { cursor: 'pointer' } },
    React.createElement('rect', {
      x: node.x, y: node.y, width: node.w, height: node.h,
      rx: 8, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.sw,
      className: 'transition-all duration-300 hover:opacity-80'
    }),
    lines.map((line, i) => React.createElement('text', {
      key: i, x: cx, y: startY + i * lineH,
      textAnchor: 'middle', dominantBaseline: 'middle',
      fontSize: 10, fontWeight: isCurrent ? 'bold' : 'normal', fill: colors.text,
      className: 'pointer-events-none select-none'
    }, line)),
    isCurrent && React.createElement('circle', {
      cx: node.x + node.w - 8, cy: node.y + 8,
      r: 5, fill: '#212070', className: 'animate-pulse pointer-events-none'
    })
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function InteractiveFlowChart({ currentStep, stepHistory, onStepClick, scale = 1 }) {
  const svgW = Math.round(540 * scale)
  const svgH = Math.round(1900 * scale)
  return React.createElement('div', { className: 'w-full overflow-auto' },
    React.createElement('svg', {
      width: svgW, height: svgH,
      viewBox: '0 0 540 1900',
      className: 'bg-white border border-slate-200 rounded-lg shadow-sm'
    },
      // Markers
      React.createElement('defs', null,
        React.createElement('marker', { id: 'arr-active',  markerWidth: '8', markerHeight: '8', refX: '7', refY: '3', orient: 'auto' },
          React.createElement('polygon', { points: '0 0, 8 3, 0 6', fill: '#06ABEB' })),
        React.createElement('marker', { id: 'arr-default', markerWidth: '8', markerHeight: '8', refX: '7', refY: '3', orient: 'auto' },
          React.createElement('polygon', { points: '0 0, 8 3, 0 6', fill: '#cbd5e1' }))
      ),
      // Part labels
      React.createElement('text', { x: 270, y: 16, textAnchor: 'middle', fontSize: 9, fontWeight: 'bold', fill: '#212070', className: 'select-none' },
        'PART 1 — Initial Risk Stratification'
      ),
      React.createElement('line', { x1: 20, y1: 658, x2: 520, y2: 658, stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 3' }),
      React.createElement('text', { x: 270, y: 672, textAnchor: 'middle', fontSize: 9, fontWeight: 'bold', fill: '#DC298D', className: 'select-none' },
        'PART 2 — Pre-Enrollment Verification'
      ),
      React.createElement('line', { x1: 20, y1: 1290, x2: 520, y2: 1290, stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 3' }),
      React.createElement('text', { x: 270, y: 1304, textAnchor: 'middle', fontSize: 9, fontWeight: 'bold', fill: '#059669', className: 'select-none' },
        'PART 3 — Standard Protocol'
      ),
      // Connections behind nodes
      CONNECTIONS.map((conn, i) =>
        React.createElement(DrawConnection, { key: i, conn, stepHistory, currentStep })
      ),
      // Nodes on top
      Object.entries(NODES).map(([nodeId, node]) =>
        React.createElement(DrawNode, {
          key: nodeId, nodeId, node,
          isCurrent: nodeId === currentStep,
          isVisited: stepHistory.includes(nodeId),
          onStepClick
        })
      ),
      // Footer
      React.createElement('text', {
        x: 270, y: 1890, textAnchor: 'middle',
        fontSize: 8, fill: '#94a3b8', className: 'select-none'
      }, 'Tewari Active Surveillance Program · Mount Sinai · Last Updated 2/28/25')
    )
  )
}
