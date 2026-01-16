import { useState, useEffect } from 'react'
import { Save, Coins as CoinsIcon, TrendingUp, Gift, Info } from 'lucide-react'
import { useToast } from '../../components/Toast/ToastContainer'
import { adminSettingsAPI } from '../../utils/adminApi'

function Coins() {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coinRules, setCoinRules] = useState({
    earning: {
      threshold: 5000,
      coins: 10
    },
    redemption: {
      coins: 50,
      discountPercent: 5
    }
  })

  useEffect(() => {
    loadCoinRules()
  }, [])

  const loadCoinRules = async () => {
    try {
      setLoading(true)
      // Load all settings and find coin rules
      const allSettings = await adminSettingsAPI.getAll()
      
      if (allSettings.coin_earning_rule) {
        const earningRule = typeof allSettings.coin_earning_rule === 'string' 
          ? JSON.parse(allSettings.coin_earning_rule) 
          : allSettings.coin_earning_rule
        setCoinRules(prev => ({ ...prev, earning: earningRule }))
      }
      
      if (allSettings.coin_redemption_rule) {
        const redemptionRule = typeof allSettings.coin_redemption_rule === 'string'
          ? JSON.parse(allSettings.coin_redemption_rule)
          : allSettings.coin_redemption_rule
        setCoinRules(prev => ({ ...prev, redemption: redemptionRule }))
      }
    } catch (err) {
      console.error('Error loading coin rules:', err)
      showError('Failed to load coin rules')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate inputs
    if (coinRules.earning.threshold <= 0 || coinRules.earning.coins <= 0) {
      showError('Earning threshold and coins must be greater than 0')
      return
    }
    if (coinRules.redemption.coins <= 0 || coinRules.redemption.discountPercent <= 0) {
      showError('Redemption coins and discount percentage must be greater than 0')
      return
    }
    if (coinRules.redemption.discountPercent > 100) {
      showError('Discount percentage cannot exceed 100%')
      return
    }

    setSaving(true)
    try {
      // Save coin earning rule
      await adminSettingsAPI.updateSingle(
        'coin_earning_rule',
        JSON.stringify(coinRules.earning),
        'json',
        'coins',
        'Coin earning rule: threshold amount and coins awarded'
      )

      // Save coin redemption rule
      await adminSettingsAPI.updateSingle(
        'coin_redemption_rule',
        JSON.stringify(coinRules.redemption),
        'json',
        'coins',
        'Coin redemption rule: coins required and discount percentage'
      )

      success('Coin rules saved successfully')
    } catch (err) {
      console.error('Error saving coin rules:', err)
      showError('Failed to save coin rules')
    } finally {
      setSaving(false)
    }
  }

  const updateEarningRule = (field, value) => {
    setCoinRules(prev => ({
      ...prev,
      earning: {
        ...prev.earning,
        [field]: parseFloat(value) || 0
      }
    }))
  }

  const updateRedemptionRule = (field, value) => {
    setCoinRules(prev => ({
      ...prev,
      redemption: {
        ...prev.redemption,
        [field]: parseFloat(value) || 0
      }
    }))
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-spinner">
          <p>Loading coin configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Coins & Rewards Configuration</h1>
          <p>Configure coin earning and redemption rules for your loyalty program</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="coins-config-sections">
        {/* Coin Earning Rule */}
        <div className="coins-config-card">
          <div className="coins-config-header">
            <div className="coins-config-icon earning-icon">
              <TrendingUp size={28} />
            </div>
            <div>
              <h2>Coin Earning Rule</h2>
              <p>Set the minimum purchase amount and coins awarded</p>
            </div>
          </div>
          <div className="coins-config-content">
            <div className="form-row">
              <div className="form-group">
                <label>
                  Minimum Purchase Amount (₹)
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={coinRules.earning.threshold}
                  onChange={(e) => updateEarningRule('threshold', e.target.value)}
                  placeholder="e.g., 5000"
                />
                <small>Customers must purchase this amount or more to earn coins</small>
              </div>
              <div className="form-group">
                <label>
                  Coins Awarded
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={coinRules.earning.coins}
                  onChange={(e) => updateEarningRule('coins', e.target.value)}
                  placeholder="e.g., 10"
                />
                <small>Number of coins awarded when threshold is met</small>
              </div>
            </div>
            <div className="coins-config-preview">
              <Info size={18} />
              <div>
                <strong>Preview:</strong> Customers purchasing ₹{coinRules.earning.threshold.toLocaleString()} or more will earn <strong>{coinRules.earning.coins} coins</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Coin Redemption Rule */}
        <div className="coins-config-card">
          <div className="coins-config-header">
            <div className="coins-config-icon redemption-icon">
              <Gift size={28} />
            </div>
            <div>
              <h2>Coin Redemption Rule</h2>
              <p>Set how many coins are needed and the discount percentage</p>
            </div>
          </div>
          <div className="coins-config-content">
            <div className="form-row">
              <div className="form-group">
                <label>
                  Coins Required
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={coinRules.redemption.coins}
                  onChange={(e) => updateRedemptionRule('coins', e.target.value)}
                  placeholder="e.g., 50"
                />
                <small>Number of coins needed to redeem</small>
              </div>
              <div className="form-group">
                <label>
                  Discount Percentage (%)
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={coinRules.redemption.discountPercent}
                  onChange={(e) => updateRedemptionRule('discountPercent', e.target.value)}
                  placeholder="e.g., 5"
                />
                <small>Discount percentage applied when coins are redeemed</small>
              </div>
            </div>
            <div className="coins-config-preview">
              <Info size={18} />
              <div>
                <strong>Preview:</strong> <strong>{coinRules.redemption.coins} coins</strong> = <strong>{coinRules.redemption.discountPercent}% discount</strong> on order total
              </div>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="coins-config-info">
          <div className="coins-config-info-header">
            <CoinsIcon size={24} />
            <h3>How It Works</h3>
          </div>
          <ul className="coins-config-info-list">
            <li>
              <strong>Coin Earning:</strong> When a customer makes a purchase of ₹{coinRules.earning.threshold.toLocaleString()} or more, they automatically receive {coinRules.earning.coins} coins in their account.
            </li>
            <li>
              <strong>Coin Redemption:</strong> Customers can redeem {coinRules.redemption.coins} coins at checkout to get a {coinRules.redemption.discountPercent}% discount on their order total.
            </li>
            <li>
              <strong>Balance Tracking:</strong> All coin transactions (earned and spent) are tracked in the customer's account and visible in their dashboard.
            </li>
            <li>
              <strong>Automatic Application:</strong> Coins are automatically added after successful payment and can be used immediately on future orders.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Coins
