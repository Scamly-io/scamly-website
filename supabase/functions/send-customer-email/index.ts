import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as Sentry from "https://deno.land/x/sentry@8.55.0/index.mjs";

const FUNCTION_NAME = "send-customer-email";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Sentry
const sentryDsn = Deno.env.get("SENTRY_DSN");
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
      }
      return event;
    },
  });
}

// Email types
type EmailType = 
  | "welcome" 
  | "trial_confirmation" 
  | "payment_failed" 
  | "manual_cancellation" 
  | "forced_cancellation";

interface EmailRequest {
  type: EmailType;
  userId: string;
  plan?: "monthly" | "yearly";
  trialEndDate?: string;
  firstBillingDate?: string;
  accessExpiresAt?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${FUNCTION_NAME.toUpperCase()}] ${step}${detailsStr}`);
};

const captureError = (error: Error, context: Record<string, unknown>) => {
  if (!sentryDsn) return;
  Sentry.withScope((scope) => {
    scope.setTag("function", FUNCTION_NAME);
    scope.setTag("source", "edge-function");
    scope.setContext("details", context);
    Sentry.captureException(error);
  });
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ===== EMAIL TEMPLATES =====

const getWelcomeEmailTemplate = (firstName: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <img style="width: 128px" src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly Logo"/>
        <p style="color: #71717a; font-size: 14px; margin-top: 4px;">Your AI-Powered Scam Protection</p>
      </div>
      
      <!-- Welcome Message -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
          Welcome, ${firstName}! 🎉
        </h2>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
          Thank you for joining Scamly. You've taken an important step towards protecting yourself from online scams and fraud.
        </p>
      </div>
      
      <!-- Features Section -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">What you can do with Scamly:</h3>
        <ul style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li><strong>Scan suspicious messages</strong> - Instantly analyze texts, emails, and links for potential scams</li>
          <li><strong>Chat with our AI</strong> - Get personalized advice on staying safe online</li>
          <li><strong>Learn from our library</strong> - Access articles and tips about the latest scam tactics</li>
          <li><strong>Stay protected 24/7</strong> - Our AI is always ready to help you spot red flags</li>
        </ul>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
          Get Started →
        </a>
      </div>
      
      <!-- Support Section -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
          We value your feedback on Scamly. To submit feedback, email feedback@scamly.io
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Scamly. All rights reserved.
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
        You're receiving this email because you signed up for Scamly.
      </p>
    </div>
  </div>
</body>
</html>
`;

const getTrialConfirmationTemplate = (
  firstName: string,
  planDetails: { name: string; price: string; billingPeriod: string },
  formattedTrialStart: string,
  formattedTrialEnd: string,
  formattedFirstBilling: string,
  plan: string
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <img style="width: 128px" src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly Logo"/>
      </div>
      
      <!-- Title -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
          Your Free Trial Has Started! 🎉
        </h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
          Hi ${firstName}, thank you for starting your free trial of Scamly Premium.
        </p>
      </div>

      <!-- Important Notice Box -->
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #92400e; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          ⚠️ Important Subscription Information
        </h3>
        <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
          By starting this free trial, you have consented to an <strong>ongoing subscription with recurring payments</strong>. 
          Your subscription will automatically continue after the trial period ends unless you cancel before the first billing date.
        </p>
      </div>

      <!-- Trial Details Box -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #18181b; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
          📋 Your Trial & Subscription Details
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Service</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              Scamly Premium - AI-powered scam protection including unlimited scans, AI chat assistance, and full article library access
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Selected Plan</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${planDetails.name}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Trial Period</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              14 days
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Trial Price</strong>
            </td>
            <td style="padding: 10px 0; color: #22c55e; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
              FREE ($0.00)
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Trial Start Date</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${formattedTrialStart}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Trial End Date</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${formattedTrialEnd}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>First Billing Date</strong>
            </td>
            <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${formattedFirstBilling}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Subscription Price After Trial</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${planDetails.price} per ${planDetails.billingPeriod}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px;">
              <strong>Billing Frequency</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right;">
              ${plan === "yearly" ? "Annually (every 12 months)" : "Monthly"}
            </td>
          </tr>
        </table>
      </div>

      <!-- Cancellation Policy -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
          ❌ How to Cancel Your Subscription
        </h3>
        <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          You can cancel your subscription at any time before your trial ends to avoid being charged. Here's how:
        </p>
        <ol style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Log in to your Scamly account at <a href="https://scamly.io" style="color: #6366f1;">scamly.io</a></li>
          <li>Navigate to the <a href="https://scamly.io/portal" style="color: #6366f1;">Portal page</a></li>
          <li>Click on <strong>"Manage Subscription"</strong></li>
          <li>Select <strong>"Cancel Subscription"</strong></li>
          <li>Confirm your cancellation</li>
        </ol>
        <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
          Your cancellation will take effect immediately after your current period ends, and you will not be charged.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
          Start Using Scamly Premium →
        </a>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
          Questions about your trial or subscription? Email us at <a href="mailto:support@scamly.io" style="color: #6366f1;">support@scamly.io</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Scamly. All rights reserved.
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
        You're receiving this email because you started a free trial on Scamly.
      </p>
    </div>
  </div>
</body>
</html>
`;

const getPaymentFailedTemplate = (
  firstName: string,
  planDetails: { name: string; price: string }
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <img style="width: 128px" src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly Logo"/>
      </div>
      
      <!-- Title -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
          We've Detected a Payment Issue 💳
        </h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0;">
          Hi ${firstName}, we wanted to let you know that your recent payment for Scamly Premium was unsuccessful.
        </p>
      </div>

      <!-- Alert Box -->
      <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #991b1b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          ⚠️ What This Means
        </h3>
        <p style="color: #b91c1c; font-size: 14px; line-height: 1.6; margin: 0;">
          Your subscription is currently in a <strong>past due</strong> state. You still have full access to all premium features for now, but we'll need you to update your payment details to continue your subscription.
        </p>
      </div>

      <!-- Subscription Details -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
          📋 Your Subscription
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Plan</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${planDetails.name}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px; border-bottom: 1px solid #e4e4e7;">
              <strong>Amount Due</strong>
            </td>
            <td style="padding: 10px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">
              ${planDetails.price}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #52525b; font-size: 14px;">
              <strong>Status</strong>
            </td>
            <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 600; text-align: right;">
              Past Due
            </td>
          </tr>
        </table>
      </div>

      <!-- Common Reasons -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          Common reasons for payment failure:
        </h3>
        <ul style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Your card has expired or been replaced</li>
          <li>Insufficient funds in your account</li>
          <li>Your bank declined the transaction</li>
          <li>Your billing address has changed</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
          Update Payment Details →
        </a>
      </div>

      <!-- Instructions -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          How to Update Your Payment:
        </h3>
        <ol style="color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Go to <a href="https://scamly.io/portal" style="color: #6366f1;">scamly.io/portal</a></li>
          <li>Click <strong>"Manage Subscription"</strong></li>
          <li>Update your payment method</li>
          <li>We'll automatically retry the payment</li>
        </ol>
      </div>

      <!-- Support Section -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
          Need help? Reply to this email or contact us at <a href="mailto:support@scamly.io" style="color: #6366f1;">support@scamly.io</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Scamly. All rights reserved.
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
        You're receiving this email because there was an issue with your Scamly subscription payment.
      </p>
    </div>
  </div>
</body>
</html>
`;

const getManualCancellationTemplate = (
  firstName: string,
  accessExpiryFormatted: string
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <img style="width: 128px" src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly Logo"/>
      </div>
      
      <!-- Title -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
          We're Sorry to See You Go
        </h1>
      </div>

      <!-- Main Content -->
      <div style="margin-bottom: 24px;">
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${firstName},
        </p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Thank you for trying Scamly Premium. We truly appreciate you giving us a chance to help protect you from scams.
        </p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Your subscription has been successfully cancelled, and <strong>you will not be charged again</strong>.
        </p>
      </div>

      <!-- Access Info Box -->
      <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #166534; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          ✓ Your Access Continues
        </h3>
        <p style="color: #15803d; font-size: 14px; line-height: 1.6; margin: 0;">
          You'll retain full access to all premium features until <strong>${accessExpiryFormatted}</strong>. After that, your account will be downgraded to our free plan.
        </p>
      </div>

      <!-- Feedback Request -->
      <div style="margin-bottom: 24px;">
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          If you have a moment, we'd love to hear about your experience. Was there something we could have done better? Your feedback helps us improve for everyone.
        </p>
        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
          Simply email feedback@scamly.io with any thoughts — no pressure at all.
        </p>
      </div>

      <!-- Resubscribe Info -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Changed your mind?</strong> You can resubscribe anytime from your account portal at <a href="https://scamly.io/portal" style="color: #6366f1;">scamly.io/portal</a>. We'll be here whenever you need us.
        </p>
      </div>

      <!-- Sign-off -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">
          Thank you again for being part of the Scamly community. Stay safe out there.
        </p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 4px 0;">
          Warm regards,
        </p>
        <p style="color: #18181b; font-size: 16px; line-height: 1.6; margin: 0; font-weight: 600;">
          Joshua<br>
          <span style="font-weight: 400; color: #71717a;">Founder, Scamly</span>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Scamly. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

const getForcedCancellationTemplate = (firstName: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <img style="width: 128px" src="https://scamly-email-assets.s3.ap-southeast-2.amazonaws.com/navbar-logo-light.png" alt="Scamly Logo"/>
      </div>
      
      <!-- Title -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
          Your Subscription Has Been Cancelled
        </h1>
      </div>

      <!-- Main Content -->
      <div style="margin-bottom: 24px;">
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${firstName},
        </p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Your Scamly Premium subscription has been cancelled and your account has been downgraded to our free plan.
        </p>
      </div>

      <!-- Info Box -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          What This Means
        </h3>
        <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0;">
          You still have access to Scamly's free features, but premium features are no longer available on your account.
        </p>
      </div>

      <!-- Resubscribe Section -->
      <div style="margin-bottom: 32px;">
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          If you'd like to regain access to premium features, you can resubscribe anytime from your account portal.
        </p>
        
        <div style="text-align: center;">
          <a href="https://scamly.io/portal" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
            Visit Account Portal →
          </a>
        </div>
      </div>

      <!-- Sign-off -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
          If you have any questions, please contact us at <a href="mailto:support@scamly.io" style="color: #6366f1;">support@scamly.io</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Scamly. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

// ===== MAIN HANDLER =====

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const requestData: Partial<EmailRequest> = await req.json();
    const { type, userId, plan, trialEndDate, firstBillingDate, accessExpiresAt } = requestData;

    if (!type || !userId) {
      logStep("Missing required fields", { type, userId });
      return new Response(JSON.stringify({ error: "type and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Processing email", { type, userId });

    // ===== WELCOME EMAIL SPECIAL HANDLING =====
    // Uses atomic claim mechanism to prevent duplicate sends
    if (type === "welcome") {
      const { data: claimedRows, error: claimError } = await supabaseClient
        .from("profiles")
        .update({ welcome_email_sent: true })
        .eq("id", userId)
        .eq("welcome_email_sent", false)
        .select("first_name");

      if (claimError) {
        logStep("Error claiming welcome email send", { error: claimError });
        return new Response(JSON.stringify({ error: "Failed to claim welcome email send" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!claimedRows || claimedRows.length === 0) {
        logStep("Welcome email already sent (or currently processing) for this user");
        return new Response(JSON.stringify({ message: "Welcome email already sent" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const releaseClaim = async () => {
        await supabaseClient
          .from("profiles")
          .update({ welcome_email_sent: false })
          .eq("id", userId);
      };

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.admin.getUserById(userId);

      if (userError || !user?.email) {
        logStep("Error fetching user", { error: userError });
        await releaseClaim();
        return new Response(JSON.stringify({ error: "Failed to fetch user" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const firstName = claimedRows[0]?.first_name || "there";
      const userEmail = user.email;

      logStep("Sending welcome email", { userEmail });

      const emailResponse = await resend.emails.send({
        from: "Scamly <noreply@scamly.io>",
        to: [userEmail],
        subject: "Welcome to Scamly!",
        html: getWelcomeEmailTemplate(firstName),
      });

      if (emailResponse.error) {
        logStep("Error sending email", { error: emailResponse.error });
        await releaseClaim();
        return new Response(JSON.stringify({ error: emailResponse.error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      logStep("Welcome email sent successfully", { emailId: emailResponse.data?.id });
      return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ===== ALL OTHER EMAIL TYPES =====
    // Get user profile and email
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name, subscription_plan")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError });
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      logStep("Error fetching user", { error: userError });
      return new Response(JSON.stringify({ error: "Failed to fetch user email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const firstName = profile?.first_name || "there";
    const userEmail = user.email;

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "trial_confirmation": {
        if (!plan || !trialEndDate || !firstBillingDate) {
          logStep("Missing required fields for trial confirmation", { plan, trialEndDate, firstBillingDate });
          return new Response(JSON.stringify({ error: "Missing required fields for trial confirmation" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const planDetails = plan === "yearly"
          ? { name: "Premium Yearly", price: "$99.00 AUD", billingPeriod: "year" }
          : { name: "Premium Monthly", price: "$10.00 AUD", billingPeriod: "month" };

        const formattedTrialStart = formatDate(new Date().toISOString());
        const formattedTrialEnd = formatDate(trialEndDate);
        const formattedFirstBilling = formatDate(firstBillingDate);

        subject = "Your Scamly Free Trial Has Started";
        htmlContent = getTrialConfirmationTemplate(
          firstName,
          planDetails,
          formattedTrialStart,
          formattedTrialEnd,
          formattedFirstBilling,
          plan
        );
        break;
      }

      case "payment_failed": {
        const isYearly = profile?.subscription_plan === "premium-yearly";
        const planDetails = isYearly
          ? { name: "Premium Yearly", price: "$99.00 AUD" }
          : { name: "Premium Monthly", price: "$10.00 AUD" };

        subject = "Action Required: Payment Issue with Your Scamly Subscription";
        htmlContent = getPaymentFailedTemplate(firstName, planDetails);
        break;
      }

      case "manual_cancellation": {
        let accessExpiryFormatted = "the end of your current billing period";
        if (accessExpiresAt) {
          accessExpiryFormatted = formatDate(accessExpiresAt);
        }

        subject = "Your Scamly Subscription Has Been Cancelled";
        htmlContent = getManualCancellationTemplate(firstName, accessExpiryFormatted);
        break;
      }

      case "forced_cancellation": {
        subject = "Your Scamly Subscription Has Been Cancelled";
        htmlContent = getForcedCancellationTemplate(firstName);
        break;
      }

      default:
        logStep("Unknown email type", { type });
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    logStep(`Sending ${type} email`, { userEmail });

    const emailResponse = await resend.emails.send({
      from: "Scamly <noreply@scamly.io>",
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      logStep("Error sending email", { error: emailResponse.error });
      return new Response(JSON.stringify({ error: emailResponse.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep(`${type} email sent successfully`, { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error in send-customer-email function", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
