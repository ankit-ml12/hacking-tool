/**
 * Google Apps Script for Subdomain Extractor
 * Deploy this as a web app to get an endpoint URL
 */

// Configuration - Update these values
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // Replace with your spreadsheet ID
  SHEET_NAME: 'Subdomains'
}

/**
 * Main function to handle POST requests from Firefox extension
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    
    if (data.action === 'add_subdomains') {
      return addSubdomains(data.subdomains)
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Invalid action'}))
      .setMimeType(ContentService.MimeType.JSON)
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

/**
 * Handle GET requests for testing
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'Subdomain Extractor API is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
}

/**
 * Add subdomains to the spreadsheet with timeout protection
 */
function addSubdomains(subdomains) {
  const startTime = new Date().getTime()
  const MAX_EXECUTION_TIME = 5 * 60 * 1000 // 5 minutes (leave 1 min buffer)
  
  try {
    const sheet = getOrCreateSheet()
    
    // Process in smaller chunks to avoid timeout
    const CHUNK_SIZE = 100
    let processed = 0
    
    for (let i = 0; i < subdomains.length; i += CHUNK_SIZE) {
      // Check if we're approaching timeout
      if (new Date().getTime() - startTime > MAX_EXECUTION_TIME) {
        console.log('Approaching timeout, stopping at:', processed)
        break
      }
      
      const chunk = subdomains.slice(i, i + CHUNK_SIZE)
      const rows = chunk.map(sub => [
        sub.domain,
        sub.source,
        new Date(sub.timestamp).toISOString(),
        sub.origin || 'Unknown',
        new Date().toISOString()
      ])
      
      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows)
        processed += rows.length
      }
      
      // Small delay to prevent rate limiting
      if (i + CHUNK_SIZE < subdomains.length) {
        Utilities.sleep(100) // 100ms delay
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        added: processed,
        total_requested: subdomains.length,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

/**
 * Get or create the spreadsheet and sheet
 */
function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME)
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME)
    // Add headers
    sheet.getRange(1, 1, 1, 5).setValues([
      ['Domain', 'Source', 'Found At', 'Origin', 'Synced At']
    ])
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold')
  }
  
  return sheet
}

/**
 * Setup function - run this once to initialize
 */
function setup() {
  try {
    const sheet = getOrCreateSheet()
    Logger.log('Sheet created/verified: ' + CONFIG.SHEET_NAME)
    Logger.log('Spreadsheet ID: ' + CONFIG.SPREADSHEET_ID)
    return 'Setup completed successfully'
  } catch (error) {
    Logger.log('Setup error: ' + error.toString())
    return 'Setup failed: ' + error.toString()
  }
}

/**
 * Test function to verify everything works
 */
function testAPI() {
  const testData = [{
    domain: 'api.example.com',
    source: 'Test',
    timestamp: Date.now(),
    origin: 'test.com'
  }]
  
  return addSubdomains(testData)
}