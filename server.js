import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';

// ─── Validate required environment variables on startup ───────────────────
const REQUIRED_ENV = ['RESEND_API_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[Server] ❌ Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('[Server] Add them to your .env file (or Render dashboard) before starting.');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'RadiExpense <radiexpense@slirus.com>';
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Allowed origins (CORS) ─────────────────────────────────────────────────
// Supports multiple known frontends plus whatever is set in CLIENT_ORIGIN.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://radiexpense.slirus.com',
  'https://radiexpense.app',
  'https://www.radiexpense.app',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

const app = express();

// Allow preflight OPTIONS requests for all routes
app.options('*', cors());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '16kb' }));

/**
 * Builds the HTML body for the welcome / onboarding-appreciation email.
 */
function buildWelcomeEmailHtml({ fullName, email, businessName, plan }) {
  const firstName = (fullName || '').trim().split(' ')[0] || 'there';
  const planLabel = plan === 'pro' ? 'Pro' : 'Free';

  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
      <title>Welcome to RadiExpense</title>
    </head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#FF6B2B 0%,#FF8C42 100%);padding:40px 32px;text-align:center;">
        <!-- Logo block -->
        <div style="margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="background:#ffffff;border-radius:16px;padding:10px 18px;display:inline-block;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;">
                      <img src="https://raw.githubusercontent.com/Kaayamosesawal/images/main/RadiExpense.png"
                           alt="RadiExpense"
                           width="40" height="40"
                           style="display:block;border-radius:10px;object-fit:cover;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:20px;font-weight:900;color:#1F2937;letter-spacing:-0.5px;font-family:'Helvetica Neue',Arial,sans-serif;">
                        Radi<span style="color:#FF6B2B;">Expense</span>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
          Welcome aboard, ${firstName}!
        </h1>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">
          Your RadiExpense ${planLabel} account has been created successfully.
        </p>
      </div>

      <div style="padding:40px 32px;">
        <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
          Dear <strong>${fullName}</strong>,
        </p>
        <p style="font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 20px;">
          Thank you for choosing RadiExpense and for completing the onboarding process for
          <strong style="color:#1F2937;">${businessName}</strong>. We're truly grateful for the trust
          you've placed in our platform to help manage and grow your business finances.
        </p>
        <p style="font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 28px;">
          Our team is committed to supporting you every step of the way. Should you have any
          questions or need assistance getting started, please don't hesitate to reach out, we're here to help you succeed.
        </p>

        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 10px;">
            Account summary
          </p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Name:</strong> ${fullName}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Business:</strong> ${businessName}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Plan:</strong> RadiExpense ${planLabel}</p>
        </div>

        <div style="text-align:center;margin-top:8px;">
          <a href="https://radiexpense.slirus.com/login"
             style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(255,107,43,0.35);">
            Go to My Dashboard →
          </a>
        </div>

        <p style="font-size:13px;color:#9CA3AF;text-align:center;margin-top:28px;line-height:1.6;">
          Need help? <a href="mailto:radiexpense@slirus.com" style="color:#FF6B2B;font-weight:700;text-decoration:none;">radiexpense@slirus.com</a>
        </p>
      </div>

      <div style="background:#F9FAFB;padding:24px 32px;text-align:center;border-top:1px solid #F3F4F6;">
        <p style="font-size:12px;color:#9CA3AF;margin:0 0 8px;">
          © ${new Date().getFullYear()} RadiExpense &mdash; A product of Slirus Holdings
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px;">
          P.O Box 331921, Juba Road, Lira, Uganda
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px;">
          You're receiving this because you created an account at
          <a href="https://radiexpense.slirus.com" style="color:#FF6B2B;text-decoration:none;">radiexpense.slirus.com</a>.
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0;">
          If you didn't sign up, you can safely ignore this email &mdash; your address will not be used again.
          &nbsp;|&nbsp;
          <a href="https://radiexpense.slirus.com/unsubscribe?email=${email}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
        </p>
      </div>
    </div>
    </td></tr>
    </table>
    </body>
    </html>
  `;
}

/**
 * Builds the HTML body for the "Thank you for upgrading to Pro" email.
 */
function buildUpgradeEmailHtml({ fullName, email, businessName }) {
  const firstName = (fullName || '').trim().split(' ')[0] || 'there';

  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
      <title>Welcome to RadiExpense Pro</title>
    </head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#FF6B2B 0%,#FF8C42 100%);padding:40px 32px;text-align:center;">
        <!-- Logo block -->
        <div style="margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="background:#ffffff;border-radius:16px;padding:10px 18px;display:inline-block;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;">
                      <img src="https://raw.githubusercontent.com/Kaayamosesawal/images/main/RadiExpense.png"
                           alt="RadiExpense"
                           width="40" height="40"
                           style="display:block;border-radius:10px;object-fit:cover;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:20px;font-weight:900;color:#1F2937;letter-spacing:-0.5px;font-family:'Helvetica Neue',Arial,sans-serif;">
                        Radi<span style="color:#FF6B2B;">Expense</span>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
          You're now on Pro, ${firstName}! 🚀
        </h1>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">
          Thank you for upgrading your RadiExpense account.
        </p>
      </div>

      <div style="padding:40px 32px;">
        <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
          Dear <strong>${fullName}</strong>,
        </p>
        <p style="font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 20px;">
          Thank you for upgrading <strong style="color:#1F2937;">${businessName}</strong> to
          RadiExpense <strong style="color:#FF6B2B;">Pro</strong>. We're honoured that you've chosen
          to grow with us, and we can't wait for you to experience everything the Pro tier has to offer.
        </p>
        <p style="font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 24px;">
          Your account now includes a more powerful experience with advanced functionality and
          professional-grade tools designed to help your business run smoother and scale faster:
        </p>

        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 12px;">
            What's unlocked
          </p>
          <p style="font-size:14px;color:#374151;margin:6px 0;">✅ Barcode scanning for faster checkout</p>
          <p style="font-size:14px;color:#374151;margin:6px 0;">✅ Customer loyalty programs</p>
          <p style="font-size:14px;color:#374151;margin:6px 0;">✅ AI-powered financial insights</p>
          <p style="font-size:14px;color:#374151;margin:6px 0;">✅ Advanced reporting & analytics</p>
          <p style="font-size:14px;color:#374151;margin:6px 0;">✅ Priority customer support</p>
        </div>

        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 10px;">
            Account summary
          </p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Name:</strong> ${fullName}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Business:</strong> ${businessName}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Plan:</strong> RadiExpense Pro</p>
        </div>

        <div style="text-align:center;margin-top:8px;">
          <a href="https://radiexpense.slirus.com/login"
             style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(255,107,43,0.35);">
            Go to My Dashboard →
          </a>
        </div>

        <p style="font-size:13px;color:#9CA3AF;text-align:center;margin-top:28px;line-height:1.6;">
          Need help? <a href="mailto:radiexpense@slirus.com" style="color:#FF6B2B;font-weight:700;text-decoration:none;">radiexpense@slirus.com</a>
        </p>
      </div>

      <div style="background:#F9FAFB;padding:24px 32px;text-align:center;border-top:1px solid #F3F4F6;">
        <p style="font-size:12px;color:#9CA3AF;margin:0 0 8px;">
          © ${new Date().getFullYear()} RadiExpense &mdash; A product of Slirus Holdings
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px;">
          Plot 14, Lira City, Northern Region, Uganda
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px;">
          You're receiving this because you upgraded your account at
          <a href="https://radiexpense.slirus.com" style="color:#FF6B2B;text-decoration:none;">radiexpense.slirus.com</a>.
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0;">
          If you believe this was sent in error, please contact us.
          &nbsp;|&nbsp;
          <a href="https://radiexpense.slirus.com/unsubscribe?email=${email}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
        </p>
      </div>
    </div>
    </td></tr>
    </table>
    </body>
    </html>
  `;
}

/**
 * POST /api/send-welcome-email
 * Body: { fullName, email, businessName, plan }
 */
app.post('/api/send-welcome-email', async (req, res) => {
  const { fullName, email, businessName, plan } = req.body || {};

  if (!fullName || !email || !businessName) {
    return res.status(400).json({
      success: false,
      message: 'fullName, email, and businessName are required.',
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    const html = buildWelcomeEmailHtml({ fullName, email, businessName, plan });

    // Plain-text fallback — greatly reduces spam score
    const text = [
      `Welcome to RadiExpense, ${fullName.split(' ')[0]}!`,
      '',
      `Dear ${fullName},`,
      '',
      `Thank you for choosing RadiExpense and for completing the onboarding process for ${businessName}.`,
      'We\'re grateful for the trust you\'ve placed in our platform.',
      '',
      'Account Summary:',
      `  Name:     ${fullName}`,
      `  Email:    ${email}`,
      `  Business: ${businessName}`,
      `  Plan:     RadiExpense ${plan === 'pro' ? 'Pro' : 'Free'}`,
      '',
      'Get started → https://radiexpense.slirus.com/login',
      '',
      'Need help? Reply to this email or contact us at radiexpense@slirus.com',
      '',
      '---',
      `© ${new Date().getFullYear()} RadiExpense · Plot 14, Lira City, Northern Region, Uganda`,
      'You received this because you created an account at radiexpense.slirus.com.',
      `Unsubscribe: https://radiexpense.slirus.com/unsubscribe?email=${encodeURIComponent(email)}`,
    ].join('\n');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      reply_to: 'radiexpense@slirus.com',
      subject: `Welcome to RadiExpense, ${fullName.split(' ')[0]}!`,
      html,
      text,
      headers: {
        // Precedence: bulk tells smart clients this is transactional, not mass spam
        'Precedence': 'bulk',
        // List-Unsubscribe is checked by Gmail/Outlook to show the unsubscribe button
        'List-Unsubscribe': `<https://radiexpense.slirus.com/unsubscribe?email=${encodeURIComponent(email)}>, <mailto:radiexpense@slirus.com?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `welcome-${Date.now()}`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Resend API error');
    }

    console.log(`[Email] ✅ welcome email → ${email} | messageId: ${data?.id}`);
    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error(`[Email] ❌ Failed to send welcome email → ${email}:`, err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production'
        ? 'Failed to send welcome email. Please try again later.'
        : err.message,
    });
  }
});

/**
 * POST /api/send-upgrade-email
 * Body: { fullName, email, businessName }
 * Sends a "thank you for upgrading to Pro" email to an already-registered user.
 */
app.post('/api/send-upgrade-email', async (req, res) => {
  const { fullName, email, businessName } = req.body || {};

  if (!fullName || !email || !businessName) {
    return res.status(400).json({
      success: false,
      message: 'fullName, email, and businessName are required.',
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    const html = buildUpgradeEmailHtml({ fullName, email, businessName });

    // Plain-text fallback — greatly reduces spam score
    const text = [
      `You're now on Pro, ${fullName.split(' ')[0]}!`,
      '',
      `Dear ${fullName},`,
      '',
      `Thank you for upgrading ${businessName} to RadiExpense Pro.`,
      'We\'re honoured that you\'ve chosen to grow with us.',
      '',
      'What\'s unlocked:',
      '  - Barcode scanning for faster checkout',
      '  - Customer loyalty programs',
      '  - AI-powered financial insights',
      '  - Advanced reporting & analytics',
      '  - Priority customer support',
      '',
      'Account Summary:',
      `  Name:     ${fullName}`,
      `  Email:    ${email}`,
      `  Business: ${businessName}`,
      `  Plan:     RadiExpense Pro`,
      '',
      'Go to your dashboard → https://radiexpense.slirus.com/login',
      '',
      'Need help? Reply to this email or contact us at radiexpense@slirus.com',
      '',
      '---',
      `© ${new Date().getFullYear()} RadiExpense · Plot 14, Lira City, Northern Region, Uganda`,
      'You received this because you upgraded your account at radiexpense.slirus.com.',
      `Unsubscribe: https://radiexpense.slirus.com/unsubscribe?email=${encodeURIComponent(email)}`,
    ].join('\n');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      reply_to: 'radiexpense@slirus.com',
      subject: `You're now on RadiExpense Pro, ${fullName.split(' ')[0]}! 🚀`,
      html,
      text,
      headers: {
        // Precedence: bulk tells smart clients this is transactional, not mass spam
        'Precedence': 'bulk',
        // List-Unsubscribe is checked by Gmail/Outlook to show the unsubscribe button
        'List-Unsubscribe': `<https://radiexpense.slirus.com/unsubscribe?email=${encodeURIComponent(email)}>, <mailto:radiexpense@slirus.com?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `upgrade-${Date.now()}`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Resend API error');
    }

    console.log(`[Email] ✅ upgrade-to-pro email → ${email} | messageId: ${data?.id}`);
    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error(`[Email] ❌ Failed to send upgrade-to-pro email → ${email}:`, err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production'
        ? 'Failed to send upgrade email. Please try again later.'
        : err.message,
    });
  }
});

// ─── GET /api/health ─────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'RadiExpense Email API',
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});
// Backwards-compatible alias
app.get('/health', (_req, res) => res.redirect(307, '/api/health'));

// ─── 404 handler ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// ─── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  RadiExpense Email API`);
  console.log(`  Environment : ${NODE_ENV}`);
  console.log(`  Port        : ${PORT}`);
  console.log(`  Email via   : Resend`);
  console.log(`  From        : ${FROM_EMAIL}`);
  console.log('─────────────────────────────────────────');
});

// ─── Render free-tier keep-alive ────────────────────────────────────────────
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  const PING_INTERVAL = 14 * 60 * 1000;
  setInterval(async () => {
    try {
      const res = await fetch(`${RENDER_URL}/api/health`);
      console.log(`[Keep-alive] Ping → ${res.status}`);
    } catch (err) {
      console.warn('[Keep-alive] Ping failed:', err.message);
    }
  }, PING_INTERVAL);
  console.log(`[Keep-alive] Self-ping enabled → ${RENDER_URL}/api/health`);
}