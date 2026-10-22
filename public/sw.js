// TinyGig service worker: shows push notifications and opens the right page on tap.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'TinyGig', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'TinyGig', {
        body: data.body || '',
        icon: '/apple-touch-icon.png',
        badge: '/favicon.svg',
        data: { href: data.href || '/w' },
      }),
      // Tell open TinyGig tabs the push arrived, so "Send a test alert" can tell a
      // delivery problem apart from the operating system hiding the pop-up.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
        for (const w of wins) w.postMessage({ type: 'tinygig-push', title: data.title || 'TinyGig' })
      }),
    ]),
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
