"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationCode = sendVerificationCode;
const nodemailer_1 = __importDefault(require("nodemailer"));
const RESEND_API = 'https://api.resend.com/emails';
function getGmailTransport() {
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    if (!user || !pass)
        return null;
    return nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });
}
function getQQTransport() {
    const user = process.env.QQ_SMTP_USER || '';
    const pass = process.env.QQ_SMTP_PASS || '';
    if (!user || !pass)
        return null;
    return nodemailer_1.default.createTransport({
        host: 'smtp.qq.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });
}
async function sendViaTransport(transport, email, code, label) {
    try {
        await transport.sendMail({
            from: `"Echo" <${process.env.SMTP_USER || process.env.QQ_SMTP_USER}>`,
            to: email,
            subject: '验证码 - Echo',
            html: emailTemplate(code),
        });
        return true;
    }
    catch (e) {
        console.error(`[email] ${label} 发送失败:`, e?.message || e);
        return false;
    }
}
async function sendViaResend(email, code) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
        return false;
    const res = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            from: 'Echo <onboarding@resend.dev>',
            to: [email],
            subject: '验证码 - Echo',
            html: emailTemplate(code),
        }),
        signal: AbortSignal.timeout(15000),
    });
    return res.ok;
}
async function sendVerificationCode(email, code) {
    // ① Gmail SMTP（主通道）
    const gmail = getGmailTransport();
    if (gmail) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            const ok = await sendViaTransport(gmail, email, code, 'Gmail');
            if (ok)
                return { ok: true, message: '' };
            if (attempt < 2)
                await new Promise(r => setTimeout(r, 1500));
        }
    }
    // ② QQ邮箱 SMTP（兜底，国内服务器更稳定）
    const qq = getQQTransport();
    if (qq) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            const ok = await sendViaTransport(qq, email, code, 'QQ');
            if (ok)
                return { ok: true, message: '' };
            if (attempt < 2)
                await new Promise(r => setTimeout(r, 1500));
        }
    }
    // ③ Resend API（可选，阿里云不拦截 HTTPS）
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const ok = await sendViaResend(email, code);
            if (ok)
                return { ok: true, message: '' };
            console.error(`[email] Resend 第${attempt}次失败`);
        }
        catch (e) {
            console.error(`[email] Resend 第${attempt}次异常:`, e?.message || e);
        }
        if (attempt < 2)
            await new Promise(r => setTimeout(r, 1000));
    }
    return { ok: false, message: '邮件发送失败，请稍后重试' };
}
function emailTemplate(code) {
    return `
    <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:30px">
      <h2 style="color:#6366f1;margin:0 0 20px">Echo 回声</h2>
      <p style="color:#333;font-size:15px">你的验证码：</p>
      <div style="border:2px dashed #6366f1;border-radius:10px;padding:18px;text-align:center;margin:16px 0">
        <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#6366f1">${code}</span>
      </div>
      <p style="color:#86868b;font-size:13px">验证码 5 分钟内有效，请勿转发给他人。</p>
    </div>
  `;
}
//# sourceMappingURL=email.service.js.map