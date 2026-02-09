import React from 'react'

export default function InteractiveFlowChart({ currentStep, stepHistory, onStepClick }) {
  const steps = {
    'start': { x: 200, y: 30, label: 'Start', width: 140, height: 50 },
    'step1': { x: 200, y: 120, label: 'Step 1:\nPatient Intent', width: 140, height: 60 },
    'step2': { x: 200, y: 230, label: 'Step 2:\nGleason Score', width: 140, height: 60 },
    'step3': { x: 80, y: 350, label: 'Step 3:\nRisk Stratification', width: 140, height: 60 },
    'step4': { x: 320, y: 350, label: 'Step 4:\nMedical History', width: 140, height: 60 },
    'end_refuse_defer': { x: 50, y: 200, label: 'Refuse/Defer', width: 100, height: 50 },
    'end_active_surveillance': { x: 320, y: 460, label: 'Active\nSurveillance', width: 140, height: 60 },
    'end_definitive_treatment': { x: 80, y: 460, label: 'Definitive\nTreatment', width: 140, height: 60 }
  }

  // Define connections with labels for decision paths
  const connections = [
    { from: 'start', to: 'step1', label: '' },
    { from: 'step1', to: 'end_refuse_defer', label: 'Refuse', offset: -30 },
    { from: 'step1', to: 'step2', label: 'Proceed', offset: 30 },
    { from: 'step2', to: 'step4', label: 'Gleason 6', offset: 40 },
    { from: 'step2', to: 'step3', label: 'Gleason 7\n(3+4)', offset: -30 },
    { from: 'step2', to: 'end_definitive_treatment', label: 'Gleason 7\n(4+3)+', offset: -60 },
    { from: 'step3', to: 'step4', label: 'Favorable', offset: 40 },
    { from: 'step3', to: 'end_definitive_treatment', label: 'Unfavorable', offset: -30 },
    { from: 'step4', to: 'end_active_surveillance', label: 'No High Risk', offset: 40 },
    { from: 'step4', to: 'end_definitive_treatment', label: 'High Risk', offset: -40 }
  ]

  const getStepColor = (step) => {
    if (step === currentStep) return '#3b82f6' // Primary blue - current
    if (stepHistory.includes(step)) return '#10b981' // Green - visited
    return '#e5e7eb' // Gray - not visited
  }

  const getStepTextColor = (step) => {
    if (step === currentStep || stepHistory.includes(step)) return '#ffffff'
    return '#374151'
  }

  const getStepBorderColor = (step) => {
    if (step === currentStep) return '#1d4ed8'
    if (stepHistory.includes(step)) return '#059669'
    return '#9ca3af'
  }

  const getConnectionColor = (from, to) => {
    const currentPath = [...stepHistory, currentStep]
    const isActivePath = currentPath.includes(from) && (currentPath.includes(to) || to === currentStep)
    return isActivePath ? '#3b82f6' : '#d1d5db'
  }

  const getConnectionWidth = (from, to) => {
    const currentPath = [...stepHistory, currentStep]
    const isActivePath = currentPath.includes(from) && (currentPath.includes(to) || to === currentStep)
    return isActivePath ? 3 : 1
  }

  const drawConnection = (fromStep, toStep, label, offset = 0) => {
    const from = steps[fromStep]
    const to = steps[toStep]
    if (!from || !to) return null

    const fromX = from.x + from.width / 2
    const fromY = from.y + from.height
    const toX = to.x + to.width / 2
    const toY = to.y

    const midX = (fromX + toX) / 2 + offset
    const midY = (fromY + toY) / 2

    const color = getConnectionColor(fromStep, toStep)
    const width = getConnectionWidth(fromStep, toStep)

    return React.createElement('g', { key: `${fromStep}-${toStep}` },
      React.createElement('path', {
        d: `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`,
        stroke: color,
        strokeWidth: width,
        fill: 'none',
        markerEnd: 'url(#arrowhead)',
        className: 'transition-all duration-300'
      }),
      label && React.createElement('text', {
        x: midX,
        y: midY - 5,
        textAnchor: 'middle',
        fontSize: '10',
        fill: color,
        className: 'pointer-events-none select-none',
        fontWeight: width === 3 ? 'bold' : 'normal'
      },
        label.split('\n').map((line, idx) =>
          React.createElement('tspan', {
            key: idx,
            x: midX,
            dy: idx === 0 ? 0 : 12
          }, line)
        )
      )
    )
  }

  return React.createElement('div', { className: 'w-full overflow-auto bg-gray-50 p-4 rounded-lg' },
    React.createElement('svg', {
      width: '500',
      height: '580',
      viewBox: '0 0 500 580',
      className: 'bg-white border border-gray-300 rounded-lg shadow-sm'
    },
      React.createElement('defs', null,
        React.createElement('marker', {
          id: 'arrowhead',
          markerWidth: '10',
          markerHeight: '10',
          refX: '9',
          refY: '3',
          orient: 'auto',
          fill: '#9ca3af'
        },
          React.createElement('polygon', {
            points: '0 0, 10 3, 0 6'
          })
        )
      ),
      connections.map(conn => drawConnection(conn.from, conn.to, conn.label, conn.offset)),
      Object.entries(steps).map(([stepId, step]) => {
        const isCurrent = stepId === currentStep
        const isVisited = stepHistory.includes(stepId)
        const isEndState = stepId.startsWith('end_')

        return React.createElement('g', { key: stepId },
          React.createElement('rect', {
            x: step.x,
            y: step.y,
            width: step.width,
            height: step.height,
            rx: 8,
            fill: getStepColor(stepId),
            stroke: getStepBorderColor(stepId),
            strokeWidth: isCurrent ? 3 : 2,
            className: 'cursor-pointer transition-all duration-300 hover:opacity-80 hover:shadow-lg',
            onClick: () => onStepClick && onStepClick(stepId)
          }),
          React.createElement('text', {
            x: step.x + step.width / 2,
            y: step.y + step.height / 2,
            textAnchor: 'middle',
            fill: getStepTextColor(stepId),
            fontSize: '11',
            fontWeight: isCurrent ? 'bold' : 'normal',
            className: 'pointer-events-none select-none'
          },
            step.label.split('\n').map((line, idx) =>
              React.createElement('tspan', {
                key: idx,
                x: step.x + step.width / 2,
                dy: idx === 0 ? (step.label.split('\n').length === 1 ? 4 : -4) : 14
              }, line)
            )
          ),
          isCurrent && React.createElement('circle', {
            cx: step.x + step.width - 12,
            cy: step.y + 12,
            r: 6,
            fill: '#fbbf24',
            className: 'animate-pulse pointer-events-none'
          })
        )
      })
    )
  )
}
