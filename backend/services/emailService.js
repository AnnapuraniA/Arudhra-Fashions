import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Email Service for sending emails
 * Configure using environment variables:
 * - EMAIL_HOST: SMTP host (e.g., smtp.gmail.com)
 * - EMAIL_PORT: SMTP port (e.g., 587)
 * - EMAIL_USER: Email address for sending
 * - EMAIL_PASS: Email password or app password
 * - EMAIL_FROM: From email address (defaults to EMAIL_USER)
 */

// Create transporter based on environment variables
const createTransporter = () => {
  // If no email config, return null (service disabled)
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email service not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.')
    return null
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

const transporter = createTransporter()
const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@arudhraboutique.com'

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 * @param {Array} options.attachments - Array of attachment objects (optional)
 * @returns {Promise<Object>} - Result object with success status
 */
export const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    // If transporter is not configured, log and return mock success
    if (!transporter) {
      console.log(`[Email Service - Mock] Would send email to: ${to}`)
      console.log(`[Email Service - Mock] Subject: ${subject}`)
      if (attachments.length > 0) {
        console.log(`[Email Service - Mock] Attachments: ${attachments.length}`)
      }
      return {
        success: true,
        message: 'Email service not configured (mock mode)',
        messageId: 'mock-' + Date.now()
      }
    }

    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      attachments
    }

    const info = await transporter.sendMail(mailOptions)
    
    console.log(`Email sent successfully to ${to}:`, info.messageId)
    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      message: error.message || 'Failed to send email',
      error: error.toString()
    }
  }
}

/**
 * Send email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 * @param {string} options.pdfPath - Path to PDF file (relative to backend root)
 * @param {string} options.pdfName - Name for PDF attachment (optional)
 * @returns {Promise<Object>} - Result object with success status
 */
export const sendEmailWithPDF = async ({ to, subject, html, text, pdfPath, pdfName }) => {
  try {
    // Resolve PDF path
    const fullPdfPath = path.join(__dirname, '..', pdfPath)
    
    // Check if PDF exists
    if (!fs.existsSync(fullPdfPath)) {
      throw new Error(`PDF file not found: ${fullPdfPath}`)
    }

    const attachments = [{
      filename: pdfName || path.basename(pdfPath),
      path: fullPdfPath,
      contentType: 'application/pdf'
    }]

    return await sendEmail({ to, subject, html, text, attachments })
  } catch (error) {
    console.error('Error sending email with PDF:', error)
    return {
      success: false,
      message: error.message || 'Failed to send email with PDF',
      error: error.toString()
    }
  }
}

/**
 * Send order confirmation email
 * @param {Object} order - Order object
 * @param {Object} user - User object with email
 * @returns {Promise<Object>} - Result object
 */
export const sendOrderConfirmationEmail = async (order, user) => {
  const email = user.email || order.shippingAddress?.email
  if (!email) {
    return { success: false, message: 'No email address found' }
  }

  const subject = `Order Confirmation - ${order.orderId}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Thank you for your order!</h2>
      <p>Dear ${user.name || 'Customer'},</p>
      <p>Your order <strong>${order.orderId}</strong> has been confirmed.</p>
      <p><strong>Order Total:</strong> ₹${parseFloat(order.total || 0).toFixed(2)}</p>
      <p>We'll send you another email when your order ships.</p>
      <p>Thank you for shopping with Arudhra Fashions!</p>
    </div>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Reset token
 * @param {string} userName - User name (optional)
 * @returns {Promise<Object>} - Result object
 */
export const sendPasswordResetEmail = async (email, resetToken, userName = 'Customer') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

  const subject = 'Reset Your Password - Arudhra Fashions'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Dear ${userName},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${resetLink}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `

  return await sendEmail({ to: email, subject, html })
}

export default {
  sendEmail,
  sendEmailWithPDF,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail
}
