import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Universal helper to send transaction emails using Resend.
 * Falls back to console logging in development if API key is not configured.
 */
export async function sendEmail({ to, subject, html }: EmailPayload) {
  if (!resend) {
    console.log(`[Email Mock Notification]
To: ${to}
Subject: ${subject}
Content: ${html.replace(/<[^>]*>/g, ' ').substring(0, 200)}...
`);
    return { success: true, mock: true };
  }

  try {
    const response = await resend.emails.send({
      from: 'Drevlo <onboarding@resend.dev>', // Resend sandbox default domain
      to,
      subject,
      html,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send transaction email via Resend:', error);
    throw error;
  }
}

/**
 * Sends a team invitation link to a new member.
 */
export async function sendTeamInvitationEmail(toEmail: string, teamName: string, inviteLink: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg;">
      <h2 style="color: #0f172a;">Join the team on Drevlo</h2>
      <p style="color: #334155; font-size: 16px; line-height: 24px;">
        You have been invited to join the <strong>${teamName}</strong> workspace on Drevlo to track code contributions and collaborate on daily standups.
      </p>
      <div style="margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #06b6d4; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: `You've been invited to ${teamName} on Drevlo`, html });
}

/**
 * Sends a billing confirmation email.
 */
export async function sendBillingConfirmationEmail(toEmail: string, planName: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a;">Thank you for subscribing!</h2>
      <p style="color: #334155; font-size: 16px; line-height: 24px;">
        Your workspace has been successfully upgraded to the Drevlo <strong>${planName}</strong> plan.
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 20px;">
        You now have access to unlimited repositories, members, and AI retrospective regeneration controls.
      </p>
      <p style="color: #64748b; font-size: 12px; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px;">
        Drevlo SaaS — Your team. Your velocity.
      </p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: 'Your Drevlo subscription is active!', html });
}

/**
 * Sends a subscription cancellation notification email.
 */
export async function sendBillingCancellationEmail(toEmail: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a;">Subscription Cancelled</h2>
      <p style="color: #334155; font-size: 16px; line-height: 24px;">
        This email confirms that your Drevlo Pro subscription has been cancelled. Your team plan will revert to the Free tier at the end of the billing period.
      </p>
      <p style="color: #64748b; font-size: 12px; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px;">
        Thank you for choosing Drevlo. If you wish to re-subscribe, you can do so at any time from your settings page.
      </p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: 'Drevlo Subscription Cancellation Confirmed', html });
}
