import { Router } from 'express'
import authRoutes from './auth'
import bankingRoutes from './banking'
import analysisRoutes from './analysis'
import switchRoutes from './switch'
import adminRoutes from './admin'
import dashboardRoutes from './dashboard'
import gdprRoutes from './gdpr'
import transactionRoutes from './transactions'
import alertsRoutes from './alerts'
import activityRoutes from './activity'
import shieldRoutes from './shield'
import goalsRoutes from './goals'
import insightsRoutes from './insights'
import communityRoutes from './community'
import productsRoutes from './products'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ message: 'Quid API v0.1.0' })
})

router.use('/auth', authRoutes)
router.use('/banking', bankingRoutes)
router.use('/analysis', analysisRoutes)
router.use('/switch', switchRoutes)
router.use('/admin', adminRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/gdpr', gdprRoutes)
router.use('/transactions', transactionRoutes)
router.use('/alerts', alertsRoutes)
router.use('/activity', activityRoutes)
router.use('/shield', shieldRoutes)
router.use('/goals', goalsRoutes)
router.use('/insights', insightsRoutes)
router.use('/community', communityRoutes)
router.use('/products', productsRoutes)

export default router
