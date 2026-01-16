import { useState, useEffect } from 'react'
import { X, ShoppingCart, Check } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../Toast/ToastContainer'
import { cartAPI } from '../../utils/api'
import { useAuth } from '../../context/AuthContext'

function QuickView({ product, isOpen, onClose }) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { success, error: showError } = useToast()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Normalize product data
  const productImage = product.images && product.images.length > 0 
    ? product.images[0]
    : product.image || 'https://via.placeholder.com/600x800'
  
  const productColors = product.colors || []
  const productSizes = product.sizes || []

  // Set default size and color
  useEffect(() => {
    if (productSizes.length > 0 && !selectedSize) {
      setSelectedSize(productSizes[0])
    }
    if (productColors.length > 0 && !selectedColor) {
      const firstColor = typeof productColors[0] === 'string' 
        ? productColors[0] 
        : (productColors[0].name || productColors[0].value)
      setSelectedColor(firstColor)
    }
  }, [product, productSizes, productColors, selectedSize, selectedColor])

  if (!isOpen || !product) return null

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showError('Please login to add items to cart')
      navigate('/dashboard', { state: { tab: 'login', redirectPath: window.location.pathname } })
      onClose()
      return
    }

    if (productSizes.length > 0 && !selectedSize) {
      showError('Please select a size')
      return
    }

    try {
      setIsAddingToCart(true)
      const productId = product._id || product.id
      const token = localStorage.getItem('token')
      
      if (!token) {
        showError('Please login again')
        return
      }

      await cartAPI.addItem(productId, 1, selectedSize || null, selectedColor || null)
      success('Product added to cart!')
      
      // Dispatch cart update event
      window.dispatchEvent(new Event('cartUpdated'))
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      console.error('Failed to add to cart:', err)
      const errorMessage = err.message || 'Failed to add product to cart'
      showError(errorMessage)
      
      // If unauthorized, might need to re-login
      if (errorMessage.includes('authorized') || errorMessage.includes('401')) {
        showError('Session expired. Please login again.')
      }
    } finally {
      setIsAddingToCart(false)
    }
  }

  const discountPercent = product.onSale && product.originalPrice && typeof product.originalPrice === 'number'
    ? Math.round(((product.originalPrice - (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0)) / product.originalPrice) * 100)
    : 0

  return (
    <div className="modal-overlay quick-view-overlay" onClick={onClose}>
      <div className="modal-content quick-view-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close quick-view-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        
        <div className="quick-view-content">
          <div className="quick-view-image-section">
            <div className="quick-view-image">
              <img src={productImage} alt={product.name} />
              {product.onSale && discountPercent > 0 && (
                <span className="quick-view-offer-badge">{discountPercent}% OFF</span>
              )}
            </div>
          </div>

          <div className="quick-view-info">
            <h2 className="quick-view-title">{product.name}</h2>

            <div className="quick-view-price-section">
              <div className="quick-view-price">
                {product.originalPrice && typeof product.originalPrice === 'number' && (
                  <span className="original-price">₹{product.originalPrice.toFixed(2)}</span>
                )}
                <span className="current-price">₹{(typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0).toFixed(2)}</span>
              </div>
              {product.inStock && (
                <div className="quick-view-stock">
                  <Check size={16} />
                  <span>In Stock</span>
                </div>
              )}
            </div>

            {productSizes.length > 0 && (
              <div className="quick-view-options">
                <label>Size</label>
                <div className="size-options">
                  {productSizes.map(size => (
                    <button
                      key={size}
                      className={`size-option-btn ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {productColors.length > 0 && (
              <div className="quick-view-options">
                <label>Color</label>
                <div className="color-options">
                  {productColors.map((color, idx) => {
                    const colorName = typeof color === 'string' ? color : (color.name || color.value || `Color ${idx + 1}`)
                    const colorValue = typeof color === 'string' ? color : (color.value || color.name || '#000000')
                    const isSelected = selectedColor === colorName
                    
                    return (
                      <button
                        key={colorName}
                        className={`color-option-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedColor(colorName)}
                        title={colorName}
                      >
                        <span 
                          className="color-swatch"
                          style={{ backgroundColor: colorValue }}
                        ></span>
                        {isSelected && <span className="check-mark">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="quick-view-actions">
              <button 
                className="btn btn-primary btn-large quick-view-add-cart" 
                onClick={handleAddToCart}
                disabled={!product.inStock || isAddingToCart}
              >
                <ShoppingCart size={20} />
                {isAddingToCart ? 'Adding...' : (product.inStock ? 'Add to Cart' : 'Out of Stock')}
              </button>
              <Link 
                to={`/product/${product._id || product.id}`} 
                className="quick-view-link" 
                onClick={onClose}
              >
                View Full Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickView

