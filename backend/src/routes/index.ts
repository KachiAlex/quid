import { Router } from 'express'
import authRoutes from './auth'
import bankingRoutes from './banking'
import analysisRoutes from './analysis'
import switchRoutes from './switch'
import adminRoutes from './admin'
import dashboardRoutes from './dashboard'
import gdprRoutes from './gdpr'

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
// TODO: mount remaining feature routers
// router.use('/users', userRoutes)
// router.use('/products', productRoutes)
// router.use('/comparison', comparisonRoutes)

export default router
