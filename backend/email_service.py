"""
Email Service - Send email notifications
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional
from datetime import datetime
import os

logger = logging.getLogger("email_service")

# Email configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@careerpath.ai")
APP_URL = os.getenv("APP_URL", "https://develop.da0sy3g04smi7.amplifyapp.com")


async def send_email(
    to: str,
    subject: str,
    body: str,
    html: bool = True,
    attachment_bytes: Optional[bytes] = None,
    attachment_filename: Optional[str] = None
) -> bool:
    """Send an email"""
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.warning("SMTP credentials not configured. Email not sent.")
            return False
        
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_FROM
        msg['To'] = to
        msg['Subject'] = subject
        
        if html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))
        
        # Attach file if provided
        if attachment_bytes and attachment_filename:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{attachment_filename}"',
            )
            msg.attach(part)
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to}")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False


async def send_interview_scheduled_email(user_email: str, schedule_details: dict) -> bool:
    """Send interview scheduled confirmation email"""
    subject = f"Interview Scheduled: {schedule_details['title']}"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Interview Scheduled Successfully</h2>
            <p>Your interview has been scheduled with the following details:</p>
            
            <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Title:</strong> {schedule_details['title']}</p>
                <p><strong>Date & Time:</strong> {schedule_details['scheduled_time']}</p>
                <p><strong>Duration:</strong> {schedule_details['duration_minutes']} minutes</p>
                {f"<p><strong>Description:</strong> {schedule_details.get('description', 'N/A')}</p>" if schedule_details.get('description') else ""}
            </div>
            
            <p>You will receive reminder notifications before your interview.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{APP_URL}/interview" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Attend Interview</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 14px;">
                    Best of luck with your preparation!<br>
                    - CareerPath AI Team
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, body, html=True)


async def send_reminder_email(user_email: str, schedule_details: dict, minutes_before: int) -> bool:
    """Send interview reminder email"""
    subject = f"Reminder: Interview in {minutes_before} minutes"
    
    time_text = f"{minutes_before} minutes" if minutes_before < 60 else f"{minutes_before // 60} hour(s)"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #EF4444;">Interview Reminder</h2>
            <p>Your interview is coming up in <strong>{time_text}</strong>!</p>
            
            <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
                <p><strong>Title:</strong> {schedule_details['title']}</p>
                <p><strong>Scheduled Time:</strong> {schedule_details['scheduled_time']}</p>
                <p><strong>Duration:</strong> {schedule_details['duration_minutes']} minutes</p>
            </div>
            
            <p>Make sure you're ready and have everything you need for the interview.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{APP_URL}/interview" style="background-color: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Join Interview Now</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 14px;">
                    Good luck!<br>
                    - CareerPath AI Team
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, body, html=True)


async def send_completion_email(user_email: str, session_details: dict) -> bool:
    """Send interview completion notification email"""
    subject = "Interview Completed - View Your Results"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10B981;">Interview Completed!</h2>
            <p>Congratulations on completing your interview!</p>
            
            <div style="background: #ECFDF5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <p><strong>Total Score:</strong> {session_details.get('total_score', 'N/A')}/10</p>
                <p><strong>Time Taken:</strong> {session_details.get('time_taken', 'N/A')}</p>
                <p><strong>Rounds Completed:</strong> {session_details.get('rounds_completed', 'N/A')}</p>
            </div>
            
            <p>Your detailed performance report is now available in your dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{APP_URL}/dashboard" style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Results</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 14px;">
                    Keep practicing and improving!<br>
                    - CareerPath AI Team
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, body, html=True)

async def send_report_email(user_email: str, pdf_bytes: bytes, filename: str) -> bool:
    """Send interview performance report with PDF attachment"""
    subject = "Your Interview Performance Report"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Your Performance Report is Ready</h2>
            <p>Thank you for completing your interview with CareerPath AI. Please find your detailed performance report attached to this email.</p>
            
            <p>This report includes:</p>
            <ul style="color: #4B5563;">
                <li>Overall performance score and time analysis</li>
                <li>AI-powered strengths and areas for improvement</li>
                <li>Detailed round-by-round question and answer evaluation</li>
            </ul>
            
            <p>You can also view your results anytime in your dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{APP_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; font-size: 14px;">
                    Keep up the great work and good luck with your career journey!<br>
                    - CareerPath AI Team
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(
        user_email, 
        subject, 
        body, 
        html=True, 
        attachment_bytes=pdf_bytes, 
        attachment_filename=filename
    )
