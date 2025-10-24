import { useState, useEffect, useRef, useCallback } from 'react'

// Auto-detect WebSocket URL based on current environment
const WS_BASE_URL = window.location.port === '5173'
  ? 'ws://localhost:8000'  // Development mode (Vite dev server)
  : `ws://${window.location.host}` // Production mode (served from backend)

/**
 * Hook for managing agent execution via WebSocket control channel
 *
 * @param {string} sessionId - Session ID for the agent execution
 * @returns {Object} - { phase, steps, currentStep, error, result, connected, pause, resume, stop, nudge }
 */
export function useRun(sessionId) {
  const [phase, setPhase] = useState('IDLE')
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [connected, setConnected] = useState(false)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)

  const connectWebSocket = useCallback(() => {
    if (!sessionId || sessionId === 'unknown') {
      console.warn('⚠️  No session ID provided, skipping WebSocket connection')
      return
    }

    try {
      console.log('🔌 Connecting to control WebSocket...', sessionId)
      const ws = new WebSocket(`${WS_BASE_URL}/ws/control?session_id=${sessionId}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Control WebSocket connected')
        setConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📨 Control message:', message.type, message)

          if (message.type === 'status') {
            setPhase(message.phase)
          } else if (message.type === 'step_started') {
            const step = message.step
            setSteps(prev => {
              // Check if step already exists
              const existing = prev.find(s => s.id === step.id)
              if (existing) {
                // Update existing step
                return prev.map(s =>
                  s.id === step.id
                    ? { ...s, status: 'in-progress', label: step.label }
                    : s
                )
              } else {
                // Add new step
                return [...prev, { ...step, status: 'in-progress' }]
              }
            })
            setCurrentStep(step)
          } else if (message.type === 'step_completed') {
            setSteps(prev => prev.map(s =>
              s.id === message.id
                ? { ...s, status: 'completed' }
                : s
            ))
            if (currentStep?.id === message.id) {
              setCurrentStep(null)
            }
          } else if (message.type === 'step_failed') {
            setSteps(prev => prev.map(s =>
              s.id === message.id
                ? { ...s, status: 'error', error: message.error }
                : s
            ))
            if (currentStep?.id === message.id) {
              setCurrentStep(null)
            }
          } else if (message.type === 'log') {
            console.log(`[${message.level}] ${message.message}`)
          } else if (message.type === 'final') {
            setResult(message.result)
            setPhase(message.result.success ? 'COMPLETE' : 'FAILED')
            setCurrentStep(null)
          } else if (message.type === 'error') {
            setError(message.message)
            setPhase('FAILED')
          } else if (message.type === 'ping') {
            // Respond to ping
            ws.send(JSON.stringify({ type: 'pong' }))
          } else if (message.type === 'command_ack') {
            console.log('✅ Command acknowledged:', message.command)
          }
        } catch (err) {
          console.error('❌ Error processing control message:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔴 Control WebSocket disconnected')
        setConnected(false)

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          console.log(`🔄 Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/5)`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connectWebSocket()
          }, delay)
        } else {
          console.error('❌ Max reconnection attempts reached')
          setError('Connection lost. Please refresh the page.')
        }
      }

      ws.onerror = (err) => {
        console.error('❌ Control WebSocket error:', err)
        setError('Failed to connect to control channel')
      }
    } catch (err) {
      console.error('❌ Failed to create control WebSocket:', err)
      setError('Failed to initialize control connection')
    }
  }, [sessionId, currentStep])

  // Send command to control WebSocket
  const sendCommand = useCallback((type, data = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    } else {
      console.warn('⚠️  Control WebSocket not connected, cannot send command:', type)
    }
  }, [])

  const pause = useCallback(() => {
    sendCommand('pause')
  }, [sendCommand])

  const resume = useCallback(() => {
    sendCommand('resume')
  }, [sendCommand])

  const stop = useCallback(() => {
    sendCommand('stop')
  }, [sendCommand])

  const nudge = useCallback((text) => {
    sendCommand('nudge', { text })
  }, [sendCommand])

  // Connect WebSocket on mount
  useEffect(() => {
    if (sessionId && sessionId !== 'unknown') {
      connectWebSocket()
    }

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [sessionId, connectWebSocket])

  return {
    phase,
    steps,
    currentStep,
    error,
    result,
    connected,
    pause,
    resume,
    stop,
    nudge
  }
}
