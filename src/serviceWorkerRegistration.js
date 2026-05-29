export function register() {
  if ('serviceWorker' in navigator) {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl).then((registration) => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available; please refresh.');
            }
          };
        };
      }).catch((error) => {
        console.error('SW registration failed:', error);
      });
    });
  }
}
