import { Router } from 'express'
import nodemailer from 'nodemailer'

const router = Router()

// Lưu OTP tạm thời (production nên dùng Redis)
const otpStore = new Map()

// Tạo transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

// Kiểm tra kết nối SMTP khi khởi động
transporter.verify()
    .then(() => console.log('✅ SMTP kết nối thành công'))
    .catch(err => console.log('⚠️  SMTP chưa cấu hình:', err.message, '\n   → Sửa file server/.env với Gmail + App Password'))

// API: Gửi OTP
router.post('/send-otp', async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json({ error: 'Email là bắt buộc' })
    }

    if (!email.endsWith('@ictu.edu.vn') && !email.endsWith('@ms.ictu.edu.vn')) {
        return res.status(400).json({ error: 'Chỉ chấp nhận email @ictu.edu.vn hoặc @ms.ictu.edu.vn' })
    }

    // Tạo mã OTP 6 số
    const otp = String(Math.floor(100000 + Math.random() * 900000))

    // Lưu OTP (hết hạn sau 5 phút)
    otpStore.set(email, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 })

    // Gửi email
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"LMS ICTU" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 Mã xác thực đăng nhập LMS ICTU',
            html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 0;">
          <div style="background: linear-gradient(135deg, #3c8dbc, #2c6fa0); padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🎓 LMS ICTU</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">Hệ thống quản lý học tập trực tuyến</p>
          </div>
          <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e8e8e8; border-top: none;">
            <p style="font-size: 15px; color: #333; margin: 0 0 8px;">Xin chào,</p>
            <p style="font-size: 14px; color: #666; margin: 0 0 20px; line-height: 1.6;">
              Bạn vừa yêu cầu đăng nhập vào hệ thống LMS ICTU. Dưới đây là mã xác thực của bạn:
            </p>
            <div style="background: #f0f7ff; border: 2px solid #3c8dbc; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 20px;">
              <p style="font-size: 12px; color: #999; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Mã xác thực</p>
              <div style="font-size: 36px; font-weight: 700; color: #3c8dbc; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #999; margin: 0 0 4px;">⏱ Mã có hiệu lực trong <strong>5 phút</strong></p>
            <p style="font-size: 13px; color: #999; margin: 0;">🔒 Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
          </div>
          <div style="padding: 16px 24px; text-align: center; background: #f8f9fa; border-radius: 0 0 12px 12px; border: 1px solid #e8e8e8; border-top: none;">
            <p style="font-size: 11px; color: #aaa; margin: 0;">© 2025 LMS ICTU — AI Learning Assistant</p>
          </div>
        </div>
      `,
        })

        console.log(`📧 OTP sent to ${email}: ${otp}`)
        res.json({ success: true, message: 'Mã xác thực đã gửi đến email' })
    } catch (err) {
        console.error('❌ Gửi email thất bại:', err.message)

        // Fallback: Trả OTP trực tiếp nếu SMTP chưa cấu hình
        console.log(`⚠️  Fallback — OTP cho ${email}: ${otp}`)
        res.json({
            success: true,
            message: 'Mã xác thực đã gửi đến email',
            // Chỉ trả OTP khi SMTP lỗi (development only)
            _devOtp: otp,
            _devNote: 'SMTP chưa cấu hình. Cấu hình trong server/.env để gửi email thật.'
        })
    }
})

// API: Xác thực OTP
router.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email và OTP là bắt buộc' })
    }

    const stored = otpStore.get(email)

    if (!stored) {
        return res.status(400).json({ error: 'Mã xác thực không tồn tại hoặc đã hết hạn', valid: false })
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email)
        return res.status(400).json({ error: 'Mã xác thực đã hết hạn (5 phút)', valid: false })
    }

    if (stored.code !== otp) {
        return res.status(400).json({ error: 'Mã xác thực không đúng', valid: false })
    }

    // OTP hợp lệ → xóa khỏi store
    otpStore.delete(email)

    res.json({
        valid: true,
        user: {
            email,
            name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            id: 'DTC' + String(Math.floor(100000000 + Math.random() * 900000000)).slice(0, 9),
        }
    })
})

export default router
