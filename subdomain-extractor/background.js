// Background script - monitors all network requests
class SubdomainExtractor {
  constructor() {
    this.subdomains = new Set()
    this.currentTabId = null
    this.init()
  }

  init() {
    // Listen to all web requests
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => this.handleRequest(details),
      { urls: ['<all_urls>'] }
    )

    // Track active tab
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.currentTabId = activeInfo.tabId
    })

    // Clear data when navigating to new domain
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading' && tab.url) {
        const domain = this.extractDomain(tab.url)
        if (domain !== this.lastDomain) {
          this.clearSubdomains()
          this.lastDomain = domain
        }
      }
    })
  }

  async handleRequest(details) {
    try {
      // Extract subdomain from URL
      const urlSubdomain = this.extractSubdomain(details.url)
      if (urlSubdomain) {
        this.addSubdomain(urlSubdomain, 'URL')
      }

      // Only process certain file types for content analysis
      if (this.shouldAnalyzeContent(details.url)) {
        this.analyzeFileContent(details.url)
      }
    } catch (error) {
      console.log('Error handling request:', error)
    }
  }

  shouldAnalyzeContent(url) {
    const contentTypes = ['.js', '.html', '.htm', '.css', '.json', '.xml']
    return (
      contentTypes.some((type) => url.toLowerCase().includes(type)) ||
      url.includes('api') ||
      url.includes('ajax')
    )
  }

  async analyzeFileContent(url) {
    try {
      const response = await fetch(url)
      const content = await response.text()

      // Extract subdomains from file content
      const contentSubdomains = this.extractSubdomainsFromText(content)
      contentSubdomains.forEach((subdomain) => {
        this.addSubdomain(subdomain, 'Content')
      })
    } catch (error) {
      // Ignore fetch errors (CORS, etc.)
    }
  }

  extractSubdomainsFromText(text) {
    const subdomains = new Set()

    // Multiple regex patterns for different formats
    const patterns = [
      // Standard URLs: https://api.example.com
      /(?:https?:\/\/)([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s"']*)?/g,

      // Domain only: api.example.com
      /(?:^|[^a-zA-Z0-9\-])([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?=[^a-zA-Z0-9\-]|$)/g,

      // Quoted strings: "api.example.com"
      /["']([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}["']/g,

      // URL encoded: %2F%2Fapi.example.com
      /%2F%2F([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g,
    ]

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const found = match[0].replace(/["'%2F]/g, '').replace(/^\/\//, '')
        const subdomain = this.extractSubdomain('https://' + found)
        if (subdomain && this.isValidSubdomain(subdomain)) {
          subdomains.add(subdomain)
        }
      }
    })

    return Array.from(subdomains)
  }

  extractSubdomain(url) {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  extractDomain(url) {
    try {
      const hostname = new URL(url).hostname
      const parts = hostname.split('.')
      return parts.slice(-2).join('.')
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
      !/^\d+\.\d+\.\d+\.\d+$/.test(subdomain)
    ) // Not an IP
  }

  addSubdomain(subdomain, source) {
    const subdomainData = {
      domain: subdomain,
      source: source,
      timestamp: Date.now(),
    }

    this.subdomains.add(JSON.stringify(subdomainData))
    this.saveToStorage()
  }

  clearSubdomains() {
    this.subdomains.clear()
    this.saveToStorage()
  }

  async saveToStorage() {
    const subdomainArray = Array.from(this.subdomains).map((s) => JSON.parse(s))
    await chrome.storage.local.set({ subdomains: subdomainArray })
  }

  async getSubdomains() {
    const result = await chrome.storage.local.get(['subdomains'])
    return result.subdomains || []
  }
}

// Initialize the extractor
new SubdomainExtractor()
