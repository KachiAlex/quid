/**
 * Comparison Ranking Algorithm
 * Ranks products based on multiple factors: price, quality, customer service, features, etc.
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface ProductFeatures {
  contractFlexibility: number // 0-10, how easy to cancel/modify
  customerServiceRating: number // 0-10, based on reviews
  reliabilityScore: number // 0-10, service reliability
  featuresScore: number // 0-10, additional features/benefits
  greenCredentials: number // 0-10, environmental impact
  brandReputation: number // 0-10, overall brand trust
}

interface WeightFactors {
  price: number // Weight for price (0-1)
  features: number // Weight for features (0-1)
  service: number // Weight for customer service (0-1)
  reliability: number // Weight for reliability (0-1)
  flexibility: number // Weight for contract flexibility (0-1)
  green: number // Weight for environmental impact (0-1)
  reputation: number // Weight for brand reputation (0-1)
}

interface RankedProduct {
  provider: string
  annualCost: number
  rank: number
  overallScore: number
  priceScore: number
  featuresScore: number
  serviceScore: number
  reliabilityScore: number
  flexibilityScore: number
  greenScore: number
  reputationScore: number
  savingsAmount: number
  savingsPercent: number
  pros: string[]
  cons: string[]
}

interface ComparisonResult {
  currentProduct: RankedProduct
  alternatives: RankedProduct[]
  totalAlternatives: number
  bestAlternative: RankedProduct
  potentialSavings: number
  recommendationScore: number
  lastRateUpdate?: Date
  dataSources?: string[]
  averageDataAge?: number
}

// Default weights for different product types
const DEFAULT_WEIGHTS: Record<string, WeightFactors> = {
  energy: {
    price: 0.35,
    features: 0.10,
    service: 0.20,
    reliability: 0.20,
    flexibility: 0.05,
    green: 0.05,
    reputation: 0.05,
  },
  broadband: {
    price: 0.30,
    features: 0.25,
    service: 0.15,
    reliability: 0.20,
    flexibility: 0.05,
    green: 0.00,
    reputation: 0.05,
  },
  car_insurance: {
    price: 0.25,
    features: 0.20,
    service: 0.25,
    reliability: 0.20,
    flexibility: 0.05,
    green: 0.00,
    reputation: 0.05,
  },
  home_insurance: {
    price: 0.25,
    features: 0.20,
    service: 0.25,
    reliability: 0.20,
    flexibility: 0.05,
    green: 0.00,
    reputation: 0.05,
  },
  life_insurance: {
    price: 0.20,
    features: 0.25,
    service: 0.30,
    reliability: 0.20,
    flexibility: 0.00,
    green: 0.00,
    reputation: 0.05,
  },
  pet_insurance: {
    price: 0.25,
    features: 0.25,
    service: 0.25,
    reliability: 0.15,
    flexibility: 0.05,
    green: 0.00,
    reputation: 0.05,
  },
  subscription: {
    price: 0.40,
    features: 0.30,
    service: 0.10,
    reliability: 0.10,
    flexibility: 0.05,
    green: 0.00,
    reputation: 0.05,
  },
}

// Product features database (would be expanded with real data)
const PRODUCT_FEATURES: Record<string, Record<string, ProductFeatures>> = {
  energy: {
    'Octopus Energy': {
      contractFlexibility: 9,
      customerServiceRating: 9,
      reliabilityScore: 8,
      featuresScore: 8,
      greenCredentials: 9,
      brandReputation: 8,
    },
    'British Gas': {
      contractFlexibility: 5,
      customerServiceRating: 6,
      reliabilityScore: 9,
      featuresScore: 7,
      greenCredentials: 6,
      brandReputation: 8,
    },
    'EDF Energy': {
      contractFlexibility: 6,
      customerServiceRating: 7,
      reliabilityScore: 8,
      featuresScore: 7,
      greenCredentials: 8,
      brandReputation: 8,
    },
    'E.ON Next': {
      contractFlexibility: 7,
      customerServiceRating: 7,
      reliabilityScore: 8,
      featuresScore: 7,
      greenCredentials: 7,
      brandReputation: 7,
    },
    'ScottishPower': {
      contractFlexibility: 6,
      customerServiceRating: 6,
      reliabilityScore: 8,
      featuresScore: 6,
      greenCredentials: 7,
      brandReputation: 7,
    },
    'OVO Energy': {
      contractFlexibility: 8,
      customerServiceRating: 8,
      reliabilityScore: 8,
      featuresScore: 8,
      greenCredentials: 8,
      brandReputation: 7,
    },
    'Utilita Energy': {
      contractFlexibility: 7,
      customerServiceRating: 6,
      reliabilityScore: 7,
      featuresScore: 6,
      greenCredentials: 5,
      brandReputation: 6,
    },
    'So Energy': {
      contractFlexibility: 8,
      customerServiceRating: 7,
      reliabilityScore: 7,
      featuresScore: 6,
      greenCredentials: 7,
      brandReputation: 6,
    },
  },
  broadband: {
    'Sky Broadband': {
      contractFlexibility: 5,
      customerServiceRating: 7,
      reliabilityScore: 8,
      featuresScore: 9,
      greenCredentials: 0,
      brandReputation: 8,
    },
    'BT Broadband': {
      contractFlexibility: 4,
      customerServiceRating: 6,
      reliabilityScore: 9,
      featuresScore: 8,
      greenCredentials: 0,
      brandReputation: 8,
    },
    'Virgin Media': {
      contractFlexibility: 5,
      customerServiceRating: 6,
      reliabilityScore: 7,
      featuresScore: 10,
      greenCredentials: 0,
      brandReputation: 7,
    },
    'TalkTalk': {
      contractFlexibility: 7,
      customerServiceRating: 5,
      reliabilityScore: 7,
      featuresScore: 6,
      greenCredentials: 0,
      brandReputation: 6,
    },
    'Vodafone': {
      contractFlexibility: 6,
      customerServiceRating: 7,
      reliabilityScore: 8,
      featuresScore: 7,
      greenCredentials: 0,
      brandReputation: 7,
    },
    'Plusnet': {
      contractFlexibility: 8,
      customerServiceRating: 8,
      reliabilityScore: 9,
      featuresScore: 6,
      greenCredentials: 0,
      brandReputation: 7,
    },
    'EE Broadband': {
      contractFlexibility: 6,
      customerServiceRating: 7,
      reliabilityScore: 8,
      featuresScore: 8,
      greenCredentials: 0,
      brandReputation: 7,
    },
    'Now Broadband': {
      contractFlexibility: 8,
      customerServiceRating: 6,
      reliabilityScore: 7,
      featuresScore: 6,
      greenCredentials: 0,
      brandReputation: 6,
    },
  },
  // Add more product types as needed...
}

/**
 * Get product features for a specific provider and product type
 */
function getProductFeatures(productType: string, provider: string): ProductFeatures {
  const typeFeatures = PRODUCT_FEATURES[productType]
  if (!typeFeatures || !typeFeatures[provider]) {
    // Return default features if not found
    return {
      contractFlexibility: 5,
      customerServiceRating: 5,
      reliabilityScore: 5,
      featuresScore: 5,
      greenCredentials: 5,
      brandReputation: 5,
    }
  }
  return typeFeatures[provider]
}

/**
 * Calculate price score (lower price = higher score)
 */
function calculatePriceScore(currentCost: number, marketCost: number, minCost: number): number {
  if (minCost === 0) return 5
  
  const priceDifference = currentCost - marketCost
  const maxDifference = currentCost - minCost
  
  if (maxDifference <= 0) return 10
  
  // Score from 0-10, where 10 is cheapest
  const score = Math.max(0, Math.min(10, 10 - (priceDifference / maxDifference) * 10))
  return Math.round(score * 10) / 10
}

/**
 * Calculate overall score based on weighted factors
 */
function calculateOverallScore(
  priceScore: number,
  features: ProductFeatures,
  weights: WeightFactors
): number {
  const weightedScore = 
    priceScore * weights.price +
    features.featuresScore * weights.features +
    features.customerServiceRating * weights.service +
    features.reliabilityScore * weights.reliability +
    features.contractFlexibility * weights.flexibility +
    features.greenCredentials * weights.green +
    features.brandReputation * weights.reputation
  
  return Math.round(weightedScore * 10) / 10
}

/**
 * Generate pros and cons for a product
 */
function generateProsAndCons(
  features: ProductFeatures,
  priceScore: number,
  productType: string
): { pros: string[], cons: string[] } {
  const pros: string[] = []
  const cons: string[] = []

  // Price-based pros/cons
  if (priceScore >= 8) {
    pros.push('Competitive pricing')
  } else if (priceScore <= 4) {
    cons.push('Higher than average pricing')
  }

  // Feature-based pros/cons
  if (features.featuresScore >= 8) {
    pros.push('Excellent features and benefits')
  } else if (features.featuresScore <= 4) {
    cons.push('Limited features')
  }

  // Service-based pros/cons
  if (features.customerServiceRating >= 8) {
    pros.push('Excellent customer service')
  } else if (features.customerServiceRating <= 4) {
    cons.push('Poor customer service reputation')
  }

  // Reliability-based pros/cons
  if (features.reliabilityScore >= 8) {
    pros.push('Highly reliable service')
  } else if (features.reliabilityScore <= 4) {
    cons.push('Reliability concerns')
  }

  // Flexibility-based pros/cons
  if (features.contractFlexibility >= 8) {
    pros.push('Flexible contract terms')
  } else if (features.contractFlexibility <= 4) {
    cons.push('Rigid contract terms')
  }

  // Green credentials (for energy)
  if (productType === 'energy') {
    if (features.greenCredentials >= 8) {
      pros.push('Strong environmental credentials')
    } else if (features.greenCredentials <= 4) {
      cons.push('Limited green energy options')
    }
  }

  return { pros, cons }
}

/**
 * Rank products for comparison
 */
export async function rankProductsForComparison(
  userId: string,
  productRecordId: string
): Promise<ComparisonResult> {
  const client = await pool.connect()

  try {
    // Get user's current product
    const currentProductResult = await client.query(
      `SELECT pr.product_type, pr.provider_name, pr.annual_cost, pr.frequency
       FROM product_records pr
       WHERE pr.record_id = $1 AND pr.user_id = $2 AND pr.excluded = false`,
      [productRecordId, userId]
    )

    if (currentProductResult.rows.length === 0) {
      throw new Error('Product not found')
    }

    const currentProduct = currentProductResult.rows[0]

    // Get market alternatives
    const alternativesResult = await client.query(
      `SELECT provider, annual_cost
       FROM rate_records
       WHERE product_type = $1 AND provider != $2
       ORDER BY annual_cost ASC
       LIMIT 10`,
      [currentProduct.product_type, currentProduct.provider_name]
    )

    const alternatives = alternativesResult.rows
    const allProducts = [
      { provider: currentProduct.provider_name, annualCost: parseFloat(currentProduct.annual_cost) },
      ...alternatives.map(alt => ({ provider: alt.provider, annualCost: parseFloat(alt.annual_cost) }))
    ]

    // Find minimum cost for price scoring
    const minCost = Math.min(...allProducts.map(p => p.annualCost))

    // Get weights for this product type
    const weights = DEFAULT_WEIGHTS[currentProduct.product_type] || DEFAULT_WEIGHTS.subscription

    // Calculate scores for all products
    const rankedProducts: RankedProduct[] = allProducts.map(product => {
      const features = getProductFeatures(currentProduct.product_type, product.provider)
      const priceScore = calculatePriceScore(
        parseFloat(currentProduct.annual_cost),
        product.annualCost,
        minCost
      )
      const overallScore = calculateOverallScore(priceScore, features, weights)
      
      const { pros, cons } = generateProsAndCons(
        features,
        priceScore,
        currentProduct.product_type
      )

      const savingsAmount = parseFloat(currentProduct.annual_cost) - product.annualCost
      const savingsPercent = (savingsAmount / parseFloat(currentProduct.annual_cost)) * 100

      return {
        provider: product.provider,
        annualCost: product.annualCost,
        rank: 0, // Will be set after sorting
        overallScore,
        priceScore,
        featuresScore: features.featuresScore,
        serviceScore: features.customerServiceRating,
        reliabilityScore: features.reliabilityScore,
        flexibilityScore: features.contractFlexibility,
        greenScore: features.greenCredentials,
        reputationScore: features.brandReputation,
        savingsAmount,
        savingsPercent,
        pros,
        cons,
      }
    })

    // Sort by overall score and assign ranks
    rankedProducts.sort((a, b) => b.overallScore - a.overallScore)
    rankedProducts.forEach((product, index) => {
      product.rank = index + 1
    })

    // Find current product and best alternative
    const currentProductRanked = rankedProducts.find(p => p.provider === currentProduct.provider_name)
    const bestAlternative = rankedProducts.find(p => p.provider !== currentProduct.provider_name)

    if (!currentProductRanked || !bestAlternative) {
      throw new Error('Failed to rank products')
    }

    // Get rate update statistics
    const rateStatsResult = await client.query(
      `SELECT 
         MAX(last_updated) as last_update,
         AVG(EXTRACT(EPOCH FROM (NOW() - last_updated)) / 86400) as avg_age,
         COUNT(DISTINCT source) as source_count
       FROM rate_records
       WHERE product_type = $1`,
      [currentProduct.product_type]
    )

    const rateStats = rateStatsResult.rows[0]
    const dataSourcesResult = await client.query(
      'SELECT DISTINCT source FROM rate_records WHERE product_type = $1',
      [currentProduct.product_type]
    )

    // Calculate recommendation score (0-100)
    const recommendationScore = Math.max(0, Math.min(100, 
      (bestAlternative.overallScore - currentProductRanked.overallScore) * 10 + 50
    ))

    return {
      currentProduct: currentProductRanked,
      alternatives: rankedProducts.filter(p => p.provider !== currentProduct.provider_name),
      totalAlternatives: alternatives.length,
      bestAlternative,
      potentialSavings: bestAlternative.savingsAmount,
      recommendationScore: Math.round(recommendationScore),
      lastRateUpdate: rateStats.last_update,
      dataSources: dataSourcesResult.rows.map(row => row.source),
      averageDataAge: parseFloat(rateStats.avg_age || '0'),
    }
  } catch (error) {
    logger.error('Failed to rank products for comparison', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get top ranked products for a product type
 */
export async function getTopRankedProducts(
  productType: string,
  limit: number = 5
): Promise<RankedProduct[]> {
  const client = await pool.connect()

  try {
    // Get top products by price
    const productsResult = await client.query(
      `SELECT provider, annual_cost
       FROM rate_records
       WHERE product_type = $1
       ORDER BY annual_cost ASC
       LIMIT $2`,
      [productType, limit * 2] // Get more to allow for ranking
    )

    const products = productsResult.rows
    const minCost = products.length > 0 ? parseFloat(products[0].annual_cost) : 0

    // Get weights for this product type
    const weights = DEFAULT_WEIGHTS[productType] || DEFAULT_WEIGHTS.subscription

    // Calculate scores
    const rankedProducts: RankedProduct[] = products.map(product => {
      const features = getProductFeatures(productType, product.provider)
      const priceScore = calculatePriceScore(minCost, parseFloat(product.annual_cost), minCost)
      const overallScore = calculateOverallScore(priceScore, features, weights)
      
      const { pros, cons } = generateProsAndCons(features, priceScore, productType)

      return {
        provider: product.provider,
        annualCost: parseFloat(product.annual_cost),
        rank: 0,
        overallScore,
        priceScore,
        featuresScore: features.featuresScore,
        serviceScore: features.customerServiceRating,
        reliabilityScore: features.reliabilityScore,
        flexibilityScore: features.contractFlexibility,
        greenScore: features.greenCredentials,
        reputationScore: features.brandReputation,
        savingsAmount: 0,
        savingsPercent: 0,
        pros,
        cons,
      }
    })

    // Sort and rank
    rankedProducts.sort((a, b) => b.overallScore - a.overallScore)
    rankedProducts.forEach((product, index) => {
      product.rank = index + 1
    })

    return rankedProducts.slice(0, limit)
  } catch (error) {
    logger.error('Failed to get top ranked products', error)
    throw error
  } finally {
    client.release()
  }
}
