import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Lightbulb, Info, AlertTriangle, CheckCircle,
  X, ChevronRight, ArrowUpRight, Target,
  TrendingUp, Shield, Zap, Clock,
  HelpCircle, BookOpen, Video, MessageSquare,
  Sparkles, Brain, Compass
} from 'lucide-react'
import api from '../lib/api'

interface GuidanceItem {
  id: string
  type: 'tip' | 'warning' | 'success' | 'info' | 'tutorial' | 'recommendation'
  title: string
  description: string
  context: {
    page: string
    section: string
    trigger: string
  }
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
  actions?: Array<{
    label: string
    type: 'primary' | 'secondary'
    action: string
    url?: string
  }>
  timing: {
    showAfter: number // seconds
    duration?: number // seconds, undefined = persistent until dismissed
    cooldown?: number // seconds before showing again
  }
  targeting: {
    userSegment?: string[]
    minScore?: number
    maxScore?: number
    requiredFeatures?: string[]
    excludedFeatures?: string[]
  }
  content: {
    icon?: string
    image?: string
    video?: string
    steps?: string[]
    examples?: Array<{
      title: string
      description: string
      result: string
    }>
  }
  analytics: {
    shown: number
    clicked: number
    dismissed: number
    completed: number
  }
  status: 'active' | 'paused' | 'archived'
  createdAt: string
  updatedAt: string
}

interface UserGuidanceState {
  dismissedItems: string[]
  completedItems: string[]
  lastShown: Record<string, number>
  preferences: {
    showTips: boolean
    showTutorials: boolean
    showRecommendations: boolean
    frequency: 'high' | 'medium' | 'low'
  }
}

const guidanceTypes = {
  tip: { 
    icon: Lightbulb, 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/10', 
    borderColor: 'border-amber-500/30' 
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10', 
    borderColor: 'border-orange-500/30' 
  },
  success: { 
    icon: CheckCircle, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10', 
    borderColor: 'border-emerald-500/30' 
  },
  info: { 
    icon: Info, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10', 
    borderColor: 'border-blue-500/30' 
  },
  tutorial: { 
    icon: BookOpen, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/10', 
    borderColor: 'border-purple-500/30' 
  },
  recommendation: { 
    icon: Sparkles, 
    color: 'text-violet-400', 
    bgColor: 'bg-violet-500/10', 
    borderColor: 'border-violet-500/30' 
  }
}

function GuidanceCard({ 
  guidance, 
  onDismiss, 
  onAction, 
  onComplete 
}: { 
  guidance: GuidanceItem
  onDismiss: (id: string) => void
  onAction: (id: string, action: string) => void
  onComplete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const typeConfig = guidanceTypes[guidance.type]
  const Icon = typeConfig.icon

  const handleAction = (action: any) => {
    onAction(guidance.id, action.action)
    
    if (action.type === 'primary' && guidance.content.steps) {
      if (currentStep < guidance.content.steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        onComplete(guidance.id)
      }
    }
  }

  return (
    <div className={`rounded-2xl border ${typeConfig.borderColor} ${typeConfig.bgColor} p-4 transition-all duration-300 hover:shadow-lg`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeConfig.bgColor}`}>
          <Icon className={`h-4 w-4 ${typeConfig.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">{guidance.title}</h3>
              <p className="text-xs text-white/70 leading-relaxed">{guidance.description}</p>
            </div>
            
            <button
              onClick={() => onDismiss(guidance.id)}
              className="ml-2 flex h-6 w-6 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Content based on type */}
          {guidance.content.steps && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50">
                  Step {currentStep + 1} of {guidance.content.steps.length}
                </span>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-white/50 hover:text-white transition"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              </div>
              
              {expanded && (
                <div className="bg-white/5 rounded-lg p-3 mb-3">
                  <p className="text-xs text-white/80 mb-2">
                    {guidance.content.steps[currentStep]}
                  </p>
                  <div className="flex gap-1">
                    {guidance.content.steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 flex-1 rounded-full ${
                          index <= currentStep ? 'bg-white/40' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {guidance.content.examples && expanded && (
            <div className="mt-3 space-y-2">
              {guidance.content.examples.map((example, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-white mb-1">{example.title}</h4>
                  <p className="text-xs text-white/60 mb-1">{example.description}</p>
                  <p className="text-xs text-emerald-400">{example.result}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {guidance.actions && guidance.actions.length > 0 && (
            <div className="mt-3 flex gap-2">
              {guidance.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    action.type === 'primary'
                      ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {action.label}
                  {action.url && <ArrowUpRight className="h-3 w-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GuidanceTooltip({ 
  children, 
  content, 
  position = 'top' 
}: { 
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const [show, setShow] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {show && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-64 rounded-lg border border-white/10 bg-[#1a1a2e] p-3 text-xs text-white/80 shadow-lg ${positionClasses[position]}`}
        >
          <div className="absolute w-2 h-2 bg-[#1a1a2e] border border-white/10 transform rotate-45">
            {position === 'top' && 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0'}
            {position === 'bottom' && 'top-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-b-0 border-l-0'}
            {position === 'left' && 'right-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 border-r-0 border-t-0'}
            {position === 'right' && 'left-full top-1/2 transform -translate-y-1/2 translate-x-1/2 border-l-0 border-t-0'}
          </div>
          {content}
        </div>
      )}
    </div>
  )
}

function InteractiveTour({ 
  steps, 
  onStart, 
  onComplete 
}: { 
  steps: Array<{
    target: string
    title: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
  }>
  onStart: () => void
  onComplete: () => void
}) {
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const location = useLocation()

  const startTour = () => {
    setActive(true)
    setCurrentStep(0)
    onStart()
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setActive(false)
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipTour = () => {
    setActive(false)
  }

  if (!active) {
    return (
      <button
        onClick={startTour}
        className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6d28d9]"
      >
        <Compass className="h-4 w-4" />
        Start Tour
      </button>
    )
  }

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
          <button
            onClick={skipTour}
            className="text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-white/70 mb-6">{step.content}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-8 rounded-full ${
                  index <= currentStep ? 'bg-[#7c3aed]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition"
              >
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-2 text-sm font-medium bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContextualGuidance({ 
  page, 
  section 
}: { 
  page: string
  section?: string 
}) {
  const [guidanceItems, setGuidanceItems] = useState<GuidanceItem[]>([])
  const [userState, setUserState] = useState<UserGuidanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    fetchGuidanceData()
  }, [page, section])

  const fetchGuidanceData = async () => {
    try {
      setLoading(true)
      
      const [guidanceResponse, stateResponse] = await Promise.all([
        api.get(`/products/contextual-guidance?page=${page}${section ? `&section=${section}` : ''}`),
        api.get('/products/user-guidance-state')
      ])

      setGuidanceItems(guidanceResponse.data)
      setUserState(stateResponse.data)

    } catch (error) {
      console.error('Failed to fetch guidance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/products/contextual-guidance/${id}/dismiss`)
      
      setGuidanceItems(prev => prev.filter(item => item.id !== id))
      setUserState(prev => prev ? {
        ...prev,
        dismissedItems: [...prev.dismissedItems, id],
        lastShown: { ...prev.lastShown, [id]: Date.now() }
      } : null)

    } catch (error) {
      console.error('Failed to dismiss guidance:', error)
    }
  }

  const handleAction = async (id: string, action: string) => {
    try {
      await api.post(`/products/contextual-guidance/${id}/action`, { action })
      
      // Track analytics
      setGuidanceItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, analytics: { ...item.analytics, clicked: item.analytics.clicked + 1 } }
          : item
      ))

    } catch (error) {
      console.error('Failed to handle guidance action:', error)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/products/contextual-guidance/${id}/complete`)
      
      setGuidanceItems(prev => prev.filter(item => item.id !== id))
      setUserState(prev => prev ? {
        ...prev,
        completedItems: [...prev.completedItems, id]
      } : null)

    } catch (error) {
      console.error('Failed to complete guidance:', error)
    }
  }

  const visibleItems = guidanceItems.filter(item => {
    if (!userState) return true
    if (userState.dismissedItems.includes(item.id)) return false
    if (userState.completedItems.includes(item.id)) return false
    
    // Check timing
    const lastShown = userState.lastShown[item.id] || 0
    const cooldown = item.timing.cooldown || 0
    if (Date.now() - lastShown < cooldown * 1000) return false
    
    return true
  })

  if (loading) {
    return null
  }

  // Sample tour steps for demonstration
  const tourSteps = [
    {
      target: 'dashboard-overview',
      title: 'Welcome to Your Dashboard',
      content: 'This is your financial command center. Here you can see your savings, opportunities, and financial health at a glance.',
      position: 'bottom' as const
    },
    {
      target: 'financial-health-score',
      title: 'Your Financial Health Score',
      content: 'This score represents your overall subscription financial health. Click here to see detailed insights and recommendations.',
      position: 'left' as const
    },
    {
      target: 'savings-opportunities',
      title: 'Savings Opportunities',
      content: 'These are your top opportunities to save money. We analyze your subscriptions and find better deals for you.',
      position: 'top' as const
    }
  ]

  return (
    <div className="space-y-4">
      {/* Tour Button */}
      {page === 'dashboard' && !showTour && (
        <div className="flex justify-center mb-6">
          <InteractiveTour
            steps={tourSteps}
            onStart={() => setShowTour(true)}
            onComplete={() => setShowTour(false)}
          />
        </div>
      )}

      {/* Guidance Cards */}
      {visibleItems.length > 0 && (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <GuidanceCard
              key={item.id}
              guidance={item}
              onDismiss={handleDismiss}
              onAction={handleAction}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Quick Tips */}
      {page === 'dashboard' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <GuidanceTooltip content="Connect your bank account to automatically track subscriptions and find savings opportunities">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <Brain className="h-4 w-4 text-violet-400" />
              <span className="text-xs text-white/70">AI-powered insights</span>
            </div>
          </GuidanceTooltip>
          
          <GuidanceTooltip content="Set up alerts to get notified about price changes and renewal dates">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-white/70">Smart alerts</span>
            </div>
          </GuidanceTooltip>
          
          <GuidanceTooltip content="Compare your subscriptions with market rates to find better deals">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-white/70">Market comparison</span>
            </div>
          </GuidanceTooltip>
        </div>
      )}

      {/* Contextual Help */}
      {section === 'comparison' && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Comparison Tips</h4>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• Look at both monthly and annual costs</li>
                <li>• Check for hidden fees and setup costs</li>
                <li>• Consider contract length and cancellation terms</li>
                <li>• Compare features, not just price</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicators */}
      {page === 'onboarding' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                    step <= 2 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'bg-white/10 border-white/20 text-white/50'
                  }`}
                >
                  {step <= 2 ? '✓' : step}
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Onboarding Progress</p>
              <p className="text-xs text-white/70">2 of 4 steps completed</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/50" />
          </div>
        </div>
      )}
    </div>
  )
}

// Export components for use in other parts of the app
export { GuidanceTooltip, InteractiveTour }
