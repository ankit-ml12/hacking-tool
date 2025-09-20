// Firefox Background Script with Google Sheets Integration
class SubdomainExtractor {
  constructor() {
    this.subdomains = new Set()
    this.pendingSync = []
    this.lastSyncTime = 0
    this.init()
  }

  init() {
    // Listen to web requests
    const webRequestAPI = (typeof browser !== 'undefined' && browser.webRequest) ? browser.webRequest : chrome.webRequest
    webRequestAPI.onBeforeRequest.addListener(
      (details) => this.handleRequest(details),
      { urls: ['<all_urls>'] }
    )

    // Listen for messages from content script
    const messageHandler = (message, sender) => {
      console.log('Background received message:', message)
      if (message.type === 'subdomain_found') {
        this.addSubdomain(message.subdomain, message.source)
      } else if (message.type === 'manual_sync') {
        console.log('Manual sync triggered')
        this.syncToGoogleSheets()
        return Promise.resolve({ success: true })
      }
    }
    
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.onMessage.addListener(messageHandler)
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(messageHandler)
    }

    // Auto-sync to Google Sheets
    setInterval(() => this.syncToGoogleSheets(), CONFIG.SYNC_INTERVAL)
  }

  async handleRequest(details) {
    try {
      const urlSubdomain = this.extractSubdomain(details.url)
      if (urlSubdomain) {
        this.addSubdomain(urlSubdomain, 'URL')
      }
    } catch (error) {
      console.log('Error handling request:', error)
    }
  }

  addSubdomain(subdomain, source) {
    console.log('Adding subdomain:', subdomain, 'source:', source)
    if (!this.isValidSubdomain(subdomain)) {
      console.log('Invalid subdomain rejected:', subdomain)
      return
    }

    const subdomainData = {
      domain: subdomain,
      source: source,
      timestamp: Date.now(),
      synced: false
    }

    const key = JSON.stringify({ domain: subdomain, source: source })
    if (!this.subdomains.has(key)) {
      this.subdomains.add(key)
      this.pendingSync.push(subdomainData)
      console.log('Subdomain added to pending sync:', subdomain)
      this.saveToStorage()
    }
  }

  async syncToGoogleSheets() {
    console.log('Sync check - pending items:', this.pendingSync.length)
    if (this.pendingSync.length === 0) return

    let batch = []
    try {
      batch = this.pendingSync.splice(0, CONFIG.BATCH_SIZE)
      console.log('Syncing batch:', batch.length, 'items')
      
      const result = await this.appendToSheet(batch)
      
      // Check if partial sync occurred
      if (result.added < result.total_requested) {
        console.log(`Partial sync: ${result.added}/${result.total_requested} items`)
        // Re-add unprocessed items
        const unprocessed = batch.slice(result.added)
        this.pendingSync.unshift(...unprocessed)
      }
      
      console.log(`Synced ${result.added} subdomains to Google Sheets`)
    } catch (error) {
      console.error('Google Sheets sync failed:', error)
      // Re-add failed items to pending with retry limit
      if (batch.length > 0) {
        batch.forEach(item => {
          item.retryCount = (item.retryCount || 0) + 1
          if (item.retryCount <= 3) { // Max 3 retries
            this.pendingSync.push(item)
          } else {
            console.log('Dropping item after 3 retries:', item.domain)
          }
        })
      }
    }
  }

  async appendToSheet(subdomains) {
    console.log('Sending to Apps Script URL:', CONFIG.APPS_SCRIPT_URL)
    
    const payload = {
      action: 'add_subdomains',
      subdomains: subdomains.map(sub => ({
        domain: sub.domain,
        source: sub.source,
        timestamp: sub.timestamp,
        origin: 'Firefox Extension'
      }))
    }
    
    console.log('Payload:', payload)

    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Apps Script error response:', errorText)
      throw new Error(`Apps Script error: ${response.status} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log('Apps Script raw response:', responseText)
    
    try {
      const result = JSON.parse(responseText)
      console.log('Apps Script parsed response:', result)
      return result
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError)
      console.error('Raw response was:', responseText)
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`)
    }
  }

  extractSubdomain(url) {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  isValidSubdomain(subdomain) {
    return (
      subdomain &&
      subdomain.includes('.') &&
      !subdomain.startsWith('.') &&
      !subdomain.endsWith('.') &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(subdomain) &&
      subdomain.length > 3
    )
  }

  async saveToStorage() {
    const subdomainArray = Array.from(this.subdomains).map(s => JSON.parse(s))
    const storageAPI = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : chrome.storage
    await storageAPI.local.set({ 
      subdomains: subdomainArray,
      pendingSync: this.pendingSync 
    })
  }

  async getSubdomains() {
    const storageAPI = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : chrome.storage
    const result = await storageAPI.local.get(['subdomains'])
    return result.subdomains || []
  }
}

// Initialize with config
window.CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby8Hvt_2EL4IoCA86hRThirJoVMkBD-dL61JmdHRIGO7clqGSQ-S0WsDUfNEwM3yM6E/exec',
  BATCH_SIZE: 50,
  SYNC_INTERVAL: 30000
}

console.log('Config loaded:', CONFIG)
window.extractor = new SubdomainExtractor()