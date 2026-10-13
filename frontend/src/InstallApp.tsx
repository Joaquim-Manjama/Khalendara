import { useEffect, useState } from 'react'
interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [help, setHelp] = useState(false)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches
    || !!(navigator as Navigator & { standalone?: boolean }).standalone)
  const [offline, setOffline] = useState(() => !navigator.onLine)
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const complete = () => { setInstalled(true); setPrompt(null); setHelp(false) }
    const connectivity = () => setOffline(!navigator.onLine)
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', complete)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', complete)
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
    }
  }, [])
  const install = async () => {
    if (!prompt) { setHelp(!help); return }
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
    } catch { setHelp(true) }
    finally { setPrompt(null) }
  }
  return <div className="pwa-controls">
    {offline && <p className="pwa-offline" role="status">You're offline. Connect to load or change events.</p>}
    {!installed && <>
      {help && <div className="pwa-help" role="region" aria-label="Install instructions"><strong>Keep Khalendara on your home screen</strong><p>On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen.</p><p>On Android, open your browser menu and choose Install app or Add to Home screen.</p><button onClick={() => setHelp(false)}>Got it</button></div>}
      <button className="pwa-install" onClick={() => void install()} aria-expanded={help}>↓ Install app</button>
    </>}
  </div>
}
