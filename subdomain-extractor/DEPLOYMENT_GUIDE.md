# Google Apps Script Deployment Guide

## Step 1: Create Google Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Name it "Subdomain Extractor"
4. Copy the spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

## Step 2: Deploy Google Apps Script

### 2.1 Create Apps Script Project
1. Go to [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Delete default code and paste the content from `google-apps-script.js`

### 2.2 Update Configuration
In the Apps Script editor, update this line:
```javascript
const CONFIG = {
  SPREADSHEET_ID: 'paste-your-spreadsheet-id-here',
  SHEET_NAME: 'Subdomains'
}
```

### 2.3 Deploy as Web App
1. Click "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Description: "Subdomain Extractor API"
4. Execute as: "Me"
5. Who has access: "Anyone"
6. Click "Deploy"
7. **Copy the Web app URL** (looks like: `https://script.google.com/macros/s/ABC123.../exec`)

### 2.4 Test Deployment
1. In Apps Script editor, run the `setup()` function
2. Run the `testAPI()` function
3. Check your spreadsheet for test data

## Step 3: Configure Firefox Extension

Update `config.js`:
```javascript
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  BATCH_SIZE: 10,
  SYNC_INTERVAL: 30000
}
```

## Step 4: Install Firefox Extension

1. Open Firefox
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json`

## Step 5: Test Everything

1. Browse any website
2. Check Firefox extension popup for collected subdomains
3. Verify data appears in your Google Spreadsheet
4. Data syncs every 30 seconds automatically

## Troubleshooting

- **Permission Error**: Make sure Apps Script deployment has "Anyone" access
- **CORS Error**: Apps Script handles CORS automatically
- **No Data**: Check browser console for errors
- **Sync Issues**: Verify the Apps Script URL in config.js

## Security Notes

- Apps Script URL is public but only accepts POST requests with specific format
- No API keys needed - Google handles authentication
- Data is stored in your personal Google Sheets