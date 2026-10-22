// TinyGig service worker: shows push notifications and opens the right page on tap.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'TinyGig', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'TinyGig', {
      body: data.body || '',
      icon: '/apple-touch-icon.png',
      badge: '/favicon.svg',
      data: { href: data.href || '/w' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = (event.notification.data && event.notification.data.href) || '/w'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(href)
          return w.focus()
        }
      }
      return self.clients.openWindow(href)
    }),
  )
})
