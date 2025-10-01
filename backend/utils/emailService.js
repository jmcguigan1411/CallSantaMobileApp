const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Welcome to Call Santa! 🎅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #b71c1c; color: white; padding: 20px; text-align: center;">
            <h1>🎅 Welcome to Call Santa!</h1>
          </div>
          <div style="padding: 20px; background-color: #f5f5f5;">
            <p>Hi ${userName},</p>
            <p>Thank you for creating an account with Call Santa! Your account has been successfully created.</p>
            <p>You can now:</p>
            <ul>
              <li>Create child profiles</li>
              <li>Schedule magical calls with Santa</li>
              <li>Manage Christmas wishlists</li>
              <li>Store special memories</li>
            </ul>
            <p>We're excited to help make this Christmas magical for your family!</p>
          </div>
          <div style="background-color: #165B33; color: white; padding: 10px; text-align: center; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Call Santa. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`✅ Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('SendGrid error:', error.response?.body || error.message);
    return false;
  }
};

const sendPasswordResetEmail = async (userEmail, userName, resetCode) => {
  try {
    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Password Reset Code 🔒',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #b71c1c; color: white; padding: 20px; text-align: center;">
            <h1>🔒 Password Reset Code</h1>
          </div>
          <div style="padding: 20px; background-color: #f5f5f5;">
            <p>Hi ${userName},</p>
            <p>You requested to reset your password for your Call Santa account.</p>
            <p>Enter this code in the app to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #fff; border: 2px dashed #b71c1c; padding: 20px 40px; border-radius: 10px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #b71c1c;">${resetCode}</span>
              </div>
            </div>
            <p style="text-align: center; color: #666; font-size: 14px;">
              This code will expire in 1 hour
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't request this, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          <div style="background-color: #165B33; color: white; padding: 10px; text-align: center; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Call Santa. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`✅ Password reset code sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('SendGrid error:', error.response?.body || error.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
};