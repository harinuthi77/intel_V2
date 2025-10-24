import React, { useState, useRef, useEffect } from 'react'
import { Send, Upload, Mic, Code, Globe, Image, Database, Zap, Play, Pause, Download, Eye, Hammer, Menu, X, Search, BookOpen, Layers, Grid, FolderKanban, MessageSquarePlus, Settings, Trash2, ChevronDown, ChevronRight, Folder, Loader2 } from 'lucide-react'
import LiveBrowserView from './LiveBrowserView'

// API Configuration - Auto-detect for integrated mode, fallback to dev mode
const API_BASE_URL = window.location.port === '5173'
  ? 'http://localhost:8000'  // Development mode (Vite dev server)
  : window.location.origin     // Integrated mode (served from backend)

export default function ForgePlatform() {
  const [task, setTask] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [model, setModel] = useState('claude')
  const [showArtifact, setShowArtifact] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(['recent'])
  const [hoveredChat, setHoveredChat] = useState(null)
  const [executionSteps, setExecutionSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(null)
  const [taskResult, setTaskResult] = useState(null)
  const [error, setError] = useState(null)
  const [currentScreenshot, setCurrentScreenshot] = useState(null)
  const [showBrowserView, setShowBrowserView] = useState(true)
  const [currentUrl, setCurrentUrl] = useState('')
  const [manualControl, setManualControl] = useState(false)
  const [activeView, setActiveView] = useState('browser') // browser, terminal, code, analytics
  const [terminalOutput, setTerminalOutput] = useState([])
  const [codeOutput, setCodeOutput] = useState([])
  const [analyticsData, setAnalyticsData] = useState(null)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const textareaRef = useRef(null)

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
    setError(null)
    setTaskResult(null)
    setCurrentScreenshot(null)
    setCurrentUrl('')

    // Initialize execution steps
    const initialSteps = [
      { id: 1, action: 'Initializing agent', status: 'in-progress', timestamp: new Date() },
      { id: 2, action: 'Analyzing task', status: 'pending', timestamp: null },
      { id: 3, action: 'Executing actions', status: 'pending', timestamp: null },
      { id: 4, action: 'Gathering results', status: 'pending', timestamp: null },
      { id: 5, action: 'Finalizing output', status: 'pending', timestamp: null }
    ]

    setExecutionSteps(initialSteps)
    setCurrentStep(initialSteps[0])

    try {
      // Use EventSource for streaming
      const response = await fetch(`${API_BASE_URL}/execute/stream`, {
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

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setIsActive(false)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = JSON.parse(line.slice(6))

            if (eventData.type === 'event') {
              const event = eventData.event

              // Handle screenshot updates
              if (event.payload?.type === 'screenshot') {
                console.log('📸 Screenshot received:', {
                  url: event.payload.url,
                  imageLength: event.payload.image?.length,
                  step: event.payload.step
                })
                setCurrentScreenshot(event.payload.image)
                setCurrentUrl(event.payload.url || '')
                setShowBrowserView(true)
                setActiveView('browser')

                // Update step status
                setExecutionSteps(prev => prev.map((step, idx) =>
                  idx === 2 ? { ...step, status: 'in-progress', timestamp: new Date() } :
                  idx < 2 ? { ...step, status: 'completed', timestamp: new Date() } : step
                ))
              }

              // Handle terminal output
              if (event.payload?.type === 'terminal') {
                setTerminalOutput(prev => [...prev, {
                  command: event.payload.command,
                  output: event.payload.output,
                  error: event.payload.error,
                  timestamp: new Date()
                }])
                setActiveView('terminal')
              }

              // Handle code execution
              if (event.payload?.type === 'code') {
                setCodeOutput(prev => [...prev, {
                  code: event.payload.code,
                  output: event.payload.output,
                  error: event.payload.error,
                  timestamp: new Date()
                }])
                setActiveView('code')
              }

              // Handle analytics
              if (event.payload?.type === 'analytics') {
                setAnalyticsData(event.payload.analysis)
                setActiveView('analytics')
              }

              console.log('📡 Event:', event.message)
            } else if (eventData.type === 'final') {
              const result = eventData.result

              if (result.success) {
                const completedSteps = initialSteps.map(step => ({
                  ...step,
                  status: 'completed',
                  timestamp: new Date()
                }))
                setExecutionSteps(completedSteps)
                setTaskResult(result)
                setCurrentStep(null)
                console.log('✅ Task completed:', result)
              } else {
                setError(result.message || 'Task execution failed')
                setExecutionSteps(prev => prev.map(step =>
                  step.status === 'in-progress'
                    ? { ...step, status: 'error', timestamp: new Date() }
                    : step
                ))
              }
            } else if (eventData.type === 'error') {
              throw new Error(eventData.message)
            }
          }
        }
      }

    } catch (err) {
      console.error('❌ Error:', err)
      setError(err.message)
      setIsActive(false)

      setExecutionSteps(prev => prev.map(step =>
        step.status === 'in-progress'
          ? { ...step, status: 'error', timestamp: new Date() }
          : step
      ))
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
            background: error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 138, 0, 0.15)',
            border: `1px solid ${error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 138, 0, 0.3)'}`,
            borderRadius: '4px',
            fontSize: '11px',
            color: error ? '#ef4444' : '#ff8a00',
            fontWeight: '600'
          }}>
            {error ? 'ERROR' : taskResult ? 'COMPLETE' : 'FORGING'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setShowArtifact(!showArtifact)}
            style={{
              padding: '6px 12px',
              background: showArtifact ? 'rgba(255, 138, 0, 0.15)' : '#0d0d0d',
              border: `1px solid ${showArtifact ? 'rgba(255, 138, 0, 0.3)' : '#222222'}`,
              borderRadius: '6px',
              color: showArtifact ? '#ff8a00' : '#cccccc',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
            }}
          >
            <Eye size={12} />
            Preview
          </button>

          <button 
            onClick={() => {
              setIsActive(false)
              setTask('')
              setError(null)
              setTaskResult(null)
              setExecutionSteps([])
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

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Left - Timeline (Resizable) */}
        <div style={{
          width: `${sidebarWidth}px`,
          background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)',
          borderRight: '1px solid #1a1a1a',
          padding: '24px',
          overflowY: 'auto',
          transition: isResizing ? 'none' : 'width 0.1s ease',
          userSelect: isResizing ? 'none' : 'auto'
        }}>
          <div style={{
            fontSize: '10px',
            color: '#666666',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontWeight: '600'
          }}>
            Task
          </div>
          <div style={{
            fontSize: '12px',
            color: '#999999',
            marginBottom: '24px',
            lineHeight: '1.4'
          }}>
            {task.substring(0, 80)}{task.length > 80 ? '...' : ''}
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#ef4444',
                fontWeight: '600',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                Error
              </div>
              <div style={{
                fontSize: '11px',
                color: '#fca5a5',
                lineHeight: '1.4'
              }}>
                {error}
              </div>
            </div>
          )}

          {/* Execution Steps */}
          <div style={{
            fontSize: '10px',
            color: '#666666',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            Execution Timeline
          </div>

          {executionSteps.map((step) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                opacity: step.status === 'pending' ? 0.3 : 1,
                transition: 'opacity 0.3s'
              }}
            >
              {getStepIcon(step.status)}
              <div style={{
                fontSize: '13px',
                color: step.status === 'pending' ? '#444444' : '#ffffff',
                fontWeight: step.status === 'in-progress' ? '600' : '400'
              }}>
                {step.action}
              </div>
            </div>
          ))}

          {/* Result Summary */}
          {taskResult && (
            <div style={{
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 138, 0, 0.1)'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#666666',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                Result
              </div>
              <div style={{
                padding: '12px',
                background: 'rgba(255, 138, 0, 0.1)',
                border: '1px solid rgba(255, 138, 0, 0.2)',
                borderRadius: '6px'
              }}>
                <div style={{
                  fontSize: '11px',
                  color: '#ff8a00',
                  marginBottom: '4px',
                  fontWeight: '600'
                }}>
                  Status: {taskResult.status}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#cccccc',
                  lineHeight: '1.4'
                }}>
                  Mode: {taskResult.mode}
                  <br />
                  Summary: {taskResult.progress_summary || 'No progress summary available'}
                </div>
              </div>
            </div>
          )}

          {/* Active Tools */}
          <div style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 138, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '10px',
              color: '#666666',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Active Tools
            </div>
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              {activeTools.map(toolId => {
                const tool = tools.find(t => t.id === toolId)
                return (
                  <div
                    key={toolId}
                    style={{
                      padding: '5px 10px',
                      background: 'rgba(255, 138, 0, 0.1)',
                      border: '1px solid rgba(255, 138, 0, 0.2)',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#ff8a00',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '500'
                    }}
                  >
                    <tool.icon size={9} />
                    {tool.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '4px',
            background: isResizing ? 'rgba(255, 138, 0, 0.5)' : 'transparent',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative',
            transition: 'background 0.2s',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'rgba(255, 138, 0, 0.3)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {/* Visual indicator */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '40px',
            background: '#333333',
            borderRadius: '2px'
          }} />
        </div>

        {/* Center - Live View (80%) */}
        <div style={{
          flex: 1,
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Browser View - Always show, update with screenshots */}
          {showBrowserView && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#0a0a0a'
            }}>
              {/* View Switcher Tabs */}
              <div style={{
                padding: '12px 20px',
                background: '#0d0d0d',
                borderBottom: '1px solid #1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {[
                  { id: 'browser', icon: Globe, label: 'Browser' },
                  { id: 'terminal', icon: Code, label: 'Terminal' },
                  { id: 'code', icon: Code, label: 'Code' },
                  { id: 'analytics', icon: Database, label: 'Analytics' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    style={{
                      padding: '6px 12px',
                      background: activeView === view.id ? 'rgba(255, 138, 0, 0.15)' : 'transparent',
                      border: `1px solid ${activeView === view.id ? 'rgba(255, 138, 0, 0.3)' : '#222222'}`,
                      borderRadius: '4px',
                      color: activeView === view.id ? '#ff8a00' : '#888888',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    <view.icon size={14} />
                    {view.label}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                {activeView === 'browser' && (
                  <>
                    <div style={{
                      flex: 1,
                      padding: '8px 14px',
                      background: '#000000',
                      border: '1px solid #222222',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#888888',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {currentUrl || 'Loading...'}
                    </div>
                    {/* Manual Control button - Disabled until session management is implemented */}
                    {/* TODO: Implement proper browser session management for manual control */}
                    <button
                      onClick={handleTakeControl}
                      disabled
                      title="Manual control requires browser session management (coming soon)"
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #222222',
                        borderRadius: '4px',
                        color: '#555555',
                        cursor: 'not-allowed',
                        display: 'none', // Hidden until implemented
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        opacity: 0.5
                      }}
                    >
                      <Hammer size={14} />
                      Take Control (Coming Soon)
                    </button>
                  </>
                )}
              </div>

              {/* View Content */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                background: '#000000'
              }}>
                {/* Browser View - Shows agent screenshots from SSE stream */}
                {activeView === 'browser' && (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }}>
                    {currentScreenshot ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                          color: '#888888',
                          marginBottom: '10px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}>
                          🌐 {currentUrl || 'Loading...'}
                        </div>
                        <img
                          src={`data:image/png;base64,${currentScreenshot}`}
                          alt="Agent browser view"
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: 'calc(100% - 40px)',
                            objectFit: 'contain',
                            border: '1px solid #333',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        color: '#666666',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌐</div>
                        <div>Waiting for agent to start browsing...</div>
                        <div style={{ fontSize: '12px', marginTop: '10px', color: '#444' }}>
                          Screenshots will appear here as the agent navigates
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Terminal View */}
                {activeView === 'terminal' && (
                  <div style={{
                    height: '100%',
                    padding: '20px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#00ff00',
                    background: '#000000',
                    overflowY: 'auto'
                  }}>
                    <div style={{ marginBottom: '16px', color: '#888888' }}>
                      🖥️ Terminal Output
                    </div>
                    {terminalOutput.length === 0 ? (
                      <div style={{ color: '#666666' }}>No terminal commands executed yet...</div>
                    ) : (
                      terminalOutput.map((entry, idx) => (
                        <div key={idx} style={{ marginBottom: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '12px' }}>
                          <div style={{ color: '#ff8a00', marginBottom: '8px' }}>
                            $ {entry.command}
                          </div>
                          {entry.output && (
                            <pre style={{ color: '#00ff00', margin: 0, whiteSpace: 'pre-wrap' }}>
                              {entry.output}
                            </pre>
                          )}
                          {entry.error && (
                            <pre style={{ color: '#ef4444', margin: 0, whiteSpace: 'pre-wrap' }}>
                              {entry.error}
                            </pre>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Code View */}
                {activeView === 'code' && (
                  <div style={{
                    height: '100%',
                    padding: '20px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ marginBottom: '16px', color: '#888888' }}>
                      💻 Code Execution
                    </div>
                    {codeOutput.length === 0 ? (
                      <div style={{ color: '#666666' }}>No code executed yet...</div>
                    ) : (
                      codeOutput.map((entry, idx) => (
                        <div key={idx} style={{ marginBottom: '24px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ padding: '12px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', color: '#ff8a00', fontWeight: '600' }}>
                            Code #{idx + 1}
                          </div>
                          <pre style={{ padding: '16px', color: '#cccccc', margin: 0, overflow: 'auto' }}>
                            {entry.code}
                          </pre>
                          {entry.output && (
                            <>
                              <div style={{ padding: '8px 12px', background: '#0d0d0d', borderTop: '1px solid #1a1a1a', color: '#888888', fontSize: '11px' }}>
                                Output:
                              </div>
                              <pre style={{ padding: '16px', color: '#00ff00', margin: 0 }}>
                                {entry.output}
                              </pre>
                            </>
                          )}
                          {entry.error && (
                            <>
                              <div style={{ padding: '8px 12px', background: '#0d0d0d', borderTop: '1px solid #1a1a1a', color: '#ef4444', fontSize: '11px' }}>
                                Error:
                              </div>
                              <pre style={{ padding: '16px', color: '#ef4444', margin: 0 }}>
                                {entry.error}
                              </pre>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Analytics View */}
                {activeView === 'analytics' && (
                  <div style={{
                    height: '100%',
                    padding: '20px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ marginBottom: '16px', color: '#888888' }}>
                      📊 Analytics Dashboard
                    </div>
                    {!analyticsData ? (
                      <div style={{ color: '#666666' }}>No analytics data yet...</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Summary Card */}
                        <div style={{ background: '#0a0a0a', border: '1px solid rgba(255, 138, 0, 0.2)', borderRadius: '8px', padding: '20px' }}>
                          <div style={{ color: '#ff8a00', fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                            📈 Summary
                          </div>
                          <div style={{ color: '#cccccc', fontSize: '13px' }}>
                            <div>Total Items Analyzed: <strong>{analyticsData.data_count}</strong></div>
                          </div>
                        </div>

                        {/* Price Statistics */}
                        {analyticsData.statistics?.prices && (
                          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255, 138, 0, 0.2)', borderRadius: '8px', padding: '20px' }}>
                            <div style={{ color: '#ff8a00', fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                              💰 Price Analysis
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', color: '#cccccc', fontSize: '13px' }}>
                              <div>Min: <strong>${analyticsData.statistics.prices.min.toFixed(2)}</strong></div>
                              <div>Max: <strong>${analyticsData.statistics.prices.max.toFixed(2)}</strong></div>
                              <div>Mean: <strong>${analyticsData.statistics.prices.mean.toFixed(2)}</strong></div>
                              <div>Median: <strong>${analyticsData.statistics.prices.median.toFixed(2)}</strong></div>
                            </div>
                          </div>
                        )}

                        {/* Insights */}
                        {analyticsData.insights?.length > 0 && (
                          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255, 138, 0, 0.2)', borderRadius: '8px', padding: '20px' }}>
                            <div style={{ color: '#ff8a00', fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                              💡 Key Insights
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {analyticsData.insights.map((insight, idx) => (
                                <div key={idx} style={{ color: '#cccccc', fontSize: '13px', paddingLeft: '12px', borderLeft: '2px solid rgba(255, 138, 0, 0.3)' }}>
                                  {insight}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {analyticsData.recommendations?.length > 0 && (
                          <div style={{ background: '#0a0a0a', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '20px' }}>
                            <div style={{ color: '#22c55e', fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                              🎯 Recommendations
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {analyticsData.recommendations.map((rec, idx) => (
                                <div key={idx} style={{ color: '#cccccc', fontSize: '13px', paddingLeft: '12px', borderLeft: '2px solid rgba(34, 197, 94, 0.3)' }}>
                                  {rec}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Indicator */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.9)',
                borderRadius: '20px',
                fontSize: '10px',
                color: '#ffffff',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  background: '#ffffff',
                  borderRadius: '50%',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                LIVE
              </div>

              {/* Manual Control Overlay */}
              {manualControl && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100
                }}>
                  <div style={{
                    background: '#0d0d0d',
                    border: '1px solid #9333ea',
                    borderRadius: '12px',
                    padding: '32px',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '0 20px 60px rgba(147, 51, 234, 0.3)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '24px'
                    }}>
                      <Hammer size={20} color="#a855f7" />
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        color: '#ffffff',
                        fontWeight: '600'
                      }}>Manual Control Mode</h3>
                    </div>

                    <p style={{
                      color: '#888888',
                      fontSize: '13px',
                      marginBottom: '20px',
                      lineHeight: '1.6'
                    }}>
                      Agent execution is paused. Navigate the browser manually or resume automation.
                    </p>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        color: '#aaaaaa',
                        fontSize: '12px',
                        marginBottom: '8px',
                        fontWeight: '500'
                      }}>
                        Navigate to URL:
                      </label>
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        const url = e.target.manualUrl.value
                        if (url) {
                          handleNavigate(url)
                          e.target.manualUrl.value = ''
                        }
                      }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            name="manualUrl"
                            placeholder="https://example.com"
                            style={{
                              flex: 1,
                              padding: '10px 14px',
                              background: '#000000',
                              border: '1px solid #222222',
                              borderRadius: '6px',
                              color: '#ffffff',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                            onBlur={(e) => e.target.style.borderColor = '#222222'}
                          />
                          <button
                            type="submit"
                            style={{
                              padding: '10px 20px',
                              background: '#9333ea',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Go
                          </button>
                        </div>
                      </form>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '24px'
                    }}>
                      <button
                        onClick={handleTakeControl}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: '#9333ea',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Resume Automation
                      </button>
                      <button
                        onClick={() => {
                          setManualControl(false)
                          setIsPaused(false)
                          setIsActive(false)
                        }}
                        style={{
                          padding: '12px 20px',
                          background: 'transparent',
                          border: '1px solid #222222',
                          borderRadius: '6px',
                          color: '#888888',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right - Artifact Preview (Optional) */}
        {showArtifact && (
          <div style={{
            width: '400px',
            background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)',
            borderLeft: '1px solid rgba(255, 138, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s ease'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 138, 0, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#ffffff',
                letterSpacing: '0.5px'
              }}>
                Live Output
              </div>
              <button
                onClick={() => setShowArtifact(false)}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#666666',
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff8a00'}
                onMouseLeave={(e) => e.target.style.color = '#666666'}
              >
                ×
              </button>
            </div>
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#888888',
              lineHeight: '1.6'
            }}>
              {taskResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ color: '#ff8a00', fontWeight: '600', marginBottom: '6px' }}>Progress Logs</div>
                    <pre style={{ color: '#cccccc', whiteSpace: 'pre-wrap' }}>
                      {(taskResult.logs || []).map((event, idx) => `${idx + 1}. [${event.level?.toUpperCase() || 'INFO'}] ${event.message}`).join('\n') || 'No logs captured.'}
                    </pre>
                  </div>
                  <div>
                    <div style={{ color: '#ff8a00', fontWeight: '600', marginBottom: '6px' }}>Collected Data</div>
                    <pre style={{ color: '#cccccc', whiteSpace: 'pre-wrap' }}>
                      {taskResult.data && taskResult.data.length > 0
                        ? JSON.stringify(taskResult.data, null, 2)
                        : 'No structured data captured.'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#666666' }}>
                  Waiting for output...
                </div>
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