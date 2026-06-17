import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock for db module
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }))

vi.mock('../db', () => ({
  pool: {
    query: mockQuery,
  },
}))

// Import after mock setup
import { financialHealthScoringService } from '../services/financialHealthScoring'

describe('Financial Health Scoring Service', () => {
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.mockReset()
  })

  describe('calculateFinancialHealthScore', () => {
    it('should calculate comprehensive financial health score', async () => {
      // Setup mock chain for multiple queries
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total_subscriptions: '5', total_annual_cost: '1200', average_cost: '240', unique_providers: '3', unique_product_types: '4', active_subscriptions: '5' }] })
        .mockResolvedValueOnce({ rows: [{ total_potential_savings: '300', avg_cost_volatility: '0.05' }] })
        .mockResolvedValueOnce({ rows: [{ renewal_alerts: '1', price_hike_alerts: '0', resolved_alerts: '2', total_alerts: '3' }] })
        .mockResolvedValueOnce({ rows: [{ estimated_annual_income: 50000 }] })
        .mockResolvedValueOnce({ rows: [{ count: '10', avg_duration: '12' }] })
        .mockResolvedValueOnce({ rows: [{ avg_volatility: '0.05' }] })
        .mockResolvedValueOnce({ rows: [{ action_count: '5' }] })
        .mockResolvedValueOnce({ rows: [] }) // save score

      const result = await financialHealthScoringService.calculateFinancialHealthScore(mockUserId)

      expect(result).toBeDefined()
      expect(result.userId).toBe(mockUserId)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.scoreCategory).toBeDefined()
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(result.scoreCategory)
      expect(result.componentScores).toBeDefined()
      expect(result.recommendations).toBeInstanceOf(Array)
      expect(result.calculatedAt).toBeInstanceOf(Date)
      expect(result.nextReviewDate).toBeInstanceOf(Date)
    })

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'))

      await expect(financialHealthScoringService.calculateFinancialHealthScore(mockUserId)).rejects.toThrow()
    })
  })

  describe('getScoreCategory', () => {
    it('should return correct categories for score ranges', () => {
      expect((financialHealthScoringService as any).getScoreCategory(95)).toBe('excellent')
      expect((financialHealthScoringService as any).getScoreCategory(80)).toBe('good')
      expect((financialHealthScoringService as any).getScoreCategory(65)).toBe('fair')
      expect((financialHealthScoringService as any).getScoreCategory(50)).toBe('poor')
      expect((financialHealthScoringService as any).getScoreCategory(30)).toBe('critical')
    })
  })

  describe('calculateOverallScore', () => {
    it('should calculate weighted average of component scores', () => {
      const components = {
        affordability: { weight: 0.3, score: 80 },
        optimization: { weight: 0.25, score: 70 },
        stability: { weight: 0.2, score: 75 },
        diversity: { weight: 0.15, score: 60 },
        awareness: { weight: 0.1, score: 85 },
      }

      const overall = (financialHealthScoringService as any).calculateOverallScore(components)
      
      expect(overall).toBeGreaterThan(70)
      expect(overall).toBeLessThan(80)
    })
  })

  describe('calculateDiversityScore', () => {
    it('should return higher scores for more diverse subscriptions', () => {
      const score1 = (financialHealthScoringService as any).calculateDiversityScore(1, 1, 5)
      const score2 = (financialHealthScoringService as any).calculateDiversityScore(5, 5, 5)
      
      expect(score2).toBeGreaterThan(score1)
      expect(score1).toBeGreaterThanOrEqual(0)
      expect(score2).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateNextReviewDate', () => {
    it('should set shorter review periods for lower scores', () => {
      const criticalDate = (financialHealthScoringService as any).calculateNextReviewDate('critical')
      const excellentDate = (financialHealthScoringService as any).calculateNextReviewDate('excellent')
      
      const now = new Date()
      const criticalDays = Math.ceil((criticalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const excellentDays = Math.ceil((excellentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      expect(criticalDays).toBeLessThan(excellentDays)
    })
  })

  describe('getScoreHistory', () => {
    it('should retrieve score history for user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', user_id: mockUserId, overall_score: 70, score_category: 'fair', calculated_at: new Date('2024-01-01') },
          { id: '2', user_id: mockUserId, overall_score: 75, score_category: 'good', calculated_at: new Date('2024-02-01') },
        ],
      })

      const result = await financialHealthScoringService.getScoreHistory(mockUserId, 30)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].score).toBe(70)
      expect(result[1].score).toBe(75)
    })

    it('should return empty array when no history exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await financialHealthScoringService.getScoreHistory(mockUserId, 30)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })
  })

  describe('Score factor calculations', () => {
    it('should calculate stability score with valid data', async () => {
      // Mock cost_changes table query
      mockQuery.mockResolvedValueOnce({ rows: [{ total_changes: '5', avg_change_percentage: '2.5', increases: '2' }] })

      const stability = await (financialHealthScoringService as any).calculateStabilityScore(mockUserId, { 
        totalAnnualCost: 1200,
        priceHikeAlertCount: 1 
      })
      
      // Score should be a valid number (not NaN)
      expect(stability.score).not.toBeNaN()
      expect(typeof stability.score).toBe('number')
      expect(stability.score).toBeGreaterThanOrEqual(0)
      expect(stability.score).toBeLessThanOrEqual(100)
    })

    it('should calculate awareness score with valid data', async () => {
      // Mock user_activity_log query
      mockQuery.mockResolvedValueOnce({ rows: [{ active_days: '15', total_actions: '30' }] })

      const awareness = await (financialHealthScoringService as any).calculateAwarenessScore(mockUserId, { 
        totalSubscriptions: 5,
        monitoringEngagement: 75,
        potentialSavings: 200
      })
      
      // Score should be a valid number (not NaN)
      expect(awareness.score).not.toBeNaN()
      expect(typeof awareness.score).toBe('number')
      expect(awareness.score).toBeGreaterThanOrEqual(0)
      expect(awareness.score).toBeLessThanOrEqual(100)
    })

    it('should handle missing stability data gracefully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total_changes: '0', avg_change_percentage: null, increases: '0' }] })

      const stability = await (financialHealthScoringService as any).calculateStabilityScore(mockUserId, { 
        totalAnnualCost: 1200,
        priceHikeAlertCount: 0
      })
      
      // Should return a valid structure even with missing data
      expect(stability).toBeDefined()
      expect(stability.weight).toBeDefined()
      expect(stability.score).toBeDefined()
    })
  })
})
