import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2 } from 'lucide-react';

export default function ForgePlatform() {
  const [task, setTask] = useState('');
  const [phase, setPhase] = useState('IDLE'); // IDLE, STARTING, RUNNING, COMPLETE
  const [steps, setSteps] = useState([]);
  const [thinking, setThinking] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message:', data.type);

      switch(data.type) {
        case 'thinking':
          console.log('💭 Thinking:', data.content);
          setThinking(data.content);
          break;

        case 'step_started':
          console.log('🚀 Step started:', data.step);
          setSteps(prev => [...prev, {
            id: data.step.id,
            label: data.step.label,
            status: 'running',
            startTime: Date.now()
          }]);
          if (phase !== 'RUNNING') setPhase('RUNNING');
          break;

        case 'step_completed':
          console.log('✅ Step completed:', data.step);
          setSteps(prev => prev.map(s =>
            s.id === data.step.id
              ? { ...s, status: 'completed', duration: Date.now() - s.startTime }
              : s
          ));
          break;

        case 'browser_frame':
          console.log('🖼️ Frame received:', data.frame?.length, 'bytes');
          if (canvasRef.current && data.frame) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();

            img.onload = () => {
              ctx.clearRect(0, 0, 1280, 720);
              ctx.drawImage(img, 0, 0, 1280, 720);
              console.log('✅ Frame drawn to canvas');
            };

            img.onerror = (err) => {
              console.error('❌ Failed to load frame:', err);
            };

            img.src = `data:image/png;base64,${data.frame}`;
          } else {
            console.warn('⚠️ Canvas ref missing or no frame data');
          }

          if (data.url) {
            setCurrentUrl(data.url);
          }
          break;

        case 'task_complete':
          console.log('🎉 Task complete');
          setPhase('COMPLETE');
          setIsRunning(false);
          break;

        case 'error':
          console.error('❌ Error:', data.message);
          setPhase('IDLE');
          setIsRunning(false);
          break;

        default:
          console.log('Unknown message type:', data.type);
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

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 1280, 720);
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

      console.log('✅ Task started successfully');
    } catch (error) {
      console.error('❌ Failed to start task:', error);
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
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#f97316'
        }}>
          FORGE
        </div>
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter your task..."
          disabled={isRunning}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isRunning) {
              handleStart();
            }
          }}
        />
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={!task.trim() && !isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#ef4444' : '#f97316',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isRunning ? (
            <>
              <Square size={16} />
              Stop
            </>
          ) : (
            <>
              <Play size={16} />
              Start
            </>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0
      }}>
        {/* Left Panel */}
        <div style={{
          width: '400px',
          borderRight: '1px solid #222',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          overflowY: 'auto'
        }}>
          {/* Thinking Panel */}
          {thinking && (
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#f97316',
                marginBottom: '8px'
              }}>
                💭 AGENT THINKING
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#d1d5db'
              }}>
                {thinking}
              </div>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#f97316',
                marginBottom: '12px'
              }}>
                EXECUTION TIMELINE
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
                    gap: '12px',
                    padding: '8px',
                    backgroundColor: step.status === 'completed' ? '#1a2e1a' : '#1a1a1a',
                    borderRadius: '6px',
                    border: `1px solid ${step.status === 'completed' ? '#22c55e' : '#f97316'}`
                  }}>
                    {step.status === 'running' ? (
                      <Loader2 size={16} className="animate-spin" style={{ color: '#f97316' }} />
                    ) : (
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e'
                      }} />
                    )}
                    <div style={{ flex: 1, fontSize: '13px' }}>
                      {step.label}
                    </div>
                    {step.duration && (
                      <div style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}>
                        {(step.duration / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Canvas */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '24px',
          minHeight: 0
        }}>
          {phase === 'IDLE' ? (
            <div style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Enter a task and click Start to begin
            </div>
          ) : (
            <>
              {/* LIVE Badge */}
              {currentUrl && (
                <div style={{
                  position: 'absolute',
                  top: '36px',
                  left: '36px',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'white',
                    borderRadius: '50%'
                  }} />
                  LIVE
                  <span style={{
                    marginLeft: '4px',
                    fontWeight: 400,
                    opacity: 0.9,
                    maxWidth: '500px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {currentUrl}
                  </span>
                </div>
              )}

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  border: '1px solid #333'
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
