"""
Google Calendar Integration Service — Web OAuth Flow

Uses per-user OAuth tokens stored in MongoDB. Each user authorizes
calendar access through a browser redirect, and their tokens are
stored/refreshed automatically.
"""
import os
import logging
from typing import Optional, Dict
from datetime import datetime, timedelta
from urllib.parse import urlencode

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import httpx

logger = logging.getLogger("calendar_integration")

# ─── Configuration from environment ───
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_CALENDAR_REDIRECT_URI = os.getenv(
    "GOOGLE_CALENDAR_REDIRECT_URI",
    "http://localhost:8000/api/schedule/calendar/callback"
)
SCOPES = ["https://www.googleapis.com/auth/calendar"]
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def is_calendar_configured() -> bool:
    """Check if Google Calendar credentials are configured"""
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def get_google_calendar_auth_url(user_id: str, frontend_redirect: Optional[str] = None) -> Optional[str]:
    """
    Generate Google OAuth consent URL for calendar access.
    user_id is embedded in the 'state' parameter so the callback knows who authorized.
    """
    if not is_calendar_configured():
        logger.warning("Google Calendar not configured — missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET")
        return None

    # Include frontend_redirect in state so we can redirect back after callback
    state = user_id
    if frontend_redirect:
        state = f"{user_id}|{frontend_redirect}"

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_CALENDAR_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",       # Gets refresh_token
        "prompt": "consent",            # Always show consent to get refresh_token
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> Optional[Dict]:
    """Exchange the authorization code for access and refresh tokens"""
    if not is_calendar_configured():
        return None

    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_CALENDAR_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Token exchange failed: {response.status_code} — {response.text}")
            return None


async def save_user_calendar_tokens(user_id: str, token_data: Dict) -> bool:
    """Save or update user's calendar tokens in MongoDB"""
    from scheduling_models import CalendarToken

    try:
        existing = await CalendarToken.find_one(CalendarToken.user_id == user_id)

        if existing:
            existing.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                existing.refresh_token = token_data["refresh_token"]
            existing.client_id = GOOGLE_CLIENT_ID
            existing.client_secret = GOOGLE_CLIENT_SECRET
            if "expires_in" in token_data:
                existing.expiry = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            existing.updated_at = datetime.utcnow()
            await existing.save()
        else:
            token = CalendarToken(
                user_id=user_id,
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token", ""),
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                expiry=datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600)),
            )
            await token.insert()

        logger.info(f"Saved calendar tokens for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving calendar tokens: {e}")
        return False


async def get_user_calendar_service(user_id: str):
    """
    Get an authenticated Google Calendar service for a specific user.
    Loads their stored tokens from MongoDB and refreshes if expired.
    """
    from scheduling_models import CalendarToken

    try:
        token_doc = await CalendarToken.find_one(CalendarToken.user_id == user_id)
        if not token_doc:
            logger.info(f"No calendar tokens found for user {user_id}")
            return None

        creds = Credentials(
            token=token_doc.access_token,
            refresh_token=token_doc.refresh_token,
            token_uri=token_doc.token_uri,
            client_id=token_doc.client_id,
            client_secret=token_doc.client_secret,
            scopes=token_doc.scopes,
        )

        # Refresh if expired
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save the refreshed token
            token_doc.access_token = creds.token
            if creds.expiry:
                token_doc.expiry = creds.expiry
            token_doc.updated_at = datetime.utcnow()
            await token_doc.save()
            logger.info(f"Refreshed calendar token for user {user_id}")

        service = build("calendar", "v3", credentials=creds)
        return service

    except Exception as e:
        logger.error(f"Error getting calendar service for user {user_id}: {e}")
        return None


async def check_user_calendar_connected(user_id: str) -> bool:
    """Check if user has connected their Google Calendar"""
    from scheduling_models import CalendarToken
    token = await CalendarToken.find_one(CalendarToken.user_id == user_id)
    return token is not None


# ─── Calendar Event CRUD ───


async def create_calendar_event(
    user_id: str,
    title: str,
    description: str,
    start_time: datetime,
    duration_minutes: int = 60,
    attendee_email: Optional[str] = None
) -> Optional[Dict]:
    """Create a calendar event in a user's Google Calendar"""
    try:
        service = await get_user_calendar_service(user_id)
        if not service:
            logger.warning(f"Calendar service not available for user {user_id}")
            return None

        end_time = start_time + timedelta(minutes=duration_minutes)

        event = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": "UTC",
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},   # 1 day before
                    {"method": "popup", "minutes": 60},         # 1 hour before
                    {"method": "popup", "minutes": 15},         # 15 min before
                ],
            },
        }

        if attendee_email:
            event["attendees"] = [{"email": attendee_email}]

        created_event = service.events().insert(calendarId="primary", body=event).execute()

        logger.info(f"Calendar event created: {created_event.get('id')} for user {user_id}")

        return {
            "event_id": created_event.get("id"),
            "html_link": created_event.get("htmlLink"),
            "status": created_event.get("status"),
        }
    except Exception as e:
        logger.error(f"Error creating calendar event: {e}")
        return None


async def update_calendar_event(
    user_id: str,
    event_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    start_time: Optional[datetime] = None,
    duration_minutes: Optional[int] = None,
) -> bool:
    """Update a calendar event"""
    try:
        service = await get_user_calendar_service(user_id)
        if not service:
            return False

        event = service.events().get(calendarId="primary", eventId=event_id).execute()

        if title:
            event["summary"] = title
        if description:
            event["description"] = description
        if start_time:
            end_time = start_time + timedelta(minutes=duration_minutes or 60)
            event["start"] = {"dateTime": start_time.isoformat(), "timeZone": "UTC"}
            event["end"] = {"dateTime": end_time.isoformat(), "timeZone": "UTC"}

        service.events().update(calendarId="primary", eventId=event_id, body=event).execute()

        logger.info(f"Calendar event updated: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Error updating calendar event: {e}")
        return False


async def delete_calendar_event(user_id: str, event_id: str) -> bool:
    """Delete a calendar event"""
    try:
        service = await get_user_calendar_service(user_id)
        if not service:
            return False

        service.events().delete(calendarId="primary", eventId=event_id).execute()

        logger.info(f"Calendar event deleted: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting calendar event: {e}")
        return False


async def list_upcoming_events(user_id: str, max_results: int = 10) -> list:
    """List upcoming calendar events for a user"""
    try:
        service = await get_user_calendar_service(user_id)
        if not service:
            return []

        now = datetime.utcnow().isoformat() + "Z"

        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        events = events_result.get("items", [])

        return [
            {
                "id": event["id"],
                "summary": event.get("summary", "No Title"),
                "start": event["start"].get("dateTime", event["start"].get("date")),
                "end": event["end"].get("dateTime", event["end"].get("date")),
                "html_link": event.get("htmlLink"),
            }
            for event in events
        ]
    except Exception as e:
        logger.error(f"Error listing calendar events: {e}")
        return []
