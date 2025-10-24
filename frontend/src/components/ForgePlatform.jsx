import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

export default function ForgePlatform() {
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState('IDLE'); // IDLE, STARTING, RUNNING, COMPLETE
  const [steps, setSteps] = useState([]);
  const [thinking, setThinking] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  // Initialize WebSocket connection
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
              ? { ...s, status: 'completed', duration: Date.now() - s.startTime }
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

        case 'task_complete':
          setPhase('COMPLETE');
          setIsRunning(false);
          break;

        case 'error':
          setError(data.message);
          setPhase('IDLE');
          setIsRunning(false);
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

  const handleStart = async () => {
    if (!task.trim()) {
      alert('Please enter a task');
      return;
    }

    setIsRunning(true);
    setPhase('STARTING');
    setSteps([]);
    setThinking('');
    setCurrentUrl('');
    setError(null);

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
    setPhase('IDLE');
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{
        height: '64px',
        borderBottom: '1px solid #1f1f1f',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
        flexShrink: 0
      }}>
        <div style={{
          fontSize: '24px',
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
            padding: '12px 16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#f97316'}
          onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isRunning) handleStart();
          }}
        />
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={!task.trim() && !isRunning}
          style={{
            padding: '12px 24px',
            backgroundColor: isRunning ? '#dc2626' : '#f97316',
            border: 'none',
            borderRadius: '8px',
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
        {/* Left Sidebar - 350px */}
        <div style={{
          width: '350px',
          borderRight: '1px solid #1f1f1f',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0a',
          flexShrink: 0
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}>
            {/* Thinking Section */}
            {thinking && (
              <div style={{
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #2a2a2a'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#f97316',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Loader2 size={12} className="animate-spin" />
                  Agent Thinking
                </div>
                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#a1a1a1'
                }}>
                  {thinking}
                </div>
              </div>
            )}

            {/* Error Section */}
            {error && (
              <div style={{
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: '#2a1a1a',
                borderRadius: '8px',
                border: '1px solid #dc2626'
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
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#fca5a5'
                }}>
                  {error}
                </div>
              </div>
            )}

            {/* Steps Timeline */}
            {steps.length > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #2a2a2a'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#f97316',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '12px'
                }}>
                  Execution Timeline
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {steps.map((step, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: step.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                      borderRadius: '6px',
                      border: `1px solid ${step.status === 'completed' ? '#22c55e' : '#f97316'}`
                    }}>
                      {step.status === 'running' ? (
                        <Loader2 size={16} className="animate-spin" style={{ color: '#f97316', flexShrink: 0 }} />
                      ) : (
                        <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                      )}
                      <div style={{
                        flex: 1,
                        fontSize: '13px',
                        color: step.status === 'completed' ? '#d4d4d4' : '#fff',
                        lineHeight: '1.4'
                      }}>
                        {step.label}
                      </div>
                      {step.duration && (
                        <div style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}>
                          <Clock size={10} />
                          {(step.duration / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Browser Canvas */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#0f0f0f',
          overflow: 'hidden'
        }}>
          {phase === 'IDLE' ? (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#4a4a4a'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Ready to automate</div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Enter a task and click Start to begin</div>
            </div>
          ) : (
            <>
              {/* Live URL Badge */}
              {currentUrl && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(220, 38, 38, 0.95)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  LIVE
                  <ChevronRight size={12} />
                  <span style={{
                    fontWeight: 400,
                    opacity: 0.95,
                    maxWidth: '600px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {currentUrl}
                  </span>
                </div>
              )}

              {/* Browser Canvas - ABSOLUTE POSITIONING TO FILL ENTIRE PANEL */}
              <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#0f0f0f',
                  objectFit: 'contain'
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
