import { useState, useEffect } from 'react'
import GraphCanvas from './components/GraphCanvas'
import ChatPanel from './components/ChatPanel'
import NodeInspector from './components/NodeInspector'
import StatsBar from './components/StatsBar'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'

export default function App() {
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [stats, setStats] = useState<any>(null)
  const [chatOpen, setChatOpen] = useState(true)

  useEffect(() => {
    axios.get(`${API}/graph/stats`).then(r => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <StatsBar stats={stats} chatOpen={chatOpen} onToggleChat={() => setChatOpen(v => !v)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Graph area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GraphCanvas
            onNodeSelect={setSelectedNode}
            highlightedIds={highlightedIds}
            API={API}
          />
          {selectedNode && (
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              API={API}
            />
          )}
        </div>
        {/* Chat panel */}
        {chatOpen && (
          <ChatPanel
            onHighlight={setHighlightedIds}
            API={API}
          />
        )}
      </div>
    </div>
  )
}
