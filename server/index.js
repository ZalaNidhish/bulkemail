require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use("/api/", limiter);

// ── Email template (Lyrcon Cold Email) ──────────────────────────
function buildEmail(name, company, senderName) {
  return {
    subject: `Scaling ${company} with High-Performance Full Stack Solutions`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Scaling ${company} with High-Performance Full Stack Solutions</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#746bc5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#746bc5; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; padding:30px; border-radius:8px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <a href="https://lyrcon.com" target="_blank">
                <img src="https://lyrcon.com/_next/static/media/logo-w.b4ed03b3.png" alt="Lyrcon Logo" width="160" style="display:block;">
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="color:#333333; font-size:16px; line-height:1.6;">
              <p>Hi ${name},</p>

              <p>
                I came across <strong>${company}</strong> while researching growing tech companies and noticed a few areas
                where site performance and technical structure could likely be improved as traffic scales.
              </p>

              <p>
                I work with teams helping optimize page speed and backend performance using React and Node-based stacks.
              </p>

              <p>
                Not reaching out to sell anything right away — just wanted to ask if you'd be open to me sharing a
                couple of quick observations I noted while browsing your site.
                If it's useful, great. If not, totally fine.
              </p>

              <ul style="padding-left:20px;">
                <li>Improve website speed and technical SEO performance</li>
                <li>Build scalable backend architecture for future growth</li>
                <li>Optimize frontend UX for higher conversion rates</li>
                <li>Implement automation to reduce manual processes</li>
              </ul>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding:25px 0;">
              <a href="https://calendly.com/jay-lyrcon/new-meeting" target="_blank"
                style="background-color:#746bc5; color:#ffffff; padding:14px 28px;
                       text-decoration:none; font-size:16px; border-radius:6px; display:inline-block;">
                Schedule a Free Technical Consultation
              </a>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:10px 0 25px 0;">
              <a href="https://drive.google.com/file/d/1g78s5gnwgdU24bY3XpObydrOjkxF1B6V/view?usp=drive_link"
                target="_blank"
                style="background-color:#f3f3f3; color:#333333; padding:12px 24px;
                       text-decoration:none; font-size:15px; border-radius:6px;
                       display:inline-block; border:3px solid #746bc5;">
                View Our Portfolio
              </a>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="color:#333333; font-size:16px; line-height:1.6;">
              <p>
                Best regards,<br>
                <strong>${senderName}</strong><br>
                Full Stack Developer<br>
                Lyrcon Solution<br>
                <a href="https://lyrcon.com" style="color:#000000; text-decoration:none;">https://lyrcon.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Hi ${name},\n\nI came across ${company} while researching growing tech companies and noticed a few areas where site performance and technical structure could likely be improved as traffic scales.\n\nI work with teams helping optimize page speed and backend performance using React and Node-based stacks.\n\nNot reaching out to sell anything right away — just wanted to ask if you'd be open to me sharing a couple of quick observations I noted while browsing your site. If it's useful, great. If not, totally fine.\n\nWhat I can help with:\n- Improve website speed and technical SEO performance\n- Build scalable backend architecture for future growth\n- Optimize frontend UX for higher conversion rates\n- Implement automation to reduce manual processes\n\nSchedule a Free Technical Consultation: https://calendly.com/jay-lyrcon/new-meeting\nView Our Portfolio: https://drive.google.com/file/d/1g78s5gnwgdU24bY3XpObydrOjkxF1B6V/view?usp=drive_link\n\nBest regards,\n${senderName}\nFull Stack Developer\nLyrcon Solution\nhttps://lyrcon.com`,
  };
}

function makeGmailTransporter(user, pass) {
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

// ── Test connection ──────────────────────────────────────────────
app.post("/api/test-connection", async (req, res) => {
  const { gmailUser, gmailPass } = req.body;
  if (!gmailUser || !gmailPass)
    return res.status(400).json({ success: false, message: "Gmail credentials required." });
  try {
    await makeGmailTransporter(gmailUser, gmailPass).verify();
    res.json({ success: true, message: "Gmail connected successfully!" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Preview ──────────────────────────────────────────────────────
app.post("/api/preview", (req, res) => {
  const { name = "Elon Musk", company = "Tesla", fromName = "Nidhish" } = req.body;
  res.json({ html: buildEmail(name, company, fromName).html });
});

// ── Send bulk (SSE streaming) ────────────────────────────────────
app.post("/api/send-bulk", async (req, res) => {
  const { recipients, delayMs = 2000, gmailUser, gmailPass, fromName } = req.body;

  if (!gmailUser || !gmailPass)
    return res.status(400).json({ error: "Gmail credentials required." });
  if (!recipients?.length)
    return res.status(400).json({ error: "No recipients provided." });

  // Server-Sent Events for live per-email updates
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const push = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let transporter;
  try {
    transporter = makeGmailTransporter(gmailUser, gmailPass);
    await transporter.verify();
  } catch (err) {
    push({ type: "error", message: "Gmail auth failed: " + err.message });
    return res.end();
  }

  const valid = recipients.filter((r) => r.email && r.name && r.company);
  push({ type: "start", total: valid.length });

  const results = [];
  const senderName = fromName || "Jay Vaghela";

  for (let i = 0; i < valid.length; i++) {
    const { email, name, company } = valid[i];
    const { subject, html, text } = buildEmail(name, company, senderName);

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${gmailUser}>`,
        to: email,
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<mailto:${gmailUser}?subject=Unsubscribe>`,
          Precedence: "bulk",
          "X-Priority": "3",
        },
      });
      const r = { email, name, company, status: "sent" };
      results.push(r);
      push({ type: "progress", index: i + 1, total: valid.length, result: r });
    } catch (err) {
      const r = { email, name, company, status: "failed", reason: err.message };
      results.push(r);
      push({ type: "progress", index: i + 1, total: valid.length, result: r });
    }

    if (i < valid.length - 1)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const sent = results.filter((r) => r.status === "sent").length;
  push({ type: "done", sent, failed: results.length - sent, results });
  res.end();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
