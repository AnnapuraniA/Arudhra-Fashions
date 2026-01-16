import express from 'express'
import { Op } from 'sequelize'
import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import User from '../models/User.js'
import Coupon from '../models/Coupon.js'
import CouponUsage from '../models/CouponUsage.js'
import Discount from '../models/Discount.js'
import CoinTransaction from '../models/CoinTransaction.js'
import Setting from '../models/Setting.js'
import { protect } from '../middleware/auth.js'
import { generateInvoicePDF } from '../utils/invoiceGenerator.js'
import { sendEmailWithPDF, sendOrderConfirmationEmail } from '../services/emailService.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, payment, shippingMethod, couponCode, discountCode, discount, discountDiscount, coinsRedeemed } = req.body

    // Verify Razorpay payment if provided
    if (payment.razorpayPaymentId && payment.razorpayOrderId && payment.razorpaySignature) {
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
      if (!RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ message: 'Payment gateway configuration missing' })
      }

      // Verify signature
      const text = `${payment.razorpayOrderId}|${payment.razorpayPaymentId}`
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex')

      if (generatedSignature !== payment.razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature' })
      }

      // Verify payment status with Razorpay
      try {
        const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${payment.razorpayPaymentId}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`
          }
        })

        if (!paymentResponse.ok) {
          return res.status(400).json({ message: 'Payment verification failed' })
        }

        const paymentDetails = await paymentResponse.json()
        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
          return res.status(400).json({ message: 'Payment not completed' })
        }
      } catch (err) {
        console.error('Razorpay verification error:', err)
        return res.status(500).json({ message: 'Payment verification failed' })
      }
    }

    // Get user cart
    const cart = await Cart.findOne({ where: { userId: req.user.id } })
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' })
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
    let shippingCost = 0
    if (shippingMethod === 'standard') shippingCost = 100
    else if (shippingMethod === 'express') shippingCost = 200
    else if (subtotal < 2000) shippingCost = 100

    const appliedCouponDiscount = discount || 0
    const appliedDiscountDiscount = discountDiscount || 0
    const totalDiscount = appliedCouponDiscount + appliedDiscountDiscount
    const tax = (subtotal - totalDiscount) * 0.18
    const total = subtotal - totalDiscount + shippingCost + tax

    // Generate order ID and tracking
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const tracking = `TRACK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Validate coupon usage if coupon code is provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        where: { code: couponCode.toUpperCase() }
      })

      if (coupon) {
        // Check per-user usage limit
        if (coupon.usageLimit) {
          const userUsageCount = await CouponUsage.count({
            where: {
              couponId: coupon.id,
              userId: req.user.id
            }
          })

          if (userUsageCount >= coupon.usageLimit) {
            return res.status(400).json({ 
              message: `You have reached the usage limit for this coupon. You can use it ${coupon.usageLimit} time${coupon.usageLimit > 1 ? 's' : ''} per account.` 
            })
          }
        }
      }
    }

    // Validate discount usage if discount code is provided
    if (discountCode) {
      const discount = await Discount.findOne({
        where: { code: discountCode.toUpperCase() }
      })

      if (discount) {
        // Check global usage limit
        if (discount.usageLimit && discount.used >= discount.usageLimit) {
          return res.status(400).json({ 
            message: 'Discount usage limit reached' 
          })
        }
      }
    }

    // Create order
    const order = await Order.create({
      orderId,
      userId: req.user.id,
      items: cart.items.map(item => ({
        product: item.product,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color
      })),
      shippingAddress,
      payment: {
        ...payment,
        status: payment.razorpayPaymentId ? 'paid' : 'pending'
      },
      subtotal,
      discount: totalDiscount,
      shippingCost,
      tax,
      total,
      tracking,
      couponCode: couponCode || null,
      discountCode: discountCode || null,
      coinsRedeemed: coinsRedeemed || 0,
      status: payment.razorpayPaymentId ? 'Processing' : 'Pending Payment',
      statusHistory: [{
        status: payment.razorpayPaymentId ? 'Processing' : 'Pending Payment',
        date: new Date(),
        note: payment.razorpayPaymentId ? 'Order placed and payment received' : 'Order placed, awaiting payment'
      }]
    })

    // Record coupon usage if coupon was used
    if (couponCode) {
      const coupon = await Coupon.findOne({
        where: { code: couponCode.toUpperCase() }
      })

      if (coupon) {
        // Create coupon usage record
        await CouponUsage.create({
          couponId: coupon.id,
          userId: req.user.id,
          orderId: order.orderId
        })

        // Increment coupon used count
        coupon.used = (coupon.used || 0) + 1
        await coupon.save()
      }
    }

    // Record discount usage if discount was used
    if (discountCode) {
      const discount = await Discount.findOne({
        where: { code: discountCode.toUpperCase() }
      })

      if (discount) {
        // Increment discount used count
        discount.used = (discount.used || 0) + 1
        await discount.save()
      }
    }

    // Clear cart
    cart.items = []
    await cart.save()

    // Award coins based on purchase amount (only if payment is successful)
    if (payment.razorpayPaymentId && total > 0) {
      try {
        // Get coin earning rules
        const earningRule = await Setting.findOne({ where: { key: 'coin_earning_rule' } })
        const defaultRule = { threshold: 5000, coins: 10 }
        const rule = earningRule ? JSON.parse(earningRule.value) : defaultRule

        // Check if order qualifies for coins
        if (total >= rule.threshold) {
          const user = await User.findByPk(req.user.id)
          if (user) {
            const coinsToAward = rule.coins
            const newBalance = (user.coins || 0) + coinsToAward
            
            user.coins = newBalance
            await user.save()

            // Create coin transaction record
            await CoinTransaction.create({
              userId: user.id,
              type: 'earned',
              amount: coinsToAward,
              balanceAfter: newBalance,
              description: `Earned from order ${order.orderId}`,
              orderId: order.orderId,
              metadata: {
                orderTotal: total,
                threshold: rule.threshold
              }
            })
          }
        }
      } catch (coinError) {
        // Don't fail order creation if coin awarding fails
        console.error('Error awarding coins:', coinError)
      }
    }

    // Handle coin redemption if coins were used
    if (req.body.coinsRedeemed && req.body.coinsRedeemed > 0) {
      try {
        const user = await User.findByPk(req.user.id)
        if (user && user.coins >= req.body.coinsRedeemed) {
          // Coins are already redeemed via coin redemption endpoint before order creation
          // This is just a safety check/log
          console.log(`Coins redeemed for order ${order.orderId}: ${req.body.coinsRedeemed}`)
        }
      } catch (coinError) {
        console.error('Error processing coin redemption:', coinError)
      }
    }

    // Send order confirmation email (non-blocking)
    try {
      const user = await User.findByPk(req.user.id)
      if (user) {
        if (user.email || shippingAddress?.email) {
          await sendOrderConfirmationEmail(order, { ...user.toJSON(), email: user.email || shippingAddress?.email })
        }
      }
    } catch (emailError) {
      // Don't fail order creation if email fails
      console.error('Error sending order confirmation email:', emailError)
    }

    res.status(201).json(order)
  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    })

    res.json(orders)
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { id: req.params.id },
          { orderId: req.params.id },
          { tracking: req.params.id }
        ],
        userId: req.user.id
      }
    })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    res.json(order)
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/orders/:id/invoice
// @desc    Download invoice PDF
// @access  Private
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { id: req.params.id },
          { orderId: req.params.id },
          { tracking: req.params.id }
        ],
        userId: req.user.id
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'mobile']
      }]
    })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    // Generate invoice PDF
    const user = order.user || req.user
    const invoicePath = await generateInvoicePDF(order, user)

    // Send PDF file
    const filepath = path.join(__dirname, '..', invoicePath)
    if (!fs.existsSync(filepath)) {
      return res.status(500).json({ message: 'Invoice generation failed' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderId}.pdf"`)
    res.sendFile(path.resolve(filepath))
  } catch (error) {
    console.error('Download invoice error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/orders/:id/send-invoice
// @desc    Send invoice to customer via email (PDF attachment)
// @access  Private
router.post('/:id/send-invoice', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { id: req.params.id },
          { orderId: req.params.id },
          { tracking: req.params.id }
        ],
        userId: req.user.id
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'mobile']
      }]
    })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const user = order.user || req.user
    const hasEmail = user.email || order.shippingAddress?.email

    if (!hasEmail) {
      return res.status(400).json({ message: 'Email address is required to send the invoice.' })
    }

    // Generate invoice PDF
    const invoicePath = await generateInvoicePDF(order, user)
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5001'
    const invoiceUrl = `${backendUrl}${invoicePath}`

    const results = {
      emailSent: false,
      message: ''
    }

    const emailResult = await sendEmailWithPDF({
      to: hasEmail,
      subject: `Invoice for Order ${order.orderId} - Arudhra Fashions`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice for Order ${order.orderId}</h2>
          <p>Dear ${user.name || 'Customer'},</p>
          <p>Please find attached your invoice for order <strong>${order.orderId}</strong>.</p>
          <p><strong>Order Total:</strong> ₹${parseFloat(order.total || 0).toFixed(2)}</p>
          <p>Thank you for shopping with Arudhra Fashions!</p>
        </div>
      `,
      pdfPath: invoicePath,
      pdfName: `invoice-${order.orderId}.pdf`
    })

    results.emailSent = emailResult.success
    if (emailResult.success) {
      results.message = 'Invoice sent via email'
    } else {
      results.message = emailResult.message || 'Failed to send email'
    }

    res.json({
      success: true,
      ...results,
      invoiceUrl
    })
  } catch (error) {
    console.error('Send invoice error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
