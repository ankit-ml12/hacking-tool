// Test script to manually add subdomains for debugging
// Run this in the background script console

console.log('Testing background script...')

// Simulate receiving a message
const testMessage = {
  type: 'subdomain_found',
  subdomain: 'api.test.com',
  source: 'Test',
  url: 'https://test.com'
}

console.log('Simulating message:', testMessage)

// Manually call the handler
if (typeof extractor !== 'undefined') {
  extractor.addSubdomain(testMessage.subdomain, testMessage.source)
} else {
  console.log('Extractor not found - check if background script loaded')
}

// Check storage
setTimeout(async () => {
  const storageAPI = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : chrome.storage
  const result = await storageAPI.local.get(['subdomains', 'pendingSync'])
  console.log('Storage check:', result)
}, 1000)