import express from 'express'
import { protect } from '../middleware/auth.js'
import User from '../models/User.js'
import CoinTransaction from '../models/CoinTransaction.js'
import Order from '../models/Order.js'
import Setting from '../models/Setting.js'
import { Op } from 'sequelize'

const router = express.Router()

// Helper function to get coin rules from settings
const getCoinRules = async () => {
  try {
    const earningRule = await Setting.findOne({ where: { key: 'coin_earning_rule' } })
    const redemptionRule = await Setting.findOne({ where: { key: 'coin_redemption_rule' } })
    
    // Default rules if not configured
    const defaultEarningRule = {
      threshold: 5000,
      coins: 10
    }
    
    const defaultRedemptionRule = {
      coins: 50,
      discountPercent: 5
    }
    
    return {
      earning: earningRule ? JSON.parse(earningRule.value) : defaultEarningRule,
      redemption: redemptionRule ? JSON.parse(redemptionRule.value) : defaultRedemptionRule
    }
  } catch (error) {
    console.error('Error getting coin rules:', error)
    return {
      earning: { threshold: 5000, coins: 10 },
      redemption: { coins: 50, discountPercent: 5 }
    }
  }
}

// @route   GET /api/coins/balance
// @desc    Get user coin balance
// @access  Private
router.get('/balance', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const rules = await getCoinRules()

    res.json({
      balance: user.coins || 0,
      rules: {
        earning: rules.earning,
        redemption: rules.redemption
      }
    })
  } catch (error) {
    console.error('Get coin balance error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/coins/transactions
// @desc    Get user coin transaction history
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    const transactions = await CoinTransaction.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    res.json({
      transactions: transactions.rows,
      total: transactions.count,
      page,
      totalPages: Math.ceil(transactions.count / limit)
    })
  } catch (error) {
    console.error('Get coin transactions error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/coins/calculate-discount
// @desc    Calculate discount for coin redemption
// @access  Private
router.post('/calculate-discount', protect, async (req, res) => {
  try {
    const { coinsToRedeem, subtotal } = req.body

    if (!coinsToRedeem || coinsToRedeem <= 0) {
      return res.status(400).json({ message: 'Invalid coins to redeem' })
    }

    if (!subtotal || subtotal <= 0) {
      return res.status(400).json({ message: 'Invalid subtotal' })
    }

    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.coins < coinsToRedeem) {
      return res.status(400).json({ message: 'Insufficient coins' })
    }

    const rules = await getCoinRules()
    const { coins: requiredCoins, discountPercent } = rules.redemption

    // Calculate how many discount units can be applied
    const discountUnits = Math.floor(coinsToRedeem / requiredCoins)
    const discountAmount = (subtotal * discountPercent * discountUnits) / 100

    res.json({
      coinsToRedeem,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountPercent: discountPercent * discountUnits,
      coinsRemaining: coinsToRedeem % requiredCoins
    })
  } catch (error) {
    console.error('Calculate discount error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/coins/redeem
// @desc    Redeem coins for discount (called during checkout)
// @access  Private
router.post('/redeem', protect, async (req, res) => {
  try {
    const { coinsToRedeem, orderId } = req.body

    if (!coinsToRedeem || coinsToRedeem <= 0) {
      return res.status(400).json({ message: 'Invalid coins to redeem' })
    }

    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.coins < coinsToRedeem) {
      return res.status(400).json({ message: 'Insufficient coins' })
    }

    // Deduct coins
    const newBalance = user.coins - coinsToRedeem
    user.coins = newBalance
    await user.save()

    // Create transaction record
    await CoinTransaction.create({
      userId: user.id,
      type: 'spent',
      amount: coinsToRedeem,
      balanceAfter: newBalance,
      description: orderId ? `Redeemed for order ${orderId}` : 'Redeemed for discount',
      orderId: orderId || null,
      metadata: {
        redemption: true
      }
    })

    res.json({
      success: true,
      coinsRedeemed: coinsToRedeem,
      newBalance
    })
  } catch (error) {
    console.error('Redeem coins error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
