import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Pause, Loader2, Circle, CheckCircle2, XCircle } from 'lucide-react';

export default function ForgePlatform() {
  // ===== STATE MANAGEMENT =====
  // Task & Execution
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState('IDLE'); // IDLE, STARTING, RUNNING, PAUSED, COMPLETE

  // Timing
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [modelName, setModelName] = useState('claude-sonnet-4-5-20250929');

  // Steps & Progress
  const [steps, setSteps] = useState([]);
  const [thinking, setThinking] = useState('');
  const [agentMessage, setAgentMessage] = useState('');
  const [error, setError] = useState(null);

  // Browser State
  const [currentUrl, setCurrentUrl] = useState('');
  const [elements, setElements] = useState([]);
  const [highlightedElement, setHighlightedElement] = useState(null);

  // Refs
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  // ===== TIMER EFFECT =====
  useEffect(() => {
    if (isRunning && !isPaused && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused, startTime]);

  // ===== WEBSOCKET SETUP =====
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Message:', data.type);

      switch(data.type) {
        case 'thinking':
          setThinking(data.content);
          break;

        case 'step_started':
          setSteps(prev => [...prev, {
            id: data.step.id,
            label: data.step.label,
            status: 'running',
            startTime: Date.now()
          }]);
          if (phase !== 'RUNNING') setPhase('RUNNING');
          break;

        case 'step_completed':
          setSteps(prev => prev.map(s =>
            s.id === data.step.id
              ? { ...s, status: 'completed', duration: Math.floor((Date.now() - s.startTime) / 1000) }
              : s
          ));
          break;

        case 'step_failed':
          setSteps(prev => prev.map(s =>
            s.id === data.step.id
              ? { ...s, status: 'failed', duration: Math.floor((Date.now() - s.startTime) / 1000) }
              : s
          ));
          break;

        case 'frame':
          if (canvasRef.current && data.data) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, 1920, 1080);
              ctx.drawImage(img, 0, 0, 1920, 1080);
            };
            img.src = `data:image/png;base64,${data.data}`;
          }
          if (data.url) setCurrentUrl(data.url);
          break;

        case 'elements':
          if (data.elements) {
            setElements(data.elements);
          }
          break;

        case 'element_highlight':
          if (data.elementId) {
            setHighlightedElement(data.elementId);
            setTimeout(() => setHighlightedElement(null), 3000);
          }
          break;

        case 'model_info':
          if (data.modelName) {
            setModelName(data.modelName);
          }
          break;

        case 'task_complete':
          setPhase('COMPLETE');
          setIsRunning(false);
          setIsPaused(false);
          break;

        case 'error':
          setError(data.message);
          setPhase('IDLE');
          setIsRunning(false);
          setIsPaused(false);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔴 WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [phase]);

  // ===== EVENT HANDLERS =====
  const handleStart = async () => {
    if (!task.trim()) {
      alert('Please enter a task');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setPhase('STARTING');
    setSteps([]);
    setThinking('');
    setCurrentUrl('');
    setError(null);
    setElements([]);
    setStartTime(Date.now());
    setElapsedTime(0);

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, 1920, 1080);
    }

    try {
      const response = await fetch('http://localhost:8000/execute/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          headless: false,
          max_steps: 40
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start task');
      }

      console.log('✅ Task started');
    } catch (error) {
      console.error('❌ Failed to start:', error);
      setError(error.message);
      setPhase('IDLE');
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPhase('IDLE');
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  };

  const handlePause = async () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      setPhase('RUNNING');
      try {
        await fetch('http://localhost:8000/execute/resume', { method: 'POST' });
      } catch (error) {
        console.error('Failed to resume:', error);
      }
    } else {
      // Pause
      setIsPaused(true);
      setPhase('PAUSED');
      try {
        await fetch('http://localhost:8000/execute/pause', { method: 'POST' });
      } catch (error) {
        console.error('Failed to pause:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!agentMessage.trim()) return;

    try {
      await fetch('http://localhost:8000/execute/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: agentMessage })
      });
      setAgentMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // ===== HELPER FUNCTIONS =====
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // ===== RENDER =====
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      color: '#333',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{
        height: '60px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '12px',
        flexShrink: 0,
        backgroundColor: '#fff'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#f97316',
          letterSpacing: '-0.5px'
        }}>
          FORGE
        </div>
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter your automation task..."
          disabled={isRunning}
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            color: '#333',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#f97316'}
          onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isRunning) handleStart();
          }}
        />
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={!task.trim() && !isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#dc2626' : '#f97316',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: (!task.trim() && !isRunning) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: (!task.trim() && !isRunning) ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          {isRunning ? (
            <>
              <Square size={16} />
              Stop
            </>
          ) : (
            <>
              <Play size={16} fill="#fff" />
              Start
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Left Panel - 380px */}
        <div style={{
          width: '380px',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          flexShrink: 0
        }}>
          {/* Header Info */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: isRunning ? '#22c55e' : '#9ca3af',
                borderRadius: '50%',
                animation: isRunning ? 'pulse 2s infinite' : 'none'
              }} />
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {isRunning ? 'Live Browser' : 'Browser Idle'}
              </div>
            </div>
            {isRunning && (
              <>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '4px'
                }}>
                  Total time: {formatTime(elapsedTime)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#aaa'
                }}>
                  Using {modelName}
                </div>
              </>
            )}
          </div>

          {/* Task Display */}
          {task && (
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              <div style={{
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#666'
              }}>
                {task}
              </div>
            </div>
          )}

          {/* Thinking Section */}
          {thinking && (
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fffbeb'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Agent Thinking
              </div>
              <div style={{
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#92400e'
              }}>
                {thinking}
              </div>
            </div>
          )}

          {/* Error Section */}
          {error && (
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fef2f2'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#dc2626',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Error
              </div>
              <div style={{
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#991b1b'
              }}>
                {error}
              </div>
            </div>
          )}

          {/* Steps Timeline */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px'
          }}>
            {steps.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {steps.map((step, idx) => (
                  <div key={step.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: step.status === 'completed' ? '#f0fdf4' :
                                    step.status === 'failed' ? '#fef2f2' :
                                    '#fffbeb',
                    borderRadius: '6px',
                    border: `1px solid ${
                      step.status === 'completed' ? '#86efac' :
                      step.status === 'failed' ? '#fca5a5' :
                      '#fde68a'
                    }`,
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      {step.status === 'running' ? (
                        <Loader2 size={16} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
                      ) : step.status === 'completed' ? (
                        <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                      ) : step.status === 'failed' ? (
                        <XCircle size={16} style={{ color: '#dc2626' }} />
                      ) : (
                        <Circle size={16} style={{ color: '#9ca3af' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#333',
                        lineHeight: '1.4',
                        marginBottom: '4px'
                      }}>
                        {step.label}
                      </div>
                      {step.duration !== undefined && (
                        <div style={{
                          fontSize: '11px',
                          color: '#888'
                        }}>
                          {step.duration}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              phase !== 'IDLE' && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9ca3af',
                  fontSize: '13px'
                }}>
                  Waiting for agent to start...
                </div>
              )
            )}
          </div>

          {/* Bottom Controls */}
          <div style={{
            borderTop: '1px solid #e0e0e0',
            padding: '16px 20px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <input
                type="text"
                value={agentMessage}
                onChange={(e) => setAgentMessage(e.target.value)}
                placeholder="Message Browser Use"
                disabled={!isRunning}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #d0d0d0',
                  borderRadius: '6px',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <button
                onClick={handleStop}
                disabled={!isRunning}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: isRunning ? '#dc2626' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  color: isRunning ? '#fff' : '#9ca3af',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isRunning ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Square size={14} />
                Stop
              </button>
              <button
                onClick={handlePause}
                disabled={!isRunning}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: isRunning ? (isPaused ? '#22c55e' : '#f59e0b') : '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  color: isRunning ? '#fff' : '#9ca3af',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isRunning ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Pause size={14} />
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
            <div style={{
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center',
              lineHeight: '1.4'
            }}>
              Browser Use can make mistakes. Please monitor its work.
            </div>
          </div>
        </div>

        {/* Right Panel - Browser Canvas */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {phase === 'IDLE' ? (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌐</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#6b7280' }}>
                Ready to Browse
              </div>
              <div style={{ fontSize: '14px' }}>
                Enter a task and click Start to begin automation
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              backgroundColor: '#fff',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Browser Chrome Header */}
              <div style={{
                height: '32px',
                backgroundColor: '#f3f4f6',
                borderBottom: '1px solid #d1d5db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6b7280'
              }}>
                <div>Live Browser</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#fbbf24',
                    borderRadius: '50%',
                    cursor: 'pointer'
                  }} />
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    cursor: 'pointer'
                  }} />
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    cursor: 'pointer'
                  }} />
                </div>
              </div>

              {/* Canvas Area */}
              <div style={{
                position: 'absolute',
                top: '32px',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#0f0f0f'
              }}>
                <canvas
                  ref={canvasRef}
                  width={1920}
                  height={1080}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />

                {/* Current URL Overlay */}
                {currentUrl && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(220, 38, 38, 0.95)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(8px)',
                    maxWidth: 'calc(100% - 24px)',
                    overflow: 'hidden'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#fff',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite'
                    }} />
                    LIVE
                    <span style={{
                      fontWeight: 400,
                      opacity: 0.95,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {currentUrl}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
