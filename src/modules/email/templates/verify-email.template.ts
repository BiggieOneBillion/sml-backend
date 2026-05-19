export interface VerifyEmailPayload {
  fullName: string;
  token: string;
  frontendUrl: string;
}

export function renderVerifyEmail(payload: VerifyEmailPayload): { subject: string; html: string } {
  const verifyUrl = `${payload.frontendUrl}/verify-email?token=${payload.token}`;

  return {
    subject: 'Verify your SML account',
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
          <h1 style="margin:0 0 8px;font-size:24px;color:#111">Verify your email</h1>
          <p style="color:#555;margin:0 0 24px">Hi ${payload.fullName},</p>
          <p style="color:#555;margin:0 0 24px">
            Thanks for signing up for SML. Click the button below to verify your email address.
            This link expires in 24 hours.
          </p>
          <a href="${verifyUrl}"
             style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;
                    padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
            Verify Email
          </a>
          <p style="color:#999;font-size:13px;margin:24px 0 0">
            Or copy this link into your browser:<br/>
            <a href="${verifyUrl}" style="color:#0f172a;word-break:break-all">${verifyUrl}</a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
          <p style="color:#bbb;font-size:12px;margin:0">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
