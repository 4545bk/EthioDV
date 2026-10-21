import { Resend } from 'resend';
import { ENV } from '../config/env.js';

let resendClient = null;
if (ENV.RESEND_API_KEY) {
  resendClient = new Resend(ENV.RESEND_API_KEY);
}

/**
 * Send 6-digit Email OTP for passwordless login
 */
export async function sendOtpEmail(toEmail, otpCode) {
  const subject = `Your EthioDV-FillTrack Login Code: ${otpCode}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">EthioDV-FillTrack</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Ethiopian Diversity Visa Registration Assistance</p>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;">Your one-time verification code is:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; padding: 10px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 6px; display: inline-block;">
          ${otpCode}
        </div>
        <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 12px;">This code will expire in 10 minutes.</p>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
        If you did not request this login code, you can safely ignore this email.
      </p>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
        <strong>Important Disclaimer:</strong> EthioDV-FillTrack is an independent non-governmental assistance service and is not affiliated with the U.S. Department of State or any government agency.
      </div>
    </div>
  `;

  if (!resendClient) {
    console.log(`\n========================================`);
    console.log(`📧 [MOCK EMAIL OTP SENT]`);
    console.log(`To: ${toEmail}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`========================================\n`);
    return { success: true, mocked: true };
  }

  try {
    const res = await resendClient.emails.send({
      from: ENV.FROM_EMAIL,
      to: toEmail,
      subject,
      html,
    });

    if (res.error) {
      console.warn('⚠️ [Resend Sandbox Restriction]:', res.error.message);
      console.log(`\n========================================`);
      console.log(`📧 [RESEND SANDBOX FALLBACK CODE]`);
      console.log(`To: ${toEmail}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log(`========================================\n`);
      return { success: true, sandboxRestricted: true, error: res.error.message };
    }

    return { success: true, data: res.data };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send official confirmation certificate to applicant
 */
export async function sendConfirmationEmail(toEmail, { applicantName, confirmationNumber, yearOfBirth, entryRef, screenshotUrl }) {
  const subject = `Official DV-2027 Confirmation: ${confirmationNumber}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: #ecfdf5; color: #059669; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600;">Entry Officially Filed</span>
        <h2 style="color: #0f172a; margin: 12px 0 0 0; font-size: 24px;">DV-2027 Confirmation Details</h2>
        <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Applicant: <strong>${applicantName}</strong></p>
      </div>
      <div style="background: #0f172a; color: #ffffff; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Official Confirmation Number</p>
        <div style="font-size: 26px; font-weight: 700; letter-spacing: 3px; color: #38bdf8; font-family: monospace;">
          ${confirmationNumber}
        </div>
        <p style="margin: 12px 0 0 0; color: #cbd5e1; font-size: 13px;">Year of Birth: <strong>${yearOfBirth}</strong> | Entry Ref: <strong>${entryRef}</strong></p>
      </div>
      ${
        screenshotUrl
          ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #334155; margin: 0 0 10px 0; font-weight: 600;">
          📸 Official State Department Submission Screenshot:
        </p>
        <a href="${screenshotUrl}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 700; font-size: 13px;">
          📥 View & Download Official Screenshot
        </a>
      </div>
      `
          : ''
      }
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #1e40af; line-height: 1.5;">
        <strong>Important:</strong> Keep this confirmation number safe! The official results will be announced in May on <strong>dvprogram.state.gov</strong>. You are the sole owner of this number.
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
        <strong>Disclaimer:</strong> EthioDV-FillTrack is an independent application assistance service not affiliated with the U.S. Government.
      </div>
    </div>
  `;

  if (!resendClient) {
    console.log(`\n========================================`);
    console.log(`📧 [MOCK CONFIRMATION EMAIL]`);
    console.log(`To: ${toEmail}`);
    console.log(`Confirmation Number: ${confirmationNumber}`);
    console.log(`========================================\n`);
    return { success: true, mocked: true };
  }

  try {
    const res = await resendClient.emails.send({
      from: ENV.FROM_EMAIL,
      to: toEmail,
      subject,
      html,
    });
    return { success: true, data: res };
  } catch (err) {
    console.error('Confirmation email send error:', err.message);
    return { success: false, error: err.message };
  }
}
