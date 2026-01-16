import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, ChevronDown, X, Smartphone, Building2, Wallet, Shield, CheckCircle2, User, Phone, Mail, MapPin, Tag, CheckCircle, IndianRupee, Package, ShoppingBag, Plus, Check, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cartAPI, ordersAPI, couponsAPI, settingsAPI, addressesAPI, paymentAPI } from '../utils/api'
import { useToast } from '../components/Toast/ToastContainer'

function CheckoutMobile() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const [step, setStep] = useState(1)
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [showCouponDropdown, setShowCouponDropdown] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const couponInputRef = useRef(null)
  const couponDropdownRef = useRef(null)
  const [shippingCosts, setShippingCosts] = useState({
    free: 0,
    standard: 100,
    express: 200
  })
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([])
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(null)
  const [useSavedPayment, setUseSavedPayment] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [formData, setFormData] = useState({
    mobile: '',
    email: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    shippingMethod: 'free',
    paymentMethod: 'card',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVC: '',
    upiId: '',
    netBankingBank: '',
    walletProvider: ''
  })

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      setRazorpayLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load Razorpay script')
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Load cart items and settings
  useEffect(() => {
    loadCart()
    loadShippingSettings()
    if (isAuthenticated && user) {
      loadSavedAddresses()
      loadSavedPaymentMethods()
      setFormData(prev => ({
        ...prev,
        mobile: user.mobile || '',
        email: user.email || '',
        name: user.name || ''
      }))
    }
  }, [user, isAuthenticated])

  const loadSavedPaymentMethods = async () => {
    try {
      const methods = await paymentAPI.getAll()
      setSavedPaymentMethods(Array.isArray(methods) ? methods : [])
      if (methods && methods.length > 0) {
        setSelectedPaymentMethodId(methods[0].id || methods[0]._id)
        setUseSavedPayment(true)
      }
    } catch (err) {
      console.error('Failed to load saved payment methods:', err)
      setSavedPaymentMethods([])
    }
  }

  const loadSavedAddresses = async () => {
    try {
      const response = await addressesAPI.getAll()
      const addresses = Array.isArray(response) ? response : (response.addresses || [])
      setSavedAddresses(addresses)
      const defaultAddress = addresses.find(addr => addr.isDefault)
      if (defaultAddress) {
        handleSelectAddress(defaultAddress)
      }
    } catch (err) {
      console.error('Failed to load saved addresses:', err)
    }
  }

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address._id || address.id)
    setShowAddAddress(false)
    setFormData(prev => ({
      ...prev,
      name: address.name || prev.name,
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || address.zip || ''
    }))
  }

  const handleUseNewAddress = () => {
    setSelectedAddressId(null)
    setShowAddAddress(true)
    setFormData(prev => ({
      ...prev,
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }))
  }

  const loadShippingSettings = async () => {
    try {
      const settings = await settingsAPI.getShipping()
      if (settings) {
        setShippingCosts(prev => ({
          ...prev,
          free: settings.freeShipping || 0,
          standard: settings.standardShipping || 100,
          express: settings.expressShipping || 200
        }))
      }
    } catch (err) {
      console.error('Failed to load shipping settings:', err)
    }
  }

  const loadCart = async () => {
    try {
      setLoading(true)
      if (isAuthenticated && user) {
        const response = await cartAPI.get()
        setCartItems(response.items || [])
      } else {
        const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]')
        setCartItems(guestCart)
      }
    } catch (err) {
      console.error('Failed to load cart:', err)
      showError('Failed to load cart')
      setCartItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'zipCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6)
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
    } else if (name === 'cardNumber') {
      const numericValue = value.replace(/\D/g, '').slice(0, 16)
      const formattedValue = numericValue.replace(/(.{4})/g, '$1 ').trim()
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }))
    } else if (name === 'cardExpiry') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4)
      let formattedValue = numericValue
      if (numericValue.length >= 2) {
        formattedValue = numericValue.slice(0, 2) + '/' + numericValue.slice(2)
      }
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }))
    } else if (name === 'cardCVC') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4)
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const loadAvailableCoupons = async () => {
    setLoadingCoupons(true)
    try {
      const response = await couponsAPI.getAvailable(subtotal)
      setAvailableCoupons(response.coupons || [])
    } catch (err) {
      console.error('Failed to load coupons:', err)
      showError('Failed to load available coupons')
    } finally {
      setLoadingCoupons(false)
    }
  }

  const handleCouponInputFocus = () => {
    setShowCouponDropdown(true)
    if (availableCoupons.length === 0 && !loadingCoupons) {
      loadAvailableCoupons()
    }
  }

  const handleSelectCoupon = async (coupon) => {
    setCouponCode(coupon.code)
    setShowCouponDropdown(false)
    setValidatingCoupon(true)
    setCouponError('')
    try {
      const result = await couponsAPI.validate(coupon.code, subtotal)
      if (result.valid && result.coupon) {
        const couponToApply = {
          id: result.coupon.id || coupon.id,
          code: coupon.code || result.coupon.code,
          type: coupon.type || result.coupon.type,
          discount: parseFloat(coupon.discount || result.coupon.discount || 0),
          maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : (result.coupon.maxDiscount ? parseFloat(result.coupon.maxDiscount) : null),
          description: coupon.description || result.coupon.description,
          minPurchase: coupon.minPurchase ? parseFloat(coupon.minPurchase) : (result.coupon.minPurchase ? parseFloat(result.coupon.minPurchase) : null)
        }
        setAppliedCoupon(couponToApply)
        setCouponError('')
        success('Coupon applied successfully!')
      } else {
        setCouponError('Invalid coupon code')
        setAppliedCoupon(null)
      }
    } catch (err) {
      console.error('Failed to validate coupon:', err)
      setCouponError(err.message || 'Invalid coupon code')
      setAppliedCoupon(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (showCouponDropdown) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showCouponDropdown])

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.price || item.price || 0
    return sum + (price * item.quantity)
  }, 0)
  const shipping = shippingCosts[formData.shippingMethod] || 0
  const tax = subtotal * 0.18
  
  let couponDiscount = 0
  if (appliedCoupon) {
    const discountValue = parseFloat(appliedCoupon.discount || 0)
    const couponType = appliedCoupon.type
    
    if (couponType === 'percentage') {
      couponDiscount = (subtotal * discountValue) / 100
      if (appliedCoupon.maxDiscount) {
        const maxDiscount = parseFloat(appliedCoupon.maxDiscount)
        if (couponDiscount > maxDiscount) {
          couponDiscount = maxDiscount
        }
      }
    } else if (couponType === 'fixed') {
      couponDiscount = discountValue
      if (couponDiscount > subtotal) {
        couponDiscount = subtotal
      }
    } else if (couponType === 'free_shipping') {
      couponDiscount = shipping
    }
  }
  
  const total = Math.max(0, subtotal + shipping + tax - couponDiscount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }

    setValidatingCoupon(true)
    setCouponError('')

    try {
      const result = await couponsAPI.validate(couponCode, subtotal)
      if (result.valid && result.coupon) {
        const couponToApply = {
          id: result.coupon.id,
          code: result.coupon.code,
          type: result.coupon.type,
          discount: parseFloat(result.coupon.discount) || 0,
          maxDiscount: result.coupon.maxDiscount ? parseFloat(result.coupon.maxDiscount) : null,
          description: result.coupon.description,
          minPurchase: result.coupon.minPurchase ? parseFloat(result.coupon.minPurchase) : null
        }
        setAppliedCoupon(couponToApply)
        setCouponError('')
        success('Coupon applied successfully!')
      } else {
        setCouponError('Invalid coupon code')
        setAppliedCoupon(null)
      }
    } catch (err) {
      console.error('Failed to validate coupon:', err)
      setCouponError(err.message || 'Invalid coupon code')
      setAppliedCoupon(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (cartItems.length === 0) {
      showError('Your cart is empty')
      return
    }

    if (!isAuthenticated) {
      showError('Please login to place an order')
      navigate('/dashboard', { state: { tab: 'login', redirectPath: window.location.pathname } })
      return
    }

    if (!formData.name || !formData.mobile || !formData.address || !formData.city || !formData.state || !formData.zipCode) {
      showError('Please fill in all required shipping address fields')
      return
    }

    if (!formData.paymentMethod) {
      showError('Please select a payment method')
      return
    }

    const subtotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.product?.price || item.price || 0)
      return sum + (price * item.quantity)
    }, 0)

    let shippingCost = 0
    if (formData.shippingMethod === 'standard') shippingCost = shippingCosts.standard
    else if (formData.shippingMethod === 'express') shippingCost = shippingCosts.express
    else if (subtotal < 2000) shippingCost = shippingCosts.standard

    const discount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercent / 100)) : 0
    const tax = (subtotal - discount) * 0.18
    const total = subtotal - discount + shippingCost + tax

    setSubmitting(true)

    try {
      if (useSavedPayment && selectedPaymentMethodId) {
        const savedMethod = savedPaymentMethods.find(m => (m.id || m._id) === selectedPaymentMethodId)
        if (savedMethod && formData.paymentMethod === 'card' && savedMethod.razorpayPaymentId) {
          await processRazorpayPayment(total, savedMethod)
          return
        }
        if (formData.paymentMethod === 'upi' && savedMethod.upiId) {
          setFormData(prev => ({ ...prev, upiId: savedMethod.upiId }))
        }
        if (formData.paymentMethod === 'netbanking' && savedMethod.bank) {
          setFormData(prev => ({ ...prev, netBankingBank: savedMethod.bank }))
        }
        if (formData.paymentMethod === 'wallet' && savedMethod.walletProvider) {
          setFormData(prev => ({ ...prev, walletProvider: savedMethod.walletProvider }))
        }
      }

      if (formData.paymentMethod === 'card') {
        const orderResponse = await paymentAPI.createRazorpayOrder({
          amount: Math.round(total),
          currency: 'INR',
          receipt: `order_${Date.now()}`
        })

        if (!orderResponse.orderId) {
          throw new Error('Failed to create payment order')
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
          amount: Math.round(total * 100),
          currency: 'INR',
          name: 'Arudhra Fashions',
          description: 'Order Payment',
          order_id: orderResponse.orderId,
          prefill: {
            name: formData.name,
            email: formData.email || user?.email || '',
            contact: formData.mobile || user?.mobile || ''
          },
          handler: async function(response) {
            try {
              await processOrderAfterPayment(response, total)
            } catch (err) {
              console.error('Failed to process order:', err)
              showError(err.message || 'Failed to process order')
              setSubmitting(false)
            }
          },
          modal: {
            ondismiss: function() {
              setSubmitting(false)
            }
          },
          theme: {
            color: '#7A5051'
          }
        }

        const razorpay = new window.Razorpay(options)
        razorpay.on('payment.failed', function(response) {
          console.error('Payment failed:', response.error)
          showError(response.error.description || 'Payment failed. Please try again.')
          setSubmitting(false)
        })
        razorpay.open()
      } else {
        await processOrderWithRazorpay(total, formData.paymentMethod)
      }
    } catch (err) {
      console.error('Failed to place order:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to place order. Please try again.'
      showError(errorMessage)
      setSubmitting(false)
    }
  }

  const processRazorpayPayment = async (total, savedMethod) => {
    try {
      const orderResponse = await paymentAPI.createRazorpayOrder({
        amount: Math.round(total),
        currency: 'INR',
        receipt: `order_${Date.now()}`
      })

      if (!orderResponse.orderId) {
        throw new Error('Failed to create payment order')
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'Arudhra Fashions',
        description: 'Order Payment',
        order_id: orderResponse.orderId,
        prefill: {
          name: savedMethod.cardName || formData.name,
          email: formData.email || user?.email || '',
          contact: formData.mobile || user?.mobile || ''
        },
        handler: async function(response) {
          await processOrderAfterPayment(response, total, savedMethod)
        },
        modal: {
          ondismiss: function() {
            setSubmitting(false)
          }
        },
        theme: {
          color: '#7A5051'
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function(response) {
        showError(response.error.description || 'Payment failed. Please try again.')
        setSubmitting(false)
      })
      razorpay.open()
    } catch (err) {
      throw err
    }
  }

  const processOrderWithRazorpay = async (total, paymentMethod) => {
    try {
      const orderResponse = await paymentAPI.createRazorpayOrder({
        amount: Math.round(total),
        currency: 'INR',
        receipt: `order_${Date.now()}`
      })

      if (!orderResponse.orderId) {
        throw new Error('Failed to create payment order')
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'Arudhra Fashions',
        description: 'Order Payment',
        order_id: orderResponse.orderId,
        method: paymentMethod,
        prefill: {
          name: formData.name,
          email: formData.email || user?.email || '',
          contact: formData.mobile || user?.mobile || ''
        },
        ...(paymentMethod === 'upi' && formData.upiId && { prefill: { upi: formData.upiId } }),
        handler: async function(response) {
          await processOrderAfterPayment(response, total)
        },
        modal: {
          ondismiss: function() {
            setSubmitting(false)
          }
        },
        theme: {
          color: '#7A5051'
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function(response) {
        showError(response.error.description || 'Payment failed. Please try again.')
        setSubmitting(false)
      })
      razorpay.open()
    } catch (err) {
      throw err
    }
  }

  const processOrderAfterPayment = async (razorpayResponse, total, savedMethod = null) => {
    try {
      const orderItems = cartItems.map(item => ({
        productId: item.product?._id || item.productId || item.id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.product?.price || item.price
      }))

      const paymentData = {
        method: formData.paymentMethod,
        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        razorpaySignature: razorpayResponse.razorpay_signature,
        ...(savedMethod && { savedPaymentMethodId: savedMethod.id || savedMethod._id }),
        ...(formData.paymentMethod === 'card' && {
          cardNumber: savedMethod?.last4 || formData.cardNumber ? formData.cardNumber.replace(/\s/g, '').slice(-4) : null,
          cardName: savedMethod?.cardName || formData.cardName || null
        }),
        ...(formData.paymentMethod === 'upi' && {
          upiId: formData.upiId || null
        }),
        ...(formData.paymentMethod === 'netbanking' && {
          bank: formData.netBankingBank || null
        }),
        ...(formData.paymentMethod === 'wallet' && {
          walletProvider: formData.walletProvider || null
        })
      }

      const orderData = {
        shippingAddress: {
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email || null,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        },
        payment: paymentData,
        shippingMethod: formData.shippingMethod || 'free',
        couponCode: appliedCoupon?.code || null,
        discount: appliedCoupon ? (orderItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0) * (appliedCoupon.discountPercent / 100)) : 0
      }

      const order = await ordersAPI.create(orderData)
      
      try {
        await cartAPI.clear()
      } catch (err) {
        console.error('Failed to clear cart:', err)
      }
      
      success('Order placed successfully!')
      navigate(`/order/${order._id || order.id || order.orderId}`)
    } catch (err) {
      console.error('Failed to create order:', err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="checkout-mobile-page">
        <div className="checkout-mobile-loading">
          <div className="loading-spinner"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-mobile-page">
        <div className="checkout-mobile-empty">
          <Package size={64} />
          <h2>Your cart is empty</h2>
          <p>Add items to your cart before checkout</p>
          <Link to="/products/women" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-mobile-page">
      {/* Mobile Header */}
      <div className="checkout-mobile-header">
        <button className="checkout-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Checkout</h1>
        <div className="checkout-item-count-mobile">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</div>
      </div>

      {/* Step Progress Indicator */}
      <div className="checkout-steps-mobile">
        <div className={`step-indicator-mobile ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number-mobile">1</div>
          <span className="step-label-mobile">Shipping</span>
        </div>
        <div className={`step-indicator-mobile ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number-mobile">2</div>
          <span className="step-label-mobile">Payment</span>
        </div>
        <div className={`step-indicator-mobile ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number-mobile">3</div>
          <span className="step-label-mobile">Review</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="checkout-mobile-content">
        {/* Step 1: Shipping Information */}
        {step === 1 && (
          <div className="checkout-step-mobile">
            <div className="step-header-mobile">
              <h2>Shipping Information</h2>
              <p>Enter your delivery details</p>
            </div>

            {/* Contact Information */}
            <div className="form-section-mobile">
              <div className="section-header-mobile">
                <User size={20} />
                <span>Contact Details</span>
              </div>
              <div className="form-group-mobile">
                <label>Mobile Number <span className="required">*</span></label>
                <div className="input-with-icon-mobile">
                  <Phone size={18} className="input-icon-mobile" />
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                    placeholder="9876543210"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    disabled={isAuthenticated}
                    className={isAuthenticated ? 'disabled-input-mobile' : ''}
                  />
                </div>
                {isAuthenticated && <small className="form-hint-mobile">Mobile number cannot be changed</small>}
              </div>

              <div className="form-group-mobile">
                <label>Full Name <span className="required">*</span></label>
                <div className="input-with-icon-mobile">
                  <User size={18} className="input-icon-mobile" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div className="form-group-mobile">
                <label>Email Address <span className="optional">(Optional)</span></label>
                <div className="input-with-icon-mobile">
                  <Mail size={18} className="input-icon-mobile" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                  />
                </div>
                <small className="form-hint-mobile">For order updates and tracking</small>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="form-section-mobile">
              <div className="section-header-mobile">
                <MapPin size={20} />
                <span>Delivery Address</span>
              </div>

              {/* Saved Addresses */}
              {isAuthenticated && savedAddresses.length > 0 && !showAddAddress && (
                <div className="saved-addresses-mobile">
                  <div className="saved-addresses-header-mobile">
                    <span>Select a saved address</span>
                    <button
                      type="button"
                      className="btn-link-mobile"
                      onClick={handleUseNewAddress}
                    >
                      <Plus size={16} />
                      New Address
                    </button>
                  </div>
                  <div className="saved-addresses-list-mobile">
                    {savedAddresses.map(address => (
                      <div
                        key={address._id || address.id}
                        className={`saved-address-card-mobile ${selectedAddressId === (address._id || address.id) ? 'selected' : ''}`}
                        onClick={() => handleSelectAddress(address)}
                      >
                        <div className="address-card-header-mobile">
                          <div className="address-type-badge-mobile">
                            {address.type || 'Home'}
                          </div>
                          {address.isDefault && (
                            <span className="default-badge-mobile">Default</span>
                          )}
                          {selectedAddressId === (address._id || address.id) && (
                            <Check size={18} className="selected-check-mobile" />
                          )}
                        </div>
                        <div className="address-card-body-mobile">
                          <p className="address-name-mobile">{address.name}</p>
                          <p className="address-line-mobile">{address.address}</p>
                          <p className="address-city-mobile">
                            {address.city}, {address.state} {address.zipCode || address.zip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Address Entry */}
              {(showAddAddress || !isAuthenticated || savedAddresses.length === 0) && (
                <div className="manual-address-form-mobile">
                  {isAuthenticated && savedAddresses.length > 0 && (
                    <div className="form-section-header-mobile">
                      <span>Enter new address</span>
                      <button
                        type="button"
                        className="btn-link-mobile"
                        onClick={() => {
                          setShowAddAddress(false)
                          const defaultAddress = savedAddresses.find(addr => addr.isDefault) || savedAddresses[0]
                          if (defaultAddress) {
                            handleSelectAddress(defaultAddress)
                          }
                        }}
                      >
                        Use Saved
                      </button>
                    </div>
                  )}
                  <div className="form-group-mobile">
                    <label>Street Address <span className="required">*</span></label>
                    <div className="input-with-icon-mobile">
                      <MapPin size={18} className="input-icon-mobile" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        placeholder="House/Flat No., Building Name, Street"
                      />
                    </div>
                  </div>

                  <div className="form-group-mobile">
                    <label>City <span className="required">*</span></label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      placeholder="City"
                    />
                  </div>

                  <div className="form-group-mobile">
                    <label>State <span className="required">*</span></label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      placeholder="State"
                    />
                  </div>

                  <div className="form-group-mobile">
                    <label>ZIP Code <span className="required">*</span></label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                      placeholder="6-digit code"
                      pattern="[0-9]{6}"
                      maxLength="6"
                    />
                    {formData.zipCode && formData.zipCode.length !== 6 && (
                      <small className="error-text-mobile">ZIP code must be 6 digits</small>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="checkout-actions-mobile">
              <button onClick={handleNext} className="btn btn-primary btn-full-mobile">
                Continue to Payment
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Payment Information */}
        {step === 2 && (
          <div className="checkout-step-mobile">
            <div className="step-header-mobile">
              <h2>Payment Information</h2>
              <p>Choose your preferred payment method</p>
            </div>

            <div className="form-group-mobile">
              <label className="payment-method-label-mobile">Payment Method *</label>
              <div className="payment-options-mobile">
                <label className="payment-option-mobile">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={handleChange}
                  />
                  <div className="payment-option-content-mobile">
                    <CreditCard size={24} />
                    <div className="payment-option-text-mobile">
                      <span className="payment-option-title-mobile">Credit/Debit Card</span>
                      <span className="payment-option-desc-mobile">Visa, Mastercard, RuPay</span>
                    </div>
                  </div>
                  <CheckCircle2 className="payment-check-icon-mobile" size={20} />
                </label>
                <label className="payment-option-mobile">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={formData.paymentMethod === 'upi'}
                    onChange={handleChange}
                  />
                  <div className="payment-option-content-mobile">
                    <Smartphone size={24} />
                    <div className="payment-option-text-mobile">
                      <span className="payment-option-title-mobile">UPI</span>
                      <span className="payment-option-desc-mobile">Google Pay, PhonePe, Paytm</span>
                    </div>
                  </div>
                  <CheckCircle2 className="payment-check-icon-mobile" size={20} />
                </label>
                <label className="payment-option-mobile">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="netbanking"
                    checked={formData.paymentMethod === 'netbanking'}
                    onChange={handleChange}
                  />
                  <div className="payment-option-content-mobile">
                    <Building2 size={24} />
                    <div className="payment-option-text-mobile">
                      <span className="payment-option-title-mobile">Net Banking</span>
                      <span className="payment-option-desc-mobile">All major banks</span>
                    </div>
                  </div>
                  <CheckCircle2 className="payment-check-icon-mobile" size={20} />
                </label>
                <label className="payment-option-mobile">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={formData.paymentMethod === 'wallet'}
                    onChange={handleChange}
                  />
                  <div className="payment-option-content-mobile">
                    <Wallet size={24} />
                    <div className="payment-option-text-mobile">
                      <span className="payment-option-title-mobile">Wallets</span>
                      <span className="payment-option-desc-mobile">Paytm, PhonePe, Amazon Pay</span>
                    </div>
                  </div>
                  <CheckCircle2 className="payment-check-icon-mobile" size={20} />
                </label>
              </div>
            </div>

            {/* Payment Details Based on Selection */}
            {formData.paymentMethod === 'card' && (
              <div className="payment-details-card-mobile">
                {savedPaymentMethods.length > 0 && (
                  <div className="saved-payment-methods-mobile">
                    <div className="form-group-mobile checkbox-group-mobile">
                      <label>
                        <input
                          type="checkbox"
                          checked={useSavedPayment}
                          onChange={(e) => {
                            setUseSavedPayment(e.target.checked)
                            if (!e.target.checked) {
                              setSelectedPaymentMethodId(null)
                            } else if (savedPaymentMethods.length > 0) {
                              setSelectedPaymentMethodId(savedPaymentMethods[0].id || savedPaymentMethods[0]._id)
                            }
                          }}
                        />
                        Use saved payment method
                      </label>
                    </div>
                    {useSavedPayment && (
                      <div className="saved-payment-methods-list-mobile">
                        {savedPaymentMethods.map(method => (
                          <div
                            key={method.id || method._id}
                            className={`saved-payment-card-mobile ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                            onClick={() => setSelectedPaymentMethodId(method.id || method._id)}
                          >
                            <CreditCard size={20} />
                            <div className="payment-card-info-mobile">
                              <p>•••• •••• •••• {method.last4 || '****'}</p>
                              <span>{method.network || 'Card'} • Expires {method.expMonth || '**'}/{method.expYear || '**'}</span>
                              {method.cardName && <span className="cardholder-name-mobile">{method.cardName}</span>}
                            </div>
                            {selectedPaymentMethodId === (method.id || method._id) && (
                              <CheckCircle2 className="selected-check-mobile" size={20} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {(!useSavedPayment || savedPaymentMethods.length === 0) && (
                  <>
                    <div className="payment-details-header-mobile">
                      <Shield size={20} />
                      <span>Secure Payment via Razorpay</span>
                    </div>
                    <div className="razorpay-info-mobile">
                      <p>Your card details will be securely processed by Razorpay. We never store your full card information.</p>
                    </div>
                    <div className="form-group-mobile">
                      <label>Cardholder Name *</label>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleChange}
                        placeholder="Name on card"
                        required={!useSavedPayment}
                      />
                    </div>
                    <p className="payment-note-mobile">Card details will be entered securely in Razorpay's payment gateway</p>
                  </>
                )}
              </div>
            )}

            {formData.paymentMethod === 'upi' && (
              <div className="payment-details-card-mobile">
                {savedPaymentMethods.filter(m => (m.method || m.type) === 'upi').length > 0 && (
                  <div className="saved-payment-methods-mobile">
                    <div className="form-group-mobile checkbox-group-mobile">
                      <label>
                        <input
                          type="checkbox"
                          checked={useSavedPayment && formData.paymentMethod === 'upi'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const savedUpi = savedPaymentMethods.find(m => (m.method || m.type) === 'upi')
                              if (savedUpi) {
                                setUseSavedPayment(true)
                                setSelectedPaymentMethodId(savedUpi.id || savedUpi._id)
                                setFormData(prev => ({ ...prev, upiId: savedUpi.upiId || '' }))
                              }
                            } else {
                              setUseSavedPayment(false)
                              setSelectedPaymentMethodId(null)
                              setFormData(prev => ({ ...prev, upiId: '' }))
                            }
                          }}
                        />
                        Use saved UPI ID
                      </label>
                    </div>
                    {useSavedPayment && savedPaymentMethods.filter(m => (m.method || m.type) === 'upi').map(method => (
                      <div
                        key={method.id || method._id}
                        className={`saved-payment-card-mobile ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedPaymentMethodId(method.id || method._id)
                          setFormData(prev => ({ ...prev, upiId: method.upiId || '' }))
                        }}
                      >
                        <Smartphone size={20} />
                        <div className="payment-card-info-mobile">
                          <p>UPI</p>
                          <span>{method.upiId || 'UPI Payment Method'}</span>
                        </div>
                        {selectedPaymentMethodId === (method.id || method._id) && (
                          <CheckCircle2 className="selected-check-mobile" size={20} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {(!useSavedPayment || savedPaymentMethods.filter(m => (m.method || m.type) === 'upi').length === 0) && (
                  <>
                    <div className="payment-details-header-mobile">
                      <Smartphone size={20} />
                      <span>UPI Details</span>
                    </div>
                    <div className="form-group-mobile">
                      <label>UPI ID *</label>
                      <div className="input-with-icon-mobile">
                        <Smartphone size={18} className="input-icon-mobile" />
                        <input
                          type="text"
                          name="upiId"
                          value={formData.upiId}
                          onChange={handleChange}
                          placeholder="yourname@upi"
                          pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                        />
                      </div>
                      <small className="form-hint-mobile">Enter your UPI ID (e.g., yourname@paytm, yourname@ybl)</small>
                    </div>
                  </>
                )}
              </div>
            )}

            {formData.paymentMethod === 'netbanking' && (
              <div className="payment-details-card-mobile">
                {savedPaymentMethods.filter(m => (m.method || m.type) === 'netbanking').length > 0 && (
                  <div className="saved-payment-methods-mobile">
                    <div className="form-group-mobile checkbox-group-mobile">
                      <label>
                        <input
                          type="checkbox"
                          checked={useSavedPayment && formData.paymentMethod === 'netbanking'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const savedBank = savedPaymentMethods.find(m => (m.method || m.type) === 'netbanking')
                              if (savedBank) {
                                setUseSavedPayment(true)
                                setSelectedPaymentMethodId(savedBank.id || savedBank._id)
                                setFormData(prev => ({ ...prev, netBankingBank: savedBank.bank || '' }))
                              }
                            } else {
                              setUseSavedPayment(false)
                              setSelectedPaymentMethodId(null)
                              setFormData(prev => ({ ...prev, netBankingBank: '' }))
                            }
                          }}
                        />
                        Use saved bank preference
                      </label>
                    </div>
                    {useSavedPayment && savedPaymentMethods.filter(m => (m.method || m.type) === 'netbanking').map(method => (
                      <div
                        key={method.id || method._id}
                        className={`saved-payment-card-mobile ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedPaymentMethodId(method.id || method._id)
                          setFormData(prev => ({ ...prev, netBankingBank: method.bank || '' }))
                        }}
                      >
                        <Building2 size={20} />
                        <div className="payment-card-info-mobile">
                          <p>Net Banking</p>
                          <span>{method.bank || 'Bank Account'}</span>
                        </div>
                        {selectedPaymentMethodId === (method.id || method._id) && (
                          <CheckCircle2 className="selected-check-mobile" size={20} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {(!useSavedPayment || savedPaymentMethods.filter(m => (m.method || m.type) === 'netbanking').length === 0) && (
                  <>
                    <div className="payment-details-header-mobile">
                      <Building2 size={20} />
                      <span>Net Banking</span>
                    </div>
                    <div className="form-group-mobile">
                      <label>Select Bank *</label>
                      <div className="input-with-icon-mobile">
                        <Building2 size={18} className="input-icon-mobile" />
                        <select
                          name="netBankingBank"
                          value={formData.netBankingBank}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select your bank</option>
                          <option value="HDFC">HDFC Bank</option>
                          <option value="ICICI">ICICI Bank</option>
                          <option value="SBI">State Bank of India</option>
                          <option value="AXIS">Axis Bank</option>
                          <option value="KOTAK">Kotak Mahindra Bank</option>
                          <option value="PNB">Punjab National Bank</option>
                          <option value="BOI">Bank of India</option>
                          <option value="BOB">Bank of Baroda</option>
                          <option value="CANARA">Canara Bank</option>
                          <option value="UNION">Union Bank of India</option>
                          <option value="IDBI">IDBI Bank</option>
                          <option value="YES">Yes Bank</option>
                          <option value="INDUS">IndusInd Bank</option>
                          <option value="FEDERAL">Federal Bank</option>
                          <option value="OTHER">Other Bank</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {formData.paymentMethod === 'wallet' && (
              <div className="payment-details-card-mobile">
                {savedPaymentMethods.filter(m => (m.method || m.type) === 'wallet').length > 0 && (
                  <div className="saved-payment-methods-mobile">
                    <div className="form-group-mobile checkbox-group-mobile">
                      <label>
                        <input
                          type="checkbox"
                          checked={useSavedPayment && formData.paymentMethod === 'wallet'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const savedWallet = savedPaymentMethods.find(m => (m.method || m.type) === 'wallet')
                              if (savedWallet) {
                                setUseSavedPayment(true)
                                setSelectedPaymentMethodId(savedWallet.id || savedWallet._id)
                                setFormData(prev => ({ ...prev, walletProvider: savedWallet.walletProvider || '' }))
                              }
                            } else {
                              setUseSavedPayment(false)
                              setSelectedPaymentMethodId(null)
                              setFormData(prev => ({ ...prev, walletProvider: '' }))
                            }
                          }}
                        />
                        Use saved wallet preference
                      </label>
                    </div>
                    {useSavedPayment && savedPaymentMethods.filter(m => (m.method || m.type) === 'wallet').map(method => (
                      <div
                        key={method.id || method._id}
                        className={`saved-payment-card-mobile ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedPaymentMethodId(method.id || method._id)
                          setFormData(prev => ({ ...prev, walletProvider: method.walletProvider || '' }))
                        }}
                      >
                        <Wallet size={20} />
                        <div className="payment-card-info-mobile">
                          <p>Digital Wallet</p>
                          <span>{method.walletProvider || 'Wallet'}</span>
                        </div>
                        {selectedPaymentMethodId === (method.id || method._id) && (
                          <CheckCircle2 className="selected-check-mobile" size={20} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {(!useSavedPayment || savedPaymentMethods.filter(m => (m.method || m.type) === 'wallet').length === 0) && (
                  <>
                    <div className="payment-details-header-mobile">
                      <Wallet size={20} />
                      <span>Digital Wallet</span>
                    </div>
                    <div className="form-group-mobile">
                      <label>Select Wallet *</label>
                      <div className="input-with-icon-mobile">
                        <Wallet size={18} className="input-icon-mobile" />
                        <select
                          name="walletProvider"
                          value={formData.walletProvider}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select wallet</option>
                          <option value="paytm">Paytm</option>
                          <option value="phonepe">PhonePe</option>
                          <option value="amazonpay">Amazon Pay</option>
                          <option value="freecharge">Freecharge</option>
                          <option value="mobikwik">MobiKwik</option>
                          <option value="jiomoney">JioMoney</option>
                          <option value="airtelmoney">Airtel Money</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="security-badge-mobile">
              <Shield size={20} />
              <div className="security-text-mobile">
                <span className="security-title-mobile">Secure Payment</span>
                <span className="security-desc-mobile">Your payment information is encrypted and secure</span>
              </div>
            </div>

            <div className="checkout-actions-mobile">
              <button onClick={() => setStep(1)} className="btn btn-outline btn-full-mobile">
                <ChevronLeft size={18} />
                Back
              </button>
              <button onClick={handleNext} className="btn btn-primary btn-full-mobile">
                Continue to Review
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review Order */}
        {step === 3 && (
          <div className="checkout-step-mobile">
            <div className="step-header-mobile">
              <ShoppingBag size={28} />
              <h2>Review Your Order</h2>
              <p>Please review your order details before placing</p>
            </div>

            {/* Shipping Address */}
            <div className="review-section-mobile">
              <div className="review-section-header-mobile">
                <MapPin size={20} />
                <span>Delivery Address</span>
              </div>
              <div className="shipping-address-card-mobile">
                <p className="address-name-mobile">{formData.name}</p>
                <p className="address-line-mobile">{formData.address}</p>
                <p className="address-city-mobile">
                  {formData.city}, {formData.state} - {formData.zipCode}
                </p>
                <div className="address-contact-mobile">
                  <Phone size={14} />
                  <span>{formData.mobile}</span>
                  {formData.email && (
                    <>
                      <Mail size={14} />
                      <span>{formData.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="review-section-mobile">
              <div className="review-section-header-mobile">
                <Package size={20} />
                <span>Order Items ({cartItems.length})</span>
              </div>
              <div className="order-items-mobile">
                {cartItems.map(item => {
                  const product = item.product || item
                  const productName = product.name || item.name
                  const productImage = product.images?.[0] || product.image || item.image
                  const productPrice = product.price || item.price || 0
                  const itemId = item._id || item.id
                  
                  return (
                    <div key={itemId} className="order-item-mobile">
                      <div className="order-item-image-mobile">
                        <img src={productImage} alt={productName} />
                      </div>
                      <div className="order-item-content-mobile">
                        <h4 className="order-item-title-mobile">{productName}</h4>
                        <div className="order-item-meta-mobile">
                          {item.size && (
                            <span className="order-item-badge-mobile">Size: {item.size}</span>
                          )}
                          {item.color && (
                            <span className="order-item-badge-mobile">Color: {item.color}</span>
                          )}
                          <span className="order-item-badge-mobile">Qty: {item.quantity}</span>
                        </div>
                        <div className="order-item-price-mobile">
                          <span className="unit-price-mobile">₹{productPrice.toFixed(2)} × {item.quantity}</span>
                          <span className="item-total-mobile">₹{(productPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Coupon Section - Redesigned */}
            <div className="coupon-section-new-mobile">
              {!appliedCoupon ? (
                <div className="coupon-wrapper-new-mobile">
                  <div className="coupon-header-new-mobile">
                    <div className="coupon-icon-wrapper-new-mobile">
                      <Tag size={22} />
                    </div>
                    <div className="coupon-header-text-new-mobile">
                      <h3>Apply Coupon</h3>
                      <p>Save more on your order</p>
                    </div>
                  </div>
                  
                  <div className="coupon-input-container-new-mobile">
                    <div className="coupon-input-field-new-mobile">
                      <input
                        ref={couponInputRef}
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className={`coupon-input-new-mobile ${couponError ? 'error' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="btn-apply-coupon-new-mobile"
                      >
                        {validatingCoupon ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    
                    {couponError && (
                      <div className="coupon-error-new-mobile">
                        <span className="error-icon">⚠️</span>
                        <span>{couponError}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-view-coupons-new-mobile"
                    onClick={() => {
                      const newState = !showCouponDropdown
                      setShowCouponDropdown(newState)
                      if (newState && (availableCoupons.length === 0 || !loadingCoupons)) {
                        loadAvailableCoupons()
                      }
                    }}
                  >
                    <span>View Available Coupons</span>
                    <ChevronDown size={18} className={showCouponDropdown ? 'rotated' : ''} />
                  </button>

                  {showCouponDropdown && (
                    <>
                      <div 
                        className="coupon-overlay-new-mobile"
                        onClick={() => setShowCouponDropdown(false)}
                      ></div>
                      <div ref={couponDropdownRef} className="coupon-modal-new-mobile">
                        <div className="coupon-modal-header-new-mobile">
                          <h3>Available Coupons</h3>
                          <button
                            type="button"
                            className="btn-close-modal-new-mobile"
                            onClick={() => setShowCouponDropdown(false)}
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="coupon-modal-content-new-mobile">
                          {loadingCoupons ? (
                            <div className="coupon-loading-new-mobile">
                              <div className="loading-spinner"></div>
                              <p>Loading coupons...</p>
                            </div>
                          ) : availableCoupons.length === 0 ? (
                            <div className="coupon-empty-new-mobile">
                              <Tag size={48} />
                              <p>No coupons available</p>
                              <span>Check back later for exciting offers!</span>
                            </div>
                          ) : (
                            <div className="coupon-grid-new-mobile">
                              {availableCoupons.map((coupon) => (
                                <div
                                  key={coupon.id}
                                  className="coupon-card-new-mobile"
                                  onClick={() => handleSelectCoupon(coupon)}
                                >
                                  <div className="coupon-card-top-new-mobile">
                                    <div className="coupon-code-new-mobile">{coupon.code}</div>
                                    <div className="coupon-discount-badge-new-mobile">
                                      {coupon.type === 'percentage'
                                        ? `${coupon.discount}%`
                                        : coupon.type === 'fixed'
                                        ? `₹${coupon.discount}`
                                        : 'FREE'}
                                    </div>
                                  </div>
                                  {coupon.description && (
                                    <p className="coupon-desc-new-mobile">{coupon.description}</p>
                                  )}
                                  {coupon.minPurchase && (
                                    <div className="coupon-min-new-mobile">
                                      Min. purchase ₹{coupon.minPurchase}
                                    </div>
                                  )}
                                  <div className="coupon-tap-hint-new-mobile">Tap to apply</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="coupon-applied-new-mobile">
                  <div className="coupon-applied-left-new-mobile">
                    <div className="coupon-applied-icon-new-mobile">
                      <CheckCircle size={24} />
                    </div>
                    <div className="coupon-applied-details-new-mobile">
                      <div className="coupon-applied-label-new-mobile">Coupon Applied</div>
                      <div className="coupon-applied-code-new-mobile">{appliedCoupon.code}</div>
                    </div>
                  </div>
                  <div className="coupon-applied-right-new-mobile">
                    <div className="coupon-applied-discount-new-mobile">
                      -₹{couponDiscount.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="btn-remove-coupon-new-mobile"
                      title="Remove coupon"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="order-summary-mobile">
              <div className="summary-row-mobile">
                <span className="summary-label-mobile">Subtotal</span>
                <span className="summary-value-mobile">₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="summary-row-mobile discount-row-mobile">
                  <span className="summary-label-mobile">
                    <Tag size={16} />
                    Coupon Discount
                  </span>
                  <span className="summary-value-mobile discount-value-mobile">-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row-mobile">
                <span className="summary-label-mobile">Shipping</span>
                <span className="summary-value-mobile">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              <div className="summary-row-mobile">
                <span className="summary-label-mobile">GST (18%)</span>
                <span className="summary-value-mobile">₹{tax.toFixed(2)}</span>
              </div>
              <div className="summary-divider-mobile"></div>
              <div className="summary-total-mobile">
                <div className="total-label-wrapper-mobile">
                  <IndianRupee size={24} />
                  <span className="total-label-mobile">Total Amount to Pay</span>
                </div>
                <span className="total-amount-mobile">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="checkout-actions-mobile">
              <button type="button" onClick={() => setStep(2)} className="btn btn-outline btn-full-mobile">
                <ChevronLeft size={18} />
                Back
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-full-mobile"
                disabled={submitting}
              >
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Sticky Order Summary Bar (for steps 1 & 2) */}
      {step !== 3 && (
        <div className={`checkout-summary-sticky-mobile ${showOrderSummary ? 'expanded' : ''}`}>
          <button
            className="summary-toggle-mobile"
            onClick={() => setShowOrderSummary(!showOrderSummary)}
          >
            <div className="summary-toggle-content-mobile">
              <div>
                <span className="summary-toggle-label-mobile">Order Summary</span>
                <span className="summary-toggle-total-mobile">₹{total.toFixed(2)}</span>
              </div>
              <ChevronDown size={20} className={showOrderSummary ? 'rotated' : ''} />
            </div>
          </button>
          {showOrderSummary && (
            <div className="summary-content-mobile">
              <div className="order-items-mini-mobile">
                {cartItems.map(item => {
                  const product = item.product || item
                  const productName = product.name || item.name
                  const productImage = product.images?.[0] || product.image || item.image
                  const productPrice = product.price || item.price || 0
                  const itemId = item._id || item.id
                  
                  return (
                    <div key={itemId} className="order-item-mini-mobile">
                      <img src={productImage} alt={productName} />
                      <div>
                        <p>{productName}</p>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <span>₹{(productPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="summary-divider-mobile"></div>
              <div className="summary-row-mobile">
                <span className="summary-label-mobile">Subtotal</span>
                <span className="summary-value-mobile">₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="summary-row-mobile discount-row-mobile">
                  <span className="summary-label-mobile">
                    <Tag size={14} />
                    Discount
                  </span>
                  <span className="summary-value-mobile discount-value-mobile">-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row-mobile">
                <span className="summary-label-mobile">Shipping</span>
                <span className="summary-value-mobile">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              <div className="summary-row-mobile">
                <span className="summary-label-mobile">GST (18%)</span>
                <span className="summary-value-mobile">₹{tax.toFixed(2)}</span>
              </div>
              <div className="summary-divider-mobile"></div>
              <div className="summary-total-mobile">
                <span className="total-label-mobile">Total</span>
                <span className="total-amount-mobile">₹{total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CheckoutMobile
