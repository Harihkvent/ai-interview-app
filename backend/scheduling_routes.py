"""
Scheduling API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import RedirectResponse
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import logging

from auth_routes import get_current_user
from auth_models import User
from scheduling_service import (
    create_scheduled_interview,
    get_upcoming_schedules,
    update_schedule,
    cancel_schedule,
    get_notification_preferences,
    update_notification_preferences
)
from calendar_integration import (
    get_google_calendar_auth_url,
    exchange_code_for_tokens,
    save_user_calendar_tokens,
    check_user_calendar_connected,
    list_upcoming_events,
    is_calendar_configured,
)

logger = logging.getLogger("scheduling_routes")

router = APIRouter()


# Request/Response Models
class CreateScheduleRequest(BaseModel):
    title: str
    scheduled_time: str  # ISO format
    duration_minutes: int = 60
    description: Optional[str] = None


class UpdateScheduleRequest(BaseModel):
    title: Optional[str] = None
    scheduled_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None


class UpdatePreferencesRequest(BaseModel):
    email_enabled: Optional[bool] = None
    reminder_intervals: Optional[List[int]] = None
    calendar_sync_enabled: Optional[bool] = None
    timezone: Optional[str] = None


# ─── Google Calendar OAuth Endpoints ───

@router.get("/calendar/connect")
async def connect_google_calendar(
    redirect: Optional[str] = Query(None, description="Frontend URL to redirect after auth"),
    current_user: User = Depends(get_current_user)
):
    """Get Google OAuth consent URL to connect user's calendar"""
    if not is_calendar_configured():
        raise HTTPException(
            status_code=503,
            detail="Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )

    auth_url = get_google_calendar_auth_url(str(current_user.id), frontend_redirect=redirect)
    if not auth_url:
        raise HTTPException(status_code=500, detail="Failed to generate auth URL")

    return {"auth_url": auth_url}


@router.get("/calendar/callback")
async def google_calendar_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """Handle Google OAuth callback — exchanges code for tokens and stores them"""
    # Parse state — may contain user_id|frontend_redirect
    parts = state.split("|", 1)
    user_id = parts[0]
    frontend_redirect = parts[1] if len(parts) > 1 else None

    # Exchange authorization code for tokens
    token_data = await exchange_code_for_tokens(code)
    if not token_data:
        if frontend_redirect:
            return RedirectResponse(url=f"{frontend_redirect}?calendar=error")
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")

    # Save tokens to MongoDB
    success = await save_user_calendar_tokens(user_id, token_data)
    if not success:
        if frontend_redirect:
            return RedirectResponse(url=f"{frontend_redirect}?calendar=error")
        raise HTTPException(status_code=500, detail="Failed to save calendar tokens")

    logger.info(f"Google Calendar connected for user {user_id}")

    # Redirect to frontend if provided, otherwise return JSON
    if frontend_redirect:
        return RedirectResponse(url=f"{frontend_redirect}?calendar=connected")

    return {"message": "Google Calendar connected successfully"}


@router.get("/calendar/status")
async def calendar_status(
    current_user: User = Depends(get_current_user)
):
    """Check if user has connected their Google Calendar"""
    connected = await check_user_calendar_connected(str(current_user.id))
    return {
        "calendar_connected": connected,
        "calendar_configured": is_calendar_configured()
    }


@router.get("/calendar/events")
async def get_calendar_events(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """List upcoming Google Calendar events for the user"""
    events = await list_upcoming_events(str(current_user.id), max_results=limit)
    return {"events": events}


# ─── Scheduling Endpoints ───

@router.post("/create")
async def create_schedule(
    request: CreateScheduleRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> dict:
    """Create a new scheduled interview"""
    try:
        scheduled_time = datetime.fromisoformat(request.scheduled_time)
        
        schedule = await create_scheduled_interview(
            user_id=str(current_user.id),
            title=request.title,
            scheduled_time=scheduled_time,
            duration_minutes=request.duration_minutes,
            description=request.description,
            background_tasks=background_tasks
        )
        
        return {
            "schedule_id": str(schedule.id),
            "title": schedule.title,
            "scheduled_time": schedule.scheduled_time.isoformat(),
            "duration_minutes": schedule.duration_minutes,
            "status": schedule.status,
            "message": "Interview scheduled successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming")
async def get_upcoming(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get upcoming scheduled interviews"""
    try:
        schedules = await get_upcoming_schedules(str(current_user.id), limit)
        
        return {
            "schedules": [
                {
                    "schedule_id": str(s.id),
                    "title": s.title,
                    "description": s.description,
                    "scheduled_time": s.scheduled_time.isoformat(),
                    "duration_minutes": s.duration_minutes,
                    "status": s.status,
                    "calendar_event_id": s.calendar_event_id
                }
                for s in schedules
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{schedule_id}")
async def get_schedule_details(
    schedule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific scheduled interview"""
    try:
        from scheduling_models import ScheduledInterview
        schedule = await ScheduledInterview.get(schedule_id)
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {
            "schedule_id": str(schedule.id),
            "title": schedule.title,
            "description": schedule.description,
            "scheduled_time": schedule.scheduled_time.isoformat(),
            "duration_minutes": schedule.duration_minutes,
            "status": schedule.status,
            "reminder_times": schedule.reminder_times,
            "reminders_sent": schedule.reminders_sent,
            "session_id": schedule.session_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{schedule_id}")
async def update_scheduled_interview(
    schedule_id: str,
    request: UpdateScheduleRequest,
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled interview"""
    try:
        # Verify ownership
        from scheduling_models import ScheduledInterview
        schedule = await ScheduledInterview.get(schedule_id)
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Prepare updates
        updates = {}
        if request.title:
            updates["title"] = request.title
        if request.description is not None:
            updates["description"] = request.description
        if request.scheduled_time:
            updates["scheduled_time"] = datetime.fromisoformat(request.scheduled_time)
        if request.duration_minutes:
            updates["duration_minutes"] = request.duration_minutes
        
        updated_schedule = await update_schedule(schedule_id, updates)
        
        return {
            "schedule_id": str(updated_schedule.id),
            "message": "Schedule updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{schedule_id}")
async def cancel_scheduled_interview(
    schedule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a scheduled interview"""
    try:
        # Verify ownership
        from scheduling_models import ScheduledInterview
        schedule = await ScheduledInterview.get(schedule_id)
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        await cancel_schedule(schedule_id)
        
        return {"message": "Schedule cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferences/get")
async def get_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get notification preferences"""
    try:
        prefs = await get_notification_preferences(str(current_user.id))
        
        return {
            "email_enabled": prefs.email_enabled,
            "reminder_intervals": prefs.reminder_intervals,
            "calendar_sync_enabled": prefs.calendar_sync_enabled,
            "timezone": prefs.timezone
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preferences/update")
async def update_preferences(
    request: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user)
):
    """Update notification preferences"""
    try:
        updates = {}
        if request.email_enabled is not None:
            updates["email_enabled"] = request.email_enabled
        if request.reminder_intervals is not None:
            updates["reminder_intervals"] = request.reminder_intervals
        if request.calendar_sync_enabled is not None:
            updates["calendar_sync_enabled"] = request.calendar_sync_enabled
        if request.timezone is not None:
            updates["timezone"] = request.timezone
        
        prefs = await update_notification_preferences(str(current_user.id), updates)
        
        return {
            "message": "Preferences updated successfully",
            "preferences": {
                "email_enabled": prefs.email_enabled,
                "reminder_intervals": prefs.reminder_intervals,
                "calendar_sync_enabled": prefs.calendar_sync_enabled,
                "timezone": prefs.timezone
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
