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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()

