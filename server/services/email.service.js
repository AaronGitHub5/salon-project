const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function initMail() {
  if (!process.env.RESEND_API_KEY) {
    console.error('  RESEND_API_KEY not set — emails will not send.');
    return;
  }
  console.log(' Mail System Ready (Resend)');
}

async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Hair By Amnesia <no-reply@hairbyamnesia.co.uk>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return;
    }

    console.log(` Email sent → ${to} | ID: ${data.id}`);
  } catch (err) {
    console.error('sendEmail failed:', err);
  }
}

function bookingConfirmationTemplate({ fullName, serviceName, stylistName, startTime, price }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="background:#111;color:#fff;padding:20px;">Hair By Amnesia</h2>
      <div style="padding:24px;">
        <p>Hi ${fullName},</p>
        <p>Your appointment is confirmed!</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;border:1px solid #eee;"><strong>Service</strong></td><td style="padding:8px;border:1px solid #eee;">${serviceName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;"><strong>Stylist</strong></td><td style="padding:8px;border:1px solid #eee;">${stylistName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;"><strong>Date & Time</strong></td><td style="padding:8px;border:1px solid #eee;">${new Date(startTime).toLocaleString('en-GB')}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;"><strong>Price</strong></td><td style="padding:8px;border:1px solid #eee;">£${price}</td></tr>
        </table>
        <p style="margin-top:20px;color:#666;">We look forward to seeing you!</p>
        <p style="margin-top:16px;font-size:13px;color:#666;">
          Need to cancel or reschedule? 
          <a href="https://hairbyamnesia.co.uk" style="color:#111;font-weight:bold;">Visit your profile</a>
        </p>
      </div>
    </div>
  `;
}

function cancellationTemplate({ serviceName }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="background:#111;color:#fff;padding:20px;">Hair By Amnesia</h2>
      <p>Your <strong>${serviceName}</strong> appointment has been cancelled.</p>
      <p>If you did not request this or have any questions, please contact us.</p>
      <p style="color:#666;">We hope to see you again soon.</p>
    </div>
  `;
}

function rescheduleTemplate({ fullName, serviceName, stylistName, newStartTime }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="background:#111;color:#fff;padding:20px;">Hair By Amnesia</h2>
      <p>Hi ${fullName},</p>
      <p>Your appointment has been rescheduled.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>Service</strong></td><td style="padding:8px;border:1px solid #eee;">${serviceName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>Stylist</strong></td><td style="padding:8px;border:1px solid #eee;">${stylistName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>New Date & Time</strong></td><td style="padding:8px;border:1px solid #eee;">${new Date(newStartTime).toLocaleString('en-GB')}</td></tr>
      </table>
      <p style="margin-top:20px;color:#666;">See you then!</p>
    </div>
  `;
}

function reviewRequestTemplate({ fullName, serviceName, bookingId }) {
  const reviewUrl = `https://hairbyamnesia.co.uk?review=${bookingId}`;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="background:#111;color:#fff;padding:20px;">Hair By Amnesia</h2>
      <div style="padding:24px;">
        <p>Hi ${fullName},</p>
        <p>We hope you enjoyed your <strong>${serviceName}</strong> appointment!</p>
        <p>We'd love to hear your feedback — it only takes 30 seconds.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${reviewUrl}"
             style="background:#111;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;border-radius:4px;">
            Leave a Review
          </a>
        </div>
        <p style="font-size:13px;color:#666;">
          Or copy this link into your browser:<br/>
          <a href="${reviewUrl}" style="color:#111;">${reviewUrl}</a>
        </p>
      </div>
    </div>
  `;
}

module.exports = {
  initMail,
  sendEmail,
  bookingConfirmationTemplate,
  cancellationTemplate,
  rescheduleTemplate,
  reviewRequestTemplate,
};