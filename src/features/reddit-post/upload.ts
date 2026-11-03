import type { PostMedia } from './post'

export const POST_MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime'

/** Staff-only upload of post media to R2. Resolves with the stored media entry. */
export function uploadPostMedia(file: File, onProgress?: (pct: number) => void): Promise<PostMedia> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads/')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body: { key?: string; error?: string } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.key) {
        resolve({ key: body.key, type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name.slice(0, 200) })
      } else reject(new Error(body.error ?? 'Upload failed. Please try again.'))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection.'))
    const form = new FormData()
    form.append('file', file)
    form.append('purpose', 'post')
    xhr.send(form)
  })
}
