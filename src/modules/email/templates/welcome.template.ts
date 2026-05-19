export interface WelcomePayload {
  fullName: string;
  frontendUrl: string;
}

export function renderWelcome(payload: WelcomePayload): { subject: string; html: string } {
  return {
    subject: 'Welcome to SML Stock Market',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:32px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:8px;padding:40px;max-width:560px">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:24px;color:#111">Welcome to SML!</h1>
          <p style="color:#555;margin:0 0 24px">Hi ${payload.fullName},</p>
          <p style="color:#555;margin:0 0 24px">
            Your email has been verified. You're all set to explore the SML Stock Market platform —
            browse ideas, connect with founders, and start investing.
          </p>
          <a href="${payload.frontendUrl}"
             style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;
                    padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
            Go to SML
          </a>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
          <p style="color:#bbb;font-size:12px;margin:0">
            SML Stock Market · noreply@smlstockmarket.com
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
