import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Lock, ChevronDown, X, Smartphone, Building2, Wallet, Shield, CheckCircle2, User, Phone, Mail, MapPin, Tag, CheckCircle, IndianRupee, Package, ShoppingBag, FileText, Plus, Check, Coins, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cartAPI, ordersAPI, couponsAPI, discountsAPI, settingsAPI, addressesAPI, paymentAPI, coinsAPI } from '../utils/api'
import { useToast } from '../components/Toast/ToastContainer'

function CheckoutWeb() {
  const { user, isAuthenticated, getGuestId } = useAuth()
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
  const [coinBalance, setCoinBalance] = useState(0)
  const [coinRules, setCoinRules] = useState({ earning: { threshold: 5000, coins: 10 }, redemption: { coins: 50, discountPercent: 5 } })
  const [coinsToRedeem, setCoinsToRedeem] = useState(0)
  const [coinDiscount, setCoinDiscount] = useState(0)
  const [loadingCoins, setLoadingCoins] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [availableDiscounts, setAvailableDiscounts] = useState([])
  const [showCouponDropdown, setShowCouponDropdown] = useState(false)
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [loadingDiscounts, setLoadingDiscounts] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountError, setDiscountError] = useState('')
  const [validatingDiscount, setValidatingDiscount] = useState(false)
  const couponInputRef = useRef(null)
  const couponDropdownRef = useRef(null)
  const discountDropdownRef = useRef(null)
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

  // Calculate subtotal using useMemo to ensure it's available before useEffect
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = item.product?.price || item.price || 0
      return sum + (price * item.quantity)
    }, 0)
  }, [cartItems])

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
      loadCoinBalance()
      // Pre-fill user info
      setFormData(prev => ({
        ...prev,
        mobile: user.mobile || '',
        email: user.email || '',
        name: user.name || ''
      }))
    }
  }, [user, isAuthenticated])

  // Load available discounts when cart items or subtotal changes
  useEffect(() => {
    if (cartItems.length > 0 && subtotal > 0) {
      loadAvailableDiscounts()
    }
  }, [cartItems, subtotal])

  // Load coin balance
  const loadCoinBalance = async () => {
    if (!isAuthenticated) return
    try {
      setLoadingCoins(true)
      const data = await coinsAPI.getBalance()
      setCoinBalance(data.balance || 0)
      if (data.rules) {
        setCoinRules(data.rules)
      }
    } catch (err) {
      console.error('Failed to load coin balance:', err)
    } finally {
      setLoadingCoins(false)
    }
  }

  // Calculate coin discount when coinsToRedeem changes
  useEffect(() => {
    if (coinsToRedeem > 0 && subtotal > 0 && isAuthenticated) {
      calculateCoinDiscount()
    } else {
      setCoinDiscount(0)
    }
  }, [coinsToRedeem, subtotal, isAuthenticated])

  const calculateCoinDiscount = async () => {
    if (coinsToRedeem <= 0 || coinsToRedeem > coinBalance) {
      setCoinDiscount(0)
      return
    }
    try {
      const result = await coinsAPI.calculateDiscount(coinsToRedeem, subtotal)
      setCoinDiscount(result.discountAmount || 0)
    } catch (err) {
      console.error('Failed to calculate coin discount:', err)
      setCoinDiscount(0)
    }
  }

  const handleCoinRedeemChange = (value) => {
    const numValue = parseInt(value) || 0
    if (numValue <= coinBalance && numValue >= 0) {
      setCoinsToRedeem(numValue)
    }
  }

  const handleMaxCoinsRedeem = () => {
    if (coinBalance > 0) {
      setCoinsToRedeem(coinBalance)
    }
  }

  const handleRemoveCoins = () => {
    setCoinsToRedeem(0)
    setCoinDiscount(0)
  }

  // Helper function to parse discount instructions (same as backend)
  const parseDiscountInstruction = (instruction, cartItems, orderTotal) => {
    if (!instruction || !cartItems || cartItems.length === 0) {
      return 0
    }
    
    const instructionLower = instruction.toLowerCase()
    
    // Buy X Get Y Free pattern
    const buyXGetYMatch = instructionLower.match(/buy\s+(\d+)\s+get\s+(\d+)\s+free/i)
    if (buyXGetYMatch) {
      const buyCount = parseInt(buyXGetYMatch[1])
      const freeCount = parseInt(buyXGetYMatch[2])
      const minItems = buyCount + freeCount
      
      // Check if cart has minimum items
      const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
      if (totalQuantity < minItems) {
        return 0
      }
      
      // Sort items by price (lowest first) and mark free items
      const sortedItems = [...cartItems].sort((a, b) => {
        const priceA = parseFloat(a.product?.price || a.price || 0)
        const priceB = parseFloat(b.product?.price || b.price || 0)
        return priceA - priceB
      })
      
      // Calculate total discount (free items' prices)
      let discount = 0
      let itemsToMakeFree = freeCount
      
      for (const item of sortedItems) {
        if (itemsToMakeFree <= 0) break
        
        const itemPrice = parseFloat(item.product?.price || item.price || 0)
        const itemQuantity = item.quantity || 1
        const freeFromThisItem = Math.min(itemsToMakeFree, itemQuantity)
        
        discount += itemPrice * freeFromThisItem
        itemsToMakeFree -= freeFromThisItem
      }
      
      return discount
    }
    
    // Percentage off pattern
    const percentMatch = instructionLower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:off|discount)/i)
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1])
      return (orderTotal * percent) / 100
    }
    
    // Fixed amount off pattern
    const fixedMatch = instructionLower.match(/₹?\s*(\d+(?:\.\d+)?)\s*(?:off|discount)/i)
    if (fixedMatch) {
      const amount = parseFloat(fixedMatch[1])
      return Math.min(amount, orderTotal)
    }
    
    return 0
  }

  const loadSavedPaymentMethods = async () => {
    try {
      const methods = await paymentAPI.getAll()
      setSavedPaymentMethods(Array.isArray(methods) ? methods : [])
      // Auto-select first saved method if available
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
      
      // Auto-select default address if available
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
      // Use defaults
    }
  }

  const loadCart = async () => {
    try {
      setLoading(true)
      if (isAuthenticated && user) {
        // Load user cart from API
        const response = await cartAPI.get()
        setCartItems(response.items || [])
      } else {
        // Load guest cart from localStorage
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
    // Validate zipcode to only allow numeric digits (6 digits for Indian zipcodes)
    if (name === 'zipCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6)
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
    } else if (name === 'cardNumber') {
      // Format card number with spaces every 4 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 16)
      const formattedValue = numericValue.replace(/(.{4})/g, '$1 ').trim()
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }))
    } else if (name === 'cardExpiry') {
      // Format expiry date as MM/YY
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
      // Only allow 3-4 digits for CVC
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

  // Load available coupons
  const loadAvailableCoupons = async () => {
    setLoadingCoupons(true)
    try {
      console.log('Loading available coupons, subtotal:', subtotal)
      const response = await couponsAPI.getAvailable(subtotal)
      console.log('Coupons response:', response)
      setAvailableCoupons(response.coupons || [])
    } catch (err) {
      console.error('Failed to load coupons:', err)
      showError('Failed to load available coupons')
    } finally {
      setLoadingCoupons(false)
    }
  }

  // Load available discounts
  const loadAvailableDiscounts = async () => {
    setLoadingDiscounts(true)
    try {
      console.log('Loading available discounts, subtotal:', subtotal)
      const response = await discountsAPI.getAvailable(subtotal, cartItems)
      console.log('Discounts response:', response)
      setAvailableDiscounts(response.discounts || [])
    } catch (err) {
      console.error('Failed to load discounts:', err)
      showError('Failed to load available discounts')
    } finally {
      setLoadingDiscounts(false)
    }
  }

  // Handle coupon input focus/click
  const handleCouponInputFocus = () => {
    setShowCouponDropdown(true)
    // Always load coupons when input is focused (if not already loaded or loading)
    if (availableCoupons.length === 0 && !loadingCoupons) {
      console.log('Input focused, loading coupons...')
      loadAvailableCoupons()
    }
  }

  // Handle coupon selection from dropdown
  const handleSelectCoupon = async (coupon) => {
    setCouponCode(coupon.code)
    setShowCouponDropdown(false)
    // Auto-apply the selected coupon
    setValidatingCoupon(true)
    setCouponError('')
    try {
      console.log('Validating selected coupon:', coupon)
      const result = await couponsAPI.validate(coupon.code, subtotal)
      console.log('Validation result:', result)
      if (result.valid && result.coupon) {
        // Use coupon data from dropdown (has original values) merged with validation result
        const couponToApply = {
          id: result.coupon.id || coupon.id,
          code: coupon.code || result.coupon.code,
          type: coupon.type || result.coupon.type,
          discount: parseFloat(coupon.discount || result.coupon.discount || 0), // Original discount value from dropdown
          maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : (result.coupon.maxDiscount ? parseFloat(result.coupon.maxDiscount) : null),
          description: coupon.description || result.coupon.description,
          minPurchase: coupon.minPurchase ? parseFloat(coupon.minPurchase) : (result.coupon.minPurchase ? parseFloat(result.coupon.minPurchase) : null)
        }
        console.log('Applying coupon (from dropdown):', couponToApply)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        couponDropdownRef.current &&
        !couponDropdownRef.current.contains(event.target) &&
        couponInputRef.current &&
        !couponInputRef.current.contains(event.target)
      ) {
        setShowCouponDropdown(false)
      }
      if (
        discountDropdownRef.current &&
        !discountDropdownRef.current.contains(event.target)
      ) {
        setShowDiscountDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Calculate totals (subtotal already calculated above with useMemo)
  const shipping = shippingCosts[formData.shippingMethod] || 0
  const tax = subtotal * 0.18
  
  // Calculate coupon discount properly
  let couponDiscount = 0
  if (appliedCoupon) {
    console.log('=== Calculating discount ===')
    console.log('Applied coupon:', JSON.stringify(appliedCoupon, null, 2))
    console.log('Subtotal:', subtotal, 'Shipping:', shipping, 'Tax:', tax)
    
    const discountValue = parseFloat(appliedCoupon.discount || 0)
    const couponType = appliedCoupon.type
    
    console.log(`Coupon type: ${couponType}, Discount value: ${discountValue}`)
    
    if (couponType === 'percentage') {
      // Percentage discount: calculate percentage of subtotal
      couponDiscount = (subtotal * discountValue) / 100
      console.log(`Percentage calculation: (${subtotal} * ${discountValue}) / 100 = ${couponDiscount}`)
      
      // Apply max discount cap if specified
      if (appliedCoupon.maxDiscount) {
        const maxDiscount = parseFloat(appliedCoupon.maxDiscount)
        if (couponDiscount > maxDiscount) {
          console.log(`Capping discount at max: ${maxDiscount}`)
          couponDiscount = maxDiscount
        }
      }
    } else if (couponType === 'fixed') {
      // Fixed amount discount: use the discount value directly
      couponDiscount = discountValue
      console.log(`Fixed discount: ${couponDiscount}`)
      
      // Don't allow discount to exceed subtotal
      if (couponDiscount > subtotal) {
        console.log(`Capping discount at subtotal: ${subtotal}`)
        couponDiscount = subtotal
      }
    } else if (couponType === 'free_shipping') {
      // Free shipping discount: use current shipping cost
      couponDiscount = shipping
      console.log(`Free shipping discount: ${couponDiscount}`)
    } else {
      console.warn(`Unknown coupon type: ${couponType}`)
    }
    
    console.log(`Final coupon discount: ₹${couponDiscount.toFixed(2)}`)
  } else {
    console.log('No coupon applied')
  }

  // Calculate discount discount based on instruction
  let discountDiscount = 0
  if (appliedDiscount) {
    console.log('=== Calculating discount discount ===')
    console.log('Applied discount:', JSON.stringify(appliedDiscount, null, 2))
    
    const discountType = appliedDiscount.type
    
    if (discountType === 'percentage') {
      discountDiscount = (subtotal * parseFloat(appliedDiscount.value)) / 100
      if (appliedDiscount.maxDiscount && discountDiscount > parseFloat(appliedDiscount.maxDiscount)) {
        discountDiscount = parseFloat(appliedDiscount.maxDiscount)
      }
    } else if (discountType === 'fixed') {
      discountDiscount = parseFloat(appliedDiscount.value)
      if (discountDiscount > subtotal) {
        discountDiscount = subtotal
      }
    } else if (discountType === 'custom' && appliedDiscount.calculatedDiscount !== undefined) {
      // Use calculated discount from instruction parser
      discountDiscount = parseFloat(appliedDiscount.calculatedDiscount || 0)
    } else if (appliedDiscount.instruction) {
      // Parse instruction if not already calculated
      discountDiscount = parseDiscountInstruction(appliedDiscount.instruction, cartItems, subtotal)
    }
    
    console.log(`Final discount discount: ₹${discountDiscount.toFixed(2)}`)
  }
  
  const total = Math.max(0, subtotal + shipping + tax - couponDiscount - discountDiscount - coinDiscount)
  
  // Calculate coins that will be earned from this purchase
  const coinsToEarn = useMemo(() => {
    if (!isAuthenticated || !coinRules.earning) return 0
    if (total >= coinRules.earning.threshold) {
      return coinRules.earning.coins
    }
    return 0
  }, [total, coinRules.earning, isAuthenticated])
  
  console.log(`=== Total Calculation ===`)
  console.log(`Subtotal: ₹${subtotal.toFixed(2)}`)
  console.log(`Shipping: ₹${shipping.toFixed(2)}`)
  console.log(`Tax (18%): ₹${tax.toFixed(2)}`)
  console.log(`Coupon Discount: -₹${couponDiscount.toFixed(2)}`)
  console.log(`TOTAL: ₹${total.toFixed(2)}`)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }

    setValidatingCoupon(true)
    setCouponError('')

    try {
      console.log('Validating coupon code:', couponCode, 'subtotal:', subtotal)
      const result = await couponsAPI.validate(couponCode, subtotal)
      console.log('Validation result:', result)
      if (result.valid && result.coupon) {
        // Use the original discount value (percentage or fixed amount), not the calculated one
        // The frontend will recalculate based on current subtotal
        const couponToApply = {
          id: result.coupon.id,
          code: result.coupon.code,
          type: result.coupon.type,
          discount: parseFloat(result.coupon.discount) || 0, // Original discount value (percentage number or fixed amount)
          maxDiscount: result.coupon.maxDiscount ? parseFloat(result.coupon.maxDiscount) : null,
          description: result.coupon.description,
          minPurchase: result.coupon.minPurchase ? parseFloat(result.coupon.minPurchase) : null
        }
        console.log('Applying coupon (manual entry):', couponToApply)
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

  // Handle discount input focus/click
  const handleDiscountInputFocus = () => {
    setShowDiscountDropdown(true)
    if (availableDiscounts.length === 0 && !loadingDiscounts) {
      loadAvailableDiscounts()
    }
  }

  // Handle discount selection from dropdown
  const handleSelectDiscount = async (discount) => {
    setDiscountCode(discount.code)
    setShowDiscountDropdown(false)
    setValidatingDiscount(true)
    setDiscountError('')
    try {
      const result = await discountsAPI.validate(discount.code, subtotal, cartItems)
      if (result.valid && result.discount) {
        setAppliedDiscount(result.discount)
        setDiscountError('')
        success('Discount applied successfully!')
      } else {
        setDiscountError('Invalid discount code')
        setAppliedDiscount(null)
      }
    } catch (err) {
      console.error('Failed to validate discount:', err)
      setDiscountError(err.message || 'Invalid discount code')
      setAppliedDiscount(null)
    } finally {
      setValidatingDiscount(false)
    }
  }

  // Handle apply discount button
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code')
      return
    }
    setValidatingDiscount(true)
    setDiscountError('')
    try {
      const result = await discountsAPI.validate(discountCode.toUpperCase(), subtotal, cartItems)
      if (result.valid && result.discount) {
        setAppliedDiscount(result.discount)
        setDiscountError('')
        success('Discount applied successfully!')
      } else {
        setDiscountError(result.message || 'Invalid discount code')
        setAppliedDiscount(null)
      }
    } catch (err) {
      console.error('Failed to validate discount:', err)
      setDiscountError(err.message || 'Invalid discount code')
      setAppliedDiscount(null)
    } finally {
      setValidatingDiscount(false)
    }
  }

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError('')
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

    // Validate required fields
    if (!formData.name || !formData.mobile || !formData.address || !formData.city || !formData.state || !formData.zipCode) {
      showError('Please fill in all required shipping address fields')
      return
    }

    if (!formData.paymentMethod) {
      showError('Please select a payment method')
      return
    }

    // Calculate order total
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
      // If using saved payment method, use saved preferences
      if (useSavedPayment && selectedPaymentMethodId) {
        const savedMethod = savedPaymentMethods.find(m => (m.id || m._id) === selectedPaymentMethodId)
        if (savedMethod) {
          // For cards, process through Razorpay
          if (formData.paymentMethod === 'card' && savedMethod.razorpayPaymentId) {
            await processRazorpayPayment(total, savedMethod)
            return
          }
          // For UPI, Net Banking, Wallet - use saved preferences
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
      }

      // For new payments or non-card methods, use Razorpay checkout
      if (formData.paymentMethod === 'card') {
        // Create Razorpay order
        const orderResponse = await paymentAPI.createRazorpayOrder({
          amount: Math.round(total),
          currency: 'INR',
          receipt: `order_${Date.now()}`
        })

        if (!orderResponse.orderId) {
          throw new Error('Failed to create payment order')
        }

        // Open Razorpay checkout
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
          amount: Math.round(total * 100), // Convert to paise
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
        // For UPI, Net Banking, Wallet - create order directly (they'll be processed by Razorpay)
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
      // Create Razorpay order
      const orderResponse = await paymentAPI.createRazorpayOrder({
        amount: Math.round(total),
        currency: 'INR',
        receipt: `order_${Date.now()}`
      })

      if (!orderResponse.orderId) {
        throw new Error('Failed to create payment order')
      }

      // For saved methods, we need to process payment
      // Note: Razorpay doesn't support direct payment with saved methods in this way
      // We'll need to open checkout but pre-fill the saved card
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
      // Create Razorpay order for non-card methods
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
      // Redeem coins if any were selected
      let redeemedCoins = 0
      if (coinsToRedeem > 0 && coinBalance >= coinsToRedeem) {
        try {
          await coinsAPI.redeem(coinsToRedeem)
          redeemedCoins = coinsToRedeem
          // Reload coin balance
          await loadCoinBalance()
        } catch (err) {
          console.error('Failed to redeem coins:', err)
          showError('Failed to redeem coins. Please try again.')
          throw err
        }
      }

      // Prepare order items
      const orderItems = cartItems.map(item => ({
        productId: item.product?._id || item.productId || item.id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.product?.price || item.price
      }))

      // Prepare payment data
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
        discountCode: appliedDiscount?.code || null,
        discount: couponDiscount || 0,
        discountDiscount: discountDiscount || 0,
        coinsRedeemed: redeemedCoins
      }

      // Create order via API
      const order = await ordersAPI.create(orderData)
      
      // Clear cart
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
      <div className="checkout-page">
        <div className="container">
          <div className="loading-spinner">
            <p>Loading checkout...</p>
          </div>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="empty-cart">
            <h2>Your cart is empty</h2>
            <p>Add items to your cart before checkout</p>
            <Link to="/products/women" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-header">
          <h1>Checkout</h1>
          {cartItems.length > 0 && (
            <p className="checkout-item-count">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your order</p>
          )}
        </div>

        <div className={`checkout-layout ${step === 3 ? 'no-sidebar' : ''}`}>
          <div className="checkout-form">
            {step === 1 && (
              <div className="checkout-step">
                <div className="shipping-header">
                  <h2>Shipping Information</h2>
                  <p className="shipping-subtitle">Enter your delivery details</p>
                  {!isAuthenticated && (
                    <p className="shipping-login-hint">
                      Have an account? <Link to="/dashboard">Log in</Link> to save your information
                    </p>
                  )}
                </div>

                {/* Contact Information Section */}
                <div className="shipping-section">
                  <div className="shipping-section-header">
                    <User size={20} />
                    <span>Contact Details</span>
                  </div>
                  <div className="form-group">
                    <label>Mobile Number <span className="required">*</span></label>
                    <div className="input-with-icon">
                      <Phone size={18} className="input-icon" />
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
                        className={isAuthenticated ? 'disabled-input' : ''}
                      />
                    </div>
                    {isAuthenticated && <small className="input-hint">Mobile number cannot be changed</small>}
                  </div>

                  <div className="form-group">
                    <label>Full Name <span className="required">*</span></label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
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

                  <div className="form-group">
                    <label>Email Address <span className="optional">(Optional)</span></label>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                      />
                    </div>
                    <small className="input-hint">For order updates and tracking</small>
                  </div>
                </div>

                {/* Delivery Address Section */}
                <div className="shipping-section">
                  <div className="shipping-section-header">
                    <MapPin size={20} />
                    <span>Delivery Address</span>
                  </div>

                  {/* Saved Addresses Selection */}
                  {isAuthenticated && savedAddresses.length > 0 && !showAddAddress && (
                    <div className="saved-addresses-section">
                      <div className="saved-addresses-header">
                        <span>Select a saved address</span>
                        <button
                          type="button"
                          className="btn-link-small"
                          onClick={handleUseNewAddress}
                        >
                          <Plus size={16} />
                          Use New Address
                        </button>
                      </div>
                      <div className="saved-addresses-grid">
                        {savedAddresses.map(address => (
                          <div
                            key={address._id || address.id}
                            className={`saved-address-card ${selectedAddressId === (address._id || address.id) ? 'selected' : ''}`}
                            onClick={() => handleSelectAddress(address)}
                          >
                            <div className="address-card-header">
                              <div className="address-type-badge">
                                {address.type || 'Home'}
                              </div>
                              {address.isDefault && (
                                <span className="default-badge-small">Default</span>
                              )}
                              {selectedAddressId === (address._id || address.id) && (
                                <Check size={18} className="selected-check" />
                              )}
                            </div>
                            <div className="address-card-body">
                              <p className="address-name">{address.name}</p>
                              <p className="address-line">{address.address}</p>
                              <p className="address-city">
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
                    <div className="manual-address-form">
                      {isAuthenticated && savedAddresses.length > 0 && (
                        <div className="form-section-header">
                          <span>Enter new address</span>
                          {savedAddresses.length > 0 && (
                            <button
                              type="button"
                              className="btn-link-small"
                              onClick={() => {
                                setShowAddAddress(false)
                                const defaultAddress = savedAddresses.find(addr => addr.isDefault) || savedAddresses[0]
                                if (defaultAddress) {
                                  handleSelectAddress(defaultAddress)
                                }
                              }}
                            >
                              Use Saved Address
                            </button>
                          )}
                        </div>
                      )}
                      <div className="form-group">
                        <label>Street Address <span className="required">*</span></label>
                        <div className="input-with-icon">
                          <MapPin size={18} className="input-icon" />
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

                      <div className="form-row">
                        <div className="form-group">
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
                        <div className="form-group">
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
                        <div className="form-group">
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
                            <small className="error-text">ZIP code must be 6 digits</small>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="checkout-actions">
                  <button onClick={handleNext} className="btn btn-primary btn-large">
                    Continue to Payment
                    <ChevronDown size={18} style={{ transform: 'rotate(-90deg)', marginLeft: '0.5rem' }} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-step">
                <div className="payment-header">
                  <h2>Payment Information</h2>
                  <p className="payment-subtitle">Choose your preferred payment method</p>
                </div>
                
                <div className="form-group">
                  <label className="payment-method-label">Payment Method *</label>
                  <div className="payment-options">
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={handleChange}
                      />
                      <div className="payment-option-content">
                        <CreditCard size={24} />
                        <div className="payment-option-text">
                          <span className="payment-option-title">Credit/Debit Card</span>
                          <span className="payment-option-desc">Visa, Mastercard, RuPay</span>
                        </div>
                      </div>
                      <CheckCircle2 className="payment-check-icon" size={20} />
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="upi"
                        checked={formData.paymentMethod === 'upi'}
                        onChange={handleChange}
                      />
                      <div className="payment-option-content">
                        <Smartphone size={24} />
                        <div className="payment-option-text">
                          <span className="payment-option-title">UPI</span>
                          <span className="payment-option-desc">Google Pay, PhonePe, Paytm</span>
                        </div>
                      </div>
                      <CheckCircle2 className="payment-check-icon" size={20} />
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="netbanking"
                        checked={formData.paymentMethod === 'netbanking'}
                        onChange={handleChange}
                      />
                      <div className="payment-option-content">
                        <Building2 size={24} />
                        <div className="payment-option-text">
                          <span className="payment-option-title">Net Banking</span>
                          <span className="payment-option-desc">All major banks</span>
                        </div>
                      </div>
                      <CheckCircle2 className="payment-check-icon" size={20} />
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="wallet"
                        checked={formData.paymentMethod === 'wallet'}
                        onChange={handleChange}
                      />
                      <div className="payment-option-content">
                        <Wallet size={24} />
                        <div className="payment-option-text">
                          <span className="payment-option-title">Wallets</span>
                          <span className="payment-option-desc">Paytm, PhonePe, Amazon Pay</span>
                        </div>
                      </div>
                      <CheckCircle2 className="payment-check-icon" size={20} />
                    </label>
                  </div>
                </div>

                {formData.paymentMethod === 'card' && (
                  <div className="payment-details-card">
                    {savedPaymentMethods.length > 0 && (
                      <div className="saved-payment-methods-section">
                        <div className="form-group">
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
                          <div className="saved-payment-methods-grid">
                            {savedPaymentMethods.map(method => (
                              <div
                                key={method.id || method._id}
                                className={`saved-payment-card ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                                onClick={() => setSelectedPaymentMethodId(method.id || method._id)}
                              >
                                <CreditCard size={20} />
                                <div className="payment-card-info">
                                  <p>•••• •••• •••• {method.last4 || '****'}</p>
                                  <span>{method.network || 'Card'} • Expires {method.expMonth || '**'}/{method.expYear || '**'}</span>
                                  {method.cardName && <span className="cardholder-name">{method.cardName}</span>}
                                </div>
                                {selectedPaymentMethodId === (method.id || method._id) && (
                                  <CheckCircle2 className="selected-check" size={20} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(!useSavedPayment || savedPaymentMethods.length === 0) && (
                      <>
                        <div className="payment-details-header">
                          <Shield size={20} />
                          <span>Secure Payment via Razorpay</span>
                        </div>
                        <div className="razorpay-info-checkout">
                          <p>Your card details will be securely processed by Razorpay. We never store your full card information.</p>
                        </div>
                        <div className="form-group">
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
                        <p className="payment-note">Card details will be entered securely in Razorpay's payment gateway</p>
                      </>
                    )}
                  </div>
                )}

                {formData.paymentMethod === 'upi' && (
                  <div className="payment-details-card">
                    {savedPaymentMethods.filter(m => (m.method || m.type) === 'upi').length > 0 && (
                      <div className="saved-payment-methods-section">
                        <div className="form-group">
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
                            className={`saved-payment-card ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedPaymentMethodId(method.id || method._id)
                              setFormData(prev => ({ ...prev, upiId: method.upiId || '' }))
                            }}
                          >
                            <Smartphone size={20} />
                            <div className="payment-card-info">
                              <p>UPI</p>
                              <span>{method.upiId || 'UPI Payment Method'}</span>
                            </div>
                            {selectedPaymentMethodId === (method.id || method._id) && (
                              <CheckCircle2 className="selected-check" size={20} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!useSavedPayment || savedPaymentMethods.filter(m => (m.method || m.type) === 'upi').length === 0) && (
                      <>
                        <div className="payment-details-header">
                          <Smartphone size={20} />
                          <span>UPI Details</span>
                        </div>
                        <div className="form-group">
                          <label>UPI ID *</label>
                          <div className="input-with-icon">
                            <Smartphone size={18} className="input-icon" />
                            <input
                              type="text"
                              name="upiId"
                              value={formData.upiId}
                              onChange={handleChange}
                              placeholder="yourname@upi"
                              pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                            />
                          </div>
                          <small className="input-hint">Enter your UPI ID (e.g., yourname@paytm, yourname@ybl)</small>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {formData.paymentMethod === 'netbanking' && (
                  <div className="payment-details-card">
                    {savedPaymentMethods.filter(m => (m.method || m.type) === 'netbanking').length > 0 && (
                      <div className="saved-payment-methods-section">
                        <div className="form-group">
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
                            className={`saved-payment-card ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedPaymentMethodId(method.id || method._id)
                              setFormData(prev => ({ ...prev, netBankingBank: method.bank || '' }))
                            }}
                          >
                            <Building2 size={20} />
                            <div className="payment-card-info">
                              <p>Net Banking</p>
                              <span>{method.bank || 'Bank Account'}</span>
                            </div>
                            {selectedPaymentMethodId === (method.id || method._id) && (
                              <CheckCircle2 className="selected-check" size={20} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!useSavedPayment || savedPaymentMethods.filter(m => (m.method || m.type) === 'netbanking').length === 0) && (
                      <>
                        <div className="payment-details-header">
                          <Building2 size={20} />
                          <span>Net Banking</span>
                        </div>
                        <div className="form-group">
                          <label>Select Bank *</label>
                          <div className="input-with-icon">
                            <Building2 size={18} className="input-icon" />
                            <select
                              name="netBankingBank"
                              value={formData.netBankingBank}
                              onChange={handleChange}
                              required
                              className="select-input"
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
                  <div className="payment-details-card">
                    {savedPaymentMethods.filter(m => (m.method || m.type) === 'wallet').length > 0 && (
                      <div className="saved-payment-methods-section">
                        <div className="form-group">
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
                            className={`saved-payment-card ${selectedPaymentMethodId === (method.id || method._id) ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedPaymentMethodId(method.id || method._id)
                              setFormData(prev => ({ ...prev, walletProvider: method.walletProvider || '' }))
                            }}
                          >
                            <Wallet size={20} />
                            <div className="payment-card-info">
                              <p>Digital Wallet</p>
                              <span>{method.walletProvider || 'Wallet'}</span>
                            </div>
                            {selectedPaymentMethodId === (method.id || method._id) && (
                              <CheckCircle2 className="selected-check" size={20} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!useSavedPayment || savedPaymentMethods.filter(m => (m.method || m.type) === 'wallet').length === 0) && (
                      <>
                        <div className="payment-details-header">
                          <Wallet size={20} />
                          <span>Digital Wallet</span>
                        </div>
                        <div className="form-group">
                          <label>Select Wallet *</label>
                          <div className="input-with-icon">
                            <Wallet size={18} className="input-icon" />
                            <select
                              name="walletProvider"
                              value={formData.walletProvider}
                              onChange={handleChange}
                              required
                              className="select-input"
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

                <div className="security-badge">
                  <div className="security-badge-content">
                    <Shield size={20} />
                    <div className="security-text">
                      <span className="security-title">Secure Payment</span>
                      <span className="security-desc">Your payment information is encrypted and secure</span>
                    </div>
                  </div>
                  <div className="security-badges">
                    <span className="security-tag">SSL Secured</span>
                    <span className="security-tag">PCI Compliant</span>
                  </div>
                </div>

                <div className="checkout-actions">
                  <button onClick={() => setStep(1)} className="btn btn-outline">
                    Back
                  </button>
                  <button onClick={handleNext} className="btn btn-primary btn-large">
                    Continue to Review
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-step">
                <div className="review-header">
                  <div className="review-header-content">
                    <ShoppingBag size={28} className="review-header-icon" />
                    <div>
                      <h2>Review Your Order</h2>
                      <p className="review-subtitle">Please review your order details before placing</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address Section */}
                <div className="review-section">
                  <div className="review-section-header">
                    <MapPin size={20} />
                    <span>Delivery Address</span>
                  </div>
                  <div className="shipping-address-card">
                    <div className="address-details">
                      <p className="address-name">{formData.name}</p>
                      <p className="address-line">{formData.address}</p>
                      <p className="address-city">
                        {formData.city}, {formData.state} - {formData.zipCode}
                      </p>
                      <div className="address-contact">
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
                </div>

                {/* Order Items Section */}
                <div className="review-section">
                  <div className="review-section-header">
                    <Package size={20} />
                    <span>Order Items ({cartItems.length})</span>
                  </div>
                  <div className="order-items-enhanced">
                    {cartItems.map(item => {
                      const product = item.product || item
                      const productName = product.name || item.name
                      const productImage = product.images?.[0] || product.image || item.image
                      const productPrice = product.price || item.price || 0
                      const itemId = item._id || item.id
                      
                      return (
                        <div key={itemId} className="order-item-enhanced">
                          <div className="order-item-image-wrapper">
                            <img src={productImage} alt={productName} />
                          </div>
                          <div className="order-item-content">
                            <h4 className="order-item-title">{productName}</h4>
                            <div className="order-item-meta">
                              {item.size && (
                                <span className="order-item-badge">
                                  <span className="badge-label">Size:</span> {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span className="order-item-badge">
                                  <span className="badge-label">Color:</span> {item.color}
                                </span>
                              )}
                              <span className="order-item-badge">
                                <span className="badge-label">Qty:</span> {item.quantity}
                              </span>
                            </div>
                            <div className="order-item-price-info">
                              <span className="unit-price">₹{productPrice.toFixed(2)} × {item.quantity}</span>
                            </div>
                          </div>
                          <div className="order-item-total">
                            <span className="order-item-price">₹{(productPrice * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Coin Redemption Section */}
                {isAuthenticated && coinBalance > 0 && (
                  <div className="coupon-section-new-web" style={{ marginBottom: '1.5rem' }}>
                    {coinsToRedeem === 0 ? (
                      <div className="coupon-wrapper-new-web">
                        <div className="coupon-header-new-web">
                          <div className="coupon-icon-wrapper-new-web">
                            <Coins size={24} />
                          </div>
                          <div className="coupon-header-text-new-web">
                            <h3>Redeem Coins</h3>
                            <p>You have {coinBalance} coins available. {coinRules.redemption.coins} coins = {coinRules.redemption.discountPercent}% discount</p>
                          </div>
                        </div>
                        <div className="coupon-input-container-new-web">
                          <div className="coupon-input-field-new-web">
                            <input
                              type="number"
                              placeholder="Enter coins to redeem"
                              value={coinsToRedeem}
                              onChange={(e) => handleCoinRedeemChange(e.target.value)}
                              min="0"
                              max={coinBalance}
                              className="coupon-input-new-web"
                            />
                            <button
                              type="button"
                              onClick={handleMaxCoinsRedeem}
                              className="btn-apply-coupon-new-web"
                              disabled={coinBalance === 0}
                            >
                              Max
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="coupon-applied-new-web">
                        <div className="coupon-applied-content-new-web">
                          <div className="coupon-applied-icon-new-web">
                            <Coins size={24} />
                          </div>
                          <div className="coupon-applied-info-new-web">
                            <div className="coupon-applied-label-new-web">Coins Redeemed</div>
                            <div className="coupon-applied-code-new-web">{coinsToRedeem} coins = ₹{coinDiscount.toFixed(2)} discount</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoins}
                          className="coupon-remove-btn-new-web"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Coin Earning Preview Section */}
                {isAuthenticated && (
                  <div className="coin-earning-preview-section" style={{ marginBottom: '1.5rem' }}>
                    {coinsToEarn > 0 ? (
                      <div className="coin-earning-preview-card">
                        <div className="coin-earning-preview-icon">
                          <TrendingUp size={24} />
                        </div>
                        <div className="coin-earning-preview-content">
                          <div className="coin-earning-preview-label">You will earn</div>
                          <div className="coin-earning-preview-amount">
                            <Coins size={20} />
                            <span>{coinsToEarn} coins</span>
                          </div>
                          <div className="coin-earning-preview-info">from this purchase</div>
                        </div>
                      </div>
                    ) : total > 0 && coinRules.earning ? (
                      <div className="coin-earning-preview-card coin-earning-preview-card-info">
                        <div className="coin-earning-preview-icon">
                          <Coins size={24} />
                        </div>
                        <div className="coin-earning-preview-content">
                          <div className="coin-earning-preview-label">Earn {coinRules.earning.coins} coins</div>
                          <div className="coin-earning-preview-info">
                            Add ₹{(coinRules.earning.threshold - total).toFixed(2)} more to earn coins
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Discount Section - Redesigned for Web */}
                <div className="coupon-section-new-web" style={{ marginBottom: '1.5rem' }}>
                  {!appliedDiscount ? (
                    <div className="coupon-wrapper-new-web">
                      <div className="coupon-header-new-web">
                        <div className="coupon-icon-wrapper-new-web">
                          <Tag size={24} />
                        </div>
                        <div className="coupon-header-text-new-web">
                          <h3>Apply Discount Code</h3>
                          <p>Enter discount code or browse available discounts</p>
                        </div>
                      </div>
                      
                      <div className="coupon-input-container-new-web">
                        <div className="coupon-input-field-new-web">
                          <input
                            type="text"
                            placeholder="Enter discount code"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                            onFocus={handleDiscountInputFocus}
                            className={`coupon-input-new-web ${discountError ? 'error' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={handleApplyDiscount}
                            disabled={validatingDiscount || !discountCode.trim()}
                            className="btn-apply-coupon-new-web"
                          >
                            {validatingDiscount ? (
                              <span className="loading-spinner-web"></span>
                            ) : (
                              'Apply'
                            )}
                          </button>
                        </div>
                        
                        {discountError && (
                          <div className="coupon-error-new-web">
                            <span className="error-icon-web">⚠️</span>
                            <span>{discountError}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn-view-coupons-new-web"
                        onClick={() => {
                          setShowDiscountDropdown(!showDiscountDropdown)
                          if (!showDiscountDropdown && availableDiscounts.length === 0) {
                            loadAvailableDiscounts()
                          }
                        }}
                      >
                        {showDiscountDropdown ? 'Hide' : 'View'} Available Discounts ({availableDiscounts.length})
                      </button>

                      {showDiscountDropdown && (
                        <div className="coupon-panel-new-web" ref={discountDropdownRef}>
                          <div className="coupon-panel-header-new-web">
                            <Tag size={20} />
                            <h4>Available Discounts</h4>
                            <button
                              type="button"
                              className="coupon-panel-close-new-web"
                              onClick={() => setShowDiscountDropdown(false)}
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <div className="coupon-panel-content-new-web">
                            {loadingDiscounts ? (
                              <div className="coupon-loading-new-web">
                                <div className="loading-spinner-web-large"></div>
                                <p>Loading discounts...</p>
                              </div>
                            ) : availableDiscounts.length === 0 ? (
                              <div className="coupon-empty-new-web">
                                <Tag size={40} />
                                <p>No discounts available</p>
                              </div>
                            ) : (
                              <div className="coupon-grid-new-web">
                                {availableDiscounts.map((discount) => (
                                  <div
                                    key={discount.id}
                                    className="coupon-card-new-web"
                                    onClick={() => handleSelectDiscount(discount)}
                                  >
                                    <div className="coupon-card-top-new-web">
                                      <div className="coupon-card-icon-new-web">
                                        <Tag size={20} />
                                      </div>
                                      <div className="coupon-card-code-new-web">{discount.code}</div>
                                    </div>
                                    <div className="coupon-card-name-new-web">{discount.name}</div>
                                    {discount.instruction && (
                                      <div className="coupon-card-description-new-web">{discount.instruction}</div>
                                    )}
                                    <div className="coupon-card-discount-new-web">
                                      {discount.type === 'percentage' ? (
                                        <span>{discount.value}% OFF</span>
                                      ) : discount.type === 'fixed' ? (
                                        <span>₹{discount.value} OFF</span>
                                      ) : (
                                        <span>Special Offer</span>
                                      )}
                                    </div>
                                    {discount.minOrder > 0 && (
                                      <div className="coupon-card-min-new-web">
                                        Min. order: ₹{discount.minOrder.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="coupon-applied-new-web">
                      <div className="coupon-applied-content-new-web">
                        <div className="coupon-applied-icon-new-web">
                          <Tag size={24} />
                        </div>
                        <div className="coupon-applied-info-new-web">
                          <div className="coupon-applied-label-new-web">Discount Applied</div>
                          <div className="coupon-applied-code-new-web">{appliedDiscount.code} - {appliedDiscount.name}</div>
                          {appliedDiscount.instruction && (
                            <div className="coupon-applied-description-new-web">{appliedDiscount.instruction}</div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="coupon-remove-btn-new-web"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Coupon Section - Redesigned for Web */}
                <div className="coupon-section-new-web">
                  {!appliedCoupon ? (
                    <div className="coupon-wrapper-new-web">
                      <div className="coupon-header-new-web">
                        <div className="coupon-icon-wrapper-new-web">
                          <Tag size={24} />
                        </div>
                        <div className="coupon-header-text-new-web">
                          <h3>Apply Coupon Code</h3>
                          <p>Enter your coupon code or browse available offers</p>
                        </div>
                      </div>
                      
                      <div className="coupon-input-container-new-web">
                        <div className="coupon-input-field-new-web">
                          <input
                            ref={couponInputRef}
                            type="text"
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className={`coupon-input-new-web ${couponError ? 'error' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={validatingCoupon || !couponCode.trim()}
                            className="btn-apply-coupon-new-web"
                          >
                            {validatingCoupon ? (
                              <span className="loading-spinner-web"></span>
                            ) : (
                              'Apply Coupon'
                            )}
                          </button>
                        </div>
                        
                        {couponError && (
                          <div className="coupon-error-new-web">
                            <span className="error-icon-web">⚠️</span>
                            <span>{couponError}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn-view-coupons-new-web"
                        onClick={() => {
                          const newState = !showCouponDropdown
                          setShowCouponDropdown(newState)
                          if (newState && (availableCoupons.length === 0 || !loadingCoupons)) {
                            loadAvailableCoupons()
                          }
                        }}
                      >
                        <span>{showCouponDropdown ? 'Hide' : 'View'} Available Coupons</span>
                        <ChevronDown size={20} className={showCouponDropdown ? 'rotated' : ''} />
                      </button>

                      {showCouponDropdown && (
                        <div ref={couponDropdownRef} className="coupon-panel-new-web">
                          <div className="coupon-panel-header-new-web">
                            <h4>Available Coupons</h4>
                            <button
                              type="button"
                              className="btn-close-panel-new-web"
                              onClick={() => setShowCouponDropdown(false)}
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <div className="coupon-panel-content-new-web">
                            {loadingCoupons ? (
                              <div className="coupon-loading-new-web">
                                <div className="loading-spinner-web-large"></div>
                                <p>Loading coupons...</p>
                              </div>
                            ) : availableCoupons.length === 0 ? (
                              <div className="coupon-empty-new-web">
                                <Tag size={56} />
                                <p>No coupons available</p>
                                <span>Check back later for exciting offers!</span>
                              </div>
                            ) : (
                              <div className="coupon-grid-new-web">
                                {availableCoupons.map((coupon) => (
                                  <div
                                    key={coupon.id}
                                    className="coupon-card-new-web"
                                    onClick={() => handleSelectCoupon(coupon)}
                                  >
                                    <div className="coupon-card-top-new-web">
                                      <div className="coupon-code-new-web">{coupon.code}</div>
                                      <div className="coupon-discount-badge-new-web">
                                        {coupon.type === 'percentage'
                                          ? `${coupon.discount}%`
                                          : coupon.type === 'fixed'
                                          ? `₹${coupon.discount}`
                                          : 'FREE'}
                                        <span className="discount-label-new-web">OFF</span>
                                      </div>
                                    </div>
                                    {coupon.description && (
                                      <p className="coupon-desc-new-web">{coupon.description}</p>
                                    )}
                                    {coupon.minPurchase && (
                                      <div className="coupon-min-new-web">
                                        <span className="min-icon">💰</span>
                                        Min. purchase ₹{coupon.minPurchase}
                                      </div>
                                    )}
                                    <div className="coupon-hover-hint-new-web">Click to apply</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="coupon-applied-new-web">
                      <div className="coupon-applied-left-new-web">
                        <div className="coupon-applied-icon-new-web">
                          <CheckCircle size={28} />
                        </div>
                        <div className="coupon-applied-details-new-web">
                          <div className="coupon-applied-label-new-web">Coupon Applied Successfully</div>
                          <div className="coupon-applied-code-new-web">{appliedCoupon.code}</div>
                        </div>
                      </div>
                      <div className="coupon-applied-right-new-web">
                        <div className="coupon-applied-discount-new-web">
                          -₹{couponDiscount.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="btn-remove-coupon-new-web"
                          title="Remove coupon"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="order-summary-enhanced">
                  <div className="summary-row-enhanced">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-value">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="summary-row-enhanced discount-row">
                      <span className="summary-label">
                        <Tag size={16} />
                        Coupon Discount ({appliedCoupon.code})
                      </span>
                      <span className="summary-value discount-value">-₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {appliedDiscount && discountDiscount > 0 && (
                    <div className="summary-row-enhanced discount-row">
                      <span className="summary-label">
                        <Tag size={16} />
                        Discount ({appliedDiscount.code})
                      </span>
                      <span className="summary-value discount-value">-₹{discountDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {coinDiscount > 0 && (
                    <div className="summary-row-enhanced discount-row">
                      <span className="summary-label">
                        <Coins size={16} />
                        Coin Discount ({coinsToRedeem} coins)
                      </span>
                      <span className="summary-value discount-value">-₹{coinDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {isAuthenticated && coinsToEarn > 0 && (
                    <div className="summary-row-enhanced coin-earning-row">
                      <span className="summary-label">
                        <TrendingUp size={16} />
                        Coins You'll Earn
                      </span>
                      <span className="summary-value coin-earning-value">
                        <Coins size={14} />
                        +{coinsToEarn} coins
                      </span>
                    </div>
                  )}
                  <div className="summary-row-enhanced">
                    <span className="summary-label">Shipping</span>
                    <span className="summary-value">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="summary-row-enhanced">
                    <span className="summary-label">GST (18%)</span>
                    <span className="summary-value">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="summary-divider-enhanced"></div>
                  <div className="summary-total-enhanced">
                    <div className="total-label-wrapper">
                      <IndianRupee size={24} />
                      <span className="total-label">Total Amount to Pay</span>
                    </div>
                    <span className="total-amount">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="checkout-actions">
                  <button type="button" onClick={() => setStep(2)} className="btn btn-outline">
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-large"
                    disabled={submitting}
                  >
                    {submitting ? 'Placing Order...' : 'Place Order'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {step !== 3 && (
          <div className="checkout-summary">
            <div className="summary-card">
              <h3>Order Summary</h3>
              <div className="order-items-mini">
                {cartItems.map(item => {
                  const product = item.product || item
                  const productName = product.name || item.name
                  const productImage = product.images?.[0] || product.image || item.image
                  const productPrice = product.price || item.price || 0
                  const itemId = item._id || item.id
                  
                  return (
                    <div key={itemId} className="order-item-mini">
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
              <div className="summary-divider"></div>
              {/* Coin Redemption Section in Sidebar */}
              {isAuthenticated && coinBalance > 0 && (
                <div className="coupon-section-new-web coupon-section-sidebar-web" style={{ marginBottom: '1rem' }}>
                  {coinsToRedeem === 0 ? (
                    <div className="coupon-wrapper-new-web coupon-wrapper-sidebar-web">
                      <div className="coupon-header-new-web coupon-header-sidebar-web">
                        <Coins size={18} />
                        <span>Redeem Coins ({coinBalance})</span>
                      </div>
                      <div className="coupon-input-container-new-web">
                        <div className="coupon-input-field-new-web coupon-input-field-sidebar-web">
                          <input
                            type="number"
                            placeholder="Coins"
                            value={coinsToRedeem}
                            onChange={(e) => handleCoinRedeemChange(e.target.value)}
                            min="0"
                            max={coinBalance}
                            className="coupon-input-new-web coupon-input-sidebar-web"
                          />
                          <button
                            type="button"
                            onClick={handleMaxCoinsRedeem}
                            className="btn-apply-coupon-new-web btn-apply-sidebar-web"
                            disabled={coinBalance === 0}
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="coupon-applied-new-web coupon-applied-sidebar-web">
                      <Coins size={16} />
                      <span>{coinsToRedeem} coins</span>
                      <button
                        type="button"
                        onClick={handleRemoveCoins}
                        className="coupon-remove-btn-new-web"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Coupon Section in Sidebar - Compact Version */}
              <div className="coupon-section-new-web coupon-section-sidebar-web">
                {!appliedCoupon ? (
                  <div className="coupon-wrapper-new-web coupon-wrapper-sidebar-web">
                    <div className="coupon-header-new-web coupon-header-sidebar-web">
                      <Tag size={20} />
                      <span>Have a coupon?</span>
                    </div>
                    <div className="coupon-input-container-new-web">
                      <div className="coupon-input-field-new-web coupon-input-field-sidebar-web">
                        <input
                          ref={couponInputRef}
                          type="text"
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className={`coupon-input-new-web coupon-input-sidebar-web ${couponError ? 'error' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={validatingCoupon || !couponCode.trim()}
                          className="btn-apply-coupon-new-web btn-apply-sidebar-web"
                        >
                          {validatingCoupon ? (
                            <span className="loading-spinner-web"></span>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>
                      {couponError && (
                        <div className="coupon-error-new-web coupon-error-sidebar-web">
                          <span className="error-icon-web">⚠️</span>
                          <span>{couponError}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-view-coupons-new-web btn-view-sidebar-web"
                      onClick={() => {
                        const newState = !showCouponDropdown
                        setShowCouponDropdown(newState)
                        if (newState && (availableCoupons.length === 0 || !loadingCoupons)) {
                          loadAvailableCoupons()
                        }
                      }}
                    >
                      <span>{showCouponDropdown ? 'Hide' : 'View'} Coupons</span>
                      <ChevronDown size={18} className={showCouponDropdown ? 'rotated' : ''} />
                    </button>
                    {showCouponDropdown && (
                      <div ref={couponDropdownRef} className="coupon-panel-new-web coupon-panel-sidebar-web">
                        <div className="coupon-panel-header-new-web">
                          <h4>Available Coupons</h4>
                          <button
                            type="button"
                            className="btn-close-panel-new-web"
                            onClick={() => setShowCouponDropdown(false)}
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="coupon-panel-content-new-web">
                          {loadingCoupons ? (
                            <div className="coupon-loading-new-web">
                              <div className="loading-spinner-web-large"></div>
                              <p>Loading coupons...</p>
                            </div>
                          ) : availableCoupons.length === 0 ? (
                            <div className="coupon-empty-new-web">
                              <Tag size={40} />
                              <p>No coupons available</p>
                            </div>
                          ) : (
                            <div className="coupon-grid-new-web coupon-grid-sidebar-web">
                              {availableCoupons.map((coupon) => (
                                <div
                                  key={coupon.id}
                                  className="coupon-card-new-web coupon-card-sidebar-web"
                                  onClick={() => handleSelectCoupon(coupon)}
                                >
                                  <div className="coupon-card-top-new-web">
                                    <div className="coupon-code-new-web">{coupon.code}</div>
                                    <div className="coupon-discount-badge-new-web">
                                      {coupon.type === 'percentage'
                                        ? `${coupon.discount}%`
                                        : coupon.type === 'fixed'
                                        ? `₹${coupon.discount}`
                                        : 'FREE'}
                                    </div>
                                  </div>
                                  {coupon.description && (
                                    <p className="coupon-desc-new-web">{coupon.description}</p>
                                  )}
                                  {coupon.minPurchase && (
                                    <div className="coupon-min-new-web">
                                      Min. ₹{coupon.minPurchase}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="coupon-applied-new-web coupon-applied-sidebar-web">
                    <div className="coupon-applied-left-new-web">
                      <div className="coupon-applied-icon-new-web">
                        <CheckCircle size={24} />
                      </div>
                      <div className="coupon-applied-details-new-web">
                        <div className="coupon-applied-label-new-web">Applied</div>
                        <div className="coupon-applied-code-new-web">{appliedCoupon.code}</div>
                      </div>
                    </div>
                    <div className="coupon-applied-right-new-web">
                      <div className="coupon-applied-discount-new-web">
                        -₹{couponDiscount.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="btn-remove-coupon-new-web"
                        title="Remove coupon"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="summary-row-enhanced">
                <span className="summary-label">Subtotal</span>
                <span className="summary-value">₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="summary-row-enhanced discount-row">
                  <span className="summary-label">
                    <Tag size={14} />
                    Coupon ({appliedCoupon.code})
                  </span>
                  <span className="summary-value discount-value">-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {appliedDiscount && discountDiscount > 0 && (
                <div className="summary-row-enhanced discount-row">
                  <span className="summary-label">
                    <Tag size={14} />
                    Discount ({appliedDiscount.code})
                  </span>
                  <span className="summary-value discount-value">-₹{discountDiscount.toFixed(2)}</span>
                </div>
              )}
              {coinDiscount > 0 && (
                <div className="summary-row-enhanced discount-row">
                  <span className="summary-label">
                    <Coins size={14} />
                    Coin Discount
                  </span>
                  <span className="summary-value discount-value">-₹{coinDiscount.toFixed(2)}</span>
                </div>
              )}
              {isAuthenticated && coinsToEarn > 0 && (
                <div className="summary-row-enhanced coin-earning-row">
                  <span className="summary-label">
                    <TrendingUp size={14} />
                    Coins You'll Earn
                  </span>
                  <span className="summary-value coin-earning-value">
                    <Coins size={12} />
                    +{coinsToEarn} coins
                  </span>
                </div>
              )}
              <div className="summary-row-enhanced">
                <span className="summary-label">Shipping</span>
                <span className="summary-value">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              <div className="summary-row-enhanced">
                <span className="summary-label">GST (18%)</span>
                <span className="summary-value">₹{tax.toFixed(2)}</span>
              </div>
              <div className="summary-divider-enhanced"></div>
              <div className="summary-total-enhanced">
                <div className="total-label-wrapper">
                  <IndianRupee size={20} />
                  <span className="total-label">Total Amount</span>
                </div>
                <span className="total-amount">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckoutWeb

