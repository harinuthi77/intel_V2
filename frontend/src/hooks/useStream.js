import { useState, useEffect, useRef, useCallback } from 'react'

// Auto-detect WebSocket URL based on current environment
const WS_BASE_URL = window.location.port === '5173'
  ? 'ws://localhost:8000'  // Development mode (Vite dev server)
  : `ws://${window.location.host}` // Production mode (served from backend)

/**
 * Hook for managing browser stream via WebSocket
 *
 * @param {string} sessionId - Session ID for the browser stream
 * @returns {Object} - { attach, connected, fps, currentUrl }
 */
export function useStream(sessionId) {
  const [connected, setConnected] = useState(false)
  const [fps, setFps] = useState(0)
  const [currentUrl, setCurrentUrl] = useState('')

  const wsRef = useRef(null)
  const canvasRef = useRef(null)
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })
  const reconnectTimeoutRef = useRef(null)

  const connectWebSocket = useCallback(() => {
    // Prevent duplicate sockets (mounts/HMR/route toggles)
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN ||
                          wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('🟡 Reuse existing /ws/browser socket')
      return
    }

    try {
      console.log('🔌 Connecting to browser stream WebSocket...')
      const ws = new WebSocket(`${WS_BASE_URL}/ws/browser`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Browser stream connected')
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === 'frame') {
            // Render frame to canvas
            renderFrame(message.data)
            setCurrentUrl(message.url)
            updateFPS()
          } else if (message.type === 'connected') {
            console.log('📡 Streaming started:', message.message)
          } else if (message.type === 'ping') {
            // Respond to ping
            ws.send(JSON.stringify({ type: 'pong' }))
          }
        } catch (err) {
          console.error('❌ Error processing stream message:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔴 Browser stream disconnected')
        setConnected(false)

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect browser stream...')
          connectWebSocket()
        }, 3000)
      }

      ws.onerror = (err) => {
        console.error('❌ Browser stream WebSocket error:', err)
      }
    } catch (err) {
      console.error('❌ Failed to create browser stream WebSocket:', err)
    }
  }, [])

  const renderFrame = useCallback((base64Frame) => {
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
  }, [])

  const updateFPS = useCallback(() => {
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
  }, [])

  const attach = useCallback((canvas) => {
    canvasRef.current = canvas
  }, [])

  // Connect WebSocket on mount
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
  }, [connectWebSocket])

  return {
    attach,
    connected,
    fps,
    currentUrl
  }
}
