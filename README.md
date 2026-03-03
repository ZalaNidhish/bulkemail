# 📧 Bulk Email Sender (MERN)

A full-stack bulk email tool with personalised name/company substitution and anti-spam best practices.

---

## 🚀 Quick Start

### 1. Server Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your SMTP credentials
node index.js
```

### 2. Client Setup

```bash
cd client
npm install
npm start
```

Open **http://localhost:3000** in your browser.

---

## 🔧 SMTP Configuration

You can configure SMTP either in `server/.env` **or directly in the UI**.

| Provider | Host | Port |
|---|---|---|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp-mail.outlook.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |

> **Gmail users:** You must create an **App Password**:
> Google Account → Security → 2-Step Verification → App Passwords

---

## 📋 Features

- ✅ Bulk email with personalised `{{name}}` and `{{company}}`  
- ✅ CSV import (`email, name, company` columns)  
- ✅ Add/edit/delete rows in the UI  
- ✅ Email preview before sending  
- ✅ Configurable delay between sends  
- ✅ Plain-text fallback (anti-spam)  
- ✅ Unsubscribe header (anti-spam)  
- ✅ Real-time results table  
- ✅ Test SMTP connection button  

---

## 📁 Customise Email Template

Edit the `buildEmail(name, company)` function in `server/index.js` to change:
- Subject line  
- Email body HTML  
- CTA button link  
- Sender signature  

---

## 🛡️ Anti-Spam Checklist

- [ ] Set up **SPF**, **DKIM**, **DMARC** DNS records for your domain  
- [ ] Use a custom domain email (not free Gmail for bulk)  
- [ ] Keep delay **≥ 2000ms** between sends  
- [ ] Warm up new accounts gradually  
- [ ] For 100+ emails/day, use SendGrid / Mailgun / SES  

---

## 📦 Tech Stack

- **Backend:** Node.js, Express, Nodemailer  
- **Frontend:** React, Axios, PapaParse (CSV)  
