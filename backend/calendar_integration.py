"""
Google Calendar Integration Service
"""
import os
import logging
from typing import Optional, Dict
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle

logger = logging.getLogger("calendar_integration")

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/calendar']

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), 'credentials.json')
TOKEN_FILE = os.path.join(os.path.dirname(__file__), 'token.pickle')


def get_calendar_service():
    """Get authenticated Google Calendar service"""
    creds = None
    
    # The file token.pickle stores the user's access and refresh tokens
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                logger.warning("Google Calendar credentials file not found. Calendar integration disabled.")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        return service
    except Exception as e:
        logger.error(f"Error building calendar service: {str(e)}")
        return None


async def create_calendar_event(
    title: str,
    description: str,
    start_time: datetime,
    duration_minutes: int = 60,
    attendee_email: Optional[str] = None
) -> Optional[Dict]:
    """Create a calendar event"""
    try:
        service = get_calendar_service()
        if not service:
            logger.warning("Calendar service not available")
            return None
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                    {'method': 'popup', 'minutes': 60},       # 1 hour before
                    {'method': 'popup', 'minutes': 15},       # 15 min before
                ],
            },
        }
        
        if attendee_email:
            event['attendees'] = [{'email': attendee_email}]
        
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        
        logger.info(f"Calendar event created: {created_event.get('id')}")
        
        return {
            'event_id': created_event.get('id'),
            'html_link': created_event.get('htmlLink'),
            'status': created_event.get('status')
        }
    except Exception as e:
        logger.error(f"Error creating calendar event: {str(e)}")
        return None


async def update_calendar_event(
    event_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    start_time: Optional[datetime] = None,
    duration_minutes: Optional[int] = None
) -> bool:
    """Update a calendar event"""
    try:
        service = get_calendar_service()
        if not service:
            return False
        
        # Get existing event
        event = service.events().get(calendarId='primary', eventId=event_id).execute()
        
        # Update fields
        if title:
            event['summary'] = title
        if description:
            event['description'] = description
        if start_time:
            end_time = start_time + timedelta(minutes=duration_minutes or 60)
            event['start'] = {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            }
            event['end'] = {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            }
        
        updated_event = service.events().update(
            calendarId='primary',
            eventId=event_id,
            body=event
        ).execute()
        
        logger.info(f"Calendar event updated: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Error updating calendar event: {str(e)}")
        return False


async def delete_calendar_event(event_id: str) -> bool:
    """Delete a calendar event"""
    try:
        service = get_calendar_service()
        if not service:
            return False
        
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        
        logger.info(f"Calendar event deleted: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting calendar event: {str(e)}")
        return False


async def list_upcoming_events(max_results: int = 10) -> list:
    """List upcoming calendar events"""
    try:
        service = get_calendar_service()
        if not service:
            return []
        
        now = datetime.utcnow().isoformat() + 'Z'
        
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        return [
            {
                'id': event['id'],
                'summary': event.get('summary', 'No Title'),
                'start': event['start'].get('dateTime', event['start'].get('date')),
                'end': event['end'].get('dateTime', event['end'].get('date')),
                'html_link': event.get('htmlLink')
            }
            for event in events
        ]
    except Exception as e:
        logger.error(f"Error listing calendar events: {str(e)}")
        return []
