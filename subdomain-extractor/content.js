// Content script - runs on every page to extract additional subdomains
class ContentExtractor {
  constructor() {
    this.init()
  }

  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.analyze())
    } else {
      this.analyze()
    }

    // Monitor dynamic content changes
    this.observeChanges()
  }

  analyze() {
    try {
      // Extract from page HTML
      this.extractFromHTML()

      // Extract from inline scripts
      this.extractFromScripts()

      // Extract from CSS
      this.extractFromCSS()

      // Monitor AJAX/Fetch requests
      this.interceptRequests()
    } catch (error) {
      console.log('Content analysis error:', error)
    }
  }

  extractFromHTML() {
    // Get all elements with URLs
    const elements = document.querySelectorAll(
      '[href], [src], [action], [data-url]'
    )

    elements.forEach((element) => {
      ;['href', 'src', 'action', 'data-url'].forEach((attr) => {
        const url = element.getAttribute(attr)
        if (url) {
          this.sendSubdomain(url, 'HTML')
        }
      })
    })
  }

  extractFromScripts() {
    // Get all script tags
    const scripts = document.querySelectorAll('script')

    scripts.forEach((script) => {
      if (script.textContent) {
        this.extractSubdomainsFromText(script.textContent, 'JavaScript')
      }
    })
  }

  extractFromCSS() {
    // Get all style tags and external stylesheets
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]')

    styles.forEach((style) => {
      if (style.textContent) {
        this.extractSubdomainsFromText(style.textContent, 'CSS')
      }
    })
  }

  extractSubdomainsFromText(text, source) {
    const patterns = [
      // URLs: https://api.example.com
      /(?:https?:\/\/)([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g,

      // Domain patterns: api.example.com
      /(?:^|[^a-zA-Z0-9\-\.])([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?=[^a-zA-Z0-9\-\.]|$)/g,

      // Quoted domains: "api.example.com"
      /["']([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}["']/g,
    ]

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        this.sendSubdomain(match[0], source)
      }
    })
  }

  interceptRequests() {
    // Override fetch
    const originalFetch = window.fetch
    window.fetch = (...args) => {
      if (args[0]) {
        this.sendSubdomain(args[0].toString(), 'Fetch')
      }
      return originalFetch.apply(window, args)
    }

    // Override XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (url) {
        contentExtractor.sendSubdomain(url, 'AJAX')
      }
      return originalOpen.apply(this, [method, url, ...rest])
    }
  }

  observeChanges() {
    // Watch for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.analyzeNewElement(node)
          }
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  analyzeNewElement(element) {
    // Check new element for URLs
    if (
      element.matches &&
      element.matches('[href], [src], [action], [data-url]')
    ) {
      ;['href', 'src', 'action', 'data-url'].forEach((attr) => {
        const url = element.getAttribute(attr)
        if (url) {
          this.sendSubdomain(url, 'Dynamic')
        }
      })
    }

    // Check child elements
    const children = element.querySelectorAll(
      '[href], [src], [action], [data-url]'
    )
    children.forEach((child) => {
      ;['href', 'src', 'action', 'data-url'].forEach((attr) => {
        const url = child.getAttribute(attr)
        if (url) {
          this.sendSubdomain(url, 'Dynamic')
        }
      })
    })
  }

  sendSubdomain(url, source) {
    try {
      const subdomain = this.extractSubdomain(url)
      if (subdomain && this.isValidSubdomain(subdomain)) {
        // Send to background script
        chrome.runtime.sendMessage({
          type: 'subdomain_found',
          subdomain: subdomain,
          source: source,
          url: window.location.href,
        })
      }
    } catch (error) {
      // Ignore errors
    }
  }

  extractSubdomain(url) {
    try {
      // Handle relative URLs
      if (url.startsWith('/')) {
        url = window.location.origin + url
      } else if (!url.includes('://')) {
        url = 'https://' + url
      }

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
      !/^\d+\.\d+\.\d+\.\d+$/.test(subdomain) && // Not an IP
      subdomain.length > 3
    )
  }
}

// Initialize content extractor
const contentExtractor = new ContentExtractor()
