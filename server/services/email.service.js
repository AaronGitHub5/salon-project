const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Format a UTC timestamp as London wall-clock time (BST or GMT depending on
// the date). Required because the server runs in UTC on Render but customers
// expect UK time in their emails.
function formatUk(startTime, opts = {}) {
  return new Date(startTime).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    ...opts,
  });
}

const EMAIL_HEADER = `
  <div style="background:#1A1A18;padding:24px 32px;">
    <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.3rem;color:#fff;font-weight:500;letter-spacing:0.02em;">
      Hair by <span style="color:#B8975A;">Amnesia</span>
    </span>
  </div>
`;

const EMAIL_FOOTER = `
  <div style="border-top:1px solid #E4E0D8;padding:20px 32px;">
    <p style="margin:0 0 4px;font-size:0.72rem;color:#B4A894;letter-spacing:0.05em;">
      This is an automated email — please do not reply.
    </p>
    <p style="margin:0 0 4px;font-size:0.72rem;color:#B4A894;">
      Questions? Visit <a href="https://hairbyamnesia.co.uk" style="color:#1A1A18;text-decoration:none;border-bottom:1px solid #E4E0D8;">hairbyamnesia.co.uk</a>
      or call <strong style="color:#1A1A18;">020 8476 7326</strong>
    </p>
    <p style="margin:8px 0 0;font-size:0.67rem;color:#B4A894;letter-spacing:0.1em;">
      Hair by Amnesia &middot; 265 High Street Harlington, Hayes, UB3 5DF
    </p>
  </div>
`;

function emailWrapper(content) {
  return `
    <div style="font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAFAF8;">
      ${EMAIL_HEADER}
      <div style="padding:32px;">
        ${content}
      </div>
      ${EMAIL_FOOTER}
    </div>
  `;
}

function tableRow(label, value) {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #E4E0D8;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:#B8975A;width:120px;">${label}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #E4E0D8;font-size:0.88rem;color:#1A1A18;font-weight:300;">${value}</td>
  </tr>`;
}

function detailsTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${rows.join('')}</table>`;
}

function ctaButton(text, href) {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${href}"
         style="display:inline-block;background:#1A1A18;color:#fff;padding:14px 28px;text-decoration:none;font-size:0.72rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;">
        ${text}
      </a>
    </div>
  `;
}

async function initMail() {
  if (!process.env.RESEND_API_KEY) {
    console.error('  RESEND_API_KEY not set — emails will not send.');
    return;
  }
  console.log(' Mail System Ready (Resend)');
}

// Single send attempt. Returns true if Resend accepted the email, false otherwise.
async function sendEmailOnce(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Hair By Amnesia <no-reply@hairbyamnesia.co.uk>',
      to,
      subject,
      html,
    });
    if (error) { console.error('Resend error:', error); return false; }
    console.log(` Email sent → ${to} | ID: ${data.id}`);
    return true;
  } catch (err) {
    console.error('sendEmail failed:', err);
    return false;
  }
}

// Send with exponential backoff retry (3 attempts: 0s, 1s, 2s).
// Returns true if any attempt succeeds, false if all fail. Never throws — callers
// that care about delivery should check the return value and surface a warning.
async function sendEmail(to, subject, html, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const ok = await sendEmailOnce(to, subject, html);
    if (ok) return true;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  console.warn(`sendEmail: gave up after ${attempts} attempts → ${to}`);
  return false;
}

function bookingConfirmationTemplate({ fullName, serviceName, stylistName, startTime, price }) {
  const priceRow = price ? tableRow('Price', `£${price}`) : '';
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Booking Confirmed</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">You're all set, ${fullName}.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;margin-bottom:8px;">
      Your appointment is confirmed. Here are the details:
    </p>
    ${detailsTable([
      tableRow('Service', serviceName),
      tableRow('Stylist', stylistName),
      tableRow('Date &amp; Time', formatUk(startTime)),
      priceRow,
    ].filter(Boolean))}
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;">We look forward to seeing you!</p>
    <p style="font-size:0.78rem;font-weight:300;color:#B4A894;margin-top:16px;">
      Need to cancel or reschedule?
      <a href="https://hairbyamnesia.co.uk" style="color:#1A1A18;text-decoration:none;border-bottom:1px solid #E4E0D8;">Visit your profile</a>
    </p>
  `);
}

function bookingPendingTemplate({ fullName, serviceName, stylistName, startTime, price }) {
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Booking Request Received</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">We've received your request, ${fullName}.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;margin-bottom:8px;">
      Your appointment request is awaiting confirmation from your stylist. You'll receive another email once it's approved.
    </p>
    ${detailsTable([
      tableRow('Service', serviceName),
      tableRow('Stylist', stylistName),
      tableRow('Requested Time', formatUk(startTime)),
      tableRow('Price', `£${price}`),
      tableRow('Status', 'Pending Approval'),
    ])}
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;">
      We'll be in touch shortly.
    </p>
  `);
}

function bookingRejectionTemplate({ fullName, serviceName, stylistName, startTime }) {
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Booking Request</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">We're unable to confirm your appointment.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;margin-bottom:8px;">
      Hi ${fullName}, unfortunately your booking request could not be approved at this time.
    </p>
    ${detailsTable([
      tableRow('Service', serviceName),
      tableRow('Stylist', stylistName),
      tableRow('Requested Time', formatUk(startTime)),
    ])}
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;">
  We hope to find a time that works for you. Browse availability and book whenever suits you best.
    </p>
    ${ctaButton('Book Again', 'https://hairbyamnesia.co.uk')}
  `);
}

function cancellationTemplate({ serviceName }) {
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Cancellation</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">Appointment cancelled.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;">
      Your <strong style="color:#1A1A18;font-weight:400;">${serviceName}</strong> appointment has been cancelled.
    </p>
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;margin-top:12px;">
      If you did not request this or have any questions, please contact us.
    </p>
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;margin-top:12px;">We hope to see you again soon.</p>
    ${ctaButton('Book Again', 'https://hairbyamnesia.co.uk')}
  `);
}

function overrideCancellationTemplate({ fullName, serviceName, stylistName, startTime, reason }) {
  const formattedDate = formatUk(startTime, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const rows = [
    tableRow('Service', serviceName),
    tableRow('Stylist', stylistName),
    tableRow('Date &amp; Time', formattedDate),
  ];
  if (reason) rows.push(tableRow('Reason', reason));

  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Schedule Change</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">Appointment cancelled.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;">
      Hi ${fullName}, we're sorry to let you know that your upcoming appointment has been cancelled.
    </p>
    ${detailsTable(rows)}
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;">
      We apologise for any inconvenience. Please rebook at your earliest convenience.
    </p>
    ${ctaButton('Rebook Now', 'https://hairbyamnesia.co.uk')}
    <p style="font-size:0.78rem;font-weight:300;color:#B4A894;">If you have any questions please don't hesitate to get in touch.</p>
  `);
}

function rescheduleTemplate({ fullName, serviceName, stylistName, newStartTime }) {
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Rescheduled</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">New time confirmed.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;">
      Hi ${fullName}, your appointment has been rescheduled.
    </p>
    ${detailsTable([
      tableRow('Service', serviceName),
      tableRow('Stylist', stylistName),
      tableRow('New Date &amp; Time', formatUk(newStartTime)),
    ])}
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;">See you then!</p>
  `);
}

function reviewRequestTemplate({ fullName, serviceName, bookingId }) {
  const reviewUrl = `https://hairbyamnesia.co.uk?review=${bookingId}`;
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Feedback</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">How was your visit?</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;">
      Hi ${fullName}, we hope you enjoyed your <strong style="color:#1A1A18;font-weight:400;">${serviceName}</strong> appointment!
    </p>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;">
      We'd love to hear your feedback — it only takes 30 seconds.
    </p>
    ${ctaButton('Leave a Review', reviewUrl)}
    <p style="font-size:0.78rem;font-weight:300;color:#B4A894;">
      Or copy this link:<br/>
      <a href="${reviewUrl}" style="color:#1A1A18;text-decoration:none;border-bottom:1px solid #E4E0D8;">${reviewUrl}</a>
    </p>
  `);
}

function reminderTemplate({ fullName, serviceName, stylistName, startTime, window }) {
  const timing = window === '1h' ? 'in <strong style="color:#1A1A18;font-weight:400;">1 hour</strong>' : '<strong style="color:#1A1A18;font-weight:400;">tomorrow</strong>';
  return emailWrapper(`
    <p style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.15em;color:#B8975A;margin:0 0 4px;">Reminder</p>
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:300;color:#1A1A18;margin:0 0 16px;">See you soon.</h2>
    <p style="font-size:0.88rem;font-weight:300;color:#7A7870;line-height:1.6;">
      Hi ${fullName}, this is a friendly reminder that you have an appointment ${timing}!
    </p>
    ${detailsTable([
      tableRow('Service', serviceName),
      tableRow('Stylist', stylistName),
      tableRow('Date &amp; Time', formatUk(startTime)),
    ])}
    <p style="font-size:0.85rem;font-weight:300;color:#7A7870;line-height:1.6;">We look forward to seeing you!</p>
    <p style="font-size:0.78rem;font-weight:300;color:#B4A894;margin-top:16px;">
      Need to cancel or reschedule?
      <a href="https://hairbyamnesia.co.uk" style="color:#1A1A18;text-decoration:none;border-bottom:1px solid #E4E0D8;">Visit your profile</a>
    </p>
  `);
}

module.exports = {
  initMail,
  sendEmail,
  bookingConfirmationTemplate,
  bookingPendingTemplate,
  bookingRejectionTemplate,
  cancellationTemplate,
  overrideCancellationTemplate,
  rescheduleTemplate,
  reviewRequestTemplate,
  reminderTemplate,
};