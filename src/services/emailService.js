const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: String(EMAIL_SECURE) === "true",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text }) => {
  try {
    const mailer = getTransporter();

    if (!mailer) {
      return { skipped: true, reason: "Email service is not configured" };
    }

    await mailer.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text
    });

    return { skipped: false };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { skipped: true, reason: error.message };
  }
};

const sendComplaintCreatedEmail = async ({ to, complaint }) => {
  return sendEmail({
    to,
    subject: `Complaint Created (#${complaint.id})`,
    text: `Your complaint has been created.\n\nTitle: ${complaint.title}\nCategory: ${complaint.category}\nPriority: ${complaint.priority}\nStatus: ${complaint.status}`
  });
};

const sendStatusUpdatedEmail = async ({ to, complaint }) => {
  return sendEmail({
    to,
    subject: `Complaint Status Updated (#${complaint.id})`,
    text: `Your complaint status is now: ${complaint.status}.\n\nTitle: ${complaint.title}`
  });
};

module.exports = {
  sendComplaintCreatedEmail,
  sendStatusUpdatedEmail
};
