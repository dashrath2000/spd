import { useState, useEffect } from 'react';
import { isElectron } from '../lib/localDB';

/**
 * Returns true when the device has internet connectivity.
 * - In Electron: queries the main process via net.isOnline()
 * - In browser: uses navigator.onLine + window events
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function checkOnline() {
      if (isElectron() && window.electronAPI?.app?.isOnline) {
        try {
          const online = await window.electronAPI.app.isOnline();
          setIsOnline(online);
        } catch {
          setIsOnline(navigator.onLine);
        }
      } else {
        setIsOnline(navigator.onLine);
      }
    }

    // Initial check
    checkOnline();

    // Poll every 10 seconds (Electron) or rely on events (browser)
    if (isElectron()) {
      interval = setInterval(checkOnline, 10_000);
    }

    // Browser events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
