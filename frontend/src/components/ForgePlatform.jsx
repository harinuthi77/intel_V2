import React, { useState, useRef, useEffect } from 'react'
import { Send, Upload, Mic, Code, Globe, Image, Database, Zap, Play, Pause, Download, Eye, Hammer, Menu, X, Search, BookOpen, Layers, Grid, FolderKanban, MessageSquarePlus, Settings, Trash2, ChevronDown, ChevronRight, Folder, Loader2, Square, SkipForward } from 'lucide-react'
import LiveBrowserView from './LiveBrowserView'
import { useRun } from '../hooks/useRun'
import { useStream } from '../hooks/useStream'

// API Configuration - Auto-detect for integrated mode, fallback to dev mode
const API_BASE_URL = window.location.port === '5173'
  ? 'http://localhost:8000'  // Development mode (Vite dev server)
  : window.location.origin     // Integrated mode (served from backend)

export default function ForgePlatform() {
  const [task, setTask] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [model, setModel] = useState('claude')
  const [showArtifact, setShowArtifact] = useState(true)  // Changed to true - always show Live Output
  const [sessionId, setSessionId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(['recent'])
  const [hoveredChat, setHoveredChat] = useState(null)
  const [agentThinking, setAgentThinking] = useState('')
  const [agentPlan, setAgentPlan] = useState([])
  const [showBrowserView, setShowBrowserView] = useState(true)
  const [manualControl, setManualControl] = useState(false)
  const [activeView, setActiveView] = useState('browser') // browser, terminal, code, analytics
  const [streamingLogs, setStreamingLogs] = useState([])  // NEW: For real-time log streaming
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const textareaRef = useRef(null)
  const canvasRef = useRef(null)

  // Use the custom hooks for agent control and browser stream
  const {
    phase,
    steps: executionSteps,
    currentStep,
    error,
    result: taskResult,
    connected: controlConnected,
    pause,
    resume,
    stop,
    nudge,
    attach: attachStream,
    fps,
    currentUrl
  } = useRun(sessionId, {
    onThinking: (thought) => {
      setAgentThinking(thought.reason || thought.action)
    },
    onLog: (log) => {
      setStreamingLogs(prev => [...prev.slice(-100), log]) // Keep last 100
    }
  })

  // Note: useStream is for manual control browser (LiveBrowserManager)
  // Agent's browser now streams through control channel (useRun)
  // const {
  //   attach: attachStream,
  //   connected: streamConnected,
  //   fps,
  //   currentUrl
  // } = useStream(sessionId)

  const chatFolders = {
    recent: {
      name: 'Recent',
      chats: [
        'AI agent strategies',
        'Fix mkdir command',
        'Integrating Claude with Ollama'
      ]
    },
    projects: {
      name: 'Projects',
      chats: [
        'Action prompts and breakdowns',
        'Refining agent script',
        'Custom agent setup'
      ]
    },
    archived: {
      name: 'Archived',
      chats: [
        'Integrate OpenAI with Ollama',
        'Build custom Ollama agent'
      ]
    }
  }

  const tools = [
    { id: 'web', icon: Globe, label: 'Web' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'image', icon: Image, label: 'Image' },
    { id: 'db', icon: Database, label: 'Data' },
    { id: 'api', icon: Zap, label: 'API' }
  ]

  const [activeTools, setActiveTools] = useState(['web', 'code'])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 400)
      textareaRef.current.style.height = newHeight + 'px'
    }
  }, [task])

  // Attach stream to canvas when canvas is ready
  useEffect(() => {
    if (canvasRef.current) {
      attachStream(canvasRef.current)
    }
  }, [canvasRef.current, attachStream])

  // Update isActive based on phase
  useEffect(() => {
    if (phase === 'RUNNING' || phase === 'STARTING') {
      setIsActive(true)
    } else if (phase === 'COMPLETE' || phase === 'FAILED' || phase === 'STOPPED') {
      setIsActive(false)
    }
  }, [phase])

  const toggleTool = (toolId) => {
    setActiveTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    )
  }

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    )
  }

  const deleteChat = (chatName, e) => {
    e.stopPropagation()
    console.log('Delete chat:', chatName)
  }

  const handleTakeControl = () => {
    setManualControl(!manualControl)
    setIsPaused(!manualControl)
  }

  const handleNavigate = async (url) => {
    try {
      await fetch(`${API_BASE_URL}/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
    } catch (err) {
      console.error('Navigation failed:', err)
    }
  }

  // Resize handlers for sidebar
  const handleMouseDown = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (isResizing) {
      const newWidth = e.clientX
      // Constrain width between 200px and 500px
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth)
      }
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, sidebarWidth])

  const handleSend = async () => {
    if (!task.trim()) return

    setIsActive(true)
    setAgentThinking('')
    setAgentPlan([])
    setStreamingLogs([])

    try {
      // Call /execute endpoint to get session_id
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: task,
          model: model,
          tools: activeTools,
          headless: true,  // ✅ No separate window, streams to UI
          max_steps: 40
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || data.message || 'Task execution failed')
      }

      const data = await response.json()
      const newSessionId = data.session_id

      console.log('✅ Agent execution started with session_id:', newSessionId)

      // Store session ID - this will trigger the useRun and useStream hooks
      setSessionId(newSessionId)

    } catch (err) {
      console.error('❌ Error:', err)
      setIsActive(false)
    }
  }

  const filteredFolders = Object.entries(chatFolders).reduce((acc, [key, folder]) => {
    const filteredChats = folder.chats.filter(chat =>
      chat.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (filteredChats.length > 0) {
      acc[key] = { ...folder, chats: filteredChats }
    }
    return acc
  }, {})

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      case 'in-progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-white text-xs">✗</span>
        </div>
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
    }
  }

  if (!isActive) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)',
        display: 'flex',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? '280px' : '0',
          background: '#000000',
          borderRight: sidebarOpen ? '1px solid #1a1a1a' : 'none',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '20px 16px',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '72px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Hammer size={16} color="#000000" strokeWidth={2.5} />
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '1px',
              whiteSpace: 'nowrap'
            }}>
              FORGE
            </div>
          </div>

          {/* Menu Items */}
          <div style={{
            padding: '16px 12px',
            borderBottom: '1px solid #1a1a1a'
          }}>
            <button style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(255, 138, 0, 0.1)',
              border: '1px solid rgba(255, 138, 0, 0.3)',
              borderRadius: '6px',
              color: '#ff8a00',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              marginBottom: '12px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 138, 0, 0.15)'
              e.target.style.transform = 'translateX(2px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 138, 0, 0.1)'
              e.target.style.transform = 'translateX(0)'
            }}>
              <MessageSquarePlus size={16} />
              New chat
            </button>

            {/* Search */}
            <div style={{
              position: 'relative',
              marginBottom: '8px'
            }}>
              <Search size={14} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666666'
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255, 138, 0, 0.3)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1a1a1a'
                }}
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #1a1a1a'
          }}>
            {[
              { icon: BookOpen, label: 'Library' },
              { icon: Code, label: 'Codex' },
              { icon: Grid, label: 'GPTs' },
              { icon: FolderKanban, label: 'Projects' }
            ].map((item, i) => (
              <button
                key={i}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#888888',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: '400',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  marginBottom: '4px',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#ffffff'
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#888888'
                  e.target.style.background = 'transparent'
                }}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Chat History with Folders */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px'
          }}>
            {Object.entries(filteredFolders).map(([folderId, folder]) => (
              <div key={folderId} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => toggleFolder(folderId)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#888888',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#ffffff'
                    e.target.style.background = 'rgba(255, 255, 255, 0.03)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#888888'
                    e.target.style.background = 'transparent'
                  }}
                >
                  {expandedFolders.includes(folderId) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <Folder size={14} />
                  {folder.name}
                  <span style={{ marginLeft: 'auto', fontSize: '10px' }}>
                    {folder.chats.length}
                  </span>
                </button>

                {expandedFolders.includes(folderId) && (
                  <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                    {folder.chats.map((chat, i) => (
                      <div
                        key={i}
                        onMouseEnter={() => setHoveredChat(`${folderId}-${i}`)}
                        onMouseLeave={() => setHoveredChat(null)}
                        style={{
                          position: 'relative',
                          marginBottom: '2px'
                        }}
                      >
                        <button
                          style={{
                            width: '100%',
                            padding: '8px 32px 8px 12px',
                            background: hoveredChat === `${folderId}-${i}` ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                            border: 'none',
                            color: '#888888',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: '400',
                            transition: 'all 0.2s',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.color = '#ffffff'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = '#888888'
                          }}
                        >
                          {chat}
                        </button>
                        {hoveredChat === `${folderId}-${i}` && (
                          <button
                            onClick={(e) => deleteChat(chat, e)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: '4px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '4px',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.2)'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.1)'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Settings at Bottom */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid #1a1a1a'
          }}>
            <button style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              color: '#888888',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(255, 138, 0, 0.3)'
              e.target.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#1a1a1a'
              e.target.style.color = '#888888'
            }}>
              <Settings size={16} />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative'
        }}>
          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              top: '20px',
              left: sidebarOpen ? '296px' : '20px',
              padding: '10px',
              background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#000000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 1000,
              boxShadow: '0 4px 16px rgba(255, 138, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 6px 24px rgba(255, 138, 0, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 16px rgba(255, 138, 0, 0.3)'
            }}
          >
            {sidebarOpen ? <X size={18} strokeWidth={2.5} /> : <Menu size={18} strokeWidth={2.5} />}
          </button>

          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(255, 138, 0, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            maxWidth: '800px',
            width: '100%',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '48px'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Hammer size={18} color="#000000" strokeWidth={2.5} />
                </div>
                <h1 style={{
                  fontSize: '48px',
                  fontWeight: '800',
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '2px',
                  textShadow: '0 0 20px rgba(255, 138, 0, 0.2), 0 0 10px rgba(255, 138, 0, 0.1)',
                  filter: 'drop-shadow(0 0 5px rgba(255, 138, 0, 0.15))'
                }}>
                  FORGE
                </h1>
              </div>
              <p style={{
                fontSize: '15px',
                color: '#cccccc',
                margin: 0,
                fontWeight: '500',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                Think it. We build it.
              </p>
            </div>

            {/* Main Input */}
            <div style={{
              background: 'linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%)',
              border: '1px solid #1a1a1a',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 138, 0, 0.3)'
              e.currentTarget.style.boxShadow = '0 4px 32px rgba(255, 138, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1a1a1a'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <textarea
                ref={textareaRef}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSend()
                  }
                }}
                placeholder="What should I forge for you?"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  maxHeight: '400px',
                  padding: '24px',
                  fontSize: '16px',
                  fontWeight: '400',
                  color: '#ffffff',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  lineHeight: '1.7',
                  overflow: 'hidden',
                  letterSpacing: '0.2px'
                }}
              />

              {/* Bottom Controls */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid rgba(255, 138, 0, 0.1)',
                background: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                {/* Left - Model & Upload */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      fontSize: '12px',
                      color: '#cccccc',
                      background: '#000000',
                      border: '1px solid #222222',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="claude">Claude</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gemini">Gemini</option>
                  </select>

                  <button style={{
                    padding: '7px 11px',
                    background: 'transparent',
                    border: '1px solid #222222',
                    borderRadius: '6px',
                    color: '#888888',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'rgba(255, 138, 0, 0.3)'
                    e.target.style.color = '#ff8a00'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#222222'
                    e.target.style.color = '#888888'
                  }}>
                    <Upload size={14} />
                  </button>

                  <button style={{
                    padding: '7px 11px',
                    background: 'transparent',
                    border: '1px solid #222222',
                    borderRadius: '6px',
                    color: '#888888',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'rgba(255, 138, 0, 0.3)'
                    e.target.style.color = '#ff8a00'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#222222'
                    e.target.style.color = '#888888'
                  }}>
                    <Mic size={14} />
                  </button>
                </div>

                {/* Right - Build Button */}
                <button
                  onClick={handleSend}
                  disabled={!task.trim()}
                  style={{
                    padding: '9px 28px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#000000',
                    background: task.trim() ? 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)' : '#1a1a1a',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: task.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    letterSpacing: '0.5px',
                    boxShadow: task.trim() ? '0 4px 16px rgba(255, 138, 0, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (task.trim()) {
                      e.target.style.transform = 'translateY(-1px)'
                      e.target.style.boxShadow = '0 6px 24px rgba(255, 138, 0, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (task.trim()) {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 16px rgba(255, 138, 0, 0.3)'
                    }
                  }}
                >
                  <Hammer size={14} />
                  Build
                </button>
              </div>
            </div>

            {/* Tools */}
            <div style={{
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#555555',
                fontWeight: '500'
              }}>
                Tools:
              </span>
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  style={{
                    padding: '6px 12px',
                    background: activeTools.includes(tool.id) ? 'rgba(255, 138, 0, 0.15)' : 'transparent',
                    border: `1px solid ${activeTools.includes(tool.id) ? 'rgba(255, 138, 0, 0.4)' : '#222222'}`,
                    borderRadius: '6px',
                    color: activeTools.includes(tool.id) ? '#ff8a00' : '#666666',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    if (!activeTools.includes(tool.id)) {
                      e.target.style.borderColor = 'rgba(255, 138, 0, 0.3)'
                      e.target.style.color = '#ff8a00'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!activeTools.includes(tool.id)) {
                      e.target.style.borderColor = '#222222'
                      e.target.style.color = '#666666'
                    }
                  }}
                >
                  <tool.icon size={11} />
                  {tool.label}
                </button>
              ))}
            </div>

            {/* Examples */}
            <div style={{
              marginTop: '48px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}>
              {[
                { text: 'Build a todo app', emoji: '⚡' },
                { text: 'Research AI trends', emoji: '🔍' },
                { text: 'Analyze CSV data', emoji: '📊' },
                { text: 'Create landing page', emoji: '🎨' },
                { text: 'Debug my code', emoji: '🐛' },
                { text: 'Automate workflow', emoji: '⚙️' }
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setTask(example.text)}
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%)',
                    border: '1px solid #1a1a1a',
                    borderRadius: '8px',
                    color: '#888888',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#ffffff'
                    e.target.style.borderColor = 'rgba(255, 138, 0, 0.3)'
                    e.target.style.background = 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#888888'
                    e.target.style.borderColor = '#1a1a1a'
                    e.target.style.background = 'linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%)'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{example.emoji}</span>
                  <span>{example.text}</span>
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div style={{
              marginTop: '32px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#444444'
            }}>
              Press <kbd style={{
                padding: '3px 7px',
                background: '#1a1a1a',
                border: '1px solid #222222',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600'
              }}>⌘</kbd> + <kbd style={{
                padding: '3px 7px',
                background: '#1a1a1a',
                border: '1px solid #222222',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600'
              }}>Enter</kbd> to forge
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active State - 20/80 Split
  return (
    <div style={{
      height: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Bar */}
      <div style={{
        height: '56px',
        background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)',
        borderBottom: '1px solid rgba(255, 138, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Hammer size={14} color="#000000" strokeWidth={2.5} />
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '1px'
          }}>
            FORGE
          </div>
          <div style={{
            width: '1px',
            height: '20px',
            background: '#222222'
          }} />
          <div style={{
            padding: '4px 10px',
            background: error || phase === 'FAILED' ? 'rgba(239, 68, 68, 0.15)' :
                       phase === 'COMPLETE' ? 'rgba(34, 197, 94, 0.15)' :
                       phase === 'PAUSED' ? 'rgba(250, 204, 21, 0.15)' :
                       'rgba(255, 138, 0, 0.15)',
            border: `1px solid ${
              error || phase === 'FAILED' ? 'rgba(239, 68, 68, 0.3)' :
              phase === 'COMPLETE' ? 'rgba(34, 197, 94, 0.3)' :
              phase === 'PAUSED' ? 'rgba(250, 204, 21, 0.3)' :
              'rgba(255, 138, 0, 0.3)'
            }`,
            borderRadius: '4px',
            fontSize: '11px',
            color: error || phase === 'FAILED' ? '#ef4444' :
                   phase === 'COMPLETE' ? '#22c55e' :
                   phase === 'PAUSED' ? '#facc15' :
                   '#ff8a00',
            fontWeight: '600'
          }}>
            {error || phase === 'FAILED' ? 'ERROR' :
             phase === 'COMPLETE' ? 'COMPLETE' :
             phase === 'PAUSED' ? 'PAUSED' :
             phase === 'STOPPED' ? 'STOPPED' :
             phase === 'STARTING' ? 'STARTING' :
             phase === 'RUNNING' ? 'FORGING' :
             'IDLE'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => {
              setIsActive(false)
              setTask('')
              setSessionId(null)
              setAgentThinking('')
              setAgentPlan([])
              setStreamingLogs([])
            }}
            style={{
              padding: '6px 12px',
              background: '#0d0d0d',
              border: '1px solid #222222',
              borderRadius: '6px',
              color: '#cccccc',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
            }}
          >
            <X size={12} />
            Close
          </button>
        </div>
      </div>

      {/* Main Content - 3 Panel Layout */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* LEFT PANEL - Agent Thinking (20%) */}
        <div style={{
          width: '280px',
          background: '#0d0d0d',
          borderRight: '1px solid #1a1a1a',
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Task */}
          <div>
            <div style={{
              fontSize: '10px',
              color: '#666',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              Task
            </div>
            <div style={{
              fontSize: '13px',
              color: '#ccc',
              lineHeight: '1.5'
            }}>
              {task}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderLeft: '3px solid #ef4444',
              borderRadius: '6px',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ Error
                </div>
                <button
                  onClick={() => setError(null)}
                  style={{
                    padding: '2px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '16px',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#ccc',
                lineHeight: '1.5',
                marginBottom: '8px'
              }}>
                {error}
              </div>
              <button
                onClick={() => {
                  setError(null)
                  setSessionId(null)
                  setIsActive(false)
                  setTask('')
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '4px',
                  color: '#ef4444',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.2)'
                }}
              >
                Start New Task
              </button>
            </div>
          )}

          {/* Current Thinking */}
          {agentThinking && (
            <div style={{
              padding: '12px',
              background: 'rgba(255, 138, 0, 0.05)',
              borderLeft: '3px solid #ff8a00',
              borderRadius: '4px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#ff8a00',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                💭 REASONING
              </div>
              <div style={{
                fontSize: '12px',
                color: '#ccc',
                lineHeight: '1.6',
                fontStyle: 'italic'
              }}>
                {agentThinking}
              </div>
            </div>
          )}

          {/* Plan Steps */}
          <div>
            <div style={{
              fontSize: '10px',
              color: '#666',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              Execution Steps
            </div>
            {executionSteps.slice(-10).map((step, idx) => (
              <div key={step.id || idx} style={{
                fontSize: '12px',
                color: '#ccc',
                marginBottom: '12px',
                paddingLeft: '24px',
                position: 'relative',
                paddingBottom: '12px',
                borderBottom: idx < executionSteps.slice(-10).length - 1 ? '1px solid #1a1a1a' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  background: step.status === 'completed' ? '#22c55e' :
                             step.status === 'error' ? '#ef4444' :
                             step.status === 'in-progress' ? '#ff8a00' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#000'
                }}>
                  {step.status === 'completed' ? '✓' :
                   step.status === 'error' ? '✗' :
                   step.status === 'in-progress' ? '⋯' : '○'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{step.label || step.action}</span>
                    {step.duration && (
                      <span style={{
                        fontSize: '10px',
                        color: '#666',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px'
                      }}>
                        {(step.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{
            marginTop: 'auto',
            padding: '12px',
            background: 'rgba(255, 138, 0, 0.1)',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#ff8a00',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {isActive ? '🔄 Agent Running' : error ? '❌ Error' : '✅ Complete'}
          </div>
        </div>

        {/* CENTER PANEL - Live Browser Stream (60%) */}
        <div style={{
          flex: 1,
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Control Bar */}
          {isActive && (
            <div style={{
              padding: '12px 20px',
              background: '#0d0d0d',
              borderBottom: '1px solid #1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}>
              {/* Pause/Resume Button */}
              <button
                onClick={() => phase === 'PAUSED' ? resume() : pause()}
                disabled={phase !== 'RUNNING' && phase !== 'PAUSED'}
                style={{
                  padding: '6px 12px',
                  background: '#0d0d0d',
                  border: '1px solid #222',
                  borderRadius: '6px',
                  color: '#cccccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
              >
                {phase === 'PAUSED' ? (
                  <>
                    <Play size={14} />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause size={14} />
                    Pause
                  </>
                )}
              </button>

              {/* Stop Button */}
              <button
                onClick={stop}
                disabled={phase !== 'RUNNING' && phase !== 'PAUSED'}
                style={{
                  padding: '6px 12px',
                  background: '#0d0d0d',
                  border: '1px solid #222',
                  borderRadius: '6px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
              >
                <Square size={14} />
                Stop
              </button>

              {/* Skip Button */}
              <button
                onClick={() => {
                  nudge("This step is taking too long. Skip it and try a different approach.")
                  console.log('⏭️  Skip requested')
                }}
                disabled={phase !== 'RUNNING'}
                style={{
                  padding: '6px 12px',
                  background: '#0d0d0d',
                  border: '1px solid #222',
                  borderRadius: '6px',
                  color: phase === 'RUNNING' ? '#facc15' : '#555',
                  cursor: phase === 'RUNNING' ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (phase === 'RUNNING') {
                    e.target.style.background = 'rgba(250, 204, 21, 0.1)'
                    e.target.style.borderColor = 'rgba(250, 204, 21, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (phase === 'RUNNING') {
                    e.target.style.background = '#0d0d0d'
                    e.target.style.borderColor = '#222'
                  }
                }}
              >
                <SkipForward size={14} />
                Skip
              </button>

              {/* Connection Status */}
              <div style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '11px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: controlConnected ? '#22c55e' : '#888'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: controlConnected ? '#22c55e' : '#888',
                    animation: controlConnected ? 'pulse 2s ease-in-out infinite' : 'none'
                  }} />
                  Control {controlConnected ? 'Connected' : 'Disconnected'}
                </div>
                {controlConnected && fps > 0 && (
                  <div style={{
                    padding: '4px 8px',
                    background: 'rgba(255, 138, 0, 0.1)',
                    border: '1px solid rgba(255, 138, 0, 0.3)',
                    borderRadius: '4px',
                    color: '#ff8a00',
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>
                    {fps} FPS
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Step Banner */}
          {currentStep && phase === 'RUNNING' && (
            <div style={{
              padding: '12px 20px',
              background: 'linear-gradient(90deg, rgba(255, 138, 0, 0.15) 0%, rgba(255, 138, 0, 0.05) 100%)',
              borderBottom: '1px solid rgba(255, 138, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <Loader2 size={16} style={{ color: '#ff8a00', animation: 'spin 1.5s linear infinite' }} />
              <div>
                <div style={{
                  fontSize: '11px',
                  color: '#ff8a00',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '2px'
                }}>
                  Step {currentStep.id}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#fff',
                  fontWeight: '500'
                }}>
                  {currentStep.label}
                </div>
              </div>
            </div>
          )}

          {/* Browser Canvas */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative'
          }}>
            {controlConnected && phase !== 'IDLE' ? (
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(255, 138, 0, 0.2)',
                  border: '1px solid rgba(255, 138, 0, 0.2)'
                }}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#666'
              }}>
                {error ? (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <div style={{ fontSize: '16px', color: '#ef4444' }}>Task Failed</div>
                    <div style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>{error}</div>
                  </>
                ) : isActive ? (
                  <>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      margin: '0 auto 24px',
                      border: '3px solid #1a1a1a',
                      borderTopColor: '#ff8a00',
                      borderRadius: '50%',
                      animation: 'spin 1.5s linear infinite'
                    }} />
                    <div style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
                      {phase === 'STARTING' ? 'Starting agent...' :
                       phase === 'BROWSER_CONNECTING' ? 'Connecting to browser...' :
                       'Initializing...'}
                    </div>
                    {currentStep && (
                      <div style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                        {currentStep.label || currentStep.action}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '16px', color: '#666' }}>No browser stream</div>
                )}
              </div>
            )}

            {/* URL Bar Overlay */}
            {currentUrl && currentUrl !== 'about:blank' && controlConnected && (
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                padding: '10px 16px',
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 138, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}>
                <Globe size={14} color="#ff8a00" />
                <div style={{
                  fontSize: '12px',
                  color: '#ccc',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {currentUrl}
                </div>
                <div style={{
                  padding: '2px 8px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#22c55e',
                  fontWeight: '600'
                }}>
                  LIVE
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Live Logs (20%) */}
        {showArtifact && (
          <div style={{
            width: '300px',
            background: '#0d0d0d',
            borderLeft: '1px solid #1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #1a1a1a',
              fontSize: '12px',
              fontWeight: '600',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isActive ? '#22c55e' : '#666',
                animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none'
              }} />
              Live Output
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: '1.5'
            }}>
              {streamingLogs.length > 0 ? (
                streamingLogs.map((log, idx) => (
                  <div key={idx} style={{
                    color: log.level === 'error' ? '#ef4444' : '#888',
                    marginBottom: '6px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid rgba(255, 138, 0, 0.05)'
                  }}>
                    <span style={{ color: '#666', marginRight: '6px' }}>
                      [{log.level?.toUpperCase() || 'INFO'}]
                    </span>
                    {log.message?.substring(0, 100)}
                  </div>
                ))
              ) : (
                <div style={{ color: '#666' }}>Starting...</div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}