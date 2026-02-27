import pytz
from datetime import datetime

print("Checking pytz available timezones...")
zones = pytz.all_timezones
print(f"Total zones found: {len(zones)}")

try:
    kolkata_tz = pytz.timezone("Asia/Kolkata")
    # Naive UTC time from DB
    utc_time = datetime.utcnow()
    # Localize and format
    local_time = pytz.utc.localize(utc_time).astimezone(kolkata_tz)
    print(f"UTC Time (Naive): {utc_time}")
    print(f"Local Time (Asia/Kolkata): {local_time}")
    print(f"Formatted: {local_time.strftime('%Y-%m-%d %H:%M')}")
    print("Success with pytz!")
except Exception as e:
    print(f"Error with pytz: {e}")
