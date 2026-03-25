import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import axios from 'axios'
import { nodeTypes } from './NodeTypes'
import { layoutGraph } from '../lib/layout'

interface Props {
  onNodeSelect: (node: any) => void
  highlightedIds: string[]
  API: string
}

const ENTITY_FILTERS = [
  { key: 'businessPartner', label: 'Customers', color: '#a855f7' },
  { key: 'salesOrder',      label: 'Sales Orders', color: '#3b82f6' },
  { key: 'delivery',        label: 'Deliveries', color: '#22c55e' },
  { key: 'billingDocument', label: 'Invoices', color: '#f59e0b' },
  { key: 'payment',         label: 'Payments', color: '#14b8a6' },
  { key: 'journalEntry',    label: 'Journal Entries', color: '#6366f1' },
]

export default function GraphCanvas({ onNodeSelect, highlightedIds, API }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(ENTITY_FILTERS.map(f => f.key)))
  const [rawNodes, setRawNodes] = useState<any[]>([])
  const [rawEdges, setRawEdges] = useState<any[]>([])

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/graph`)
      .then(r => {
        setRawNodes(r.data.nodes)
        setRawEdges(r.data.edges)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load graph'); setLoading(false) })
  }, [API])

  // Apply filters + layout whenever raw data or filters change
  useEffect(() => {
    if (!rawNodes.length) return
    const filteredNodes = rawNodes.filter(n => activeFilters.has(n.type))
    const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id))
    const filteredEdges = rawEdges.filter(e =>
      filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    )
    const laid = layoutGraph(filteredNodes, filteredEdges)
    setNodes(laid.nodes.map((n: any) => ({
      ...n,
      selected: highlightedIds.includes(n.id),
    })))
    setEdges(laid.edges.map((e: any) => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
      style: { stroke: '#374151', strokeWidth: 1 },
      labelStyle: { fill: '#6b7280', fontSize: 10 },
      labelBgStyle: { fill: 'transparent' },
    })))
  }, [rawNodes, rawEdges, activeFilters, highlightedIds])

  const handleNodeClick = useCallback((_: any, node: any) => {
    const [type, id] = node.id.split('_').reduce((acc: string[], part: string, i: number) => {
      if (i === 0) return [part, '']
      acc[1] = acc[1] ? acc[1] + '_' + part : part
      return acc
    }, ['', ''])
    onNodeSelect({ ...node, entityType: type, entityId: id })
  }, [onNodeSelect])

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: 'var(--text3)', fontSize: 14 }}>Loading graph...</span>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444' }}>
      {error}
    </div>
  )

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Filter toolbar */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {ENTITY_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => toggleFilter(f.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 16,
              border: `1px solid ${activeFilters.has(f.key) ? f.color : 'var(--border)'}`,
              background: activeFilters.has(f.key) ? `${f.color}20` : 'var(--bg2)',
              color: activeFilters.has(f.key) ? f.color : 'var(--text3)',
              cursor: 'pointer', fontSize: 11, fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeFilters.has(f.key) ? f.color : 'var(--border)' }} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Node count badge */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 10,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--text3)',
      }}>
        {nodes.length} nodes · {edges.length} edges
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2130" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              businessPartner: '#a855f7', salesOrder: '#3b82f6',
              delivery: '#22c55e', billingDocument: '#f59e0b',
              payment: '#14b8a6', journalEntry: '#6366f1',
            }
            return colors[n.type || ''] || '#374151'
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  )
}
