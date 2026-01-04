"""
Scheduling API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

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


# Endpoints
@router.post("/create")
async def create_schedule(
    request: CreateScheduleRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a new scheduled interview"""
    try:
        scheduled_time = datetime.fromisoformat(request.scheduled_time)
        
        schedule = await create_scheduled_interview(
            user_id=str(current_user.id),
            title=request.title,
            scheduled_time=scheduled_time,
            duration_minutes=request.duration_minutes,
            description=request.description
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
