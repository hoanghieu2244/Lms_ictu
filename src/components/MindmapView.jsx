import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Color palette for different depth levels
const COLORS = [
    { bg: '#e8f0fe', border: '#7baaf7', text: '#1a73e8' },  // root - blue
    { bg: '#e6f4ea', border: '#81c995', text: '#137333' },  // level 1 - green
    { bg: '#fce8e6', border: '#f28b82', text: '#c5221f' },  // level 2 - red
    { bg: '#fef7e0', border: '#fdd663', text: '#b06000' },  // level 3 - yellow
    { bg: '#f3e8fd', border: '#c58af9', text: '#7627bb' },  // level 4 - purple
]

function getColor(depth) {
    return COLORS[Math.min(depth, COLORS.length - 1)]
}

// Calculate the layout of the tree
function layoutTree(node, depth = 0, y = 0) {
    const nodeW = Math.min(220, Math.max(120, node.label.length * 9 + 30))
    const nodeH = 44
    const hGap = 60
    const vGap = 16

    const result = {
        label: node.label,
        depth,
        x: depth * (200 + hGap),
        y: 0,
        w: nodeW,
        h: nodeH,
        children: [],
    }

    if (!node.children || node.children.length === 0) {
        result.y = y
        result.totalHeight = nodeH
        return result
    }

    let currentY = y
    const childResults = []
    for (const child of node.children) {
        const childLayout = layoutTree(child, depth + 1, currentY)
        childResults.push(childLayout)
        currentY += childLayout.totalHeight + vGap
    }

    result.children = childResults
    const totalChildHeight = currentY - y - vGap

    // Center the parent vertically among its children
    result.y = y + totalChildHeight / 2 - nodeH / 2
    result.totalHeight = totalChildHeight

    return result
}

// Flatten tree to array of nodes and edges
function flattenTree(node) {
    const nodes = []
    const edges = []

    function walk(n) {
        nodes.push(n)
        for (const child of n.children) {
            edges.push({ from: n, to: child })
            walk(child)
        }
    }
    walk(node)
    return { nodes, edges }
}

export default function MindmapView({ courseId, lessonId, lesson }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 40, y: 40 })
    const [dragging, setDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const svgRef = useRef(null)

    useEffect(() => {
        if (!lesson?.content) return
        fetchMindmap()
    }, [courseId, lessonId])

    const fetchMindmap = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/api/ai/mindmap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    lessonId,
                    title: lesson.content.title,
                    sections: lesson.content.sections,
                })
            })
            if (!res.ok) throw new Error('API error')
            const result = await res.json()
            setData(result)
        } catch (err) {
            console.error('Mindmap error:', err)
            setError('Không thể tạo mindmap từ AI.')
            // Fallback: build from lesson sections
            setData({
                root: {
                    label: lesson.content.title,
                    children: lesson.content.sections.map(s => ({
                        label: s.heading,
                        children: s.list ? s.list.slice(0, 3).map(item => ({
                            label: item.length > 40 ? item.slice(0, 37) + '...' : item
                        })) : []
                    }))
                }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleMouseDown = useCallback((e) => {
        if (e.target.closest('.mindmap-node')) return
        setDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }, [pan])

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }, [dragging, dragStart])

    const handleMouseUp = useCallback(() => {
        setDragging(false)
    }, [])

    if (loading) {
        return (
            <div className="immersive-loading">
                <div className="immersive-loading-spinner" />
                <p>🧠 AI đang phân tích cấu trúc và tạo sơ đồ tư duy...</p>
                <p className="immersive-loading-sub">Quá trình này mất khoảng 10-20 giây</p>
            </div>
        )
    }

    if (!data?.root) return null

    const tree = layoutTree(data.root)
    const { nodes, edges } = flattenTree(tree)

    // Calculate SVG bounds
    const maxX = Math.max(...nodes.map(n => n.x + n.w)) + 80
    const maxY = Math.max(...nodes.map(n => n.y + n.h)) + 80

    return (
        <div className="mindmap-container">
            {error && <div className="immersive-error" style={{ margin: '0 0 12px' }}>⚠️ {error}</div>}

            {/* Zoom controls */}
            <div className="mindmap-controls">
                <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))} title="Phóng to">+</button>
                <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))} title="Thu nhỏ">−</button>
                <button onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }) }} title="Reset">⟲</button>
            </div>

            <div
                className="mindmap-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            >
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${maxX} ${maxY}`}
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                    }}
                >
                    {/* Edges */}
                    {edges.map((edge, i) => {
                        const x1 = edge.from.x + edge.from.w
                        const y1 = edge.from.y + edge.from.h / 2
                        const x2 = edge.to.x
                        const y2 = edge.to.y + edge.to.h / 2
                        const midX = (x1 + x2) / 2
                        return (
                            <path
                                key={`edge-${i}`}
                                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                                fill="none"
                                stroke={getColor(edge.to.depth).border}
                                strokeWidth="2"
                                opacity="0.6"
                            />
                        )
                    })}

                    {/* Nodes */}
                    {nodes.map((node, i) => {
                        const color = getColor(node.depth)
                        return (
                            <g key={`node-${i}`} className="mindmap-node">
                                <rect
                                    x={node.x}
                                    y={node.y}
                                    width={node.w}
                                    height={node.h}
                                    rx="8"
                                    ry="8"
                                    fill={color.bg}
                                    stroke={color.border}
                                    strokeWidth="2"
                                />
                                <text
                                    x={node.x + node.w / 2}
                                    y={node.y + node.h / 2}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={color.text}
                                    fontSize={node.depth === 0 ? "13" : "11"}
                                    fontWeight={node.depth === 0 ? "700" : "500"}
                                    fontFamily="Inter, system-ui, sans-serif"
                                >
                                    {node.label.length > 28 ? node.label.slice(0, 25) + '...' : node.label}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>
        </div>
    )
}
