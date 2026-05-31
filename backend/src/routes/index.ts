import { Router } from 'express'
import authRoutes from './auth'
import bankingRoutes from './banking'
import analysisRoutes from './analysis'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ message: 'Quid API v0.1.0' })
})

router.use('/auth', authRoutes)
router.use('/banking', bankingRoutes)
router.use('/analysis', analysisRoutes)
// TODO: mount remaining feature routers
// router.use('/users', userRoutes)
// router.use('/banking', bankingRoutes)
// router.use('/products', productRoutes)
// router.use('/comparison', comparisonRoutes)
// router.use('/switch', switchRoutes)

export default router
