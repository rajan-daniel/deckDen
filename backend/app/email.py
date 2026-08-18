"""Sends transactional email via Resend. If RESEND_API_KEY isn't set (e.g.
in local dev), the email is logged to the console instead of sent, so the
password reset flow can still be exercised end-to-end without needing a
real API key or a verified sending domain."""

import os

import resend

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "DeckDen <onboarding@resend.dev>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def send_password_reset_email(to_email: str, token: str) -> None:
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY not set — password reset link for {to_email}: {reset_link}")
        return

    resend.Emails.send({
        "from": EMAIL_FROM,
        "to": to_email,
        "subject": "Reset your DeckDen password",
        "html": (
            "<p>Someone requested a password reset for your DeckDen account.</p>"
            f'<p><a href="{reset_link}">Reset your password</a></p>'
            "<p>This link expires in 30 minutes. If you didn't request this, "
            "you can safely ignore this email.</p>"
        ),
    })
