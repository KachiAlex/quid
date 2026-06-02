import { Router } from 'express'
import authRoutes from './auth'
import bankingRoutes from './banking'
import analysisRoutes from './analysis'
import switchRoutes from './switch'
import adminRoutes from './admin'
import dashboardRoutes from './dashboard'
import gdprRoutes from './gdpr'
import transactionRoutes from './transactions'

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

export default router
