import React, { useEffect, useRef, useState } from 'react'
import { Globe, Wifi, WifiOff } from 'lucide-react'

// Auto-detect WebSocket URL based on current environment
const WS_BASE_URL = window.location.port === '5173'
  ? 'ws://localhost:8000'  // Development mode (Vite dev server)
  : `ws://${window.location.host}` // Production mode (served from backend)

export default function LiveBrowserView() {
  const [connected, setConnected] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const [fps, setFps] = useState(0)
  const [error, setError] = useState(null)
  const [inputUrl, setInputUrl] = useState('')

  const wsRef = useRef(null)
  const canvasRef = useRef(null)
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })
  const reconnectTimeoutRef = useRef(null)

  useEffect(() => {
    connectWebSocket()

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  const connectWebSocket = () => {
    try {
      console.log('🔌 Connecting to live browser WebSocket...')
      const ws = new WebSocket(`${WS_BASE_URL}/ws/browser`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Connected to live browser')
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === 'frame') {
            // Render live frame to canvas
            renderFrame(message.data)
            setCurrentUrl(message.url)
            updateFPS()
          } else if (message.type === 'connected') {
            console.log('📡 Streaming started:', message.message)
          } else if (message.type === 'command_ack') {
            console.log('✅ Command acknowledged:', message.command)
          } else if (message.type === 'ping') {
            // Respond to ping to keep connection alive
            ws.send(JSON.stringify({ type: 'pong' }))
          }
        } catch (err) {
          console.error('❌ Error processing message:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔴 Disconnected from live browser')
        setConnected(false)

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...')
          connectWebSocket()
        }, 3000)
      }

      ws.onerror = (err) => {
        console.error('❌ WebSocket error:', err)
        setError('Failed to connect to live browser')
      }
    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err)
      setError('Failed to initialize WebSocket connection')
    }
  }

  const renderFrame = (base64Frame) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Resize canvas to match frame dimensions
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width
        canvas.height = img.height
      }

      // Draw frame
      ctx.drawImage(img, 0, 0)
    }

    img.onerror = (err) => {
      console.error('❌ Failed to load frame image:', err)
    }

    img.src = `data:image/jpeg;base64,${base64Frame}`
  }

  const updateFPS = () => {
    const counter = fpsCounterRef.current
    counter.frames++

    const now = Date.now()
    const elapsed = now - counter.lastTime

    // Update FPS every second
    if (elapsed >= 1000) {
      const currentFps = Math.round((counter.frames * 1000) / elapsed)
      setFps(currentFps)
      counter.frames = 0
      counter.lastTime = now
    }
  }

  const handleNavigate = (url) => {
    if (!url || !connected) return

    // Ensure URL has protocol
    let finalUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url
    }

    console.log('🔗 Navigating to:', finalUrl)

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'navigate',
        url: finalUrl
      }))
      setInputUrl('')
    }
  }

  const handleCanvasClick = (e) => {
    if (!connected) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Calculate click coordinates relative to actual canvas dimensions
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)

    console.log('🖱️  Click at:', { x, y })

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'click',
        x: x,
        y: y
      }))
    }
  }

  const handleCanvasScroll = (e) => {
    if (!connected) return

    e.preventDefault()

    const delta = e.deltaY

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'scroll',
        delta: delta
      }))
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Status Bar */}
      <div
        style={{
          padding: '12px 20px',
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}
      >
        {/* Connection Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {connected ? (
            <Wifi size={16} color="#22c55e" />
          ) : (
            <WifiOff size={16} color="#ef4444" />
          )}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
            }}
          />
        </div>

        {/* URL Bar */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Globe size={14} color="#888" />
          <input
            type="text"
            value={inputUrl || currentUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNavigate(e.target.value)
              }
            }}
            placeholder="Enter URL or search..."
            disabled={!connected}
            style={{
              flex: 1,
              padding: '8px 14px',
              background: '#000',
              border: '1px solid #222',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'monospace',
              outline: 'none'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(255, 138, 0, 0.5)')}
            onBlur={(e) => (e.target.style.borderColor = '#222')}
          />
          <button
            onClick={() => handleNavigate(inputUrl || currentUrl)}
            disabled={!connected || (!inputUrl && !currentUrl)}
            style={{
              padding: '8px 16px',
              background: connected ? 'rgba(255, 138, 0, 0.1)' : '#1a1a1a',
              border: `1px solid ${connected ? 'rgba(255, 138, 0, 0.3)' : '#222'}`,
              borderRadius: '6px',
              color: connected ? '#ff8a00' : '#555',
              fontSize: '11px',
              fontWeight: '600',
              cursor: connected ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (connected) {
                e.target.style.background = 'rgba(255, 138, 0, 0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (connected) {
                e.target.style.background = 'rgba(255, 138, 0, 0.1)'
              }
            }}
          >
            GO
          </button>
        </div>

        {/* FPS Counter */}
        <div
          style={{
            padding: '6px 12px',
            background: 'rgba(255, 138, 0, 0.1)',
            border: '1px solid rgba(255, 138, 0, 0.3)',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#ff8a00',
            fontWeight: '600',
            fontFamily: 'monospace',
            minWidth: '60px',
            textAlign: 'center'
          }}
        >
          {fps} FPS
        </div>

        {/* Live Indicator */}
        <div
          style={{
            padding: '6px 12px',
            background: connected
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${
              connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }`,
            borderRadius: '4px',
            fontSize: '11px',
            color: connected ? '#22c55e' : '#ef4444',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {connected && (
            <div
              style={{
                width: '6px',
                height: '6px',
                background: '#22c55e',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          )}
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Live Browser Canvas */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '20px',
          background: '#000'
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onWheel={handleCanvasScroll}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: connected
              ? '0 8px 32px rgba(255, 138, 0, 0.2)'
              : '0 8px 32px rgba(0, 0, 0, 0.5)',
            cursor: connected ? 'pointer' : 'default',
            border: connected ? '1px solid rgba(255, 138, 0, 0.2)' : '1px solid #1a1a1a'
          }}
        />
      </div>

      {/* Connection Status Overlay */}
      {!connected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #222',
              borderTopColor: '#ff8a00',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <div
            style={{
              color: '#888',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {error || 'Connecting to live browser...'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
