// Demo data for when database is not available
export const demoData = {
  // Dashboard summary
  dashboardSummary: {
    totalSavings: 1247,
    switchedSavings: 389,
    switchCount: 3,
    productCounts: {
      subscription: 12,
      insurance: 2,
      energy: 1,
      broadband: 1
    },
    totalOverpayment: 456,
    totalPotentialSavings: 892
  },

  // Alerts
  alerts: [
    {
      alert_id: 'demo-1',
      title: 'Car insurance renewal in 14 days',
      detail: 'Your current provider quoted £1,240. We found 8 better deals starting at £528.',
      alert_type: 'Urgent',
      urgency: 'Very High',
      icon_category: 'car_insurance',
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      alert_id: 'demo-2',
      title: 'Broadband price increase detected',
      detail: 'Virgin Media is increasing your monthly bill by £18 from next month.',
      alert_type: 'Savings',
      urgency: 'High',
      icon_category: 'broadband',
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      alert_id: 'demo-3',
      title: 'Better energy tariff available',
      detail: 'Octopus Energy Agile tariff could save you £438/year based on your usage.',
      alert_type: 'Savings',
      urgency: 'High',
      icon_category: 'energy',
      is_read: true,
      created_at: new Date().toISOString()
    }
  ],

  // Products
  products: [
    {
      record_id: 'demo-1',
      product_name: 'Netflix Premium',
      provider_name: 'Netflix',
      product_type: 'subscription',
      annual_cost: 239.88,
      potential_savings: 0,
      status: 'active'
    },
    {
      record_id: 'demo-2',
      product_name: 'Spotify Family',
      provider_name: 'Spotify',
      product_type: 'subscription',
      annual_cost: 191.64,
      potential_savings: 47.91,
      status: 'active'
    },
    {
      record_id: 'demo-3',
      product_name: 'Adobe Creative Suite',
      provider_name: 'Adobe',
      product_type: 'subscription',
      annual_cost: 599.88,
      potential_savings: 119.98,
      status: 'active'
    }
  ],

  // Financial health score
  financialHealthScore: {
    overall_score: 72,
    score_category: 'Good',
    affordability_score: 85,
    optimization_score: 68,
    stability_score: 74,
    diversity_score: 70,
    awareness_score: 63,
    calculated_at: new Date().toISOString(),
    insights: [
      'Your subscription costs are well within affordable limits',
      'Consider optimizing high-cost subscriptions for better savings',
      'Good mix of different subscription types',
      'Set up alerts for better awareness of price changes'
    ],
    recommendations: [
      {
        category: 'Cost Optimization',
        priority: 'High',
        title: 'Review Adobe Creative Suite',
        description: 'Your Adobe subscription represents 25% of your total subscription costs. Consider alternatives or downgrade to a cheaper plan.',
        potential_savings: 119.98
      }
    ]
  },

  // Activity log
  activityLog: [
    {
      activity_id: 'demo-1',
      activity_type: 'scan',
      title: 'Car insurance scan completed',
      detail: 'Found 8 better quotes for you',
      icon_category: 'car_insurance',
      created_at: new Date().toISOString()
    },
    {
      activity_id: 'demo-2',
      activity_type: 'shield',
      title: 'Energy tariff updated',
      detail: 'Potential saving increased',
      icon_category: 'energy',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    }
  ],

  // Switch history
  switchHistory: [
    {
      switch_id: 'demo-1',
      product_name: 'British Gas Energy',
      old_provider: 'British Gas',
      new_provider: 'Octopus Energy',
      annual_savings: 438,
      status: 'completed',
      completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
}

// Demo response handler
export function handleDemoRequest(endpoint: string, params?: any) {
  switch (endpoint) {
    case '/dashboard/summary':
      return demoData.dashboardSummary
      
    case '/alerts':
      return { alerts: demoData.alerts }
      
    case '/alerts/count':
      return { count: demoData.alerts.filter(a => !a.is_read).length }
      
    case '/products':
      return { products: demoData.products }
      
    case '/products/overpayment':
      return { 
        totalOverpayment: demoData.dashboardSummary.totalOverpayment,
        totalPotentialSavings: demoData.dashboardSummary.totalPotentialSavings
      }
      
    case '/products/financial-health-score':
      return demoData.financialHealthScore
      
    case '/activity':
      return { activities: demoData.activityLog }
      
    case '/switch/history':
      return { switches: demoData.switchHistory }
      
    case '/banking/connections':
      return { connections: [] }
      
    case '/products/pending-confirmation':
      return { products: [] }
      
    case '/shield/status':
      return { 
        active: true, 
        monitored_products: demoData.products.length,
        alerts_count: demoData.alerts.length
      }
      
    default:
      return null
  }
}
