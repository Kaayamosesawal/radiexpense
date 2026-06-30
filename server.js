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

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'RadiExpense <onboarding@radiexpense.app>';
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
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:linear-gradient(135deg,#FF6B2B,#FF8C42);padding:40px 32px;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
         <img src="https://raw.githubusercontent.com/Kaayamosesawal/images/main/RadiExpense.png"
                 alt="Slirus Holding" width="72" height="72"
                 style="display:block;border-radius:50%;
                        border:2px solid #e2e8f0;object-fit:cover;" />
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
          Need help? <a href="mailto:radiexpense@slirus.com" style="color:#FF6B2B;font-weight:700;text-decoration:none;">support@radiexpense.com</a>
        </p>
      </div>

      <div style="background:#F9FAFB;padding:24px 32px;text-align:center;border-top:1px solid #F3F4F6;">
        <p style="font-size:12px;color:#9CA3AF;margin:0;">
          © ${new Date().getFullYear()} RadiExpense · Lira, Uganda<br/>
          You're receiving this because you registered on Radiexpense App.
        </p>
      </div>
    </div>
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

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: `Welcome to RadiExpense, ${fullName.split(' ')[0]}! 🎉`,
      html,
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