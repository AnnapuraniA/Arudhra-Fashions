import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Brand color palette
const colors = {
  primary: '#C89E7E',        // Medium warm brown/caramel
  primaryDark: '#7A5051',   // Deep reddish-brown/plum
  primaryLight: '#CAB19B',   // Light warm beige/tan
  secondary: '#AB8A8A',     // Muted dusty rose/mauve
  background: '#FAF8F5',     // Very light cream/beige
  textPrimary: '#3A1F23',   // Very dark espresso/chocolate brown
  textSecondary: '#7A5051', // Deep reddish-brown/plum
  white: '#FFFFFF'
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Generate invoice PDF for an order
 * @param {Object} order - Order object with all details
 * @param {Object} user - User object with name, email, mobile
 * @returns {Promise<string>} - Path to generated PDF file
 */
export async function generateInvoicePDF(order, user) {
  return new Promise((resolve, reject) => {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '..', 'uploads', 'invoices')
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true })
      }

      // Generate filename
      const filename = `invoice-${order.orderId}-${Date.now()}.pdf`
      const filepath = path.join(invoicesDir, filename)

      // Create PDF document with proper margins
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 0,
        layout: 'portrait'
      })

      // Pipe PDF to file
      const stream = fs.createWriteStream(filepath)
      doc.pipe(stream)

      // Page dimensions
      const pageWidth = 595.28 // A4 width in points (210mm)
      const pageHeight = 841.89 // A4 height in points (297mm)
      const margin = 40
      const contentWidth = pageWidth - (margin * 2)

      // Logo path - try multiple locations
      const logoPaths = [
        path.join(__dirname, '..', '..', 'public', 'Logo.png'),
        path.join(__dirname, '..', '..', 'Logo.png'),
        path.join(__dirname, '..', '..', 'Logo.PNG')
      ]
      
      let logoPath = null
      for (const lp of logoPaths) {
        if (fs.existsSync(lp)) {
          logoPath = lp
          break
        }
      }

      // ========== HEADER SECTION ==========
      let currentY = margin

      // Logo on the right top - Large and prominent, no background
      const logoSize = 130
      const logoX = pageWidth - margin - logoSize
      const logoY = margin
      
      // Logo image without any background or shadow
      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, logoX, logoY, { 
            width: logoSize, 
            height: logoSize,
            fit: [logoSize, logoSize]
          })
        } catch (error) {
          console.error('Error loading logo:', error)
        }
      }

      // Invoice heading centered at top with enhanced styling
      const invoiceTitleY = margin + 30
      
      doc.fontSize(36).font('Helvetica-Bold')
        .fillColor(colors.primaryDark)
        .text('INVOICE', margin, invoiceTitleY, { 
          width: contentWidth, 
          align: 'center' 
        })
      
      // Invoice number and date below the heading, centered
      const invoiceInfoY = invoiceTitleY + 35
      doc.fontSize(10).font('Helvetica')
        .fillColor(colors.textSecondary)
        .text('Invoice No:', margin, invoiceInfoY, { 
          width: contentWidth, 
          align: 'center' 
        })
      
      doc.fontSize(12).font('Helvetica-Bold')
        .fillColor(colors.textPrimary)
        .text(order.orderId || 'N/A', margin, invoiceInfoY + 15, { 
          width: contentWidth, 
          align: 'center' 
        })
      
      // Format date properly - check multiple possible date fields
      let invoiceDate = 'N/A'
      const dateValue = order.createdAt || order.orderDate || order.date || new Date()
      try {
        invoiceDate = new Date(dateValue).toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      } catch (error) {
        console.error('Error formatting date:', error)
        invoiceDate = new Date().toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
      
      doc.fontSize(10).font('Helvetica')
        .fillColor(colors.textSecondary)
        .text('Date:', margin, invoiceInfoY + 35, { 
          width: contentWidth, 
          align: 'center' 
        })
      
      doc.fontSize(12).font('Helvetica-Bold')
        .fillColor(colors.textPrimary)
        .text(invoiceDate, margin, invoiceInfoY + 50, { 
          width: contentWidth, 
          align: 'center' 
        })

      // ========== CUSTOMER DETAILS SECTION ==========
      currentY = invoiceInfoY + 90
      
      // Bill To section with enhanced styling
      const billToBoxY = currentY
      const billToBoxHeight = 100
      
      // Background box for Bill To section
      doc.rect(margin, billToBoxY, 280, billToBoxHeight)
        .fillColor(colors.background)
        .fill()
      
      // Border around Bill To section
      doc.rect(margin, billToBoxY, 280, billToBoxHeight)
        .strokeColor(colors.primaryLight)
        .lineWidth(1.5)
        .stroke()
      
      // Bill To section header
      doc.fontSize(12).font('Helvetica-Bold')
        .fillColor(colors.primaryDark)
        .text('Bill To:', margin + 10, billToBoxY + 10)
      
      currentY = billToBoxY + 25
      
      const customerName = user.name || order.shippingAddress?.name || 'Customer'
      const customerAddress = order.shippingAddress
      const customerMobile = user.mobile || order.shippingAddress?.mobile || ''
      const customerEmail = user.email || order.shippingAddress?.email || ''

      doc.fontSize(11).font('Helvetica-Bold')
        .fillColor(colors.textPrimary)
        .text(customerName, margin + 10, currentY, { width: 260 })
      
      currentY += 18
      doc.fontSize(9).font('Helvetica')
        .fillColor(colors.textSecondary)
      
      if (customerAddress) {
        if (customerAddress.address) {
          doc.text(customerAddress.address, margin + 10, currentY, { width: 260 })
          currentY += 15
        }
        const cityStateZip = [
          customerAddress.city || '',
          customerAddress.state || '',
          customerAddress.zipCode || customerAddress.zip || ''
        ].filter(Boolean).join(', ')
        if (cityStateZip) {
          doc.text(cityStateZip, margin + 10, currentY, { width: 260 })
          currentY += 15
        }
      }
      
      if (customerMobile) {
        doc.text(`Mobile: ${customerMobile}`, margin + 10, currentY, { width: 260 })
        currentY += 15
      }
      
      if (customerEmail) {
        doc.text(`Email: ${customerEmail}`, margin + 10, currentY, { width: 260 })
        currentY += 15
      }
      
      currentY = billToBoxY + billToBoxHeight + 20

      // ========== ITEMS TABLE ==========
      const tableStartY = currentY + 10
      doc.y = tableStartY
      
      // Validate items array
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        throw new Error('Order items are missing or invalid')
      }

      // Table Header with colored background - properly fitted
      const headerY = doc.y
      const headerRowHeight = 32
      const primaryLightRgb = hexToRgb(colors.primaryLight)
      const primaryDarkRgb = hexToRgb(colors.primaryDark)
      
      // Draw header background
      doc.rect(margin, headerY, contentWidth, headerRowHeight)
        .fillColor(`rgb(${primaryDarkRgb.r}, ${primaryDarkRgb.g}, ${primaryDarkRgb.b})`)
        .fill()
      
      // Column positions - properly calculated to fit within page width
      // Total available width: contentWidth = 515.28 (pageWidth - 2*margin)
      // Distribute columns properly to fit: ensure colTotal + colTotalWidth <= pageWidth - margin (555.28)
      const colItem = margin + 10
      const colItemWidth = 180
      const colSize = colItem + colItemWidth + 8
      const colSizeWidth = 42
      const colColor = colSize + colSizeWidth + 8
      const colColorWidth = 52
      const colQty = colColor + colColorWidth + 8
      const colQtyWidth = 32
      const colPrice = colQty + colQtyWidth + 8
      const colPriceWidth = 70
      const colTotal = colPrice + colPriceWidth + 8
      const colTotalWidth = 80
      
      // Verification: colTotal + colTotalWidth = 490 + 80 = 570, but should be <= 555.28
      // Need to adjust: reduce spacing or widths slightly
      // Recalculated: colTotal position = 40 + 10 + 180 + 8 + 42 + 8 + 52 + 8 + 32 + 8 + 70 + 8 = 466
      // colTotal + colTotalWidth = 466 + 80 = 546, which fits!
      
      doc.fontSize(11).font('Helvetica-Bold')
        .fillColor(colors.white)
        .text('Item', colItem, headerY + 10, { width: colItemWidth, align: 'left' })
        .text('Size', colSize, headerY + 10, { width: colSizeWidth, align: 'center' })
        .text('Color', colColor, headerY + 10, { width: colColorWidth, align: 'center' })
        .text('Qty', colQty, headerY + 10, { width: colQtyWidth, align: 'center' })
        .text('Price', colPrice, headerY + 10, { width: colPriceWidth, align: 'right' })
        .text('Total', colTotal, headerY + 10, { width: colTotalWidth, align: 'right' })
      
      doc.y = headerY + headerRowHeight + 12

      // Items rows with alternating background - no border lines
      let itemsY = doc.y
      doc.fontSize(10).font('Helvetica')
        .fillColor(colors.textPrimary)
      
      order.items.forEach((item, index) => {
        const itemName = item.name || item.product?.name || 'Product'
        const size = item.size || '-'
        const color = item.color || '-'
        const quantity = item.quantity || 1
        const price = parseFloat(item.price || 0)
        const total = price * quantity

        // Check if we need a new page
        if (itemsY > pageHeight - 250) {
          doc.addPage()
          itemsY = margin + 20
          // Redraw header on new page
          doc.rect(margin, itemsY - 10, contentWidth, headerRowHeight)
            .fillColor(`rgb(${primaryDarkRgb.r}, ${primaryDarkRgb.g}, ${primaryDarkRgb.b})`)
            .fill()
          doc.fontSize(11).font('Helvetica-Bold')
            .fillColor(colors.white)
            .text('Item', colItem, itemsY - 2, { width: colItemWidth, align: 'left' })
            .text('Size', colSize, itemsY - 2, { width: colSizeWidth, align: 'center' })
            .text('Color', colColor, itemsY - 2, { width: colColorWidth, align: 'center' })
            .text('Qty', colQty, itemsY - 2, { width: colQtyWidth, align: 'center' })
            .text('Price', colPrice, itemsY - 2, { width: colPriceWidth, align: 'right' })
            .text('Total', colTotal, itemsY - 2, { width: colTotalWidth, align: 'right' })
          itemsY += headerRowHeight + 12
        }

        // Calculate item name height first (needed for row height calculations)
        const itemNameHeight = doc.heightOfString(itemName, { width: colItemWidth })
        const rowHeight = Math.max(24, itemNameHeight + 12)

        // Alternate row background for better readability
        if (index % 2 === 0) {
          doc.rect(margin, itemsY - 3, contentWidth, rowHeight)
            .fillColor(colors.background)
            .fill()
        }

        // Item name and details - properly aligned with column widths
        doc.fillColor(colors.textPrimary)
          .fontSize(10)
          .font('Helvetica')
          .text(itemName, colItem, itemsY, { width: colItemWidth, align: 'left' })
          .text(size || '-', colSize, itemsY, { width: colSizeWidth, align: 'center' })
          .text(color || '-', colColor, itemsY, { width: colColorWidth, align: 'center' })
          .text(quantity.toString(), colQty, itemsY, { width: colQtyWidth, align: 'center' })
          // Use "Rs." instead of ₹ to avoid encoding issues
          .text(`Rs. ${price.toFixed(2)}`, colPrice, itemsY, { width: colPriceWidth, align: 'right' })
          .text(`Rs. ${total.toFixed(2)}`, colTotal, itemsY, { width: colTotalWidth, align: 'right' })

        itemsY += rowHeight
      })

      doc.y = itemsY + 20

      // ========== TOTALS SECTION ==========
      const subtotal = parseFloat(order.subtotal || 0)
      const shippingCost = parseFloat(order.shippingCost || 0)
      const tax = parseFloat(order.tax || 0)
      const grandTotal = parseFloat(order.total || 0)

      // Totals section - no background box, clean and elegant
      const totalsStartX = colTotal
      const totalsLabelWidth = 100
      const totalsValueWidth = colTotalWidth
      let totalsY = doc.y

      doc.fontSize(10).font('Helvetica')
        .fillColor(colors.textSecondary)
        .text('Subtotal:', totalsStartX - totalsLabelWidth - 10, totalsY, { width: totalsLabelWidth, align: 'right' })
        .fillColor(colors.textPrimary)
        .fontSize(10)
        .font('Helvetica')
        .text(`Rs. ${subtotal.toFixed(2)}`, totalsStartX, totalsY, { width: totalsValueWidth, align: 'right' })
        totalsY += 20

      if (shippingCost > 0) {
        doc.fillColor(colors.textSecondary)
          .fontSize(10)
          .font('Helvetica')
          .text('Shipping:', totalsStartX - totalsLabelWidth - 10, totalsY, { width: totalsLabelWidth, align: 'right' })
          .fillColor(colors.textPrimary)
          .fontSize(10)
          .font('Helvetica')
          .text(`Rs. ${shippingCost.toFixed(2)}`, totalsStartX, totalsY, { width: totalsValueWidth, align: 'right' })
        totalsY += 20
      }

      if (tax > 0) {
        doc.fillColor(colors.textSecondary)
          .fontSize(10)
          .font('Helvetica')
          .text('Tax (GST):', totalsStartX - totalsLabelWidth - 10, totalsY, { width: totalsLabelWidth, align: 'right' })
          .fillColor(colors.textPrimary)
          .fontSize(10)
          .font('Helvetica')
          .text(`Rs. ${tax.toFixed(2)}`, totalsStartX, totalsY, { width: totalsValueWidth, align: 'right' })
        totalsY += 20
      }

      // Grand Total - enhanced styling without background
      totalsY += 8
      
      doc.fontSize(13).font('Helvetica-Bold')
        .fillColor(colors.primaryDark)
        .text('Total:', totalsStartX - totalsLabelWidth - 10, totalsY, { width: totalsLabelWidth, align: 'right' })
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(colors.textPrimary)
        .text(`Rs. ${grandTotal.toFixed(2)}`, totalsStartX, totalsY, { width: totalsValueWidth, align: 'right' })
      
      doc.y = totalsY + 30

      // ========== FOOTER SECTION ==========
      const footerY = doc.y + 20

      // Thank You message (centered) with enhanced styling matching website
      doc.fontSize(18).font('Helvetica-Bold')
        .fillColor(colors.primaryDark)
        .text('Thank You for Shopping with Arudhra Fashions!', margin, footerY, { 
          width: contentWidth, 
          align: 'center' 
        })

      // Footer text with website styling
      const footerTextY = footerY + 30
      doc.fontSize(9).font('Helvetica')
        .fillColor(colors.textSecondary)
        .opacity(0.8)
        .text('This computer-generated document is valid without signature or company stamp.', 
          margin, footerTextY, { 
            width: contentWidth, 
            align: 'center' 
          })
        .opacity(1)
      
      // Brand name at bottom right with elegant styling
      const brandY = footerTextY + 25
      doc.fontSize(15).font('Times-Italic')
        .fillColor(colors.primaryDark)
        .text('Arudhra Fashions', pageWidth - margin - 150, brandY, { 
          width: 150, 
          align: 'right' 
        })

      // Finalize PDF
      doc.end()

      stream.on('finish', () => {
        resolve(`/uploads/invoices/${filename}`)
      })

      stream.on('error', (error) => {
        reject(error)
      })
    } catch (error) {
      reject(error)
    }
  })
}
