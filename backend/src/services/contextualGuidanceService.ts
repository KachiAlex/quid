/**
 * Contextual Guidance Service
 * Provides intelligent, context-aware help and recommendations throughout the user journey
 */

import { pool } from '../db'
import { logger } from '../config/logger'

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
    showAfter: number
    duration?: number
    cooldown?: number
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
  userId: string
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

class ContextualGuidanceService {
  /**
   * Get contextual guidance items for a user
   */
  async getGuidanceItems(userId: string, options: {
    page?: string
    section?: string
    type?: string
    limit?: number
  } = {}): Promise<GuidanceItem[]> {
    try {
      const userState = await this.getUserGuidanceState(userId)
      const userProfile = await this.getUserProfile(userId)
      
      let query = `
        SELECT * FROM contextual_guidance 
        WHERE status = 'active'
      `
      const params: any[] = []
      let paramIndex = 1

      if (options.page) {
        query += ` AND context->>'page' = $${paramIndex++}`
        params.push(options.page)
      }

      if (options.section) {
        query += ` AND context->>'section' = $${paramIndex++}`
        params.push(options.section)
      }

      if (options.type) {
        query += ` AND type = $${paramIndex++}`
        params.push(options.type)
      }

      query += ` ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        created_at DESC
      `

      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`
        params.push(options.limit)
      }

      const result = await pool.query(query, params)
      
      // Filter based on user state and targeting
      const filteredItems = result.rows.filter(item => {
        // Check if already dismissed or completed
        if (userState.dismissedItems.includes(item.id)) return false
        if (userState.completedItems.includes(item.id)) return false
        
        // Check timing
        const lastShown = userState.lastShown[item.id] || 0
        const cooldown = (item.timing as any).cooldown || 0
        if (Date.now() - lastShown < cooldown * 1000) return false
        
        // Check targeting
        if (!this.matchesTargeting(item, userProfile)) return false
        
        // Check user preferences
        if (!this.matchesPreferences(item, userState.preferences)) return false
        
        return true
      })

      // Update analytics for shown items
      await this.updateAnalytics(filteredItems.map(item => item.id), 'shown')

      return filteredItems.map(row => ({
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description,
        context: row.context,
        priority: row.priority,
        actionable: row.actionable,
        actions: row.actions,
        timing: row.timing,
        targeting: row.targeting,
        content: row.content,
        analytics: row.analytics,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

    } catch (error) {
      logger.error('Failed to get guidance items', error)
      throw error
    }
  }

  /**
   * Get user's guidance state
   */
  async getUserGuidanceState(userId: string): Promise<UserGuidanceState> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_guidance_state WHERE user_id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        // Create default state
        const defaultState: UserGuidanceState = {
          userId,
          dismissedItems: [],
          completedItems: [],
          lastShown: {},
          preferences: {
            showTips: true,
            showTutorials: true,
            showRecommendations: true,
            frequency: 'medium'
          }
        }

        await pool.query(`
          INSERT INTO user_guidance_state (user_id, dismissed_items, completed_items, last_shown, preferences)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          userId,
          JSON.stringify(defaultState.dismissedItems),
          JSON.stringify(defaultState.completedItems),
          JSON.stringify(defaultState.lastShown),
          JSON.stringify(defaultState.preferences)
        ])

        return defaultState
      }

      const row = result.rows[0]
      return {
        userId: row.user_id,
        dismissedItems: JSON.parse(row.dismissed_items || '[]'),
        completedItems: JSON.parse(row.completed_items || '[]'),
        lastShown: JSON.parse(row.last_shown || '{}'),
        preferences: JSON.parse(row.preferences || '{}')
      }

    } catch (error) {
      logger.error('Failed to get user guidance state', error)
      throw error
    }
  }

  /**
   * Get user profile for targeting
   */
  private async getUserProfile(userId: string) {
    try {
      const [profileResult, scoreResult] = await Promise.all([
        pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
        pool.query(`
          SELECT overall_score, score_category 
          FROM financial_health_scores 
          WHERE user_id = $1 
          ORDER BY calculated_at DESC 
          LIMIT 1
        `, [userId])
      ])

      return {
        profile: profileResult.rows[0] || {},
        score: scoreResult.rows[0] || null
      }

    } catch (error) {
      logger.error('Failed to get user profile', error)
      return { profile: {}, score: null }
    }
  }

  /**
   * Check if item matches user targeting criteria
   */
  private matchesTargeting(item: any, userProfile: any): boolean {
    const targeting = item.targeting || {}
    
    // Check score range
    if (targeting.minScore || targeting.maxScore) {
      const userScore = userProfile.score?.overall_score || 0
      if (targeting.minScore && userScore < targeting.minScore) return false
      if (targeting.maxScore && userScore > targeting.maxScore) return false
    }

    // Check user segments (simplified)
    if (targeting.userSegment && targeting.userSegment.length > 0) {
      // Would implement actual user segmentation logic
      const userSegment = this.determineUserSegment(userProfile)
      if (!targeting.userSegment.includes(userSegment)) return false
    }

    return true
  }

  /**
   * Determine user segment (simplified)
   */
  private determineUserSegment(userProfile: any): string {
    const score = userProfile.score?.overall_score || 0
    
    if (score >= 80) return 'power_user'
    if (score >= 60) return 'engaged_user'
    if (score >= 40) return 'casual_user'
    return 'new_user'
  }

  /**
   * Check if item matches user preferences
   */
  private matchesPreferences(item: any, preferences: any): boolean {
    switch (item.type) {
      case 'tip':
        return preferences.showTips !== false
      case 'tutorial':
        return preferences.showTutorials !== false
      case 'recommendation':
        return preferences.showRecommendations !== false
      default:
        return true
    }
  }

  /**
   * Dismiss a guidance item
   */
  async dismissGuidanceItem(userId: string, itemId: string): Promise<void> {
    try {
      await pool.query(`
        UPDATE user_guidance_state 
        SET 
          dismissed_items = dismissed_items || $1::text,
          last_shown = jsonb_set(last_shown, $2::text[], $3::bigint),
          updated_at = NOW()
        WHERE user_id = $4
      `, [
        JSON.stringify([itemId]),
        `{${itemId}}`,
        Date.now(),
        userId
      ])

      await this.updateAnalytics([itemId], 'dismissed')

    } catch (error) {
      logger.error('Failed to dismiss guidance item', error)
      throw error
    }
  }

  /**
   * Complete a guidance item
   */
  async completeGuidanceItem(userId: string, itemId: string): Promise<void> {
    try {
      await pool.query(`
        UPDATE user_guidance_state 
        SET 
          completed_items = completed_items || $1::text,
          updated_at = NOW()
        WHERE user_id = $2
      `, [
        JSON.stringify([itemId]),
        userId
      ])

      await this.updateAnalytics([itemId], 'completed')

    } catch (error) {
      logger.error('Failed to complete guidance item', error)
      throw error
    }
  }

  /**
   * Handle guidance item action
   */
  async handleGuidanceAction(userId: string, itemId: string, action: string): Promise<void> {
    try {
      // Log the action
      await pool.query(`
        INSERT INTO guidance_action_log (user_id, item_id, action, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [userId, itemId, action])

      await this.updateAnalytics([itemId], 'clicked')

    } catch (error) {
      logger.error('Failed to handle guidance action', error)
      throw error
    }
  }

  /**
   * Update guidance analytics
   */
  private async updateAnalytics(itemIds: string[], action: 'shown' | 'clicked' | 'dismissed' | 'completed'): Promise<void> {
    try {
      const column = action === 'shown' ? 'shown' : 
                    action === 'clicked' ? 'clicked' : 
                    action === 'dismissed' ? 'dismissed' : 'completed'

      await pool.query(`
        UPDATE contextual_guidance 
        SET analytics = jsonb_set(analytics, $1::text[], (analytics->>$1)::int + 1),
            updated_at = NOW()
        WHERE id = ANY($2)
      `, [`{${column}}`, itemIds])

    } catch (error) {
      logger.error('Failed to update guidance analytics', error)
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserGuidanceState['preferences']>): Promise<void> {
    try {
      await pool.query(`
        UPDATE user_guidance_state 
        SET preferences = jsonb_set(preferences, '{}', $1::jsonb, true),
            updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(preferences), userId])

    } catch (error) {
      logger.error('Failed to update user preferences', error)
      throw error
    }
  }

  /**
   * Create guidance item (admin)
   */
  async createGuidanceItem(item: Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const result = await pool.query(`
        INSERT INTO contextual_guidance (
          type, title, description, context, priority, actionable, actions,
          timing, targeting, content, status, analytics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        item.type,
        item.title,
        item.description,
        JSON.stringify(item.context),
        item.priority,
        item.actionable,
        JSON.stringify(item.actions || []),
        JSON.stringify(item.timing),
        JSON.stringify(item.targeting),
        JSON.stringify(item.content),
        item.status,
        JSON.stringify({
          shown: 0,
          clicked: 0,
          dismissed: 0,
          completed: 0
        })
      ])

      return result.rows[0].id

    } catch (error) {
      logger.error('Failed to create guidance item', error)
      throw error
    }
  }

  /**
   * Get guidance analytics (admin)
   */
  async getGuidanceAnalytics(options: {
    startDate?: string
    endDate?: string
    type?: string
  } = {}): Promise<{
    totalItems: number
    activeItems: number
    totalShown: number
    totalClicked: number
    totalDismissed: number
    totalCompleted: number
    averageEngagement: number
    topPerformingItems: Array<{
      id: string
      title: string
      type: string
      engagement: number
    }>
    typeBreakdown: Record<string, {
      count: number
      engagement: number
    }>
  }> {
    try {
      let whereClause = 'WHERE 1=1'
      const params: any[] = []

      if (options.startDate) {
        whereClause += ` AND created_at >= $${params.length + 1}`
        params.push(options.startDate)
      }

      if (options.endDate) {
        whereClause += ` AND created_at <= $${params.length + 1}`
        params.push(options.endDate)
      }

      if (options.type) {
        whereClause += ` AND type = $${params.length + 1}`
        params.push(options.type)
      }

      const [summaryResult, typeResult, topResult] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_items,
            COALESCE(SUM((analytics->>'shown')::int), 0) as total_shown,
            COALESCE(SUM((analytics->>'clicked')::int), 0) as total_clicked,
            COALESCE(SUM((analytics->>'dismissed')::int), 0) as total_dismissed,
            COALESCE(SUM((analytics->>'completed')::int), 0) as total_completed
          FROM contextual_guidance 
          ${whereClause}
        `, params),
        
        pool.query(`
          SELECT 
            type,
            COUNT(*) as count,
            CASE 
              WHEN SUM((analytics->>'shown')::int) > 0 
              THEN ROUND(SUM((analytics->>'clicked')::int)::numeric / SUM((analytics->>'shown')::int) * 100, 2)
              ELSE 0 
            END as engagement
          FROM contextual_guidance 
          ${whereClause}
          GROUP BY type
        `, params),
        
        pool.query(`
          SELECT 
            id, title, type,
            CASE 
              WHEN (analytics->>'shown')::int > 0 
              THEN ROUND((analytics->>'clicked')::numeric / (analytics->>'shown')::int * 100, 2)
              ELSE 0 
            END as engagement
          FROM contextual_guidance 
          ${whereClause}
          ORDER BY engagement DESC
          LIMIT 10
        `, params)
      ])

      const summary = summaryResult.rows[0]
      const averageEngagement = summary.total_shown > 0 
        ? (summary.total_clicked / summary.total_shown) * 100 
        : 0

      return {
        totalItems: parseInt(summary.total_items),
        activeItems: parseInt(summary.active_items),
        totalShown: parseInt(summary.total_shown),
        totalClicked: parseInt(summary.total_clicked),
        totalDismissed: parseInt(summary.total_dismissed),
        totalCompleted: parseInt(summary.total_completed),
        averageEngagement,
        topPerformingItems: topResult.rows,
        typeBreakdown: typeResult.rows.reduce((acc, row) => {
          acc[row.type] = {
            count: parseInt(row.count),
            engagement: parseFloat(row.engagement)
          }
          return acc
        }, {} as Record<string, { count: number; engagement: number }>)
      }

    } catch (error) {
      logger.error('Failed to get guidance analytics', error)
      throw error
    }
  }

  /**
   * Generate contextual guidance based on user state
   */
  async generateContextualGuidance(userId: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(userId)
      const userState = await this.getUserGuidanceState(userId)
      
      // Generate guidance based on different contexts
      const guidanceItems = []

      // New user guidance
      if (this.isNewUser(userState)) {
        guidanceItems.push(this.generateNewUserGuidance())
      }

      // Financial health guidance
      if (userProfile.score) {
        guidanceItems.push(...this.generateFinancialHealthGuidance(userProfile.score))
      }

      // Savings opportunity guidance
      const savingsData = await this.getUserSavingsData(userId)
      guidanceItems.push(...this.generateSavingsGuidance(savingsData))

      // Behavior-based guidance
      const behaviorData = await this.getUserBehaviorData(userId)
      guidanceItems.push(...this.generateBehaviorGuidance(behaviorData))

      // Create guidance items
      for (const item of guidanceItems) {
        await this.createGuidanceItem(item)
      }

    } catch (error) {
      logger.error('Failed to generate contextual guidance', error)
      throw error
    }
  }

  /**
   * Check if user is new
   */
  private isNewUser(userState: UserGuidanceState): boolean {
    return userState.completedItems.length === 0 && userState.dismissedItems.length === 0
  }

  /**
   * Generate new user guidance
   */
  private generateNewUserGuidance(): Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'> {
    return {
      type: 'tutorial',
      title: 'Welcome to Quid! Let\'s get you started',
      description: 'Follow our quick tour to learn how to save money on your subscriptions.',
      context: { page: 'dashboard', section: 'overview', trigger: 'new_user' },
      priority: 'high',
      actionable: true,
      actions: [
        { label: 'Start Tour', type: 'primary', action: 'start_tour' },
        { label: 'Skip', type: 'secondary', action: 'skip' }
      ],
      timing: { showAfter: 0, cooldown: 86400 },
      targeting: {},
      content: {
        icon: 'sparkles',
        steps: [
          'Connect your bank account to automatically track subscriptions',
          'Review your subscription analysis and savings opportunities',
          'Set up alerts for price changes and renewals',
          'Explore your financial health score and recommendations'
        ]
      },
      status: 'active'
    }
  }

  /**
   * Generate financial health guidance
   */
  private generateFinancialHealthGuidance(score: any): Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>[] {
    const items: Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>[] = []

    if (score.overall_score < 60) {
      items.push({
        type: 'recommendation',
        title: 'Improve Your Financial Health Score',
        description: `Your current score is ${score.overall_score}. Here are personalized recommendations to improve it.`,
        context: { page: 'financial-health', section: 'overview', trigger: 'low_score' },
        priority: 'high',
        actionable: true,
        actions: [
          { label: 'View Recommendations', type: 'primary', action: 'view_recommendations', url: '/financial-health' }
        ],
        timing: { showAfter: 5, cooldown: 604800 },
        targeting: { maxScore: 60 },
        content: {
          icon: 'target',
          examples: [
            {
              title: 'Cost Optimization',
              description: 'Switch to better deals for your highest-cost subscriptions',
              result: 'Potential savings: £300/year'
            },
            {
              title: 'Reduce Volatility',
              description: 'Choose fixed-rate plans to avoid price increases',
              result: 'Risk reduction: 25%'
            }
          ]
        },
        status: 'active'
      })
    }

    return items
  }

  /**
   * Get user savings data
   */
  private async getUserSavingsData(userId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_subscriptions,
          COALESCE(SUM(annual_cost), 0) as total_cost,
          COALESCE(SUM(ps.potential_savings), 0) as total_savings
        FROM product_records pr
        LEFT JOIN product_statistics ps ON pr.record_id = ps.record_id
        WHERE pr.user_id = $1 AND pr.status = 'active'
      `, [userId])

      return result.rows[0] || { total_subscriptions: 0, total_cost: 0, total_savings: 0 }

    } catch (error) {
      logger.error('Failed to get user savings data', error)
      return { total_subscriptions: 0, total_cost: 0, total_savings: 0 }
    }
  }

  /**
   * Generate savings guidance
   */
  private generateSavingsGuidance(savingsData: any): Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>[] {
    const items: Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>[] = []

    if (savingsData.total_savings > 100) {
      items.push({
        type: 'tip',
        title: 'Significant Savings Available',
        description: `You could save £${Math.round(savingsData.total_savings)} annually by optimizing your subscriptions.`,
        context: { page: 'dashboard', section: 'savings', trigger: 'high_savings' },
        priority: 'high',
        actionable: true,
        actions: [
          { label: 'View Opportunities', type: 'primary', action: 'view_savings', url: '/dashboard' }
        ],
        timing: { showAfter: 10, cooldown: 86400 },
        targeting: {},
        content: {
          icon: 'trending-up',
          examples: [
            {
              title: 'Top Opportunity',
              description: 'Your most expensive subscription has the highest savings potential',
              result: 'Save up to 40% on this subscription'
            }
          ]
        },
        status: 'active'
      })
    }

    return items
  }

  /**
   * Get user behavior data
   */
  private async getUserBehaviorData(userId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN activity_type = 'comparison_viewed' THEN 1 END) as comparisons,
          COUNT(CASE WHEN activity_type = 'switch_completed' THEN 1 END) as switches,
          MAX(created_at) as last_activity
        FROM user_activity_log
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      `, [userId])

      return result.rows[0] || { comparisons: 0, switches: 0, last_activity: null }

    } catch (error) {
      logger.error('Failed to get user behavior data', error)
      return { comparisons: 0, switches: 0, last_activity: null }
    }
  }

  /**
   * Generate behavior-based guidance
   */
  private generateBehaviorGuidance(behaviorData: any): Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>[] {
    const items: Omit<GuidanceItem, 'id' | 'analytics' | 'createdAt' | 'updatedAt'>[] = []

    if (behaviorData.comparisons > 5 && behaviorData.switches === 0) {
      items.push({
        type: 'tip',
        title: 'Ready to Make a Switch?',
        description: 'You\'ve been comparing options but haven\'t made any switches yet. Take action on your research!',
        context: { page: 'comparison', section: 'results', trigger: 'comparison_without_action' },
        priority: 'medium',
        actionable: true,
        actions: [
          { label: 'View Switch Options', type: 'primary', action: 'view_switches' }
        ],
        timing: { showAfter: 15, cooldown: 172800 },
        targeting: {},
        content: {
          icon: 'zap',
          steps: [
            'Review your comparison results',
            'Check switching costs and benefits',
            'Complete the switch process',
            'Track your savings'
          ]
        },
        status: 'active'
      })
    }

    return items
  }
}

// Export singleton instance
export const contextualGuidanceService = new ContextualGuidanceService()

// Export types for use in other modules
export type {
  GuidanceItem,
  UserGuidanceState,
}
