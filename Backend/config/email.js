const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  
  return nodemailer.createTransport(config);
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Lead Management System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request - Lead Management System',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              padding: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
            }
            .card {
              background: white;
              padding: 40px;
              margin: 20px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              color: #2d3748;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              color: #667eea;
            }
            .content {
              color: #4a5568;
              margin-bottom: 30px;
              font-size: 16px;
            }
            .content p {
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              padding: 14px 35px;
              background: linear-gradient(135deg, #5b0ea0 0%, #7a1bd8 50%, #b833ff 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              text-align: center;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(123, 27, 216, 0.4);
            }
            .button-container {
              text-align: center;
              margin: 35px 0;
            }
            .link-text {
              word-break: break-all;
              color: #7a1bd8;
              background: #f7fafc;
              padding: 12px;
              border-radius: 6px;
              font-size: 14px;
              border: 1px solid #e2e8f0;
            }
            .footer {
              color: #718096;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
            }
            .warning {
              background: #fff5f5;
              border-left: 4px solid #fc8181;
              padding: 15px;
              margin-top: 25px;
              border-radius: 4px;
              color: #742a2a;
              font-size: 14px;
            }
            .warning strong {
              color: #c53030;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p><strong>Hello,</strong></p>
                <p>You have requested to reset your password for your <strong>Lead Management System</strong> account.</p>
                <p>Click the button below to create a new password:</p>
              </div>
              <div class="button-container">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>
              <div class="content">
                <p style="font-size: 14px; color: #718096;">Or copy and paste this link into your browser:</p>
                <div class="link-text">${resetUrl}</div>
              </div>
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong><br>
                This link will expire in <strong>10 minutes</strong> for security reasons. If you didn't request this password reset, please ignore this email or contact support immediately.
              </div>
              <div class="footer">
                <p style="margin: 10px 0;">If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
                <p style="margin-top: 20px; font-weight: 600; color: #4a5568;">Best regards,<br>Lead Management System Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Password Reset Request - Lead Management System

Hello,

You have requested to reset your password for your Lead Management System account.

Click the link below to reset your password:
${resetUrl}

⚠️ Important: This link will expire in 10 minutes for security reasons.

If you didn't request a password reset, please ignore this email or contact support.

Best regards,
Lead Management System Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
};
