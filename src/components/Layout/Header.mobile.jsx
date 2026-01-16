import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Heart, User, Search, ChevronDown, ChevronUp, GitCompare, Menu, X, ChevronRight, Sparkles, Coins } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useHeaderData } from '../../hooks/useHeaderData'
import { useLoginModal } from '../../context/LoginModalContext'
import { coinsAPI } from '../../utils/api'

function HeaderMobile() {
  const { isAuthenticated, user } = useAuth()
  const { cartCount, compareCount, isSticky } = useHeaderData()
  const { openModal } = useLoginModal()
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isHomeCategoriesOpen, setIsHomeCategoriesOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [coinBalance, setCoinBalance] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // Load coin balance
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCoinBalance()
      // Refresh coin balance periodically
      const interval = setInterval(() => {
        if (isAuthenticated) {
          loadCoinBalance()
        }
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    } else {
      setCoinBalance(0)
    }
  }, [isAuthenticated, user])

  const loadCoinBalance = async () => {
    if (!isAuthenticated) return
    try {
      const data = await coinsAPI.getBalance()
      setCoinBalance(data.balance || 0)
    } catch (err) {
      console.error('Failed to load coin balance:', err)
      // Set to 0 on error so icon still shows
      setCoinBalance(0)
    }
  }

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/categories`)
        const data = await response.json()
        setCategories(data || [])
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      }
    }
    fetchCategories()
  }, [])

  const toggleCategory = (categorySlug) => {
    if (expandedCategory === categorySlug) {
      setExpandedCategory(null)
    } else {
      setExpandedCategory(categorySlug)
    }
  }

  const handleCategoryClick = (categorySlug) => {
    navigate(`/products/${categorySlug}`)
    setExpandedCategory(null)
    setIsHomeCategoriesOpen(false)
  }

  const handleSubcategoryClick = (categorySlug, subcategorySlug) => {
    navigate(`/products/${categorySlug}/${subcategorySlug}`)
    setExpandedCategory(null)
    setIsHomeCategoriesOpen(false)
  }

  // Close accordion when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (expandedCategory && !e.target.closest('.nav-category')) {
        setExpandedCategory(null)
      }
    }

    if (expandedCategory) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [expandedCategory])

  // Close search when clicking outside
  useEffect(() => {
    if (!isSearchExpanded) return

    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-wrapper') && !e.target.closest('.search-dropdown')) {
        setIsSearchExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchExpanded])

  // Prevent body scroll when bottom sheet is open
  useEffect(() => {
    if (isHomeCategoriesOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isHomeCategoriesOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e)
    }
  }

  return (
    <>
      {/* Backdrop overlay when bottom sheet is open */}
      {isHomeCategoriesOpen && (
        <div 
          className="categories-bottom-sheet-backdrop"
          onClick={() => setIsHomeCategoriesOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <div className={`header-wrapper ${!isHomePage ? 'header-footer-style' : ''}`}>
        <header className={`header header-mobile ${!isHomePage ? 'header-footer-style' : ''} ${isSticky ? 'sticky' : ''} ${isHomePage ? 'home-header' : ''}`}>
          <div className="container">
            <div className={`header-content ${isHomePage ? 'home-header-content' : 'other-page-header-content'}`}>
              {/* Menu button for categories */}
              <button 
                className="mobile-menu-btn"
                onClick={() => setIsHomeCategoriesOpen(!isHomeCategoriesOpen)}
                aria-label="Open categories menu"
                title="Categories"
              >
                {isHomeCategoriesOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <Link to="/" className="brand-name">
                Arudhra Fashions
              </Link>

              <div className="header-actions">
                {!isHomePage && (
                  <>
                    <Link to="/wishlist" className="icon-btn" title="Wishlist">
                      <Heart size={20} />
                    </Link>
                    <Link to="/cart" className="icon-btn" title="Shopping Cart">
                      <ShoppingCart size={20} />
                      {cartCount > 0 && (
                        <span className="badge show"></span>
                      )}
                    </Link>
                  </>
                )}
                <Link to="/compare" className="icon-btn" title="Compare Products">
                  <GitCompare size={20} />
                  {compareCount > 0 && (
                    <span className="badge show"></span>
                  )}
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      state={{ tab: 'coins' }} 
                      className="icon-btn coins-icon-btn" 
                      title={`${coinBalance} Coins`}
                      style={{ display: 'flex', visibility: 'visible', opacity: 1 }}
                    >
                      <Coins size={20} />
                      {coinBalance > 0 && (
                        <span className="coin-badge">{coinBalance}</span>
                      )}
                    </Link>
                    <Link to="/dashboard" className="icon-btn" title={user?.name || 'Profile'}>
                      <User size={20} />
                    </Link>
                  </>
                ) : (
                  <button
                    className="icon-btn"
                    onClick={() => openModal('login')}
                    title="Login/Register"
                  >
                    <User size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Search Bar - Below Header */}
      <div className="mobile-search-bar-container">
        <form className="mobile-search-bar" onSubmit={handleSearch}>
          <Search size={20} className="mobile-search-icon" />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="mobile-search-input"
          />
          {searchQuery && (
            <button 
              type="button" 
              className="mobile-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Bottom Sheet for Categories */}
      <div className={`categories-bottom-sheet ${isHomeCategoriesOpen ? 'open' : ''}`}>
        <div className="categories-bottom-sheet-header">
          <h2>Categories</h2>
          <button 
            className="categories-bottom-sheet-close"
            onClick={() => setIsHomeCategoriesOpen(false)}
            aria-label="Close categories"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="categories-bottom-sheet-content">
          {categories.map((category) => {
            const isExpanded = expandedCategory === category.slug
            return (
              <div 
                key={category.id} 
                className={`category-item ${isExpanded ? 'expanded' : ''}`}
              >
                <button
                  className="category-item-header"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleCategory(category.slug)
                  }}
                  type="button"
                >
                  <span className="category-name">{category.name}</span>
                  <ChevronDown className={`category-chevron ${isExpanded ? 'expanded' : ''}`} size={20} />
                </button>
                
                {/* Always render subcategories container for smooth animations */}
                <div className={`category-subcategories ${isExpanded ? 'expanded' : ''}`}>
                  <div className="subcategory-header-section">
                    <button
                      className="subcategory-item view-all-btn"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCategoryClick(category.slug)
                      }}
                      type="button"
                    >
                      <div className="view-all-content">
                        <Sparkles size={18} className="view-all-icon" />
                        <span>View All {category.name}</span>
                      </div>
                      <ChevronRight size={18} className="view-all-arrow" />
                    </button>
                  </div>
                  
                  <div className="subcategory-list">
                    {(category.subcategories || []).map((subcategory, index) => (
                      <button
                        key={subcategory.id}
                        className="subcategory-item"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSubcategoryClick(category.slug, subcategory.slug)
                        }}
                        type="button"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <span className="subcategory-name">{subcategory.name}</span>
                        <ChevronRight size={18} className="subcategory-arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default HeaderMobile
