class PopupManager {
  constructor() {
    this.currentFilter = 'all'
    this.subdomains = []
    this.init()
  }

  async init() {
    await this.loadSubdomains()
    this.setupEventListeners()
    this.updateCurrentDomain()
    this.render()
  }

  async loadSubdomains() {
    try {
      const result = await chrome.storage.local.get(['subdomains'])
      this.subdomains = result.subdomains || []
    } catch (error) {
      console.error('Error loading subdomains:', error)
      this.subdomains = []
    }
  }

  setupEventListeners() {
    // Refresh button
    document
      .getElementById('refreshBtn')
      .addEventListener('click', async () => {
        await this.loadSubdomains()
        this.render()
      })

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', async () => {
      if (confirm('Clear all collected subdomains?')) {
        await chrome.storage.local.clear()
        this.subdomains = []
        this.render()
      }
    })

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportSubdomains()
    })

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document
          .querySelectorAll('.filter-tab')
          .forEach((t) => t.classList.remove('active'))
        tab.classList.add('active')
        this.currentFilter = tab.dataset.filter
        this.render()
      })
    })
  }

  async updateCurrentDomain() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tab && tab.url) {
        const url = new URL(tab.url)
        document.getElementById(
          'currentDomain'
        ).textContent = `Current: ${url.hostname}`
      }
    } catch (error) {
      document.getElementById('currentDomain').textContent = ''
    }
  }

  render() {
    this.updateStats()
    this.renderSubdomainList()
  }

  updateStats() {
    const urlCount = this.subdomains.filter((s) => s.source === 'URL').length
    const contentCount = this.subdomains.filter(
      (s) => s.source === 'Content'
    ).length

    document.getElementById('totalCount').textContent = this.subdomains.length
    document.getElementById('urlCount').textContent = urlCount
    document.getElementById('contentCount').textContent = contentCount
  }

  renderSubdomainList() {
    const listContainer = document.getElementById('subdomainList')

    // Filter subdomains
    let filteredSubdomains = this.subdomains
    if (this.currentFilter !== 'all') {
      const filterSource = this.currentFilter === 'url' ? 'URL' : 'Content'
      filteredSubdomains = this.subdomains.filter(
        (s) => s.source === filterSource
      )
    }

    // Remove duplicates and sort
    const uniqueSubdomains = this.removeDuplicates(filteredSubdomains)
    uniqueSubdomains.sort((a, b) => a.domain.localeCompare(b.domain))

    if (uniqueSubdomains.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div>🌐</div>
          <div>No subdomains found</div>
          <div style="font-size: 12px; margin-top: 10px;">
            ${
              this.currentFilter === 'all'
                ? 'Browse websites to start collecting subdomains'
                : `No subdomains found from ${this.currentFilter} source`
            }
          </div>
        </div>
      `
      return
    }

    const html = uniqueSubdomains
      .map(
        (subdomain) => `
      <div class="subdomain-item">
        <div class="subdomain-domain">${this.escapeHtml(subdomain.domain)}</div>
        <span class="subdomain-source ${subdomain.source.toLowerCase()}">${
          subdomain.source
        }</span>
      </div>
    `
      )
      .join('')

    listContainer.innerHTML = html
  }

  removeDuplicates(subdomains) {
    const seen = new Set()
    return subdomains.filter((subdomain) => {
      const key = subdomain.domain
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  exportSubdomains() {
    if (this.subdomains.length === 0) {
      alert('No subdomains to export')
      return
    }

    // Create export data
    const exportData = {
      timestamp: new Date().toISOString(),
      total_count: this.subdomains.length,
      subdomains: this.removeDuplicates(this.subdomains).map((s) => ({
        domain: s.domain,
        source: s.source,
        found_at: new Date(s.timestamp).toISOString(),
      })),
    }

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subdomains_${new Date().getTime()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager()
})
