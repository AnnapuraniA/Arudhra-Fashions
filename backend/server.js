import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/db.js'

// Import models to set up associations
import './models/index.js'

// Import routes
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import wishlistRoutes from './routes/wishlistRoutes.js'
import compareRoutes from './routes/compareRoutes.js'
import addressRoutes from './routes/addressRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import adminAuthRoutes from './routes/adminAuthRoutes.js'
import bannerRoutes from './routes/bannerRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import settingRoutes from './routes/settingRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import returnRoutes from './routes/returnRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import discountRoutes from './routes/discountRoutes.js'
import newsletterRoutes from './routes/newsletterRoutes.js'
import contentRoutes from './routes/contentRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import emailTemplateRoutes from './routes/emailTemplateRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import newArrivalRoutes from './routes/newArrivalRoutes.js'
import testimonialRoutes from './routes/testimonialRoutes.js'
import saleStripRoutes from './routes/saleStripRoutes.js'
import coinRoutes from './routes/coinRoutes.js'

// Load environment variables
dotenv.config()

const app = express()

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://arudhrafashions.com',
  process.env.ADMIN_URL || process.env.FRONTEND_URL || 'https://arudhrafashions.com',
  'http://localhost:5173'
]

// Dynamic CORS middleware: reflect allowed origins and handle preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin

  // Allow non-browser requests (curl, server-to-server) without origin
  if (!origin) return next()

  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.arudhrafashions.com')
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    if (req.method === 'OPTIONS') return res.sendStatus(200)
  }

  return next()
})
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Mark API responses so we can verify requests reach the backend server
app.use('/api', (req, res, next) => {
  res.header('X-Served-By', 'arudhra-backend')
  next()
})

// Simple diagnostic endpoint to verify CORS and routing
app.options('/api/diagnostic', (req, res) => {
  // Respond to preflight explicitly
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')
  return res.sendStatus(200)
})
app.get('/api/diagnostic', (req, res) => {
  return res.json({
    ok: true,
    servedBy: 'arudhra-backend',
    originHeader: req.headers.origin || null
  })
})

// Serve static files (uploaded images)
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Public/Customer Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/products', reviewRoutes) // Product reviews
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/compare', compareRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/payment-methods', paymentRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/discounts', discountRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/returns', returnRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/new-arrivals', newArrivalRoutes)
app.use('/api/testimonials', testimonialRoutes)
app.use('/api/sale-strips', saleStripRoutes)
app.use('/api/coins', coinRoutes)

// Admin Routes
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/banners', bannerRoutes)
app.use('/api/admin/coupons', couponRoutes)
app.use('/api/admin/settings', settingRoutes)
app.use('/api/admin/queries', contactRoutes)
app.use('/api/admin/returns', returnRoutes)
app.use('/api/admin/categories', categoryRoutes)
app.use('/api/admin/discounts', discountRoutes)
app.use('/api/admin/newsletter', newsletterRoutes)
app.use('/api/admin/content', contentRoutes)
app.use('/api/admin/new-arrivals', newArrivalRoutes)
app.use('/api/admin/testimonials', testimonialRoutes)
app.use('/api/admin/sale-strips', saleStripRoutes)
app.use('/api/admin/inventory', inventoryRoutes)
app.use('/api/admin/email-templates', emailTemplateRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Arudhra Fashions API is running' })
})

// Serve frontend static files (Vite build) so backend can serve the SPA in production
// NOTE: frontend is served separately (e.g. static site on arudhrafashions.com).
// Keep backend focused on API routes only so /api/* are handled here.

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB()
    
    const PORT = process.env.PORT || 5001
    const HOST = process.env.HOST || '0.0.0.0'

    app.listen(PORT, HOST, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on ${HOST}:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()

