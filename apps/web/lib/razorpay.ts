let razorpayScriptPromise: Promise<boolean> | null = null;

/**
 * Loads the Razorpay Checkout SDK once cleanly and avoids duplicate DOM tags.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean((window as any).Razorpay)), { once: true });
      existing.addEventListener(
        'error',
        () => {
          razorpayScriptPromise = null;
          resolve(false);
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean((window as any).Razorpay));
    script.onerror = () => {
      razorpayScriptPromise = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

