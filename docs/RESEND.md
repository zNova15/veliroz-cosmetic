# Correo transaccional — puesta en marcha

Todo el código está escrito y probado. Lo que falta es una cuenta, tres
registros DNS y dos variables de entorno. Son unos 15 minutos.

## Cómo está armado

Nadie envía un correo en el momento del pago. Un trigger en Postgres
deja el pedido anotado en `email_queue`, y un cron cada 10 minutos lo
recoge y lo despacha por Resend.

```
pedido cambia de estado
   └─ trigger trg_encolar_email_pedido  →  email_queue (estado 'pendiente')
                                              │
             cron cada 10 min ──────────────► /api/cron/drain-email-queue
                                              │
                                    Resend ───┴──► la clienta
```

Va con cola y no en línea porque si Resend está caído o lento, un envío
directo o bien bloquea la confirmación del pago o bien se pierde sin
dejar rastro. Con cola, el pedido se confirma siempre y el correo se
reintenta hasta 5 veces antes de marcarse `fallido`.

Los cinco correos ya escritos, en `src/emails/`:

| Cuándo | Plantilla |
|---|---|
| Se crea el pedido | `PedidoCreado.tsx` |
| El pago se aprueba | `PedidoPagado.tsx` |
| Sale a reparto | `PedidoEnReparto.tsx` |
| Se entrega | `PedidoEntregado.tsx` |
| 7 días después de entregado | pide reseña |

## Los pasos

### 1. Cuenta y dominio (5 min)

En [resend.com](https://resend.com) → **Domains** → **Add Domain** →
`veliroz.com`, región **us-east-1** (la más cercana a Perú).

Resend muestra **tres registros**. Van en Cloudflare → veliroz.com →
DNS → Add record, **copiados tal cual**:

| Tipo | Nombre | Contenido |
|---|---|---|
| TXT | `resend._domainkey` | la llave larga que muestra Resend |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com`, prioridad 10 |

En Cloudflare, **la nube tiene que quedar gris** (DNS only) en todos.
Si queda naranja, Cloudflare intercepta el registro y Resend nunca
verifica el dominio.

Conviene agregar un cuarto, que Resend no pide pero Gmail sí mira —
sin DMARC, el correo de un dominio nuevo suele caer en spam:

| Tipo | Nombre | Contenido |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hola@veliroz.com` |

Después de pegarlos:

```bash
bash scripts/verificar-email-dns.sh
```

Propagar toma entre 1 y 5 minutos. Recién cuando el script los dé por
buenos, volver a Resend y darle **Verify**.

### 2. Que las respuestas lleguen a algún lado

Los correos salen desde `hola@veliroz.com`. Hoy ese buzón **no existe**:
si una clienta responde su confirmación, el mensaje rebota y nadie se
entera.

Cloudflare → **Email** → **Email Routing** → habilitar → reenviar
`hola@veliroz.com` a la casilla de Gmail que se lee todos los días.
Es gratis y agrega solo los MX de la raíz, que no chocan con los de
Resend (esos viven en `send.veliroz.com`).

### 3. Las variables en Vercel

Resend → **API Keys** → **Create** → permiso *Sending access*.

En Vercel → veliroz-cosmetic → Settings → Environment Variables, las
tres en **Production**:

| Variable | De dónde sale |
|---|---|
| `RESEND_API_KEY` | la key recién creada, empieza con `re_` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `CRON_SECRET` | inventada: `openssl rand -hex 32` |

`SUPABASE_SERVICE_ROLE_KEY` no es opcional. `email_queue` tiene RLS
activo y ninguna policy a propósito, porque guarda nombre y correo de
clientas — dato personal bajo la Ley 29733. La clave anon viaja en el
bundle del navegador y no debe poder leer esa tabla ni por accidente.

Esa clave da acceso total a la base y **nunca va al repositorio**.

### 4. La migración

Supabase → SQL Editor del proyecto `usfpzlxmmgruydqbymsx` — verificar
el id antes de ejecutar — y correr entera
`supabase/migrations/029_email_queue.sql`.

Crea la cola, sus índices, el RLS y el trigger. Es idempotente: correrla
dos veces no rompe nada.

### 5. Comprobar que anda

Con todo desplegado:

```bash
curl -s -H "x-cron-secret: $CRON_SECRET" \
  https://veliroz.com/api/cron/drain-email-queue | jq
```

Debe responder `{"ok": true, "usingServiceRole": true, ...}`.

Si dice `"error": "sin_service_role"`, falta la variable del paso 3 —
el drainer falla a propósito en vez de reportar cero envíos, que es lo
que parecería si se dejara pasar.

La prueba de verdad es un pedido real: comprar algo, marcarlo `pagado`
en Supabase, y ver llegar la confirmación en menos de 10 minutos.
Mientras tanto, la cola se puede mirar:

```sql
select tipo, estado, intentos, ultimo_error, scheduled_at
  from email_queue order by created_at desc limit 20;
```

## Límites del plan gratis

3.000 correos al mes y 100 por día. A 4 correos por pedido, alcanza
para unos 25 pedidos diarios — bastante más de lo que hoy entra.
