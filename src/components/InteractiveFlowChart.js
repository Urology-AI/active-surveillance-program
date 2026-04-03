import React from 'react'

// Node definitions — positioned to mirror the actual Tewari AS flowchart
// SVG canvas: 540 wide × 750 tall
const NODES = {
  start:                    { x: 185, y: 20,  w: 170, h: 48,  label: '1st Positive Bx',           shape: 'diamond' },
  step1:                    { x: 165, y: 112, w: 210, h: 58,  label: 'Step 1\nPatient Intent / SDM' },
  end_refuse_defer:         { x: 416, y: 124, w: 112, h: 46,  label: 'Refuse/Defer\n3-6 mo F/U',   color: 'info' },
  step2:                    { x: 165, y: 220, w: 210, h: 58,  label: 'Step 2\nGleason Score' },
  step3:                    { x: 34,  y: 336, w: 148, h: 58,  label: 'Step 3\nRisk Stratification' },
  step4:                    { x: 358, y: 336, w: 148, h: 58,  label: 'Step 4\nMedical History' },
  end_definitive_treatment: { x: 358, y: 464, w: 148, h: 72,  label: 'Definitive\nTreatment',       color: 'warning' },
  step5:                    { x: 34,  y: 464, w: 148, h: 58,  label: 'Step 5\nSDM on AS' },
  end_active_surveillance:  { x: 34,  y: 582, w: 148, h: 60,  label: 'Active Surveillance\nInitiated', color: 'success' },
}

const CONNECTIONS = [
  { from: 'start',     to: 'step1' },
  { from: 'step1',     to: 'end_refuse_defer',          label: 'Refuse' },
  { from: 'step1',     to: 'step2',                     label: 'Proceed' },
  { from: 'step2',     to: 'step3',                     label: 'Gleason 7\n(3+4)' },
  { from: 'step2',     to: 'step4',                     label: 'Gleason 6\n(3+3)' },
  { from: 'step2',     to: 'end_definitive_treatment',  label: 'Gleason 7\n(4+3)+' },
  { from: 'step3',     to: 'step4',                     label: 'Favorable' },
  { from: 'step3',     to: 'end_definitive_treatment',  label: 'Unfavorable' },
  { from: 'step4',     to: 'end_definitive_treatment',  label: 'High Risk' },
  { from: 'step4',     to: 'step5',                     label: 'No High Risk' },
  { from: 'step5',     to: 'end_active_surveillance',   label: 'Agrees to AS' },
  { from: 'step5',     to: 'end_definitive_treatment',  label: 'Declines AS' },
]

function getNodeColors(colorHint, isCurrent, isVisited) {
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
  const tcx = to.x + to.w / 2
  const tcy = to.y + to.h / 2

  // Default: bottom of from → top of to
  let x1 = fcx, y1 = from.y + from.h
  let x2 = tcx, y2 = to.y

  // Overrides for non-vertical connections
  if (conn.from === 'step1' && conn.to === 'end_refuse_defer') {
    x1 = from.x + from.w; y1 = fcy
    x2 = to.x;            y2 = tcy
  }
  if (conn.from === 'step2' && conn.to === 'step3') {
    x1 = from.x + from.w * 0.22; y1 = from.y + from.h
  }
  if (conn.from === 'step2' && conn.to === 'step4') {
    x1 = from.x + from.w * 0.78; y1 = from.y + from.h
  }
  if (conn.from === 'step2' && conn.to === 'end_definitive_treatment') {
    x1 = from.x + from.w; y1 = fcy
    x2 = to.x + to.w / 2; y2 = to.y
  }
  if (conn.from === 'step3' && conn.to === 'step4') {
    x1 = from.x + from.w; y1 = fcy
    x2 = to.x;            y2 = tcy
  }
  if (conn.from === 'step3' && conn.to === 'end_definitive_treatment') {
    x1 = from.x + from.w; y1 = from.y + from.h
    x2 = to.x;            y2 = tcy
  }
  if (conn.from === 'step4' && conn.to === 'step5') {
    x1 = from.x;          y1 = fcy
    x2 = to.x + to.w;     y2 = tcy
  }
  if (conn.from === 'step5' && conn.to === 'end_definitive_treatment') {
    x1 = from.x + from.w; y1 = fcy
    x2 = to.x;            y2 = tcy
  }

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  return { x1, y1, x2, y2, mx, my }
}

function DrawConnection({ conn, stepHistory, currentStep }) {
  const pts = getConnectionPoints(conn)
  if (!pts) return null
  const { x1, y1, x2, y2, mx, my } = pts

  const active = isOnActivePath(conn.from, conn.to, stepHistory, currentStep)
  const color  = active ? '#06ABEB' : '#cbd5e1'
  const sw     = active ? 2.5 : 1
  const marker = active ? 'url(#arr-active)' : 'url(#arr-default)'

  const label = conn.label || ''
  const lines = label.split('\n')

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

function DrawNode({ nodeId, node, isCurrent, isVisited, onStepClick }) {
  const colors = getNodeColors(node.color, isCurrent, isVisited)
  const cx = node.x + node.w / 2
  const lines = node.label.split('\n')
  const lineH = 13
  const totalH = lines.length * lineH
  const startY = node.y + node.h / 2 - totalH / 2 + lineH * 0.6

  const handleClick = () => onStepClick && onStepClick(nodeId)

  if (node.shape === 'diamond') {
    const cx2 = node.x + node.w / 2
    const cy2 = node.y + node.h / 2
    const pts = `${cx2},${node.y} ${node.x + node.w},${cy2} ${cx2},${node.y + node.h} ${node.x},${cy2}`
    return React.createElement('g', { onClick: handleClick, style: { cursor: 'pointer' } },
      React.createElement('polygon', {
        points: pts,
        fill: isCurrent ? '#DC298D' : '#f9a8d4',
        stroke: isCurrent ? '#212070' : '#be185d',
        strokeWidth: isCurrent ? 3 : 1.5,
        className: 'transition-all duration-300 hover:opacity-80'
      }),
      lines.map((line, i) =>
        React.createElement('text', {
          key: i, x: cx2, y: startY + i * lineH,
          textAnchor: 'middle', dominantBaseline: 'middle',
          fontSize: 10, fontWeight: 'bold', fill: '#3b0764',
          className: 'pointer-events-none select-none'
        }, line)
      ),
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
    lines.map((line, i) =>
      React.createElement('text', {
        key: i, x: cx, y: startY + i * lineH,
        textAnchor: 'middle', dominantBaseline: 'middle',
        fontSize: 10, fontWeight: isCurrent ? 'bold' : 'normal', fill: colors.text,
        className: 'pointer-events-none select-none'
      }, line)
    ),
    isCurrent && React.createElement('circle', {
      cx: node.x + node.w - 8, cy: node.y + 8,
      r: 5, fill: '#212070', className: 'animate-pulse pointer-events-none'
    })
  )
}

export default function InteractiveFlowChart({ currentStep, stepHistory, onStepClick }) {
  return React.createElement('div', { className: 'w-full overflow-auto' },
    React.createElement('svg', {
      width: '540', height: '680',
      viewBox: '0 0 540 680',
      className: 'bg-white border border-slate-200 rounded-lg shadow-sm'
    },
      React.createElement('defs', null,
        React.createElement('marker', {
          id: 'arr-active', markerWidth: '8', markerHeight: '8',
          refX: '7', refY: '3', orient: 'auto'
        }, React.createElement('polygon', { points: '0 0, 8 3, 0 6', fill: '#06ABEB' })),
        React.createElement('marker', {
          id: 'arr-default', markerWidth: '8', markerHeight: '8',
          refX: '7', refY: '3', orient: 'auto'
        }, React.createElement('polygon', { points: '0 0, 8 3, 0 6', fill: '#cbd5e1' }))
      ),
      // Draw connections behind nodes
      CONNECTIONS.map((conn, i) =>
        React.createElement(DrawConnection, { key: i, conn, stepHistory, currentStep })
      ),
      // Draw nodes on top
      Object.entries(NODES).map(([nodeId, node]) =>
        React.createElement(DrawNode, {
          key: nodeId, nodeId, node,
          isCurrent: nodeId === currentStep,
          isVisited: stepHistory.includes(nodeId),
          onStepClick
        })
      ),
      // Caption
      React.createElement('text', {
        x: 270, y: 668, textAnchor: 'middle',
        fontSize: 8, fill: '#94a3b8', className: 'select-none'
      }, 'Tewari Active Surveillance Program · Mount Sinai')
    )
  )
}
