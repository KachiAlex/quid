/**
 * Provider-Specific Cancellation Guidance Service
 * Provides detailed cancellation instructions for different providers
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface CancellationMethod {
  type: 'phone' | 'email' | 'online' | 'in_person' | 'mail' | 'chat'
  label: string
  instructions: string
  contactInfo?: string
  url?: string
  hours?: string
  requirements?: string[]
  fees?: string
  noticePeriod?: string
}

interface CancellationGuidance {
  providerName: string
  productType: string
  methods: CancellationMethod[]
  generalTips: string[]
  importantNotes: string[]
  commonIssues: Array<{
    issue: string
    solution: string
  }>
  alternativeOptions: Array<{
    option: string
    description: string
  }>
  lastUpdated: Date
}

interface ProviderGuidance {
  id: string
  providerName: string
  productType: string
  cancellationMethods: any
  generalTips: string[]
  importantNotes: string[]
  commonIssues: any
  alternativeOptions: any
  lastUpdated: Date
}

class CancellationGuidanceService {
  /**
   * Get cancellation guidance for a specific provider and product type
   */
  async getCancellationGuidance(providerName: string, productType: string): Promise<CancellationGuidance | null> {
    try {
      // First try to get provider-specific guidance
      const specificQuery = `
        SELECT * FROM provider_cancellation_guidance
        WHERE provider_name = $1 AND product_type = $2
        ORDER BY last_updated DESC
        LIMIT 1
      `

      const specificResult = await pool.query(specificQuery, [providerName, productType])

      if (specificResult.rows.length > 0) {
        return this.formatGuidance(specificResult.rows[0])
      }

      // Fall back to general product type guidance
      const generalQuery = `
        SELECT * FROM provider_cancellation_guidance
        WHERE provider_name = 'GENERAL' AND product_type = $1
        ORDER BY last_updated DESC
        LIMIT 1
      `

      const generalResult = await pool.query(generalQuery, [productType])

      if (generalResult.rows.length > 0) {
        const guidance = this.formatGuidance(generalResult.rows[0])
        guidance.providerName = providerName // Override with actual provider name
        return guidance
      }

      // Fall back to completely general guidance
      return this.getDefaultGuidance(providerName, productType)

    } catch (error) {
      logger.error('Failed to get cancellation guidance', error)
      return this.getDefaultGuidance(providerName, productType)
    }
  }

  /**
   * Format guidance from database row
   */
  private formatGuidance(row: any): CancellationGuidance {
    return {
      providerName: row.provider_name,
      productType: row.product_type,
      methods: row.cancellation_methods || [],
      generalTips: row.general_tips || [],
      importantNotes: row.important_notes || [],
      commonIssues: row.common_issues || [],
      alternativeOptions: row.alternative_options || [],
      lastUpdated: row.last_updated,
    }
  }

  /**
   * Get default guidance when no specific guidance is available
   */
  private getDefaultGuidance(providerName: string, productType: string): CancellationGuidance {
    const defaultMethods: CancellationMethod[] = [
      {
        type: 'phone',
        label: 'Call Customer Service',
        instructions: `Call ${providerName} customer service to request cancellation. Have your account details ready.`,
        contactInfo: 'Check your latest bill or website for the customer service number',
        hours: 'Typically Monday-Friday 9am-6pm',
        requirements: ['Account number', 'Personal identification', 'Reason for cancellation'],
        noticePeriod: 'Usually 30 days notice required',
      },
      {
        type: 'online',
        label: 'Online Account',
        instructions: 'Log in to your online account and look for cancellation options in account settings.',
        url: `Visit ${providerName.toLowerCase().replace(/\s+/g, '')}.com`,
        requirements: ['Online account access', 'Login credentials'],
        noticePeriod: 'Varies by provider',
      },
      {
        type: 'email',
        label: 'Email Request',
        instructions: 'Send a formal cancellation request via email. Include all relevant account details.',
        contactInfo: 'Check provider website for cancellation email address',
        requirements: ['Full name', 'Account number', 'Service address', 'Cancellation date'],
        noticePeriod: 'Usually 30 days, confirm with provider',
      },
    ]

    const defaultTips = [
      'Always get confirmation of your cancellation in writing',
      'Check for early termination fees in your contract',
      'Note the date and time of your cancellation request',
      'Keep records of all communication regarding cancellation',
      'Follow up if you don\'t receive confirmation within 5-7 business days',
    ]

    const defaultNotes = [
      'Some providers may offer retention deals to keep you as a customer',
      'Be aware of any minimum contract periods',
      'Check if you need to return any equipment',
      'Confirm final billing date and any final charges',
      'Consider the timing of cancellation to avoid service gaps',
    ]

    const defaultIssues = [
      {
        issue: 'Long wait times on phone',
        solution: 'Try calling early morning or late afternoon, or use online chat if available',
      },
      {
        issue: 'Website cancellation not working',
        solution: 'Try a different browser or call customer service directly',
      },
      {
        issue: 'Provider trying to retain you',
        solution: 'Be firm but polite, clearly stating your intention to cancel',
      },
    ]

    const defaultAlternatives = [
      {
        option: 'Downgrade Plan',
        description: 'Switch to a cheaper plan instead of cancelling completely',
      },
      {
        option: 'Pause Service',
        description: 'Some providers allow temporary suspension of service',
      },
      {
        option: 'Transfer Service',
        description: 'Transfer service to a new address if moving',
      },
    ]

    return {
      providerName,
      productType,
      methods: defaultMethods,
      generalTips: defaultTips,
      importantNotes: defaultNotes,
      commonIssues: defaultIssues,
      alternativeOptions: defaultAlternatives,
      lastUpdated: new Date(),
    }
  }

  /**
   * Search for cancellation guidance by provider name
   */
  async searchProviderGuidance(searchTerm: string): Promise<ProviderGuidance[]> {
    try {
      const query = `
        SELECT DISTINCT ON (provider_name, product_type) *
        FROM provider_cancellation_guidance
        WHERE provider_name ILIKE $1 OR product_type ILIKE $1
        ORDER BY provider_name, product_type, last_updated DESC
      `

      const result = await pool.query(query, [`%${searchTerm}%`])

      return result.rows.map(row => ({
        id: row.id,
        providerName: row.provider_name,
        productType: row.product_type,
        cancellationMethods: row.cancellation_methods,
        generalTips: row.general_tips,
        importantNotes: row.important_notes,
        commonIssues: row.common_issues,
        alternativeOptions: row.alternative_options,
        lastUpdated: row.last_updated,
      }))

    } catch (error) {
      logger.error('Failed to search provider guidance', error)
      return []
    }
  }

  /**
   * Get all available providers with guidance
   */
  async getAllProviders(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT provider_name 
        FROM provider_cancellation_guidance 
        WHERE provider_name != 'GENERAL'
        ORDER BY provider_name
      `

      const result = await pool.query(query)
      return result.rows.map(row => row.provider_name)

    } catch (error) {
      logger.error('Failed to get all providers', error)
      return []
    }
  }

  /**
   * Get popular providers (most searched)
   */
  async getPopularProviders(): Promise<string[]> {
    try {
      const query = `
        SELECT provider_name, COUNT(*) as search_count
        FROM cancellation_guidance_searches
        WHERE searched_at > NOW() - INTERVAL '30 days'
        GROUP BY provider_name
        ORDER BY search_count DESC
        LIMIT 10
      `

      const result = await pool.query(query)
      return result.rows.map(row => row.provider_name)

    } catch (error) {
      logger.error('Failed to get popular providers', error)
      return []
    }
  }

  /**
   * Record search for analytics
   */
  async recordSearch(providerName: string, userId?: string): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO cancellation_guidance_searches 
         (provider_name, user_id, searched_at) 
         VALUES ($1, $2, NOW())`,
        [providerName, userId]
      )

    } catch (error) {
      // Don't throw error for analytics
      logger.warn('Failed to record search', error)
    }
  }

  /**
   * Get cancellation guidance statistics
   */
  async getStatistics(): Promise<{
    totalProviders: number
    totalProductTypes: number
    totalSearches: number
    popularProviders: Array<{ provider: string; count: number }>
    recentSearches: number
  }> {
    try {
      const [providersResult, typesResult, searchesResult, popularResult, recentResult] = await Promise.all([
        pool.query('SELECT COUNT(DISTINCT provider_name) as count FROM provider_cancellation_guidance WHERE provider_name != \'GENERAL\''),
        pool.query('SELECT COUNT(DISTINCT product_type) as count FROM provider_cancellation_guidance'),
        pool.query('SELECT COUNT(*) as count FROM cancellation_guidance_searches'),
        pool.query(`
          SELECT provider_name, COUNT(*) as count 
          FROM cancellation_guidance_searches 
          WHERE searched_at > NOW() - INTERVAL '30 days'
          GROUP BY provider_name 
          ORDER BY count DESC 
          LIMIT 5
        `),
        pool.query(`
          SELECT COUNT(*) as count 
          FROM cancellation_guidance_searches 
          WHERE searched_at > NOW() - INTERVAL '7 days'
        `),
      ])

      return {
        totalProviders: parseInt(providersResult.rows[0].count),
        totalProductTypes: parseInt(typesResult.rows[0].count),
        totalSearches: parseInt(searchesResult.rows[0].count),
        popularProviders: popularResult.rows.map(row => ({
          provider: row.provider_name,
          count: parseInt(row.count),
        })),
        recentSearches: parseInt(recentResult.rows[0].count),
      }

    } catch (error) {
      logger.error('Failed to get cancellation guidance statistics', error)
      return {
        totalProviders: 0,
        totalProductTypes: 0,
        totalSearches: 0,
        popularProviders: [],
        recentSearches: 0,
      }
    }
  }

  /**
   * Update or create cancellation guidance
   */
  async updateGuidance(guidance: Omit<CancellationGuidance, 'lastUpdated'>): Promise<void> {
    try {
      const query = `
        INSERT INTO provider_cancellation_guidance 
        (provider_name, product_type, cancellation_methods, general_tips, 
         important_notes, common_issues, alternative_options, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (provider_name, product_type) 
        DO UPDATE SET
          cancellation_methods = EXCLUDED.cancellation_methods,
          general_tips = EXCLUDED.general_tips,
          important_notes = EXCLUDED.important_notes,
          common_issues = EXCLUDED.common_issues,
          alternative_options = EXCLUDED.alternative_options,
          last_updated = NOW()
      `

      await pool.query(query, [
        guidance.providerName,
        guidance.productType,
        JSON.stringify(guidance.methods),
        JSON.stringify(guidance.generalTips),
        JSON.stringify(guidance.importantNotes),
        JSON.stringify(guidance.commonIssues),
        JSON.stringify(guidance.alternativeOptions),
      ])

      logger.info('Cancellation guidance updated', {
        provider: guidance.providerName,
        productType: guidance.productType,
      })

    } catch (error) {
      logger.error('Failed to update cancellation guidance', error)
      throw error
    }
  }

  /**
   * Get guidance for multiple products at once
   */
  async getBatchGuidance(requests: Array<{ providerName: string; productType: string }>): Promise<Map<string, CancellationGuidance>> {
    const results = new Map<string, CancellationGuidance>()

    for (const request of requests) {
      const key = `${request.providerName}-${request.productType}`
      try {
        const guidance = await this.getCancellationGuidance(request.providerName, request.productType)
        if (guidance) {
          results.set(key, guidance)
        }
      } catch (error) {
        logger.error('Failed to get batch guidance', { key, error })
      }
    }

    return results
  }

  /**
   * Validate cancellation guidance data
   */
  validateGuidance(guidance: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!guidance.providerName || typeof guidance.providerName !== 'string') {
      errors.push('Provider name is required and must be a string')
    }

    if (!guidance.productType || typeof guidance.productType !== 'string') {
      errors.push('Product type is required and must be a string')
    }

    if (!Array.isArray(guidance.methods)) {
      errors.push('Cancellation methods must be an array')
    } else {
      guidance.methods.forEach((method: any, index: number) => {
        if (!method.type || !['phone', 'email', 'online', 'in_person', 'mail', 'chat'].includes(method.type)) {
          errors.push(`Method ${index + 1}: Invalid type`)
        }
        if (!method.label || typeof method.label !== 'string') {
          errors.push(`Method ${index + 1}: Label is required`)
        }
        if (!method.instructions || typeof method.instructions !== 'string') {
          errors.push(`Method ${index + 1}: Instructions are required`)
        }
      })
    }

    if (!Array.isArray(guidance.generalTips)) {
      errors.push('General tips must be an array')
    }

    if (!Array.isArray(guidance.importantNotes)) {
      errors.push('Important notes must be an array')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Export singleton instance
export const cancellationGuidanceService = new CancellationGuidanceService()

// Export types for use in other modules
export type {
  CancellationMethod,
  CancellationGuidance,
  ProviderGuidance,
}
