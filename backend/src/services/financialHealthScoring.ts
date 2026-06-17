/**
 * Financial Health Scoring Service
 * Calculates and analyzes financial health scores based on subscription data
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface FinancialHealthScore {
  id: string
  userId: string
  overallScore: number
  scoreCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  componentScores: {
    affordability: number
    optimization: number
    stability: number
    diversity: number
    awareness: number
  }
  factors: {
    totalSubscriptions: number
    totalAnnualCost: number
    averageCostPerSubscription: number
    potentialSavings: number
    savingsPercentage: number
    costVolatility: number
    renewalAlertCount: number
    priceHikeAlertCount: number
    productDiversityScore: number
    monitoringEngagement: number
  }
  recommendations: Array<{
    category: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    potentialImpact: number
    estimatedSavings: number
  }>
  calculatedAt: Date
  nextReviewDate: Date
}

interface ScoreHistory {
  id: string
  userId: string
  score: number
  category: string
  calculatedAt: Date
  changeFromPrevious: number
  keyFactors: string[]
}

interface ScoreFactors {
  affordability: {
    weight: number
    score: number
    factors: {
      costToIncomeRatio: number
      budgetUtilization: number
      paymentHistory: number
      emergencyBuffer: number
    }
  }
  optimization: {
    weight: number
    score: number
    factors: {
      potentialSavings: number
      overpaymentRate: number
      marketComparison: number
      switchingFrequency: number
    }
  }
  stability: {
    weight: number
    score: number
    factors: {
      costVolatility: number
      providerStability: number
      contractLength: number
      priceHikeFrequency: number
    }
  }
  diversity: {
    weight: number
    score: number
    factors: {
      providerDiversity: number
      productTypeDiversity: number
      riskConcentration: number
      marketCoverage: number
    }
  }
  awareness: {
    weight: number
    score: number
    factors: {
      monitoringFrequency: number
      alertResponseRate: number
      reviewEngagement: number
      optimizationActions: number
    }
  }
}

class FinancialHealthScoringService {
  private readonly scoreWeights = {
    affordability: 0.30,
    optimization: 0.25,
    stability: 0.20,
    diversity: 0.15,
    awareness: 0.10,
  }

  private readonly scoreCategories = {
    excellent: { min: 90, max: 100, color: '#10B981', description: 'Excellent financial health' },
    good: { min: 75, max: 89, color: '#3B82F6', description: 'Good financial health' },
    fair: { min: 60, max: 74, color: '#F59E0B', description: 'Fair financial health' },
    poor: { min: 40, max: 59, color: '#EF4444', description: 'Poor financial health' },
    critical: { min: 0, max: 39, color: '#991B1B', description: 'Critical financial health' },
  }

  /**
   * Calculate comprehensive financial health score for a user
   */
  async calculateFinancialHealthScore(userId: string): Promise<FinancialHealthScore> {
    try {
      logger.info('Calculating financial health score', { userId })

      // Get user's subscription data
      const subscriptionData = await this.getUserSubscriptionData(userId)
      
      // Calculate component scores
      const componentScores = await this.calculateComponentScores(userId, subscriptionData)
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(componentScores)
      
      // Determine score category
      const scoreCategory = this.getScoreCategory(overallScore)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, componentScores, subscriptionData)
      
      // Calculate next review date
      const nextReviewDate = this.calculateNextReviewDate(scoreCategory)

      // Save score to database
      const scoreId = await this.saveFinancialHealthScore(userId, {
        overallScore,
        scoreCategory,
        componentScores,
        subscriptionData,
        recommendations,
        nextReviewDate,
      })

      const financialHealthScore: FinancialHealthScore = {
        id: scoreId,
        userId,
        overallScore,
        scoreCategory,
        componentScores: {
          affordability: componentScores.affordability.score,
          optimization: componentScores.optimization.score,
          stability: componentScores.stability.score,
          diversity: componentScores.diversity.score,
          awareness: componentScores.awareness.score,
        },
        factors: {
          totalSubscriptions: subscriptionData.totalSubscriptions,
          totalAnnualCost: subscriptionData.totalAnnualCost,
          averageCostPerSubscription: subscriptionData.averageCostPerSubscription,
          potentialSavings: subscriptionData.potentialSavings,
          savingsPercentage: subscriptionData.savingsPercentage,
          costVolatility: subscriptionData.costVolatility,
          renewalAlertCount: subscriptionData.renewalAlertCount,
          priceHikeAlertCount: subscriptionData.priceHikeAlertCount,
          productDiversityScore: subscriptionData.productDiversityScore,
          monitoringEngagement: subscriptionData.monitoringEngagement,
        },
        recommendations,
        calculatedAt: new Date(),
        nextReviewDate,
      }

      logger.info('Financial health score calculated', {
        userId,
        score: overallScore,
        category: scoreCategory,
      })

      return financialHealthScore

    } catch (error) {
      logger.error('Failed to calculate financial health score', error)
      throw error
    }
  }

  /**
   * Get user's subscription data for scoring
   */
  private async getUserSubscriptionData(userId: string): Promise<any> {
    try {
      const [productsResult, statsResult, alertsResult] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(*) as total_subscriptions,
            COALESCE(SUM(annual_cost), 0) as total_annual_cost,
            COALESCE(AVG(annual_cost), 0) as average_cost,
            COUNT(DISTINCT provider_name) as unique_providers,
            COUNT(DISTINCT product_type) as unique_product_types,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
          FROM product_records 
          WHERE user_id = $1 AND status = 'active'
        `, [userId]),
        
        pool.query(`
          SELECT 
            COALESCE(SUM(potential_savings), 0) as total_potential_savings,
            COALESCE(AVG(cost_volatility), 0) as avg_cost_volatility
          FROM product_statistics 
          WHERE user_id = $1
        `, [userId]),
        
        pool.query(`
          SELECT 
            COUNT(CASE WHEN alert_type = 'renewal' THEN 1 END) as renewal_alerts,
            COUNT(CASE WHEN alert_type = 'price_hike' THEN 1 END) as price_hike_alerts,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
            COUNT(*) as total_alerts
          FROM user_alerts 
          WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
        `, [userId]),
      ])

      const products = productsResult.rows[0]
      const stats = statsResult.rows[0]
      const alerts = alertsResult.rows[0]

      const totalAnnualCost = parseFloat(products.total_annual_cost)
      const potentialSavings = parseFloat(stats.total_potential_savings)
      const savingsPercentage = totalAnnualCost > 0 ? (potentialSavings / totalAnnualCost) * 100 : 0

      return {
        totalSubscriptions: parseInt(products.total_subscriptions),
        totalAnnualCost,
        averageCostPerSubscription: parseFloat(products.average_cost),
        uniqueProviders: parseInt(products.unique_providers),
        uniqueProductTypes: parseInt(products.unique_product_types),
        activeSubscriptions: parseInt(products.active_subscriptions),
        potentialSavings,
        savingsPercentage,
        costVolatility: parseFloat(stats.avg_cost_volatility) || 0,
        renewalAlertCount: parseInt(alerts.renewal_alerts),
        priceHikeAlertCount: parseInt(alerts.price_hike_alerts),
        productDiversityScore: this.calculateDiversityScore(
          parseInt(products.unique_providers),
          parseInt(products.unique_product_types),
          parseInt(products.total_subscriptions)
        ),
        monitoringEngagement: alerts.total_alerts > 0 
          ? (parseInt(alerts.resolved_alerts) / parseInt(alerts.total_alerts)) * 100 
          : 0,
      }

    } catch (error) {
      logger.error('Failed to get user subscription data', error)
      throw error
    }
  }

  /**
   * Calculate component scores
   */
  private async calculateComponentScores(userId: string, data: any): Promise<ScoreFactors> {
    const affordability = await this.calculateAffordabilityScore(userId, data)
    const optimization = await this.calculateOptimizationScore(userId, data)
    const stability = await this.calculateStabilityScore(userId, data)
    const diversity = await this.calculateDiversityComponentScore(data)
    const awareness = await this.calculateAwarenessScore(userId, data)

    return {
      affordability,
      optimization,
      stability,
      diversity,
      awareness,
    }
  }

  /**
   * Calculate affordability score
   */
  private async calculateAffordabilityScore(userId: string, data: any): Promise<any> {
    try {
      // Get user's income data (simplified - in real app would integrate with financial data)
      const userResult = await pool.query(
        'SELECT estimated_annual_income FROM user_profiles WHERE user_id = $1',
        [userId]
      )

      const estimatedIncome = userResult.rows[0]?.estimated_annual_income || 50000 // Default assumption
      const costToIncomeRatio = (data.totalAnnualCost / estimatedIncome) * 100

      // Calculate individual factors
      const costToIncomeScore = Math.max(0, 100 - (costToIncomeRatio * 2)) // Penalize high ratios
      const budgetUtilizationScore = Math.max(0, 100 - Math.max(0, (data.totalAnnualCost / 12000) * 100)) // Assume £12k budget
      const paymentHistoryScore = 95 // Simplified - would use actual payment data
      const emergencyBufferScore = Math.max(0, 100 - costToIncomeRatio) // Higher costs = less buffer

      const score = (costToIncomeScore + budgetUtilizationScore + paymentHistoryScore + emergencyBufferScore) / 4

      return {
        weight: this.scoreWeights.affordability,
        score,
        factors: {
          costToIncomeRatio,
          budgetUtilization: budgetUtilizationScore,
          paymentHistory: paymentHistoryScore,
          emergencyBuffer: emergencyBufferScore,
        },
      }

    } catch (error) {
      logger.error('Failed to calculate affordability score', error)
      return {
        weight: this.scoreWeights.affordability,
        score: 50, // Default score
        factors: {
          costToIncomeRatio: 0,
          budgetUtilization: 50,
          paymentHistory: 50,
          emergencyBuffer: 50,
        },
      }
    }
  }

  /**
   * Calculate optimization score
   */
  private async calculateOptimizationScore(userId: string, data: any): Promise<any> {
    try {
      // Calculate individual factors
      const potentialSavingsScore = Math.max(0, 100 - data.savingsPercentage) // Less savings = better score
      const overpaymentRate = data.savingsPercentage
      const overpaymentScore = Math.max(0, 100 - overpaymentRate)
      
      // Market comparison (simplified)
      const marketComparisonScore = data.savingsPercentage < 10 ? 90 : data.savingsPercentage < 20 ? 70 : 50
      
      // Switching frequency (simplified - would use actual switching data)
      const switchingFrequencyScore = 75 // Default assumption

      const score = (potentialSavingsScore + overpaymentScore + marketComparisonScore + switchingFrequencyScore) / 4

      return {
        weight: this.scoreWeights.optimization,
        score,
        factors: {
          potentialSavings: potentialSavingsScore,
          overpaymentRate,
          marketComparison: marketComparisonScore,
          switchingFrequency: switchingFrequencyScore,
        },
      }

    } catch (error) {
      logger.error('Failed to calculate optimization score', error)
      return {
        weight: this.scoreWeights.optimization,
        score: 50,
        factors: {
          potentialSavings: 50,
          overpaymentRate: 0,
          marketComparison: 50,
          switchingFrequency: 50,
        },
      }
    }
  }

  /**
   * Calculate stability score
   */
  private async calculateStabilityScore(userId: string, data: any): Promise<any> {
    try {
      // Get cost change data
      const costChangeResult = await pool.query(`
        SELECT 
          COUNT(*) as total_changes,
          AVG(ABS(change_percentage)) as avg_change_percentage,
          COUNT(CASE WHEN change_type = 'increase' THEN 1 END) as increases
        FROM cost_changes 
        WHERE user_id = $1 AND change_date >= NOW() - INTERVAL '12 months'
      `, [userId])

      const costChangeData = costChangeResult.rows[0]
      const avgChangePercentage = parseFloat(costChangeData.avg_change_percentage) || 0
      const increaseRate = costChangeData.total_changes > 0 
        ? (parseInt(costChangeData.increases) / parseInt(costChangeData.total_changes)) * 100 
        : 0

      // Calculate individual factors
      const costVolatilityScore = Math.max(0, 100 - (avgChangePercentage * 2)) // Penalize volatility
      const providerStabilityScore = 85 // Simplified - would analyze provider stability
      const contractLengthScore = 80 // Simplified - would analyze contract lengths
      const priceHikeFrequencyScore = Math.max(0, 100 - (data.priceHikeAlertCount * 10))

      const score = (costVolatilityScore + providerStabilityScore + contractLengthScore + priceHikeFrequencyScore) / 4

      return {
        weight: this.scoreWeights.stability,
        score,
        factors: {
          costVolatility: costVolatilityScore,
          providerStability: providerStabilityScore,
          contractLength: contractLengthScore,
          priceHikeFrequency: priceHikeFrequencyScore,
        },
      }

    } catch (error) {
      logger.error('Failed to calculate stability score', error)
      return {
        weight: this.scoreWeights.stability,
        score: 50,
        factors: {
          costVolatility: 50,
          providerStability: 50,
          contractLength: 50,
          priceHikeFrequency: 50,
        },
      }
    }
  }

  /**
   * Calculate diversity score
   */
  private async calculateDiversityComponentScore(data: any): Promise<any> {
    try {
      // Calculate individual factors
      const providerDiversityScore = Math.min(100, (data.uniqueProviders / data.totalSubscriptions) * 100)
      const productTypeDiversityScore = Math.min(100, (data.uniqueProductTypes / data.totalSubscriptions) * 100)
      
      // Risk concentration (inverse of concentration)
      const riskConcentrationScore = data.totalSubscriptions > 0 
        ? Math.max(0, 100 - ((data.totalAnnualCost / data.totalSubscriptions) / data.averageCostPerSubscription) * 50)
        : 100
      
      const marketCoverageScore = Math.min(100, (data.uniqueProductTypes / 5) * 100) // Assuming 5 main product types

      const score = (providerDiversityScore + productTypeDiversityScore + riskConcentrationScore + marketCoverageScore) / 4

      return {
        weight: this.scoreWeights.diversity,
        score,
        factors: {
          providerDiversity: providerDiversityScore,
          productTypeDiversity: productTypeDiversityScore,
          riskConcentration: riskConcentrationScore,
          marketCoverage: marketCoverageScore,
        },
      }

    } catch (error) {
      logger.error('Failed to calculate diversity score', error)
      return {
        weight: this.scoreWeights.diversity,
        score: 50,
        factors: {
          providerDiversity: 50,
          productTypeDiversity: 50,
          riskConcentration: 50,
          marketCoverage: 50,
        },
      }
    }
  }

  /**
   * Calculate awareness score
   */
  private async calculateAwarenessScore(userId: string, data: any): Promise<any> {
    try {
      // Get user engagement data
      const engagementResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as active_days,
          COUNT(*) as total_actions
        FROM user_activity_log 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
      `, [userId])

      const engagementData = engagementResult.rows[0]
      const activeDays = parseInt(engagementData.active_days) || 0
      const totalActions = parseInt(engagementData.total_actions) || 0

      // Calculate individual factors
      const monitoringFrequencyScore = Math.min(100, (activeDays / 30) * 100) // Active days in last 30 days
      const alertResponseRateScore = data.monitoringEngagement
      const reviewEngagementScore = Math.min(100, (totalActions / 50) * 100) // Assume 50 actions is optimal
      const optimizationActionsScore = Math.min(100, (data.potentialSavings > 0 ? 80 : 60)) // Reward engagement

      const score = (monitoringFrequencyScore + alertResponseRateScore + reviewEngagementScore + optimizationActionsScore) / 4

      return {
        weight: this.scoreWeights.awareness,
        score,
        factors: {
          monitoringFrequency: monitoringFrequencyScore,
          alertResponseRate: alertResponseRateScore,
          reviewEngagement: reviewEngagementScore,
          optimizationActions: optimizationActionsScore,
        },
      }

    } catch (error) {
      logger.error('Failed to calculate awareness score', error)
      return {
        weight: this.scoreWeights.awareness,
        score: 50,
        factors: {
          monitoringFrequency: 50,
          alertResponseRate: 50,
          reviewEngagement: 50,
          optimizationActions: 50,
        },
      }
    }
  }

  /**
   * Calculate overall score from component scores
   */
  private calculateOverallScore(componentScores: ScoreFactors): number {
    let weightedSum = 0
    let totalWeight = 0

    for (const [component, score] of Object.entries(componentScores)) {
      weightedSum += score.score * score.weight
      totalWeight += score.weight
    }

    return Math.round((weightedSum / totalWeight) * 100) / 100
  }

  /**
   * Get score category based on score
   */
  private getScoreCategory(score: number): string {
    for (const [category, range] of Object.entries(this.scoreCategories)) {
      if (score >= range.min && score <= range.max) {
        return category
      }
    }
    return 'poor'
  }

  /**
   * Calculate diversity score
   */
  private calculateDiversityScore(providers: number, productTypes: number, totalSubscriptions: number): number {
    if (totalSubscriptions === 0) return 0
    
    const providerDiversity = (providers / totalSubscriptions) * 50
    const productTypeDiversity = (productTypes / totalSubscriptions) * 50
    
    return Math.min(100, providerDiversity + productTypeDiversity)
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(userId: string, componentScores: ScoreFactors, data: any): Promise<any[]> {
    const recommendations = []

    // Affordability recommendations
    if (componentScores.affordability.score < 70) {
      recommendations.push({
        category: 'affordability',
        priority: 'high',
        title: 'Reduce subscription costs',
        description: 'Your subscription costs represent a significant portion of your budget. Consider reducing or optimizing your subscriptions.',
        potentialImpact: 25,
        estimatedSavings: data.potentialSavings * 0.8,
      })
    }

    // Optimization recommendations
    if (componentScores.optimization.score < 70) {
      recommendations.push({
        category: 'optimization',
        priority: 'high',
        title: 'Optimize your subscriptions',
        description: `You could save £${data.potentialSavings.toFixed(2)} annually by switching to better deals.`,
        potentialImpact: 30,
        estimatedSavings: data.potentialSavings,
      })
    }

    // Stability recommendations
    if (componentScores.stability.score < 70) {
      recommendations.push({
        category: 'stability',
        priority: 'medium',
        title: 'Improve cost stability',
        description: 'Consider fixed-rate plans to reduce cost volatility and avoid unexpected price increases.',
        potentialImpact: 20,
        estimatedSavings: data.totalAnnualCost * 0.1,
      })
    }

    // Diversity recommendations
    if (componentScores.diversity.score < 70) {
      recommendations.push({
        category: 'diversity',
        priority: 'medium',
        title: 'Diversify your providers',
        description: 'Consider spreading your subscriptions across multiple providers to reduce dependency risk.',
        potentialImpact: 15,
        estimatedSavings: data.totalAnnualCost * 0.05,
      })
    }

    // Awareness recommendations
    if (componentScores.awareness.score < 70) {
      recommendations.push({
        category: 'awareness',
        priority: 'low',
        title: 'Increase monitoring engagement',
        description: 'Regular monitoring helps you catch issues early and maximize savings opportunities.',
        potentialImpact: 10,
        estimatedSavings: data.potentialSavings * 0.2,
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Calculate next review date based on score category
   */
  private calculateNextReviewDate(scoreCategory: string): Date {
    const now = new Date()
    const reviewIntervals = {
      excellent: 90,    // 3 months
      good: 60,         // 2 months
      fair: 30,         // 1 month
      poor: 14,         // 2 weeks
      critical: 7,      // 1 week
    }

    const days = reviewIntervals[scoreCategory as keyof typeof reviewIntervals] || 30
    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + days)

    return nextReview
  }

  /**
   * Save financial health score to database
   */
  private async saveFinancialHealthScore(userId: string, scoreData: any): Promise<string> {
    try {
      const query = `
        INSERT INTO financial_health_scores (
          user_id, overall_score, score_category, affordability_score,
          optimization_score, stability_score, diversity_score, awareness_score,
          total_subscriptions, total_annual_cost, potential_savings,
          recommendations, next_review_date, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING id
      `

      const result = await pool.query(query, [
        userId,
        scoreData.overallScore,
        scoreData.scoreCategory,
        scoreData.componentScores.affordability.score,
        scoreData.componentScores.optimization.score,
        scoreData.componentScores.stability.score,
        scoreData.componentScores.diversity.score,
        scoreData.componentScores.awareness.score,
        scoreData.subscriptionData.totalSubscriptions,
        scoreData.subscriptionData.totalAnnualCost,
        scoreData.subscriptionData.potentialSavings,
        JSON.stringify(scoreData.recommendations),
        scoreData.nextReviewDate,
      ])

      return result.rows[0].id

    } catch (error) {
      logger.error('Failed to save financial health score', error)
      throw error
    }
  }

  /**
   * Get financial health score history
   */
  async getScoreHistory(userId: string, limit: number = 12): Promise<ScoreHistory[]> {
    try {
      const query = `
        SELECT 
          id,
          overall_score,
          score_category,
          calculated_at,
          LAG(overall_score) OVER (ORDER BY calculated_at) as previous_score
        FROM financial_health_scores
        WHERE user_id = $1
        ORDER BY calculated_at DESC
        LIMIT $2
      `

      const result = await pool.query(query, [userId, limit])

      return result.rows.map(row => ({
        id: row.id,
        userId,
        score: parseFloat(row.overall_score),
        category: row.score_category,
        calculatedAt: row.calculated_at,
        changeFromPrevious: row.previous_score ? parseFloat(row.overall_score) - parseFloat(row.previous_score) : 0,
        keyFactors: [], // Would be populated based on significant changes
      }))

    } catch (error) {
      logger.error('Failed to get score history', error)
      throw error
    }
  }

  /**
   * Get financial health insights
   */
  async getFinancialHealthInsights(userId: string): Promise<{
    currentScore: FinancialHealthScore | null
    trend: 'improving' | 'declining' | 'stable'
    keyInsights: string[]
    benchmarkComparison: {
      userPercentile: number
      averageScore: number
      topPerformerScore: number
    }
  }> {
    try {
      // Get current score
      const currentScoreResult = await pool.query(
        'SELECT * FROM financial_health_scores WHERE user_id = $1 ORDER BY calculated_at DESC LIMIT 1',
        [userId]
      )

      const currentScore = currentScoreResult.rows[0]

      // Get trend
      const trendResult = await pool.query(`
        SELECT 
          CASE 
            WHEN LAG(overall_score) OVER (ORDER BY calculated_at) < overall_score THEN 'improving'
            WHEN LAG(overall_score) OVER (ORDER BY calculated_at) > overall_score THEN 'declining'
            ELSE 'stable'
          END as trend
        FROM financial_health_scores
        WHERE user_id = $1
        ORDER BY calculated_at DESC
        LIMIT 1
      `, [userId])

      const trend = trendResult.rows[0]?.trend || 'stable'

      // Get benchmark data
      const benchmarkResult = await pool.query(`
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY overall_score) as median_score,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY overall_score) as top_score,
          COUNT(*) as total_users
        FROM financial_health_scores
        WHERE calculated_at >= NOW() - INTERVAL '30 days'
      `)

      const benchmark = benchmarkResult.rows[0]
      const userPercentile = currentScore ? this.calculatePercentile(parseFloat(currentScore.overall_score), benchmark) : 0

      // Generate key insights
      const keyInsights = this.generateKeyInsights(currentScore, trend, userPercentile)

      return {
        currentScore: currentScore ? {
          id: currentScore.id,
          userId: currentScore.user_id,
          overallScore: parseFloat(currentScore.overall_score),
          scoreCategory: currentScore.score_category,
          componentScores: {
            affordability: parseFloat(currentScore.affordability_score),
            optimization: parseFloat(currentScore.optimization_score),
            stability: parseFloat(currentScore.stability_score),
            diversity: parseFloat(currentScore.diversity_score),
            awareness: parseFloat(currentScore.awareness_score),
          },
          factors: {
            totalSubscriptions: parseInt(currentScore.total_subscriptions),
            totalAnnualCost: parseFloat(currentScore.total_annual_cost),
            averageCostPerSubscription: 0, // Would calculate
            potentialSavings: parseFloat(currentScore.potential_savings),
            savingsPercentage: 0, // Would calculate
            costVolatility: 0, // Would calculate
            renewalAlertCount: 0, // Would calculate
            priceHikeAlertCount: 0, // Would calculate
            productDiversityScore: 0, // Would calculate
            monitoringEngagement: 0, // Would calculate
          },
          recommendations: JSON.parse(currentScore.recommendations || '[]'),
          calculatedAt: currentScore.calculated_at,
          nextReviewDate: currentScore.next_review_date,
        } : null,
        trend,
        keyInsights,
        benchmarkComparison: {
          userPercentile,
          averageScore: parseFloat(benchmark.median_score) || 0,
          topPerformerScore: parseFloat(benchmark.top_score) || 0,
        },
      }

    } catch (error) {
      logger.error('Failed to get financial health insights', error)
      throw error
    }
  }

  /**
   * Calculate percentile for benchmark comparison
   */
  private calculatePercentile(userScore: number, benchmark: any): number {
    // Simplified percentile calculation
    // In real implementation, would use proper statistical methods
    const medianScore = parseFloat(benchmark.median_score) || 50
    const topScore = parseFloat(benchmark.top_score) || 90
    
    if (userScore >= topScore) return 90
    if (userScore >= medianScore) return 50 + ((userScore - medianScore) / (topScore - medianScore)) * 40
    return (userScore / medianScore) * 50
  }

  /**
   * Generate key insights based on score data
   */
  private generateKeyInsights(currentScore: any, trend: string, userPercentile: number): string[] {
    const insights = []

    if (!currentScore) {
      return ['Start tracking your subscriptions to get personalized financial health insights']
    }

    const score = parseFloat(currentScore.overall_score)

    if (trend === 'improving') {
      insights.push('Your financial health is improving - keep up the good work!')
    } else if (trend === 'declining') {
      insights.push('Your financial health is declining - consider reviewing your subscriptions')
    }

    if (userPercentile >= 80) {
      insights.push('You\'re in the top 20% of users - excellent subscription management!')
    } else if (userPercentile <= 30) {
      insights.push('There\'s room for improvement - many users save more by optimizing their subscriptions')
    }

    if (parseFloat(currentScore.optimization_score) < 60) {
      insights.push('Optimization opportunities could save you significant money')
    }

    if (parseFloat(currentScore.affordability_score) < 60) {
      insights.push('Your subscription costs may be stretching your budget')
    }

    return insights
  }
}

// Export singleton instance
export const financialHealthScoringService = new FinancialHealthScoringService()

// Export types for use in other modules
export type {
  FinancialHealthScore,
  ScoreHistory,
  ScoreFactors,
}
