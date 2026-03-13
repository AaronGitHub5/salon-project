const nodemailer = require('nodemailer');

let transporter;

async function initMail() {
  try {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    console.log('📧 Mail System Ready (Log Mode)');
  } catch (err) {
    console.error('Mail setup failed:', err);
  }
}

async function sendEmail(to, subject, html) {
  console.log(`Attempting to send email to: ${to}...`);

  if (!transporter) {
    console.error('Transporter not initialized!');
    return;
  }

  try {
    await transporter.sendMail({
      from: '"Hair By Amnesia" <no-reply@amnesia.com>',
      to,
      subject,
      html,
    });

    console.log('\n=========================================');
    console.log('📨 EMAIL GENERATED SUCCESSFULLY!');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('=========================================\n');
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

module.exports = { initMail, sendEmail };
