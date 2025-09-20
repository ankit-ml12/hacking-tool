// Firefox Content Script
class ContentExtractor {
  constructor() {
    this.init()
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.analyze())
    } else {
      this.analyze()
    }
    this.observeChanges()
  }

  analyze() {
    try {
      this.extractFromHTML()
      this.extractFromScripts()
      this.extractFromCSS()
      this.interceptRequests()
    } catch (error) {
      console.log('Content analysis error:', error)
    }
  }

  extractFromHTML() {
    const elements = document.querySelectorAll('[href], [src], [action], [data-url]')
    elements.forEach((element) => {
      ['href', 'src', 'action', 'data-url'].forEach((attr) => {
        const url = element.getAttribute(attr)
        if (url) {
          this.sendSubdomain(url, 'HTML')
        }
      })
    })
  }

  extractFromScripts() {
    const scripts = document.querySelectorAll('script')
    scripts.forEach((script) => {
      if (script.textContent) {
        this.extractSubdomainsFromText(script.textContent, 'JavaScript')
      }
    })
  }

  extractFromCSS() {
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
    styles.forEach((style) => {
      if (style.textContent) {
        this.extractSubdomainsFromText(style.textContent, 'CSS')
      }
    })
  }

  extractSubdomainsFromText(text, source) {
    const patterns = [
      // Full URLs: https://api.example.com
      /https?:\/\/([a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}/g,
      // Quoted domains: "api.example.com"
      /["']([a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}["']/g,
    ]

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        let url = match[0].replace(/["']/g, '')
        if (!url.startsWith('http')) {
          url = 'https://' + url
        }
        this.sendSubdomain(url, source)
      }
    })
  }

  interceptRequests() {
    try {
      // Try to intercept fetch if possible
      if (window.fetch && typeof window.fetch === 'function') {
        const originalFetch = window.fetch
        window.fetch = (...args) => {
          if (args[0]) {
            this.sendSubdomain(args[0].toString(), 'Fetch')
          }
          return originalFetch.apply(window, args)
        }
      }
    } catch (e) {
      console.log('Cannot intercept fetch:', e)
    }

    try {
      // Intercept XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (url) {
          contentExtractor.sendSubdomain(url, 'AJAX')
        }
        return originalOpen.apply(this, [method, url, ...rest])
      }
    } catch (e) {
      console.log('Cannot intercept XMLHttpRequest:', e)
    }
  }

  observeChanges() {
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
    if (element.matches && element.matches('[href], [src], [action], [data-url]')) {
      ['href', 'src', 'action', 'data-url'].forEach((attr) => {
        const url = element.getAttribute(attr)
        if (url) {
          this.sendSubdomain(url, 'Dynamic')
        }
      })
    }

    const children = element.querySelectorAll('[href], [src], [action], [data-url]')
    children.forEach((child) => {
      ['href', 'src', 'action', 'data-url'].forEach((attr) => {
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
      console.log('Checking subdomain:', subdomain, 'from:', url, 'source:', source)
      if (subdomain && this.isValidSubdomain(subdomain)) {
        console.log('Valid subdomain found:', subdomain)
        // Send to background script
        try {
          if (typeof browser !== 'undefined' && browser.runtime) {
            browser.runtime.sendMessage({
              type: 'subdomain_found',
              subdomain: subdomain,
              source: source,
              url: window.location.href,
            })
          } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
              type: 'subdomain_found',
              subdomain: subdomain,
              source: source,
              url: window.location.href,
            })
          }
          console.log('Message sent to background:', subdomain)
        } catch (msgError) {
          console.log('Failed to send message:', msgError)
        }
      }
    } catch (error) {
      console.log('Error in sendSubdomain:', error)
    }
  }

  extractSubdomain(url) {
    try {
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
      subdomain.length > 3 &&
      /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(subdomain) && // Valid format
      !subdomain.includes('92m') // Filter out invalid patterns
    )
  }
}

const contentExtractor = new ContentExtractor()