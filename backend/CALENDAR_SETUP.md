# Google Calendar Integration Setup Guide

## Overview

The CareerPath AI platform now includes Google Calendar integration for automatically syncing scheduled interviews to users' Google Calendars.

## Prerequisites

1. Google Cloud Project with Calendar API enabled (✅ Already configured)
2. OAuth 2.0 credentials (✅ Already saved to `credentials.json`)
3. Python packages installed

## Installation

### 1. Install Required Packages

Add to your virtual environment:

```bash
pip install google-auth==2.25.2
pip install google-auth-oauthlib==1.2.0
pip install google-auth-httplib2==0.2.0
pip install google-api-python-client==2.110.0
```

Or update `requirements.txt` and run:

```bash
pip install -r requirements.txt
```

### 2. First-Time Authentication

The first time the calendar integration is used, it will:

1. Open a browser window for Google OAuth consent
2. Ask you to sign in with your Google account
3. Request permission to manage calendar events
4. Save the authentication token to `token.pickle`

**Important:** This authentication step needs to be done on a machine with a browser. Once `token.pickle` is created, it can be reused.

## How It Works

### Automatic Calendar Sync

When a user schedules an interview:

1. **Check User Preferences**: System checks if calendar sync is enabled for the user
2. **Create Calendar Event**: If enabled, creates event in user's Google Calendar
3. **Store Event ID**: Saves the calendar event ID for future updates/deletions
4. **Provide Calendar Link**: Returns a link to view the event in Google Calendar

### Event Management

- **Create**: When interview is scheduled
- **Update**: When interview time/details are changed
- **Delete**: When interview is cancelled

### User Control

Users can enable/disable calendar sync via notification preferences:

```python
# Enable calendar sync
await update_notification_preferences(user_id, {
    "calendar_sync_enabled": True
})
```

## API Endpoints

### Enable Calendar Sync

```http
PUT /api/schedule/preferences/update
Content-Type: application/json

{
  "calendar_sync_enabled": true
}
```

### Create Scheduled Interview (with Calendar)

```http
POST /api/schedule/create
Content-Type: application/json

{
  "title": "Mock Interview - Software Engineer",
  "scheduled_time": "2026-01-10T14:00:00",
  "duration_minutes": 60,
  "description": "Technical interview preparation"
}
```

**Response includes:**
```json
{
  "schedule_id": "...",
  "calendar_event_id": "...",
  "calendar_link": "https://calendar.google.com/calendar/event?eid=..."
}
```

## Configuration

### Environment Variables

No additional environment variables needed. The integration uses:

- `credentials.json` - OAuth client credentials (already saved)
- `token.pickle` - User authentication token (auto-generated)

### Scopes

The integration requests the following Google Calendar scope:

- `https://www.googleapis.com/auth/calendar` - Full calendar access

## Features

### ✅ Implemented

- Create calendar events with reminders
- Update event details (time, title, description)
- Delete events when interviews are cancelled
- Automatic reminder configuration:
  - 1 day before (email)
  - 1 hour before (popup)
  - 15 minutes before (popup)
- User preference control
- Graceful fallback if calendar unavailable

### Event Details

Each calendar event includes:

- **Title**: Interview title
- **Description**: Interview description
- **Start Time**: Scheduled interview time
- **Duration**: Interview duration
- **Reminders**: Pre-configured reminder times
- **Attendee**: User's email (optional)

## Troubleshooting

### Calendar Integration Not Working

1. **Check credentials file exists**:
   ```bash
   ls backend/credentials.json
   ```

2. **Check if packages are installed**:
   ```bash
   pip list | grep google
   ```

3. **Re-authenticate**:
   ```bash
   rm backend/token.pickle
   # Restart server and trigger calendar sync
   ```

### Permission Errors

If you see "insufficient permissions":

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Calendar API for your project
3. Verify OAuth consent screen is configured
4. Re-authenticate

### Browser Not Opening

If running on a server without a browser:

1. Run authentication on local machine first
2. Copy `token.pickle` to server
3. Or use service account authentication (advanced)

## Testing

### Test Calendar Integration

```python
# In Python shell or test script
from calendar_integration import create_calendar_event
from datetime import datetime, timedelta

# Create test event
result = await create_calendar_event(
    title="Test Interview",
    description="Testing calendar integration",
    start_time=datetime.utcnow() + timedelta(hours=1),
    duration_minutes=30
)

print(f"Event created: {result}")
```

### Verify in Google Calendar

1. Go to [Google Calendar](https://calendar.google.com/)
2. Check for the created event
3. Verify reminders are set correctly

## Security Notes

- **credentials.json**: Contains OAuth client ID and secret (not sensitive for installed apps)
- **token.pickle**: Contains user's access/refresh tokens (KEEP PRIVATE)
- Add `token.pickle` to `.gitignore` to prevent committing

## Next Steps

1. Install required packages
2. Run the backend server
3. Create a test scheduled interview
4. Enable calendar sync in user preferences
5. Verify event appears in Google Calendar

## Support

For issues with Google Calendar API:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 for Installed Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
