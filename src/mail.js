const nodemailer = require('nodemailer');
const tr = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, secure: +process.env.SMTP_PORT === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined }) : null;
// Fire-and-forget: a mail failure must never break an API call. Without SMTP, mail is printed to the console.
module.exports = async (to, subject, text) => {
  if (!tr) return console.log(`[MAIL] to=${to} | ${subject}\n${text}\n`);
  try { await tr.sendMail({ from: process.env.MAIL_FROM, to, subject, text }); } catch (e) { console.error('mail failed:', e.message); }
};
