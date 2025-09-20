# Firefox Installation & Google Sheets Setup

## Firefox Installation Steps

1. **Prepare Extension Files**
   - Rename `manifest-firefox.json` to `manifest.json`
   - Replace original files with Firefox versions

2. **Install in Firefox**
   - Open Firefox
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

## Google Sheets API Setup

### 1. Create Google Cloud Project
```bash
# Go to: https://console.cloud.google.com/
# Create new project or select existing one
```

### 2. Enable Google Sheets API
```bash
# In Google Cloud Console:
# APIs & Services > Library
# Search "Google Sheets API" > Enable
```

### 3. Create API Key
```bash
# APIs & Services > Credentials
# Create Credentials > API Key
# Copy the API key
```

### 4. Create Google Spreadsheet
```bash
# Go to: https://sheets.google.com/
# Create new spreadsheet
# Copy spreadsheet ID from URL:
# https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

### 5. Setup Sheet Headers
Add these headers to your Google Sheet:
```
Domain | Source | Timestamp | Origin
```

### 6. Configure Extension
Edit `config.js`:
```javascript
const CONFIG = {
  GOOGLE_SHEETS_API_KEY: 'your-actual-api-key-here',
  SPREADSHEET_ID: 'your-spreadsheet-id-here',
  SHEET_NAME: 'Subdomains',
  BATCH_SIZE: 10,
  SYNC_INTERVAL: 30000
}
```

## Usage
1. Browse websites normally
2. Extension automatically extracts subdomains
3. Data syncs to Google Sheets every 30 seconds
4. View real-time data in the popup

## Troubleshooting
- Check browser console for API errors
- Verify API key has Sheets API access
- Ensure spreadsheet is publicly accessible or shared with service account