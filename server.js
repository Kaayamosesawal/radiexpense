import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Resend } from 'resend';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import cron from 'node-cron';

// ─── Validate required environment variables on startup ───────────────────
// FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY come from
// a Firebase service account JSON (Project Settings → Service Accounts →
// Generate new private key). These are required because staff-account
// creation/removal (Firebase Auth) and the subscription-expiry sweep
// (Firestore) can only be done with the Admin SDK — never client-side.
const REQUIRED_ENV = ['RESEND_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[Server] ❌ Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('[Server] Add them to your .env file (or Render dashboard) before starting.');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Firebase Admin SDK ──────────────────────────────────────────────────────
// Powers: staff login creation/reset/removal (Firebase Auth) and the
// subscription-expiry sweep below (Firestore). FIREBASE_PRIVATE_KEY is stored
// with literal "\n" sequences in most dashboards (Render, Vercel, etc.), so
// it has to be un-escaped before use.
//
// NOTE: uses the modular `firebase-admin/app`, `/auth`, `/firestore` entry
// points rather than `import admin from 'firebase-admin'` — the old
// namespace-style default import doesn't reliably expose `.credential`,
// `.firestore()`, `.auth()` under Node ESM (`"type": "module"`), which is
// what throws "Cannot read properties of undefined (reading 'cert')" at
// startup. The modular imports are firebase-admin's own recommended way to
// use the SDK from ESM and avoid that interop issue entirely.
const firebaseApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(firebaseApp);
const authAdmin = getAuth(firebaseApp);

const FROM_EMAIL   = process.env.RESEND_FROM_EMAIL || 'RadiExpense <radiexpense@slirus.com>';
// ↑ radiexpense@slirus.com is the sending address for every email this
// server sends (welcome, verification, upgrade, staff, admin alerts).
// It's a Slirus Holdings domain address that forwards to/is monitored via
// slirushub@gmail.com — do not point this at a firebaseapp.com or other
// unverified sending domain, since that's what causes emails to land in Spam.
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL        || 'slirushub@gmail.com';
const PORT         = process.env.PORT               || 4000;
const NODE_ENV     = process.env.NODE_ENV           || 'development';

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
          P.O Box 331921, Juba Road, Lira, Uganda
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px;">
          You're receiving this because you upgraded your account at
          <a href="https://radiexpense.slirus.com" style="color:#FF6B2B;text-decoration:none;">radiexpense.slirus.com</a>.
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0;">
          If you believe this was sent in error, please contact us.
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
      `© ${new Date().getFullYear()} RadiExpense · P.O Box 331921, Juba Road, Lira, Uganda`,
      'You received this because you created an account at radiexpense.slirus.com.',
      
    ].join('\n');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      reply_to: 'radiexpense@slirus.com',
      subject: `Welcome to RadiExpense, ${fullName.split(' ')[0]}!`,
      html,
      text,
      headers: {
        // NOTE: deliberately NOT setting "Precedence: bulk" — that header is
        // what causes Gmail/Outlook to (a) show an auto "Unsubscribe" link
        // next to the sender and (b) nudge spam filters toward treating this
        // as bulk/newsletter mail. This is a 1:1 transactional email, so we
        // omit it entirely to keep it out of Spam and unsubscribe-link-free.
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
 * Builds the HTML body for the branded email-verification message.
 * This REPLACES Firebase Auth's own built-in verification email (sent from
 * noreply@<project>.firebaseapp.com), which is what was landing in Spam —
 * see buildWelcomeEmailHtml above for why: an unrecognized firebaseapp.com
 * sending domain has no reputation with Gmail, so it gets flagged. Sending
 * the verification link ourselves through Resend, from the same
 * radiexpense@slirus.com address the welcome/upgrade emails already use
 * successfully, keeps it out of Spam and on-brand.
 */
function buildVerifyEmailHtml({ fullName, email, verifyUrl }) {
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
      <title>Verify your email for RadiExpense</title>
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
                      <img src="https://radiexpense.slirus.com/logo1.png"
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
          Verify your email, ${firstName}
        </h1>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">
          One click and you're all set.
        </p>
      </div>

      <div style="padding:40px 32px;">
        <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;text-align:justify;">
          Hi <strong>${fullName || 'there'}</strong>,
        </p>
        <p style="font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 28px;text-align:justify;">
          Please confirm this is your email address to finish setting up your RadiExpense account.
          Once verified, you'll have full access to your dashboard and can start managing and
          growing your business finances right away.
        </p>

        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 10px;">
            Account details
          </p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Name:</strong> ${fullName || 'there'}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Email:</strong> ${email || ''}</p>
        </div>

        <div style="text-align:center;margin-top:8px;">
          <a href="${verifyUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(255,107,43,0.35);">
            Verify Email →
          </a>
        </div>

        <p style="font-size:13px;color:#9CA3AF;text-align:justify;margin-top:28px;line-height:1.6;">
          If you didn't ask to verify this address, you can safely ignore this email — your
          address will not be used again. Need help? <a href="mailto:radiexpense@slirus.com" style="color:#FF6B2B;font-weight:700;text-decoration:none;">radiexpense@slirus.com</a>
        </p>
      </div>

      <div style="background:#F9FAFB;padding:24px 32px;text-align:justify;border-top:1px solid #F3F4F6;">
        <p style="font-size:12px;color:#9CA3AF;margin:0 0 8px;">
          © ${new Date().getFullYear()} RadiExpense &mdash; A product of Slirus Holdings
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px;">
          P.O Box 331921, Juba Road, Lira, Uganda
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin:0;">
          You're receiving this because you created an account at
          <a href="https://radiexpense.slirus.com" style="color:#FF6B2B;text-decoration:none;">radiexpense.slirus.com</a>.
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
 * POST /api/send-verification-email
 * Body: { email, fullName }
 * Generates the verification link via Firebase Admin (so no Firebase Auth
 * email is ever sent) and delivers it ourselves through Resend instead —
 * this is the fix for the "post-registration email lands in Spam" issue,
 * since the built-in Firebase Auth verify email was the one Gmail flagged.
 * Call this from the sign-up flow INSTEAD OF the client-side
 * `sendEmailVerification()` Firebase Auth call.
 */
app.post('/api/send-verification-email', async (req, res) => {
  const { email, fullName } = req.body || {};
  if (!email || !emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    const verifyUrl = await authAdmin.generateEmailVerificationLink(email, {
      url: 'https://radiexpense.slirus.com/login',
    });
    const html = buildVerifyEmailHtml({ fullName, email, verifyUrl });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      reply_to: 'radiexpense@slirus.com',
      subject: 'Verify your email for RadiExpense',
      html,
      headers: { 'X-Entity-Ref-ID': `verify-${Date.now()}` },
    });
    if (error) throw new Error(error.message || 'Resend API error');

    console.log(`[Email] ✅ verification email → ${email} | messageId: ${data?.id}`);
    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error(`[Email] ❌ Failed to send verification email → ${email}:`, err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production' ? 'Failed to send verification email.' : err.message,
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
      `© ${new Date().getFullYear()} RadiExpense · P.O Box 331921, Juba Road, Lira, Uganda`,
      'You received this because you upgraded your account at radiexpense.slirus.com.',
      
    ].join('\n');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      reply_to: 'radiexpense@slirus.com',
      subject: `You're now on RadiExpense Pro, ${fullName.split(' ')[0]}! 🚀`,
      html,
      text,
      headers: {
        // See note in /api/send-welcome-email — no "Precedence: bulk" here
        // either, for the same spam / auto-unsubscribe-link reasons.
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


// ─── Shared small helpers ───────────────────────────────────────────────────
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Auto-generates a readable-but-strong one-time password for new staff logins. */
function generatePassword() {
  const words = ['Radi', 'Lira', 'Kampala', 'Slirus', 'Nile', 'Pearl', 'Savanna', 'Orbit'];
  const word = words[crypto.randomInt(0, words.length)];
  const digits = crypto.randomInt(1000, 9999);
  const symbol = ['!', '#', '$', '%', '@'][crypto.randomInt(0, 5)];
  return `${word}${digits}${symbol}`;
}

const formatExpiryEAT = (date) =>
  new Date(date).toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' EAT';

/**
 * Builds the HTML body for a new team member's login-credentials email.
 */
function buildStaffWelcomeEmailHtml({ name, email, password, role, businessName, loginUrl }) {
  const firstName = (name || '').trim().split(' ')[0] || 'there';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your RadiExpense login</title></head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#FF6B2B 0%,#FF8C42 100%);padding:40px 32px;text-align:center;">
        <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">Welcome to the team, ${firstName}!</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${businessName} added you to their RadiExpense workspace.</p>
      </div>
      <div style="padding:36px 32px;">
        <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size:14px;color:#6B7280;line-height:1.7;margin:0 0 24px;">
          You've been added as <strong style="color:#1F2937;">${role}</strong> for <strong style="color:#1F2937;">${businessName}</strong> on RadiExpense.
          Use the credentials below to sign in on the same login page as everyone else.
        </p>
        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 10px;">Your login</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Password:</strong> <span style="font-family:monospace;background:#FDECE3;padding:2px 8px;border-radius:6px;">${password}</span></p>
          <p style="font-size:12px;color:#9CA3AF;margin:10px 0 0;">For your security, please change this password after your first sign-in.</p>
        </div>
        <div style="text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:16px 40px;border-radius:50px;text-decoration:none;">Sign In →</a>
        </div>
        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin-top:24px;">If you weren't expecting this, contact ${businessName} directly.</p>
      </div>
    </div>
    </td></tr></table></body></html>`;
}

/** Builds the HTML body for a "your password was reset" email. */
function buildStaffPasswordResetEmailHtml({ name, email, password, role, businessName, loginUrl }) {
  const firstName = (name || '').trim().split(' ')[0] || 'there';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your password was reset</title></head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#FF6B2B 0%,#FF8C42 100%);padding:36px 32px;text-align:center;">
        <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0;">Your password was reset, ${firstName}</h1>
      </div>
      <div style="padding:36px 32px;">
        <p style="font-size:14px;color:#6B7280;line-height:1.7;margin:0 0 24px;">
          ${businessName} reset your RadiExpense login (${role}). Here's your new password:
        </p>
        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>New password:</strong> <span style="font-family:monospace;background:#FDECE3;padding:2px 8px;border-radius:6px;">${password}</span></p>
        </div>
        <div style="text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:16px 40px;border-radius:50px;text-decoration:none;">Sign In →</a>
        </div>
      </div>
    </div>
    </td></tr></table></body></html>`;
}

/** Builds the HTML body for the "you were removed" notice. */
function buildStaffRemovedEmailHtml({ name, businessName }) {
  const firstName = (name || '').trim().split(' ')[0] || 'there';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;padding:32px;">
      <p style="font-size:15px;color:#374151;">Hi ${firstName},</p>
      <p style="font-size:14px;color:#6B7280;line-height:1.7;">Your RadiExpense access for <strong>${businessName}</strong> has been removed and your login is no longer active. If this seems wrong, please contact ${businessName} directly.</p>
    </div>
    </td></tr></table></body></html>`;
}

/**
 * Builds the HTML body for the "Pro is now active" confirmation email, sent
 * once an admin approves payment in Payment Manager — NOT at upgrade-intent
 * time. Includes business details and the exact billing-cycle expiry so the
 * business knows precisely when they'll need to renew.
 */
function buildProActivatedEmailHtml({ fullName, email, businessName, phone, address, district, billingCycle, expiresAtLabel }) {
  const firstName = (fullName || '').trim().split(' ')[0] || 'there';
  const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
  const location = [address, district].filter(Boolean).join(', ') || '—';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your RadiExpense Pro is active</title></head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#FF6B2B 0%,#FF8C42 100%);padding:40px 32px;text-align:center;">
        <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">You're live on Pro, ${firstName}! 🚀</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Your payment has been verified and Pro is now active.</p>
      </div>
      <div style="padding:40px 32px;">
        <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">Dear <strong>${fullName}</strong>,</p>
        <p style="font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 24px;">
          Thank you for upgrading <strong style="color:#1F2937;">${businessName}</strong> to RadiExpense <strong style="color:#FF6B2B;">Pro</strong>.
          We truly appreciate your trust in growing your business with us.
        </p>
        <div style="background:#FFF7F3;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 10px;">Business details</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Business:</strong> ${businessName}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Location:</strong> ${location}</p>
          <p style="font-size:14px;color:#374151;margin:4px 0;"><strong>Contact:</strong> ${phone || '—'} · ${email}</p>
        </div>
        <div style="background:#1F2937;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin:0 0 10px;">Subscription</p>
          <p style="font-size:14px;color:#F3F4F6;margin:4px 0;"><strong>Plan:</strong> Pro — ${cycleLabel}</p>
          <p style="font-size:14px;color:#F3F4F6;margin:4px 0;"><strong>Expires:</strong> ${expiresAtLabel}</p>
          <p style="font-size:12px;color:#9CA3AF;margin:10px 0 0;">We'll remind you by email 3 days before this date.</p>
        </div>
        <div style="text-align:center;margin-top:8px;">
          <a href="https://radiexpense.slirus.com/login" style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:16px 40px;border-radius:50px;text-decoration:none;">Go to My Dashboard →</a>
        </div>
      </div>
    </div>
    </td></tr></table></body></html>`;
}

/** Builds the HTML body for the "expiring in 3 days" reminder email. */
function buildExpiryReminderEmailHtml({ fullName, businessName, billingCycle, expiresAtLabel }) {
  const firstName = (fullName || '').trim().split(' ')[0] || 'there';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#fffbeb;border-bottom:1px solid #fcd34d;padding:24px 32px;text-align:center;">
        <p style="margin:0;font-size:13px;font-weight:900;color:#92400e;">⏳ Your RadiExpense Pro plan expires in 3 days</p>
      </div>
      <div style="padding:32px;">
        <p style="font-size:15px;color:#374151;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#6B7280;line-height:1.7;">
          <strong>${businessName}</strong>'s Pro (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}) plan expires on
          <strong style="color:#1F2937;">${expiresAtLabel}</strong>. Renew before then to avoid any interruption —
          if it lapses, Pro stays usable for a further 3-day grace period, after which the account automatically
          falls back to the Free tier (your data is always kept safe either way).
        </p>
        <div style="text-align:center;margin-top:20px;">
          <a href="https://radiexpense.slirus.com/login" style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:14px 36px;border-radius:50px;text-decoration:none;">Renew Now →</a>
        </div>
      </div>
    </div>
    </td></tr></table></body></html>`;
}

/** Builds the HTML body for the "you've fallen back to Free" email. */
function buildDowngradedEmailHtml({ fullName, businessName }) {
  const firstName = (fullName || '').trim().split(' ')[0] || 'there';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
      <tr><td align="center">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;padding:32px;">
      <p style="font-size:15px;color:#374151;">Hi ${firstName},</p>
      <p style="font-size:14px;color:#6B7280;line-height:1.7;">
        <strong>${businessName}</strong>'s Pro plan expired and the 3-day grace period has now ended, so the account
        has moved back to the Free tier. All your data — expenses, products, savings, loans — is safe and untouched.
        You can upgrade back to Pro any time from your dashboard.
      </p>
      <div style="text-align:center;margin-top:20px;">
        <a href="https://radiexpense.slirus.com/login" style="display:inline-block;background:linear-gradient(135deg,#FF6B2B,#FF8C42);color:#ffffff;font-size:15px;font-weight:900;padding:14px 36px;border-radius:50px;text-decoration:none;">Renew Pro →</a>
      </div>
    </div>
    </td></tr></table></body></html>`;
}

// ─── Admin payment notification HTML builder ──────────────────────────────────
/**
 * Builds a rich HTML email for the admin notifying them of a new Pro
 * subscription payment that needs verification in the MTN / Airtel portal.
 * Includes a direct Firestore activation link placeholder and all payment
 * details so the admin can verify and act without switching contexts.
 */
function buildAdminPaymentNotificationHtml({ uid, fullName, email, businessName, provider, billingCycle, amount, ussdCode, submittedAt }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Pro Payment — Action Required</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:28px 16px;">
  <tr><td align="center">
  <table role="presentation" width="580" cellpadding="0" cellspacing="0"
         style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#FF6B2B,#FF8C42);padding:28px 32px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">
          RadiExpense · Admin Alert
        </p>
        <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">
          🔔 New Pro Payment — Action Required
        </h1>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">
          A user has completed payment and is waiting for Pro activation.
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:28px 32px;">

        <!-- Urgency banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#92400e;">
                ⏳ The user is on the "Waiting for activation" screen right now. Please verify and activate as soon as possible.
              </p>
            </td>
          </tr>
        </table>

        <!-- Payment details table -->
        <p style="margin:0 0 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">
          Payment Details
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px;">
          ${[
            ['Full Name',      fullName],
            ['Email',          email],
            ['Business',       businessName],
            ['Provider',       provider],
            ['Plan',           billingCycle === 'yearly' ? 'Pro — Annual' : 'Pro — Monthly'],
            ['Amount',         amount],
            ['USSD Code Used', ussdCode],
            ['User UID',       uid],
            ['Submitted At',   submittedAt],
          ].map(([label, value], i) => `
          <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
            <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;width:38%;border-bottom:1px solid #f1f5f9;">${label}</td>
            <td style="padding:11px 16px;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${value || '—'}</td>
          </tr>`).join('')}
        </table>

        <!-- Action steps -->
        <p style="margin:0 0 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">
          Steps to Activate
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#f8fafc;border-radius:10px;padding:0;margin-bottom:24px;border:1px solid #e2e8f0;">
          ${[
            ['1', 'Check the MTN or Airtel merchant portal / SMS statement for a payment of ' + amount + ' referencing "RadiExpense".'],
            ['2', 'Open the Firebase Firestore console → users collection → find UID: ' + uid],
            ['3', 'Set the following fields:  planStatus → "active"   and   paidAt → (current timestamp)'],
            ['4', 'The user\'s screen will update automatically within seconds — no other action needed.'],
          ].map(([n, text]) => `
          <tr>
            <td style="padding:12px 16px;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#FF6B2B;border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:900;color:#ffffff;">${n}</span>
            </td>
            <td style="padding:12px 16px 12px 0;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">${text}</td>
          </tr>`).join('')}
        </table>

        <!-- CTA button — deep link to Firestore (adjust project ID) -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://console.firebase.google.com/project/_/firestore/data/users/${uid}"
             style="display:inline-block;background:#1e293b;color:#ffffff;font-size:14px;font-weight:900;padding:14px 32px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;">
            Open User in Firestore Console →
          </a>
        </div>

        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
          If the payment is not found in the provider portal, do <strong>not</strong> activate.<br/>
          Contact the user at <a href="mailto:${email}" style="color:#FF6B2B;text-decoration:none;">${email}</a> to clarify.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:18px 32px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">
          © ${year} RadiExpense · Internal Admin Notification · Do not forward this email.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * POST /api/notify-admin-payment
 * Body: { uid, fullName, email, businessName, provider, billingCycle, amount, ussdCode }
 *
 * Called by OnboardingPro.jsx when a user taps "I've Made the Payment".
 * Sends a rich HTML notification email to the admin (slirushub@gmail.com)
 * with all payment details and a direct link to the user's Firestore doc.
 * The admin verifies in the MTN/Airtel portal and then sets
 *   planStatus: 'active' + paidAt in Firestore to unlock Pro for the user.
 */
app.post('/api/notify-admin-payment', async (req, res) => {
  const { uid, fullName, email, businessName, provider, billingCycle, amount, ussdCode } = req.body || {};

  // Validate required fields
  const missing = ['uid', 'fullName', 'email', 'businessName', 'provider', 'amount']
    .filter(k => !req.body?.[k]);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
  }

  const submittedAt = new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' EAT';

  try {
    const html = buildAdminPaymentNotificationHtml({
      uid, fullName, email, businessName, provider,
      billingCycle, amount, ussdCode, submittedAt,
    });

    // Plain-text version for spam compliance + admin email clients that prefer text
    const text = [
      '⚠️  NEW PRO PAYMENT — ACTION REQUIRED',
      '═'.repeat(48),
      '',
      `Submitted at : ${submittedAt}`,
      `Name         : ${fullName}`,
      `Email        : ${email}`,
      `Business     : ${businessName}`,
      `Provider     : ${provider}`,
      `Plan         : ${billingCycle === 'yearly' ? 'Pro Annual' : 'Pro Monthly'}`,
      `Amount       : ${amount}`,
      `USSD Code    : ${ussdCode || 'N/A'}`,
      `User UID     : ${uid}`,
      '',
      'HOW TO ACTIVATE:',
      '1. Verify payment in MTN/Airtel merchant portal or SMS statement.',
      '2. Go to Firebase Firestore → users → ' + uid,
      '3. Set:  planStatus = "active"  and  paidAt = <current timestamp>',
      '4. The user\'s screen updates automatically — no further action needed.',
      '',
      'Firestore link (replace YOUR_PROJECT_ID):',
      `https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/data/users/${uid}`,
      '',
      'If payment is NOT found in the portal, do NOT activate.',
      `Contact user at: ${email}`,
      '',
      '─'.repeat(48),
      'RadiExpense · Internal Admin Notification · Do not forward.',
    ].join('\n');

    const { data, error } = await resend.emails.send({
      from:     FROM_EMAIL,
      to:       [ADMIN_EMAIL],
      reply_to: email,              // Replying goes directly to the paying user
      subject:  `🔔 New Pro Payment — ${businessName} (${provider}) · Needs Verification`,
      html,
      text,
      headers: {
        'Precedence':            'high',
        'X-Priority':            '1',
        'X-Entity-Ref-ID':       `admin-payment-${uid}-${Date.now()}`,
        'X-Mailer':              'RadiExpense-Admin-Notifier/1.0',
      },
    });

    if (error) throw new Error(error.message || 'Resend API error');

    console.log(`[Admin] ✅ payment notification → ${ADMIN_EMAIL} | business: ${businessName} | uid: ${uid} | msgId: ${data?.id}`);
    return res.status(200).json({ success: true, id: data?.id });

  } catch (err) {
    console.error(`[Admin] ❌ Failed to send payment notification | uid: ${uid} | err: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production'
        ? 'Failed to send admin notification. Payment status saved — admin will be notified separately.'
        : err.message,
    });
  }
});

// ─── POST /api/create-staff-account ────────────────────────────────────────
// Body: { ownerUid, ownerBusinessName, name, role, email, phone, startDate, loginUrl }
// Creates a real Firebase Auth login for a new team member (auto-generated
// password), writes their roster doc to Firestore `staff` (scoped to
// ownerUid — the business owner keeps admin rights over this record: they
// can edit/delete it, the team member cannot), and emails the credentials.
app.post('/api/create-staff-account', async (req, res) => {
  const { ownerUid, ownerBusinessName, name, role, email, phone, startDate, loginUrl } = req.body || {};
  const missingFields = ['ownerUid', 'name', 'role', 'email'].filter(k => !req.body?.[k]);
  if (missingFields.length) {
    return res.status(400).json({ error: `Missing fields: ${missingFields.join(', ')}` });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const password = generatePassword();

  try {
    const userRecord = await authAdmin.createUser({
      email, password, displayName: name, emailVerified: false,
    });

    const batch = db.batch();
    const staffRef = db.collection('staff').doc();
    batch.set(staffRef, {
      uid: ownerUid,            // owner scope — used by the `where('uid', '==', ...)` query
      createdBy: ownerUid,      // creator keeps admin rights over this record
      authUid: userRecord.uid,
      name, role, email, phone: phone || '', startDate: startDate || '',
      createdAt: Date.now(),
      attendance: [],
    });
    // Lookup doc firestore.rules reads via get() to resolve "which business
    // does this signed-in uid belong to" — see myBusinessUid() there. Doc ID
    // IS the team member's own Auth uid so rules can fetch it directly
    // without needing a where() query (which rules can't run).
    batch.set(db.collection('staffLinks').doc(userRecord.uid), {
      ownerUid, staffId: staffRef.id, role, name, createdAt: Date.now(),
    });
    await batch.commit();

    const html = buildStaffWelcomeEmailHtml({ name, email, password, role, businessName: ownerBusinessName || 'your team', loginUrl: loginUrl || 'https://radiexpense.slirus.com/login' });
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to: [email], reply_to: 'radiexpense@slirus.com',
      subject: `Your RadiExpense login — ${ownerBusinessName || 'Team invite'}`,
      html,
    });
    if (error) console.error('[Staff] ⚠️ account created but email failed:', error.message);

    console.log(`[Staff] ✅ created ${email} (${role}) under owner ${ownerUid}`);
    return res.status(200).json({ success: true, authUid: userRecord.uid, staffId: staffRef.id });
  } catch (err) {
    console.error('[Staff] ❌ create-staff-account failed:', err.message);
    const message = err.code === 'auth/email-already-exists'
      ? 'This email already has an account on RadiExpense.'
      : (NODE_ENV === 'production' ? 'Could not create staff login.' : err.message);
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/reset-staff-password ────────────────────────────────────────
// Body: { authUid, email, name, businessName, role, loginUrl }
app.post('/api/reset-staff-password', async (req, res) => {
  const { authUid, email, name, businessName, role, loginUrl } = req.body || {};
  if (!authUid || !email) return res.status(400).json({ error: 'authUid and email are required.' });

  const password = generatePassword();
  try {
    await authAdmin.updateUser(authUid, { password });
    const html = buildStaffPasswordResetEmailHtml({ name, email, password, role, businessName: businessName || 'your team', loginUrl: loginUrl || 'https://radiexpense.slirus.com/login' });
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to: [email], reply_to: 'radiexpense@slirus.com',
      subject: `Your RadiExpense password was reset`,
      html,
    });
    if (error) throw new Error(error.message);
    console.log(`[Staff] ✅ password reset for ${email}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Staff] ❌ reset-staff-password failed:', err.message);
    return res.status(500).json({ error: NODE_ENV === 'production' ? 'Reset failed.' : err.message });
  }
});

// ─── POST /api/delete-staff-account ────────────────────────────────────────
// Body: { authUid, email, name, businessName }
// Revokes the team member's Firebase Auth login. The Firestore roster doc
// itself is deleted client-side right after this call succeeds.
app.post('/api/delete-staff-account', async (req, res) => {
  const { authUid, email, name, businessName } = req.body || {};
  if (!authUid) return res.status(400).json({ error: 'authUid is required.' });

  try {
    try {
      await authAdmin.deleteUser(authUid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      // Already gone from Auth — still fall through to clean up staffLinks below.
    }
    // Remove the businessUid lookup doc firestore.rules relies on — without
    // this an offboarded team member's Auth uid (if it were ever reused)
    // could theoretically resolve back into the old business's scope.
    await db.collection('staffLinks').doc(authUid).delete().catch(() => {});

    if (email && emailPattern.test(email)) {
      const html = buildStaffRemovedEmailHtml({ name, businessName: businessName || 'the business' });
      resend.emails.send({
        from: FROM_EMAIL, to: [email], subject: 'Your RadiExpense access has been removed', html,
      }).catch(e => console.warn('[Staff] removal notice email failed:', e.message));
    }
    console.log(`[Staff] ✅ deleted auth account ${authUid}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Staff] ❌ delete-staff-account failed:', err.message);
    return res.status(500).json({ error: NODE_ENV === 'production' ? 'Could not remove staff login.' : err.message });
  }
});

// ─── POST /api/send-pro-activated-email ────────────────────────────────────
// Body: { fullName, email, businessName, phone, address, district, billingCycle, expiresAt }
// Called by Payment Manager right after an admin approves payment — this is
// the "confirming and appreciating the business for upgrade to Pro" email
// from the spec, distinct from the pre-payment nudge in /api/send-upgrade-email.
app.post('/api/send-pro-activated-email', async (req, res) => {
  const { fullName, email, businessName, phone, address, district, billingCycle, expiresAt } = req.body || {};
  const missingFields = ['fullName', 'email', 'businessName', 'billingCycle', 'expiresAt'].filter(k => !req.body?.[k]);
  if (missingFields.length) {
    return res.status(400).json({ success: false, message: `Missing fields: ${missingFields.join(', ')}` });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    const expiresAtLabel = formatExpiryEAT(expiresAt);
    const html = buildProActivatedEmailHtml({ fullName, email, businessName, phone, address, district, billingCycle, expiresAtLabel });
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, to: [email], reply_to: 'radiexpense@slirus.com',
      subject: `You're now on RadiExpense Pro, ${fullName.split(' ')[0]}! 🚀`,
      html,
    });
    if (error) throw new Error(error.message || 'Resend API error');
    console.log(`[Email] ✅ pro-activated email → ${email} | expires ${expiresAtLabel}`);
    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error(`[Email] ❌ Failed to send pro-activated email → ${email}:`, err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production' ? 'Failed to send confirmation email.' : err.message,
    });
  }
});

/**
 * POST /api/send-downgraded-email
 * Manual counterpart to the automatic sweep's downgrade email — used when
 * an admin manually "cuts off" (deactivates) a Pro subscriber from the
 * Payment Manager, rather than waiting for the grace period to lapse.
 */
app.post('/api/send-downgraded-email', async (req, res) => {
  const { fullName, email, businessName } = req.body || {};
  if (!email || !emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    const html = buildDowngradedEmailHtml({ fullName, businessName });
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, to: [email], reply_to: 'radiexpense@slirus.com',
      subject: `Your RadiExpense account is now on the Free tier`,
      html,
    });
    if (error) throw new Error(error.message || 'Resend API error');
    console.log(`[Email] ✅ downgraded email → ${email}`);
    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error(`[Email] ❌ Failed to send downgraded email → ${email}:`, err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production' ? 'Failed to send notification email.' : err.message,
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

// ─── Subscription sweep — expiry reminders + grace fallback-to-free ────────
// Mirrors the lifecycle constants in src/utils/subscription.js (client-side
// display only). This job is the one place that actually ENFORCES it:
//   - 3 days before planExpiresAt  → reminder email (sent once per period)
//   - > 3 days past planExpiresAt  → downgrade to Free + notify
// Firestore fields written: expiryReminderSentFor (guards duplicate sends),
// plan/planStatus (on downgrade), downgradedAt.
const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 3;
const REMINDER_DAYS_BEFORE = 3;

async function runSubscriptionSweep() {
  const now = Date.now();
  let reminders = 0, downgrades = 0, checked = 0;
  try {
    const snap = await db.collection('users')
      .where('plan', '==', 'pro')
      .where('planStatus', '==', 'active')
      .get();

    for (const docSnap of snap.docs) {
      const u = docSnap.data();
      checked++;
      if (!u.planExpiresAt) continue;
      const expiresAt = u.planExpiresAt.toDate ? u.planExpiresAt.toDate() : new Date(u.planExpiresAt);
      const expiresAtKey = expiresAt.toISOString();
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now) / DAY_MS);
      const daysPastExpiry = Math.floor((now - expiresAt.getTime()) / DAY_MS);

      // 3-day-out reminder — guarded so it only fires once per billing period.
      if (daysUntilExpiry <= REMINDER_DAYS_BEFORE && daysUntilExpiry >= 0 && u.expiryReminderSentFor !== expiresAtKey && u.email) {
        try {
          const html = buildExpiryReminderEmailHtml({
            fullName: u.fullName, businessName: u.businessName,
            billingCycle: u.billingCycle, expiresAtLabel: formatExpiryEAT(expiresAt),
          });
          await resend.emails.send({
            from: FROM_EMAIL, to: [u.email], reply_to: 'radiexpense@slirus.com',
            subject: `⏳ Your RadiExpense Pro plan expires in ${Math.max(daysUntilExpiry, 0)} day(s)`,
            html,
          });
          await docSnap.ref.update({ expiryReminderSentFor: expiresAtKey });
          reminders++;
        } catch (e) {
          console.error(`[Sweep] ⚠️ reminder failed for ${u.email}:`, e.message);
        }
      }

      // Past grace period — fall back to Free tier.
      if (daysPastExpiry > GRACE_DAYS) {
        try {
          await docSnap.ref.update({
            plan: 'free', planStatus: 'expired', downgradedAt: FieldValue.serverTimestamp(),
          });
          if (u.email) {
            const html = buildDowngradedEmailHtml({ fullName: u.fullName, businessName: u.businessName });
            await resend.emails.send({
              from: FROM_EMAIL, to: [u.email], reply_to: 'radiexpense@slirus.com',
              subject: `Your RadiExpense account is now on the Free tier`,
              html,
            });
          }
          downgrades++;
        } catch (e) {
          console.error(`[Sweep] ⚠️ downgrade failed for uid ${docSnap.id}:`, e.message);
        }
      }
    }
    console.log(`[Sweep] checked ${checked} Pro accounts | ${reminders} reminder(s) sent | ${downgrades} downgraded`);
  } catch (err) {
    console.error('[Sweep] ❌ subscription sweep failed:', err.message);
  }
}

// Runs every 6 hours — frequent enough that the 3-day reminder and the
// grace-period fallback both land within hours of crossing their threshold,
// without hammering Firestore.
cron.schedule('0 */6 * * *', runSubscriptionSweep);
// Also run once at boot so a redeploy doesn't leave accounts waiting up to 6h.
runSubscriptionSweep();

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