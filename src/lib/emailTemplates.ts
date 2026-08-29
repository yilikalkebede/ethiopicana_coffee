const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Shared plain-HTML wrapper — no React Email/MJML, just inline styles.
 * Kept deliberately simple: six transactional emails don't justify a new
 * templating dependency (same reasoning as Journal's plain-paragraph
 * rendering instead of a markdown library, Phase 7). */
function layout(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f1ea;font-family:Georgia,serif;color:#2b2420;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f1ea;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #ddd4c5;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #ddd4c5;">
                <span style="font-size:18px;letter-spacing:0.02em;">Latitude <em>Coffee Co.</em></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;font-weight:500;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #ddd4c5;font-size:12px;color:#8a8072;font-family:monospace;">
                Latitude Coffee Co. — 100% Ethiopian coffee
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:12px;padding:12px 24px;background-color:#6b5a3e;color:#ffffff;text-decoration:none;font-size:14px;">${label}</a>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${text}</p>`;
}

export function verificationEmail(firstName: string, token: string) {
  const url = `${APP_URL}/api/auth/verify-email/${token}`;
  return {
    subject: "Verify your email — Latitude Coffee Co.",
    html: layout(
      "Verify your email",
      p(`Hi ${firstName}, confirm this is your email address to finish setting up your account.`) +
        button(url, "Verify email") +
        p("If you didn't create an account, you can ignore this email."),
    ),
  };
}

export function passwordResetEmail(firstName: string, token: string) {
  const url = `${APP_URL}/reset-password/${token}`;
  return {
    subject: "Reset your password — Latitude Coffee Co.",
    html: layout(
      "Reset your password",
      p(`Hi ${firstName}, we got a request to reset your password. This link expires in 1 hour.`) +
        button(url, "Reset password") +
        p("If you didn't request this, you can safely ignore this email — your password won't change."),
    ),
  };
}

export function orderConfirmationEmail(
  firstName: string,
  orderNumber: string,
  items: { name: string; quantity: number; total: string }[],
  total: string
) {
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:14px;">${i.name} × ${i.quantity}</td><td style="padding:6px 0;font-size:14px;text-align:right;">${i.total}</td></tr>`
    )
    .join("");
  return {
    subject: `Order confirmed — ${orderNumber}`,
    html: layout(
      "Thank you for your order",
      p(`Hi ${firstName}, we've got your order <strong>${orderNumber}</strong> and we're getting it ready.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #ddd4c5;padding-top:12px;">${itemRows}<tr><td style="padding-top:10px;border-top:1px solid #ddd4c5;font-size:15px;font-weight:bold;">Total</td><td style="padding-top:10px;border-top:1px solid #ddd4c5;font-size:15px;font-weight:bold;text-align:right;">${total}</td></tr></table>` +
        button(`${APP_URL}/account/orders`, "View your order"),
    ),
  };
}

export function giftClaimEmail(recipientName: string, purchaserFirstName: string, giftMessage: string | null, claimUrl: string) {
  return {
    subject: `${purchaserFirstName} sent you a coffee gift`,
    html: layout(
      "You've got a gift",
      p(`Hi ${recipientName || "there"}, ${purchaserFirstName} sent you a coffee subscription gift.`) +
        (giftMessage ? p(`&ldquo;${giftMessage}&rdquo;`) : "") +
        button(claimUrl, "Claim your gift"),
    ),
  };
}

export function shippingNotificationEmail(firstName: string, orderNumber: string, carrier: string | null, trackingNumber: string | null) {
  return {
    subject: `Your order ${orderNumber} has shipped`,
    html: layout(
      "Your order is on its way",
      p(`Hi ${firstName}, order <strong>${orderNumber}</strong> just shipped.`) +
        (trackingNumber ? p(`${carrier ?? "Carrier"} tracking number: <strong>${trackingNumber}</strong>`) : "") +
        button(`${APP_URL}/account/orders`, "Track your order"),
    ),
  };
}

export function reviewRequestEmail(firstName: string, productNames: string[], orderId: string) {
  const productList = productNames.join(", ");
  return {
    subject: `How was your ${productNames[0]}${productNames.length > 1 ? "…" : ""}?`,
    html: layout(
      "We'd love your feedback",
      p(`Hi ${firstName}, hope you're enjoying your ${productList}. Mind leaving a quick review?`) +
        button(`${APP_URL}/account/orders/${orderId}`, "Leave a review"),
    ),
  };
}
