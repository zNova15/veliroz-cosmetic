# Veliroz Cosmetic

Sub-marca de skincare del ecosistema Veliroz (Cajamarca + Lima, Perú).
**Live**: https://veliroz-cosmetic.vercel.app · Deploy target futuro: `veliroz.com/cosmetic`.

## Stack

- **Next.js 16.3** App Router + React 19 + TypeScript strict
- **Tailwind CSS 4** (CSS-first `@theme` config en `globals.css`)
- Fuentes: Fraunces (serif display) + Inter (body) + JetBrains Mono (precios/ingredientes)
- **Supabase** — proyecto compartido `usfpzlxmmgruydqbymsx` (Firebase JWT + RLS + Realtime)
- **Deploy**: Vercel Hobby en `veliroz-cosmetic.vercel.app` (auto-deploy push a `main`)
- **UI**: shadcn/ui-compatible primitives + Motion + Zustand + Embla + Model-viewer (para Sprint 3D real)
- **Pagos**: Culqi + MercadoPago + Yape/Plin manual + PagoEfectivo
- **SUNAT**: Nubefact (boleta/factura electrónica automática)
- **Emails**: Resend + React Email
- **WhatsApp**: Meta Cloud API + bot custom con router
- **Analytics**: Vercel Analytics + GA4 + Meta Pixel

## Scripts

```bash
pnpm dev       # dev server con turbopack
pnpm build     # producción
pnpm start     # servir build
```

## Env vars — pendientes de configurar en Vercel

Setear en **Vercel Dashboard → Settings → Environment Variables** (Production + Preview + Development):

### YA seteadas ✓
```
NEXT_PUBLIC_SUPABASE_URL=https://usfpzlxmmgruydqbymsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

### Pagos (setear cuando abras las cuentas)

```bash
# Culqi (tarjetas) — https://panel.culqi.com/settings/api-keys
CULQI_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CULQI_PUBLIC_KEY=pk_test_...
CULQI_WEBHOOK_SECRET=...

# MercadoPago Perú — https://www.mercadopago.com.pe/developers/panel/app
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...

# Yape Business API — solicitar a BCP (3-10 días aprobación)
YAPE_BUSINESS_TOKEN=...
```

### Facturación SUNAT

```bash
# Nubefact — https://www.nubefact.com/precios (S/40/mes)
NUBEFACT_TOKEN=...
NUBEFACT_RUC_EMISOR=...
NUBEFACT_SERIE_BOLETA=B001
NUBEFACT_SERIE_FACTURA=F001
```

### Email transaccional

```bash
# Resend — https://resend.com (free tier 3000 emails/mes)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hola@veliroz.com  # requiere verificar dominio
```

### WhatsApp Bot

```bash
# Meta Cloud API — https://developers.facebook.com/docs/whatsapp/cloud-api
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=veliroz-webhook-2026  # inventar
WHATSAPP_APP_SECRET=...  # para HMAC de webhooks entrantes
```

### Analytics

```bash
# Google Analytics 4 — https://analytics.google.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Meta Pixel — https://www.facebook.com/events_manager2/list/pixel
NEXT_PUBLIC_META_PIXEL_ID=1234567890
```

### Otros

```bash
CRON_SECRET=inventar-random-64chars  # protege el cron drain-email-queue
```

## Roadmap actual

- ✅ **Sprint 0**: TLS + limpieza de código orphan + robots.txt + retiro admin público
- ✅ **Sprint 1**: fundación Next.js + design system + landing placeholder
- ✅ **Sprint 2**: catálogo con filtros multidimensionales + PDPs SSG + wishlist + CRM productos/marcas/reviews
- ✅ **Sprint 3-4**: cart drawer + checkout multi-step + Culqi/MP/Yape/Plin + Nubefact + Resend + WhatsApp bot + blog MDX + quiz + feeds Google/Meta + analytics

## Backend

Migraciones aplicadas en Supabase (project `usfpzlxmmgruydqbymsx`):
- 001-006: base Veliroz Flores/Bienestar/Chocotejas
- **007**: marcas + productos + variantes_producto + lotes_inventario + bundle_composicion + reviews + trigger sync catalogo + RLS
- **008**: seed 7 productos hero + 7 variantes (The Ordinary, CeraVe, Beauty of Joseon, COSRX, Xhekpon)
- **008 (CRM repo)**: reviews moderación (rechazado + updated_at + moderado_por + policy staff_read)
- **009**: cupones v2 (tipo_regla + scope_id + bogo + max_por_cliente) + seed COSMETIC10 + ENVIOGRATIS
- **010**: email_queue + triggers auto pedidos INSERT/estado
- **011**: comprobantes_electronicos + trigger auto pedido pagado

## Cron jobs (Vercel)

Config en `vercel.json`:
- `/api/cron/drain-email-queue` cada 5 min → procesa cola de emails pendientes

## Docs

- `docs/proveedores.md` — hit list Sumak/Kabuki/KORE4N/Novafarmawimer + 7 SKUs + compliance mes 0
- Plan completo del proyecto: `/Users/macbookpro/.claude/plans/mellow-skipping-karp.md`

## URLs live

- Landing: https://veliroz-cosmetic.vercel.app/
- Catálogo: https://veliroz-cosmetic.vercel.app/cosmetic/productos
- PDP: https://veliroz-cosmetic.vercel.app/cosmetic/producto/[slug]
- Blog: https://veliroz-cosmetic.vercel.app/cosmetic/blog
- Quiz: https://veliroz-cosmetic.vercel.app/cosmetic/quiz
- Rutinas: https://veliroz-cosmetic.vercel.app/cosmetic/rutinas
- Marcas: https://veliroz-cosmetic.vercel.app/cosmetic/marcas
- Checkout: https://veliroz-cosmetic.vercel.app/cosmetic/pago
- Feeds: `/api/feeds/google-merchant.xml` + `/api/feeds/meta-catalog.csv`
- Sitemap: `/sitemap.xml`
