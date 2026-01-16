import { useState, useEffect } from 'react'
import { Coins, TrendingUp, TrendingDown, Clock, Gift, Info, ShoppingBag, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { coinsAPI } from '../utils/api'
import { useToast } from './Toast/ToastContainer'

function CoinsTab({ user, showSuccessToast, showError }) {
  const [coinBalance, setCoinBalance] = useState(0)
  const [coinRules, setCoinRules] = useState({ earning: { threshold: 5000, coins: 10 }, redemption: { coins: 50, discountPercent: 5 } })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadCoinData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user])

  const loadCoinData = async () => {
    try {
      setLoading(true)
      const [balanceData, transactionsData] = await Promise.all([
        coinsAPI.getBalance(),
        coinsAPI.getTransactions(page, 20)
      ])
      
      setCoinBalance(balanceData.balance || 0)
      
      // Always update coin rules if provided, otherwise keep defaults
      if (balanceData.rules) {
        setCoinRules(balanceData.rules)
      } else {
        // If rules not provided, try to load from settings API as fallback
        console.warn('Coin rules not found in balance response, using defaults')
      }
      
      setTransactions(transactionsData.transactions || [])
      setTotalPages(transactionsData.totalPages || 1)
    } catch (err) {
      console.error('Failed to load coin data:', err)
      showError('Failed to load coin information')
      // Keep default rules on error
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earned':
        return <TrendingUp size={20} className="text-success" />
      case 'spent':
        return <TrendingDown size={20} className="text-danger" />
      case 'expired':
        return <Clock size={20} className="text-warning" />
      case 'refunded':
        return <Gift size={20} className="text-info" />
      default:
        return <Coins size={20} />
    }
  }

  const getTransactionColor = (type) => {
    switch (type) {
      case 'earned':
        return 'text-success'
      case 'spent':
        return 'text-danger'
      case 'expired':
        return 'text-warning'
      case 'refunded':
        return 'text-info'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="loading-spinner">
          <p>Loading coin information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-section">
      <div className="coins-header">
        <h2>Coins & Rewards</h2>
        <p className="coins-subtitle">
          Earn {coinRules.earning.coins} coins on purchases over ₹{coinRules.earning.threshold.toLocaleString()} and redeem {coinRules.redemption.coins} coins for {coinRules.redemption.discountPercent}% discount
        </p>
      </div>

      {/* Coin Balance Card */}
      <div className="coin-balance-card">
        <div className="coin-balance-icon">
          <Coins size={48} />
        </div>
        <div className="coin-balance-content">
          <div className="coin-balance-label">Your Coin Balance</div>
          <div className="coin-balance-amount">{coinBalance}</div>
          <div className="coin-balance-info">
            {coinRules.redemption.coins} coins = {coinRules.redemption.discountPercent}% discount
          </div>
        </div>
      </div>

      {/* Coin Rules - Improved UI */}
      <div className="coin-rules-section">
        <div className="coin-rules-header">
          <div className="coin-rules-header-icon">
            <Sparkles size={28} />
          </div>
          <div>
            <h3>How It Works</h3>
            <p className="coin-rules-subtitle">Simple steps to earn and redeem your rewards</p>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="coin-steps-container">
          <div className="coin-step-card">
            <div className="coin-step-number">1</div>
            <div className="coin-step-content">
              <div className="coin-step-header">
                <ShoppingBag size={24} className="coin-step-icon" />
                <h4>Shop & Earn</h4>
              </div>
              <p className="coin-step-description">
                Make a purchase worth <strong>₹{coinRules.earning.threshold.toLocaleString()}</strong> or more
              </p>
              <div className="coin-step-reward">
                <Coins size={18} />
                <span>Earn <strong>{coinRules.earning.coins} coins</strong> automatically</span>
              </div>
            </div>
            <div className="coin-step-arrow">
              <ArrowRight size={20} />
            </div>
          </div>

          <div className="coin-step-card">
            <div className="coin-step-number">2</div>
            <div className="coin-step-content">
              <div className="coin-step-header">
                <Gift size={24} className="coin-step-icon" />
                <h4>Redeem & Save</h4>
              </div>
              <p className="coin-step-description">
                Redeem {coinRules.redemption.coins} coins at checkout to get {coinRules.redemption.discountPercent}% discount on your order
              </p>
              <div className="coin-step-reward">
                <CheckCircle2 size={18} />
                <span><strong>{coinRules.redemption.coins} coins</strong> = <strong>{coinRules.redemption.discountPercent}% discount</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="coin-info-grid">
          <div className="coin-info-card earn-card">
            <div className="coin-info-icon-wrapper">
              <TrendingUp size={28} />
            </div>
            <div className="coin-info-content">
              <h4>Earn Coins</h4>
              <p className="coin-info-main">
                <span className="coin-info-highlight">{coinRules.earning.coins} coins</span>
              </p>
              <p className="coin-info-detail">
                For purchases over ₹{coinRules.earning.threshold.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="coin-info-card redeem-card">
            <div className="coin-info-icon-wrapper">
              <Gift size={28} />
            </div>
            <div className="coin-info-content">
              <h4>Redeem Coins</h4>
              <p className="coin-info-main">
                <span className="coin-info-highlight">{coinRules.redemption.discountPercent}% off</span>
              </p>
              <p className="coin-info-detail">
                Use {coinRules.redemption.coins} coins at checkout
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="coin-tips-section">
          <div className="coin-tips-header">
            <Info size={20} />
            <h4>Tips & Benefits</h4>
          </div>
          <ul className="coin-tips-list">
            <li>
              <CheckCircle2 size={16} />
              <span>Coins are automatically added to your account after successful payment of ₹{coinRules.earning.threshold.toLocaleString()} or more</span>
            </li>
            <li>
              <CheckCircle2 size={16} />
              <span>You can redeem {coinRules.redemption.coins} coins during checkout to get {coinRules.redemption.discountPercent}% instant discount</span>
            </li>
            <li>
              <CheckCircle2 size={16} />
              <span>View your complete transaction history below</span>
            </li>
            <li>
              <CheckCircle2 size={16} />
              <span>Coins never expire - use them whenever you want</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Transaction History */}
      <div className="coin-transactions-section">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <Coins size={48} />
            <h3>No transactions yet</h3>
            <p>Make a purchase of ₹{coinRules.earning.threshold.toLocaleString()} or more to earn {coinRules.earning.coins} coins and see your transaction history here</p>
          </div>
        ) : (
          <>
            <div className="coin-transactions-list">
              {transactions.map(transaction => (
                <div key={transaction.id} className="coin-transaction-item">
                  <div className="transaction-icon-wrapper">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-description">{transaction.description}</div>
                    <div className="transaction-date">
                      {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className={`transaction-amount ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'earned' || transaction.type === 'refunded' ? '+' : '-'}
                    {transaction.amount} coins
                  </div>
                  <div className="transaction-balance">
                    Balance: {transaction.balanceAfter} coins
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="pagination-info">Page {page} of {totalPages}</span>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CoinsTab
