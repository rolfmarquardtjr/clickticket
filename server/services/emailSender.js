import nodemailer from 'nodemailer';

function formatFromAddress({ fromName, fromEmail }) {
  if (!fromEmail) return undefined;
  const cleanName = fromName ? fromName.replace(/"/g, '') : '';
  return cleanName ? `"${cleanName}" <${fromEmail}>` : fromEmail;
}

export async function sendEmailReply({
  mailbox,
  to,
  subject,
  text,
  html,
  inReplyTo,
  references,
  replyTo,
  fromName,
  fromEmail
}) {
  const host = mailbox.smtp_host;
  const port = mailbox.smtp_port || 465;
  const secure = mailbox.smtp_secure !== undefined ? !!mailbox.smtp_secure : port === 465;
  const user = mailbox.smtp_username || mailbox.username;
  const pass = mailbox.smtp_password || mailbox.password;

  if (!host) {
    throw new Error('SMTP não configurado para esta caixa');
  }
  if (!user || !pass) {
    throw new Error('Credenciais SMTP ausentes');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const headers = {};
  if (inReplyTo) headers['In-Reply-To'] = inReplyTo;
  if (references) headers['References'] = references;

  const info = await transporter.sendMail({
    from: formatFromAddress({
      fromName: fromName || mailbox.smtp_from_name || mailbox.name,
      fromEmail: fromEmail || mailbox.smtp_from_email || user
    }),
    to,
    subject,
    text,
    html,
    replyTo: replyTo || undefined,
    headers
  });

  return info;
}
