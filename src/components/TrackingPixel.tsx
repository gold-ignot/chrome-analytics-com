import { headers } from 'next/headers';

export async function TrackingPixel() {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  // direct goatcounter pixel - works for everyone: no-js, ad-blockers, etc
  return (
    <img
      src={`https://chromeanalytics.goatcounter.com/count?p=${encodeURIComponent(pathname)}`}
      width="1"
      height="1"
      alt=""
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', pointerEvents: 'none' }}
    />
  );
}