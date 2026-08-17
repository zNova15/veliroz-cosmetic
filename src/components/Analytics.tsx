"use client";

import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

/* ============================================================
   Veliroz Cosmetic — <Analytics />
   ---------------------------------------------------------
   Client component que monta los 3 tracks del site:

   1. Vercel Web Analytics — auto-carga desde el paquete oficial.
      Se activa solo cuando el bundle está deployado en Vercel;
      en local es un no-op silencioso.
   2. Google Analytics 4 (gtag) — via next/script strategy
      "afterInteractive". Se salta el render si NEXT_PUBLIC_GA_ID
      no está seteado (fallback silencioso).
   3. Meta Pixel (Facebook/Instagram) — idem con
      NEXT_PUBLIC_META_PIXEL_ID.

   Las funciones window.gtag y window.fbq quedan disponibles
   globalmente para los helpers de src/lib/track.ts.
   ============================================================ */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function Analytics() {
  return (
    <>
      {/* Vercel Web Analytics — self-contained, respeta DNT */}
      <VercelAnalytics />

      {/* Google Analytics 4 */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                anonymize_ip: true,
                allow_google_signals: false
              });
            `}
          </Script>
        </>
      )}

      {/* Meta Pixel */}
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){
                if(f.fbq)return;n=f.fbq=function(){
                  n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)
                };
                if(!f._fbq)f._fbq=n;
                n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
                t=b.createElement(e); t.async=!0;
                t.src=v;
                s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)
              }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          {/* Noscript fallback para el pixel de FB */}
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}

/* Tipado global para gtag y fbq — usado por src/lib/track.ts */
declare global {
  interface Window {
    gtag?: (
      command: "config" | "event" | "js" | "set" | "consent",
      targetOrEventName: string | Date,
      params?: Record<string, unknown>
    ) => void;
    fbq?: (
      command: "init" | "track" | "trackCustom",
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}
