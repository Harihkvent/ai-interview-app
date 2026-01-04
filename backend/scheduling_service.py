"""
Scheduling Service - Manage interview scheduling and notifications
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import logging

from scheduling_models import ScheduledInterview, NotificationPreference
from email_service import send_interview_scheduled_email, send_reminder_email
from auth_models import User

# Import calendar integration (optional)
try:
    from calendar_integration import create_calendar_event, update_calendar_event, delete_calendar_event
    CALENDAR_AVAILABLE = True
except ImportError:
    CALENDAR_AVAILABLE = False
    logger.warning("Google Calendar integration not available. Install google-api-python-client to enable.")

logger = logging.getLogger("scheduling_service")


async def create_scheduled_interview(
    user_id: str,
    title: str,
    scheduled_time: datetime,
    duration_minutes: int = 60,
    description: Optional[str] = None
) -> ScheduledInterview:
    """Create a new scheduled interview"""
    try:
        schedule = ScheduledInterview(
            user_id=user_id,
            title=title,
            description=description,
            scheduled_time=scheduled_time,
            duration_minutes=duration_minutes,
            status="scheduled"
        )
        await schedule.insert()
        
        # Get user for email and calendar
        user = await User.get(user_id)
        
        # Send confirmation email
        if user and user.email:
            await send_interview_scheduled_email(
                user.email,
                {
                    "title": title,
                    "scheduled_time": scheduled_time.strftime("%Y-%m-%d %H:%M"),
                    "duration_minutes": duration_minutes,
                    "description": description
                }
            )
            schedule.notification_sent = True
        
        # Create calendar event if enabled
        if CALENDAR_AVAILABLE:
            prefs = await get_notification_preferences(user_id)
            if prefs.calendar_sync_enabled:
                calendar_result = await create_calendar_event(
                    title=title,
                    description=description or "CareerPath AI Interview",
                    start_time=scheduled_time,
                    duration_minutes=duration_minutes,
                    attendee_email=user.email if user else None
                )
                if calendar_result:
                    schedule.calendar_event_id = calendar_result['event_id']
                    schedule.calendar_link = calendar_result['html_link']
        
        await schedule.save()
        
        logger.info(f"Created scheduled interview {schedule.id} for user {user_id}")
        return schedule
    except Exception as e:
        logger.error(f"Error creating scheduled interview: {str(e)}")
        raise


async def get_upcoming_schedules(user_id: str, limit: int = 10) -> List[ScheduledInterview]:
    """Get upcoming scheduled interviews for a user"""
    try:
        now = datetime.utcnow()
        schedules = await ScheduledInterview.find(
            ScheduledInterview.user_id == user_id,
            ScheduledInterview.scheduled_time >= now,
            ScheduledInterview.status == "scheduled"
        ).sort("+scheduled_time").limit(limit).to_list()
        
        return schedules
    except Exception as e:
        logger.error(f"Error getting upcoming schedules: {str(e)}")
        raise


async def update_schedule(
    schedule_id: str,
    updates: Dict
) -> ScheduledInterview:
    """Update a scheduled interview"""
    try:
        schedule = await ScheduledInterview.get(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        # Update allowed fields
        if "title" in updates:
            schedule.title = updates["title"]
        if "description" in updates:
            schedule.description = updates["description"]
        if "scheduled_time" in updates:
            schedule.scheduled_time = updates["scheduled_time"]
            # Reset reminders if time changed
            schedule.reminders_sent = []
        if "duration_minutes" in updates:
            schedule.duration_minutes = updates["duration_minutes"]
        
        schedule.updated_at = datetime.utcnow()
        await schedule.save()
        
        # Update calendar event if exists
        if CALENDAR_AVAILABLE and schedule.calendar_event_id:
            await update_calendar_event(
                event_id=schedule.calendar_event_id,
                title=schedule.title,
                description=schedule.description,
                start_time=schedule.scheduled_time,
                duration_minutes=schedule.duration_minutes
            )
        
        logger.info(f"Updated schedule {schedule_id}")
        return schedule
    except Exception as e:
        logger.error(f"Error updating schedule: {str(e)}")
        raise


async def cancel_schedule(schedule_id: str) -> bool:
    """Cancel a scheduled interview"""
    try:
        schedule = await ScheduledInterview.get(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        schedule.status = "cancelled"
        schedule.updated_at = datetime.utcnow()
        await schedule.save()
        
        # Delete calendar event if exists
        if CALENDAR_AVAILABLE and schedule.calendar_event_id:
            await delete_calendar_event(schedule.calendar_event_id)
        
        logger.info(f"Cancelled schedule {schedule_id}")
        return True
    except Exception as e:
        logger.error(f"Error cancelling schedule: {str(e)}")
        raise


async def check_and_send_reminders():
    """Check for upcoming interviews and send reminders (to be called by scheduler)"""
    try:
        now = datetime.utcnow()
        
        # Get all scheduled interviews
        schedules = await ScheduledInterview.find(
            ScheduledInterview.status == "scheduled",
            ScheduledInterview.scheduled_time >= now
        ).to_list()
        
        for schedule in schedules:
            time_until = (schedule.scheduled_time - now).total_seconds() / 60  # minutes
            
            # Check each reminder interval
            for interval in schedule.reminder_times:
                # If we're within the reminder window and haven't sent this reminder yet
                if interval not in schedule.reminders_sent and time_until <= interval and time_until > 0:
                    # Send reminder
                    user = await User.get(schedule.user_id)
                    if user and user.email:
                        success = await send_reminder_email(
                            user.email,
                            {
                                "title": schedule.title,
                                "scheduled_time": schedule.scheduled_time.strftime("%Y-%m-%d %H:%M"),
                                "duration_minutes": schedule.duration_minutes
                            },
                            interval
                        )
                        
                        if success:
                            schedule.reminders_sent.append(interval)
                            await schedule.save()
                            logger.info(f"Sent {interval}min reminder for schedule {schedule.id}")
        
    except Exception as e:
        logger.error(f"Error checking reminders: {str(e)}")


async def get_notification_preferences(user_id: str) -> NotificationPreference:
    """Get user's notification preferences"""
    try:
        prefs = await NotificationPreference.find_one(
            NotificationPreference.user_id == user_id
        )
        
        if not prefs:
            # Create default preferences
            prefs = NotificationPreference(
                user_id=user_id,
                email_enabled=True,
                reminder_intervals=[15, 60, 1440],
                calendar_sync_enabled=False
            )
            await prefs.insert()
        
        return prefs
    except Exception as e:
        logger.error(f"Error getting notification preferences: {str(e)}")
        raise


async def update_notification_preferences(
    user_id: str,
    updates: Dict
) -> NotificationPreference:
    """Update user's notification preferences"""
    try:
        prefs = await get_notification_preferences(user_id)
        
        if "email_enabled" in updates:
            prefs.email_enabled = updates["email_enabled"]
        if "reminder_intervals" in updates:
            prefs.reminder_intervals = updates["reminder_intervals"]
        if "calendar_sync_enabled" in updates:
            prefs.calendar_sync_enabled = updates["calendar_sync_enabled"]
        if "timezone" in updates:
            prefs.timezone = updates["timezone"]
        
        prefs.updated_at = datetime.utcnow()
        await prefs.save()
        
        return prefs
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise


async def mark_schedule_completed(schedule_id: str, session_id: str) -> bool:
    """Mark a scheduled interview as completed and link to session"""
    try:
        schedule = await ScheduledInterview.get(schedule_id)
        if not schedule:
            return False
        
        schedule.status = "completed"
        schedule.session_id = session_id
        schedule.updated_at = datetime.utcnow()
        await schedule.save()
        
        return True
    except Exception as e:
        logger.error(f"Error marking schedule completed: {str(e)}")
        return False
