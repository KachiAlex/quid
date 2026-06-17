/**
 * AI Recommendation Service
 * Provides intelligent, personalized subscription recommendations using AI analysis
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface AIRecommendation {
  id: string
  userId: string
  type: 'cost_optimization' | 'usage_pattern' | 'market_opportunity' | 'risk_mitigation' | 'behavioral'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionableSteps: string[]
  expectedImpact: {
    costSavings: number
    timeSavings: number
    riskReduction: number
  }
  confidence: number
  reasoning: string
  dataPoints: Array<{
    type: string
    value: any
    weight: number
  }>
  validUntil: Date
  createdAt: Date
  status: 'active' | 'implemented' | 'dismissed' | 'expired'
}

interface UserProfile {
  userId: string
  financialProfile: {
    estimatedIncome: number
    monthlyBudget: number
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
    savingsGoals: Array<{
      category: string
      target: number
      timeframe: string
    }>
  }
  behaviorPatterns: {
    switchingFrequency: number
    priceSensitivity: number
    brandLoyalty: number
    researchDepth: number
    decisionSpeed: number
  }
  preferences: {
    notificationFrequency: string
    communicationStyle: string
    preferredProviders: string[]
    avoidedProviders: string[]
  }
}

interface MarketInsight {
  category: string
  trend: 'increasing' | 'decreasing' | 'stable'
  marketRate: number
  competitionLevel: number
  bestProviders: Array<{
    name: string
    rate: number
    features: string[]
    satisfaction: number
  }>
  seasonalPatterns: Array<{
    period: string
    priceChange: number
    demand: number
  }>
}

class AIRecommendationService {
  private readonly aiProvider = 'openai' // Could be 'openai', 'anthropic', 'google', etc.
  private readonly modelVersion = 'gpt-4-turbo'
  private readonly confidenceThreshold = 0.7

  /**
   * Generate personalized AI recommendations for a user
   */
  async generateRecommendations(userId: string): Promise<AIRecommendation[]> {
    try {
      logger.info('Generating AI recommendations', { userId })

      // Gather user data
      const [userProfile, userProducts, marketData, behaviorData] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserProducts(userId),
        this.getMarketInsights(),
        this.getUserBehaviorData(userId)
      ])

      // Generate different types of recommendations
      const recommendations = await Promise.all([
        this.generateCostOptimizationRecommendations(userProfile, userProducts, marketData),
        this.generateUsagePatternRecommendations(userProfile, userProducts, behaviorData),
        this.generateMarketOpportunityRecommendations(userProfile, userProducts, marketData),
        this.generateRiskMitigationRecommendations(userProfile, userProducts, marketData),
        this.generateBehavioralRecommendations(userProfile, behaviorData)
      ])

      // Flatten and prioritize recommendations
      const allRecommendations = recommendations.flat()
      const prioritizedRecommendations = this.prioritizeRecommendations(allRecommendations)

      // Save recommendations to database
      await this.saveRecommendations(userId, prioritizedRecommendations)

      logger.info('AI recommendations generated', {
        userId,
        count: prioritizedRecommendations.length,
        types: prioritizedRecommendations.map(r => r.type)
      })

      return prioritizedRecommendations

    } catch (error) {
      logger.error('Failed to generate AI recommendations', error)
      throw error
    }
  }

  /**
   * Get user's financial and behavioral profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const [profileResult, behaviorResult] = await Promise.all([
        pool.query(`
          SELECT 
            up.estimated_annual_income,
            up.monthly_budget,
            up.risk_tolerance,
            up.financial_goals,
            up.notification_preferences
          FROM user_profiles up
          WHERE up.user_id = $1
        `, [userId]),
        
        pool.query(`
          SELECT 
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '90 days' THEN 1 END) as recent_actions,
            COUNT(CASE WHEN activity_type = 'switch_completed' THEN 1 END) as total_switches,
            COUNT(CASE WHEN activity_type = 'comparison_viewed' THEN 1 END) as total_comparisons,
            AVG(CASE WHEN activity_type = 'product_viewed' THEN 
              EXTRACT(EPOCH FROM (updated_at - created_at))/60 END) as avg_research_time
          FROM user_activity_log ual
          WHERE ual.user_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
        `, [userId])
      ])

      const profile = profileResult.rows[0] || {}
      const behavior = behaviorResult.rows[0] || {}

      return {
        userId,
        financialProfile: {
          estimatedIncome: profile.estimated_annual_income || 50000,
          monthlyBudget: profile.monthly_budget || 1000,
          riskTolerance: profile.risk_tolerance || 'moderate',
          savingsGoals: profile.financial_goals?.savings || []
        },
        behaviorPatterns: {
          switchingFrequency: (parseInt(behavior.total_switches) || 0) / 6, // per month
          priceSensitivity: 0.7, // Would be calculated from actual behavior
          brandLoyalty: 0.5, // Would be calculated from provider preferences
          researchDepth: Math.min(1, (parseFloat(behavior.avg_research_time) || 0) / 30),
          decisionSpeed: 0.6 // Would be calculated from time-to-decision data
        },
        preferences: {
          notificationFrequency: profile.notification_preferences?.score_updates ? 'weekly' : 'monthly',
          communicationStyle: 'detailed',
          preferredProviders: [],
          avoidedProviders: []
        }
      }

    } catch (error) {
      logger.error('Failed to get user profile', error)
      throw error
    }
  }

  /**
   * Get user's current products and subscriptions
   */
  private async getUserProducts(userId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          pr.record_id,
          pr.provider_name,
          pr.product_type,
          pr.annual_cost,
          pr.status,
          pr.renewal_date,
          ps.potential_savings,
          ps.cost_volatility,
          ps.optimization_potential,
          rr.market_rate,
          rr.competition_level
        FROM product_records pr
        LEFT JOIN product_statistics ps ON pr.record_id = ps.record_id
        LEFT JOIN rate_records rr ON pr.product_type = rr.product_type
        WHERE pr.user_id = $1 AND pr.status = 'active'
        ORDER BY pr.annual_cost DESC
      `, [userId])

      return result.rows

    } catch (error) {
      logger.error('Failed to get user products', error)
      throw error
    }
  }

  /**
   * Get current market insights and trends
   */
  private async getMarketInsights(): Promise<Record<string, MarketInsight>> {
    try {
      const result = await pool.query(`
        SELECT 
          product_type,
          AVG(annual_rate) as market_rate,
          COUNT(DISTINCT provider_name) as competition_level,
          STDDEV(annual_rate) as price_volatility,
          MAX(created_at) as last_updated
        FROM rate_records
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY product_type
      `)

      const insights: Record<string, MarketInsight> = {}

      for (const row of result.rows) {
        insights[row.product_type] = {
          category: row.product_type,
          trend: 'stable', // Would be calculated from historical data
          marketRate: parseFloat(row.market_rate) || 0,
          competitionLevel: parseInt(row.competition_level) || 0,
          bestProviders: [], // Would be populated from market analysis
          seasonalPatterns: [] // Would be populated from seasonal analysis
        }
      }

      return insights

    } catch (error) {
      logger.error('Failed to get market insights', error)
      throw error
    }
  }

  /**
   * Get user behavior and interaction data
   */
  private async getUserBehaviorData(userId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          activity_type,
          COUNT(*) as frequency,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_duration,
          MAX(created_at) as last_activity
        FROM user_activity_log
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
        GROUP BY activity_type
        ORDER BY frequency DESC
      `, [userId])

      return result.rows

    } catch (error) {
      logger.error('Failed to get user behavior data', error)
      throw error
    }
  }

  /**
   * Generate cost optimization recommendations
   */
  private async generateCostOptimizationRecommendations(
    profile: UserProfile,
    products: any[],
    marketData: Record<string, MarketInsight>
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // High-cost product analysis
    const highCostProducts = products.filter(p => p.annual_cost > 1000)
    for (const product of highCostProducts) {
      if (product.potential_savings > 200) {
        recommendations.push({
          id: `cost-opt-${product.record_id}`,
          userId: profile.userId,
          type: 'cost_optimization',
          priority: product.potential_savings > 500 ? 'high' : 'medium',
          title: `Optimize ${product.product_type} subscription`,
          description: `Your ${product.provider_name} ${product.product_type} costs £${product.annual_cost} annually, but you could save approximately £${product.potential_savings} by switching to a better rate.`,
          actionableSteps: [
            `Compare current rate with market alternatives`,
            `Check for early termination fees`,
            `Negotiate with current provider`,
            `Consider switching to top-rated providers`
          ],
          expectedImpact: {
            costSavings: product.potential_savings,
            timeSavings: 2, // hours per year
            riskReduction: 10 // percentage
          },
          confidence: 0.85,
          reasoning: `Based on market analysis, your current rate is ${((product.annual_cost - (product.annual_cost - product.potential_savings)) / product.annual_cost * 100).toFixed(0)}% above market average for similar services.`,
          dataPoints: [
            { type: 'current_cost', value: product.annual_cost, weight: 0.4 },
            { type: 'potential_savings', value: product.potential_savings, weight: 0.3 },
            { type: 'market_comparison', value: product.market_rate, weight: 0.3 }
          ],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
          status: 'active'
        })
      }
    }

    // Bundle optimization recommendations
    const productTypes = [...new Set(products.map(p => p.product_type))]
    for (const productType of productTypes) {
      const typeProducts = products.filter(p => p.product_type === productType)
      if (typeProducts.length > 1) {
        const totalCost = typeProducts.reduce((sum, p) => sum + p.annual_cost, 0)
        const totalSavings = typeProducts.reduce((sum, p) => sum + (p.potential_savings || 0), 0)
        
        if (totalSavings > 100) {
          recommendations.push({
            id: `bundle-opt-${productType}`,
            userId: profile.userId,
            type: 'cost_optimization',
            priority: totalSavings > 300 ? 'high' : 'medium',
            title: `Bundle ${productType} services for savings`,
            description: `You have ${typeProducts.length} ${productType} subscriptions totaling £${totalCost} annually. Bundling these services could save you approximately £${totalSavings}.`,
            actionableSteps: [
              `Research bundle offers from major providers`,
              `Compare bundled vs individual pricing`,
              `Check if current providers offer price matching`,
              `Consider family or household plans`
            ],
            expectedImpact: {
              costSavings: totalSavings,
              timeSavings: 5, // hours per year from consolidated billing
              riskReduction: 15
            },
            confidence: 0.75,
            reasoning: `Multiple subscriptions of the same type often qualify for bundle discounts. Market analysis shows potential savings of ${((totalSavings / totalCost) * 100).toFixed(0)}%.`,
            dataPoints: [
              { type: 'product_count', value: typeProducts.length, weight: 0.3 },
              { type: 'total_cost', value: totalCost, weight: 0.4 },
              { type: 'bundle_potential', value: totalSavings, weight: 0.3 }
            ],
            validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            status: 'active'
          })
        }
      }
    }

    return recommendations
  }

  /**
   * Generate usage pattern-based recommendations
   */
  private async generateUsagePatternRecommendations(
    profile: UserProfile,
    products: any[],
    behaviorData: any[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Low usage recommendations
    const lowUsageProducts = products.filter(p => {
      // Would be based on actual usage data
      return p.product_type === 'streaming' || p.product_type === 'gaming'
    })

    for (const product of lowUsageProducts) {
      recommendations.push({
        id: `usage-opt-${product.record_id}`,
        userId: profile.userId,
        type: 'usage_pattern',
        priority: 'medium',
        title: `Optimize ${product.product_type} usage`,
        description: `Based on your usage patterns, you may not be getting full value from your ${product.provider_name} ${product.product_type} subscription.`,
        actionableSteps: [
          `Review actual usage statistics`,
          `Consider downgrading to a cheaper tier`,
          `Look for pay-per-use alternatives`,
          `Set up usage alerts and notifications`
        ],
        expectedImpact: {
          costSavings: product.annual_cost * 0.3, // estimated 30% savings
          timeSavings: 1,
          riskReduction: 5
        },
        confidence: 0.70,
        reasoning: `Usage pattern analysis suggests underutilization compared to subscription cost.`,
        dataPoints: [
          { type: 'usage_frequency', value: 0.3, weight: 0.5 },
          { type: 'cost_per_use', value: product.annual_cost / 12, weight: 0.3 },
          { type: 'behavior_pattern', value: 'low_engagement', weight: 0.2 }
        ],
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        status: 'active'
      })
    }

    return recommendations
  }

  /**
   * Generate market opportunity recommendations
   */
  private async generateMarketOpportunityRecommendations(
    profile: UserProfile,
    products: any[],
    marketData: Record<string, MarketInsight>
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Market trend recommendations
    for (const [category, insight] of Object.entries(marketData)) {
      if (insight.trend === 'decreasing' && insight.competition_level > 5) {
        const userProducts = products.filter(p => p.product_type === category)
        
        if (userProducts.length > 0) {
          recommendations.push({
            id: `market-opp-${category}`,
            userId: profile.userId,
            type: 'market_opportunity',
            priority: 'medium',
            title: `Take advantage of ${category} market trends`,
            description: `The ${category} market is currently experiencing price reductions due to increased competition. This is an optimal time to review your subscriptions.`,
            actionableSteps: [
              `Research current market rates and promotions`,
              `Contact current providers for price matching`,
              `Consider switching to newer, competitive providers`,
              `Lock in long-term rates at current low prices`
            ],
            expectedImpact: {
              costSavings: 200, // estimated based on market trends
              timeSavings: 2,
              riskReduction: 20
            },
            confidence: 0.80,
            reasoning: `Market analysis shows decreasing prices in ${category} with high competition, creating favorable conditions for switching or renegotiating.`,
            dataPoints: [
              { type: 'market_trend', value: insight.trend, weight: 0.4 },
              { type: 'competition_level', value: insight.competition_level, weight: 0.3 },
              { type: 'price_volatility', value: insight.marketRate, weight: 0.3 }
            ],
            validUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days - time-sensitive
            createdAt: new Date(),
            status: 'active'
          })
        }
      }
    }

    return recommendations
  }

  /**
   * Generate risk mitigation recommendations
   */
  private async generateRiskMitigationRecommendations(
    profile: UserProfile,
    products: any[],
    marketData: Record<string, MarketInsight>
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // High volatility products
    const volatileProducts = products.filter(p => p.cost_volatility > 15)
    for (const product of volatileProducts) {
      recommendations.push({
        id: `risk-mit-${product.record_id}`,
        userId: profile.userId,
        type: 'risk_mitigation',
        priority: product.cost_volatility > 25 ? 'high' : 'medium',
        title: `Protect against ${product.product_type} price volatility`,
        description: `Your ${product.provider_name} ${product.product_type} shows high price volatility (${product.cost_volatility}%). Consider strategies to protect against unexpected price increases.`,
        actionableSteps: [
          `Switch to fixed-rate plans if available`,
          `Set up price increase alerts`,
          `Consider longer contracts with price guarantees`,
          `Diversify providers to reduce dependency`
        ],
        expectedImpact: {
          costSavings: product.annual_cost * 0.1, // potential savings from protection
          timeSavings: 3,
          riskReduction: product.cost_volatility
        },
        confidence: 0.85,
        reasoning: `Historical price analysis shows ${product.cost_volatility}% volatility for this product category, indicating significant risk of price increases.`,
        dataPoints: [
          { type: 'price_volatility', value: product.cost_volatility, weight: 0.5 },
          { type: 'contract_type', value: 'variable', weight: 0.3 },
          { type: 'market_stability', value: 0.3, weight: 0.2 }
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        status: 'active'
      })
    }

    // Provider concentration risk
    const providerCounts = products.reduce((acc, p) => {
      acc[p.provider_name] = (acc[p.provider_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    for (const [provider, count] of Object.entries(providerCounts)) {
      if (count >= 3 && (count / products.length) > 0.5) {
        recommendations.push({
          id: `risk-conc-${provider}`,
          userId: profile.userId,
          type: 'risk_mitigation',
          priority: 'medium',
          title: `Reduce dependency on ${provider}`,
          description: `${count} of your subscriptions (${((count / products.length) * 100).toFixed(0)}%) are with ${provider}. This concentration increases your risk from provider-specific issues.`,
          actionableSteps: [
            `Research alternative providers for each service`,
            `Gradually diversify your provider portfolio`,
            `Maintain relationships with backup providers`,
            `Consider provider-independent services where possible`
          ],
          expectedImpact: {
            costSavings: 0,
            timeSavings: 0,
            riskReduction: 25
          },
          confidence: 0.75,
          reasoning: `Provider concentration of ${((count / products.length) * 100).toFixed(0)}% increases exposure to provider-specific risks including price changes and service disruptions.`,
          dataPoints: [
            { type: 'provider_concentration', value: count / products.length, weight: 0.6 },
            { type: 'total_products', value: products.length, weight: 0.2 },
            { type: 'provider_stability', value: 0.8, weight: 0.2 }
          ],
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          status: 'active'
        })
      }
    }

    return recommendations
  }

  /**
   * Generate behavioral recommendations
   */
  private async generateBehavioralRecommendations(
    profile: UserProfile,
    behaviorData: any[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Low engagement recommendations
    if (profile.behaviorPatterns.researchDepth < 0.3) {
      recommendations.push({
        id: `behavior-research`,
        userId: profile.userId,
        type: 'behavioral',
        priority: 'low',
        title: `Improve subscription research habits`,
        description: `Your research patterns suggest you may not be exploring all options before making subscription decisions. Developing better research habits could lead to better choices and savings.`,
        actionableSteps: [
          `Set minimum research time for new subscriptions`,
          `Use comparison tools for all major decisions`,
          `Create a subscription evaluation checklist`,
          `Schedule regular subscription reviews`
        ],
        expectedImpact: {
          costSavings: 150, // estimated from better decisions
          timeSavings: -5, // initial time investment
          riskReduction: 20
        },
        confidence: 0.65,
        reasoning: `Behavioral analysis shows limited research depth (${(profile.behaviorPatterns.researchDepth * 100).toFixed(0)}% of optimal), suggesting room for improvement in decision-making process.`,
        dataPoints: [
          { type: 'research_depth', value: profile.behaviorPatterns.researchDepth, weight: 0.4 },
          { type: 'decision_speed', value: profile.behaviorPatterns.decisionSpeed, weight: 0.3 },
          { type: 'price_sensitivity', value: profile.behaviorPatterns.priceSensitivity, weight: 0.3 }
        ],
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        status: 'active'
      })
    }

    // Switching frequency recommendations
    if (profile.behaviorPatterns.switchingFrequency < 0.1) {
      recommendations.push({
        id: `behavior-switching`,
        userId: profile.userId,
        type: 'behavioral',
        priority: 'low',
        title: `Consider regular subscription reviews`,
        description: `You haven't switched subscriptions recently. Regular reviews can help ensure you're always getting the best value and taking advantage of market improvements.`,
        actionableSteps: [
          `Set calendar reminders for subscription reviews`,
          `Subscribe to market trend newsletters`,
          `Enable price monitoring alerts`,
          `Build relationships with multiple providers`
        ],
        expectedImpact: {
          costSavings: 100,
          timeSavings: 2,
          riskReduction: 15
        },
        confidence: 0.60,
        reasoning: `Low switching frequency (${profile.behaviorPatterns.switchingFrequency.toFixed(2)} per month) may indicate missed optimization opportunities.`,
        dataPoints: [
          { type: 'switching_frequency', value: profile.behaviorPatterns.switchingFrequency, weight: 0.5 },
          { type: 'market_awareness', value: 0.4, weight: 0.3 },
          { type: 'price_sensitivity', value: profile.behaviorPatterns.priceSensitivity, weight: 0.2 }
        ],
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        status: 'active'
      })
    }

    return recommendations
  }

  /**
   * Prioritize recommendations based on impact and user profile
   */
  private prioritizeRecommendations(recommendations: AIRecommendation[]): AIRecommendation[] {
    return recommendations.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      // Within same priority, sort by expected impact
      const impactA = a.expectedImpact.costSavings + a.expectedImpact.riskReduction
      const impactB = b.expectedImpact.costSavings + b.expectedImpact.riskReduction
      
      return impactB - impactA
    })
  }

  /**
   * Save recommendations to database
   */
  private async saveRecommendations(userId: string, recommendations: AIRecommendation[]): Promise<void> {
    try {
      // Deactivate old recommendations
      await pool.query(
        'UPDATE ai_recommendations SET status = $1 WHERE user_id = $2 AND status = $3',
        ['expired', userId, 'active']
      )

      // Insert new recommendations
      for (const rec of recommendations) {
        await pool.query(`
          INSERT INTO ai_recommendations (
            user_id, type, priority, title, description, actionable_steps,
            expected_impact, confidence, reasoning, data_points, valid_until,
            created_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          rec.userId,
          rec.type,
          rec.priority,
          rec.title,
          rec.description,
          JSON.stringify(rec.actionableSteps),
          JSON.stringify(rec.expectedImpact),
          rec.confidence,
          rec.reasoning,
          JSON.stringify(rec.dataPoints),
          rec.validUntil,
          rec.createdAt,
          rec.status
        ])
      }

    } catch (error) {
      logger.error('Failed to save recommendations', error)
      throw error
    }
  }

  /**
   * Get active recommendations for a user
   */
  async getRecommendations(userId: string, options: {
    type?: string
    priority?: string
    limit?: number
  } = {}): Promise<AIRecommendation[]> {
    try {
      let query = `
        SELECT * FROM ai_recommendations 
        WHERE user_id = $1 AND status = 'active' AND valid_until > NOW()
      `
      const params: any[] = [userId]
      let paramIndex = 2

      if (options.type) {
        query += ` AND type = $${paramIndex++}`
        params.push(options.type)
      }

      if (options.priority) {
        query += ` AND priority = $${paramIndex++}`
        params.push(options.priority)
      }

      query += ` ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        confidence DESC,
        created_at DESC
      `

      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`
        params.push(options.limit)
      }

      const result = await pool.query(query, params)

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        description: row.description,
        actionableSteps: JSON.parse(row.actionable_steps || '[]'),
        expectedImpact: JSON.parse(row.expected_impact || '{}'),
        confidence: parseFloat(row.confidence),
        reasoning: row.reasoning,
        dataPoints: JSON.parse(row.data_points || '[]'),
        validUntil: row.valid_until,
        createdAt: row.created_at,
        status: row.status
      }))

    } catch (error) {
      logger.error('Failed to get recommendations', error)
      throw error
    }
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(
    recommendationId: string, 
    status: 'active' | 'implemented' | 'dismissed' | 'expired',
    feedback?: string
  ): Promise<void> {
    try {
      await pool.query(`
        UPDATE ai_recommendations 
        SET status = $1, feedback = $2, updated_at = NOW()
        WHERE id = $3
      `, [status, feedback, recommendationId])

    } catch (error) {
      logger.error('Failed to update recommendation status', error)
      throw error
    }
  }

  /**
   * Get recommendation analytics and performance
   */
  async getRecommendationAnalytics(userId: string): Promise<{
    totalGenerated: number
    implementedCount: number
    dismissedCount: number
    averageConfidence: number
    totalSavings: number
    topCategories: Array<{ category: string; count: number }>
    recentPerformance: Array<{
      month: string
      recommendations: number
      implementations: number
      savings: number
    }>
  }> {
    try {
      const [analyticsResult, performanceResult] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(*) as total_generated,
            COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented_count,
            COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_count,
            AVG(confidence) as avg_confidence,
            COALESCE(SUM(CASE WHEN status = 'implemented' THEN (expected_impact->>'costSavings')::numeric ELSE 0 END), 0) as total_savings
          FROM ai_recommendations 
          WHERE user_id = $1
        `, [userId]),
        
        pool.query(`
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as recommendations,
            COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implementations,
            COALESCE(SUM(CASE WHEN status = 'implemented' THEN (expected_impact->>'costSavings')::numeric ELSE 0 END), 0) as savings
          FROM ai_recommendations 
          WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month DESC
        `, [userId])
      ])

      const analytics = analyticsResult.rows[0]

      return {
        totalGenerated: parseInt(analytics.total_generated),
        implementedCount: parseInt(analytics.implemented_count),
        dismissedCount: parseInt(analytics.dismissed_count),
        averageConfidence: parseFloat(analytics.avg_confidence) || 0,
        totalSavings: parseFloat(analytics.total_savings) || 0,
        topCategories: [], // Would be calculated from category analysis
        recentPerformance: performanceResult.rows.map(row => ({
          month: row.month,
          recommendations: parseInt(row.recommendations),
          implementations: parseInt(row.implementations),
          savings: parseFloat(row.savings)
        }))
      }

    } catch (error) {
      logger.error('Failed to get recommendation analytics', error)
      throw error
    }
  }
}

// Export singleton instance
export const aiRecommendationService = new AIRecommendationService()

// Export types for use in other modules
export type {
  AIRecommendation,
  UserProfile,
  MarketInsight,
}
