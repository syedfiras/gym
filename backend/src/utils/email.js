import axios from 'axios';

export const sendResetPasswordEmail = async ({
  to,
  name,
  resetToken
}) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: 'GymNet Support',
        email: process.env.EMAIL_FROM.match(/<(.*)>/)[1]
      },
      to: [{ email: to, name }],
      subject: 'Reset your GymNet password',
      htmlContent: `
        <p>Hi ${name || 'Owner'},</p>
        <p>You requested to reset your password.</p>
        <p>
          <a href="${resetUrl}" target="_blank">
            Click here to reset your password
          </a>
        </p>
        <p>This link is valid for <strong>1 hour</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
        <br />
        <p>— GymNet Support</p>
      `
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
};
