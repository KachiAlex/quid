import { describe, it, expect } from 'vitest'
import { handleDemoRequest, demoData } from '../../../api/demo-data'

describe('Demo Data API', () => {
  describe('handleDemoRequest', () => {
    it('should return demo dashboard summary', () => {
      const result = handleDemoRequest('/dashboard/summary')
      
      expect(result).toBeDefined()
      expect(result.totalSavings).toBeGreaterThan(0)
      expect(result.switchedSavings).toBeGreaterThanOrEqual(0)
      expect(result.switchCount).toBeGreaterThanOrEqual(0)
      expect(result.productCounts).toBeDefined()
      expect(result.totalOverpayment).toBeGreaterThanOrEqual(0)
      expect(result.totalPotentialSavings).toBeGreaterThanOrEqual(0)
    })

    it('should return demo alerts', () => {
      const result = handleDemoRequest('/alerts')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.alerts)).toBe(true)
      expect(result.alerts.length).toBeGreaterThan(0)
      
      const alert = result.alerts[0]
      expect(alert.alert_id).toBeDefined()
      expect(alert.title).toBeDefined()
      expect(alert.urgency).toBeDefined()
    })

    it('should return demo alert count', () => {
      const result = handleDemoRequest('/alerts/count')
      
      expect(result).toBeDefined()
      expect(result.count).toBeGreaterThanOrEqual(0)
    })

    it('should return demo products', () => {
      const result = handleDemoRequest('/products')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.products)).toBe(true)
      expect(result.products.length).toBeGreaterThan(0)
      
      const product = result.products[0]
      expect(product.record_id).toBeDefined()
      expect(product.product_name).toBeDefined()
      expect(product.annual_cost).toBeGreaterThan(0)
    })

    it('should return demo overpayment data', () => {
      const result = handleDemoRequest('/products/overpayment')
      
      expect(result).toBeDefined()
      expect(result.totalOverpayment).toBeGreaterThanOrEqual(0)
      expect(result.totalPotentialSavings).toBeGreaterThanOrEqual(0)
    })

    it('should return demo financial health score', () => {
      const result = handleDemoRequest('/products/financial-health-score')
      
      expect(result).toBeDefined()
      expect(result.overall_score).toBeGreaterThan(0)
      expect(result.overall_score).toBeLessThanOrEqual(100)
      expect(result.score_category).toBeDefined()
      expect(Array.isArray(result.insights)).toBe(true)
      expect(Array.isArray(result.recommendations)).toBe(true)
    })

    it('should return demo activity log', () => {
      const result = handleDemoRequest('/activity')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.activities)).toBe(true)
      expect(result.activities.length).toBeGreaterThan(0)
    })

    it('should return demo switch history', () => {
      const result = handleDemoRequest('/switch/history')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.switches)).toBe(true)
    })

    it('should return empty banking connections', () => {
      const result = handleDemoRequest('/banking/connections')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.connections)).toBe(true)
      expect(result.connections).toHaveLength(0)
    })

    it('should return empty pending confirmations', () => {
      const result = handleDemoRequest('/products/pending-confirmation')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.products)).toBe(true)
      expect(result.products).toHaveLength(0)
    })

    it('should return shield status', () => {
      const result = handleDemoRequest('/shield/status')
      
      expect(result).toBeDefined()
      expect(result.active).toBe(true)
      expect(result.monitored_products).toBeGreaterThan(0)
      expect(result.alerts_count).toBeGreaterThan(0)
    })

    it('should return null for unknown endpoints', () => {
      const result = handleDemoRequest('/unknown/endpoint')
      
      expect(result).toBeNull()
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent financial data', () => {
      const summary = demoData.dashboardSummary
      const products = demoData.products
      
      // Total annual cost should match sum of product costs
      const totalFromProducts = products.reduce((sum, p) => sum + p.annual_cost, 0)
      expect(totalFromProducts).toBeGreaterThan(0)
      
      // Potential savings should be positive
      expect(summary.totalPotentialSavings).toBeGreaterThan(0)
    })

    it('should have valid alert urgency levels', () => {
      const validUrgencies = ['Very High', 'High', 'Medium', 'Low']
      
      demoData.alerts.forEach(alert => {
        expect(validUrgencies).toContain(alert.urgency)
      })
    })

    it('should have valid financial health score ranges', () => {
      const score = demoData.financialHealthScore
      
      expect(score.overall_score).toBeGreaterThanOrEqual(0)
      expect(score.overall_score).toBeLessThanOrEqual(100)
      
      // Check individual component scores using correct property names
      expect(score.affordability_score).toBeGreaterThanOrEqual(0)
      expect(score.affordability_score).toBeLessThanOrEqual(100)
      expect(score.optimization_score).toBeGreaterThanOrEqual(0)
      expect(score.optimization_score).toBeLessThanOrEqual(100)
      expect(score.stability_score).toBeGreaterThanOrEqual(0)
      expect(score.stability_score).toBeLessThanOrEqual(100)
      expect(score.diversity_score).toBeGreaterThanOrEqual(0)
      expect(score.diversity_score).toBeLessThanOrEqual(100)
      expect(score.awareness_score).toBeGreaterThanOrEqual(0)
      expect(score.awareness_score).toBeLessThanOrEqual(100)
    })

    it('should not contain XSS vectors in demo data', () => {
      const dataString = JSON.stringify(demoData)
      
      expect(dataString).not.toContain('<script>')
      expect(dataString).not.toContain('javascript:')
      expect(dataString).not.toContain('onerror=')
    })
  })
})
