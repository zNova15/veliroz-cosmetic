"use client";

import { useCheckoutStore } from "@/lib/checkout-store";
import { Tab } from "./FormField";
import type { StepValidator } from "./validators";

/* ============================================================
   Step 3 · Método de pago
   Tabs: Culqi · Yape · Plin · MercadoPago · PagoEfectivo
   - Culqi/MP: placeholder de Payment Brick (env vars pendientes).
   - Yape/Plin: QR placeholder + número + banner WhatsApp.
   - PagoEfectivo: placeholder con instrucciones.
   La confirmación real la dispara el sidebar OrderSummary.
   ============================================================ */

const YAPE_NUM = "967 456 364";
const WA_NUM = "51967456364";

interface Props {
  totalMostrado: number;
}

export function StepPago({ totalMostrado }: Props) {
  const s = useCheckoutStore();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
          · Paso 3 de 3 ·
        </span>
        <h2 className="font-serif text-2xl md:text-3xl text-ink">
          ¿Cómo pagas?
        </h2>
        <p className="text-sm text-clay">
          Elige el método que más te convenga — todo el proceso está encriptado.
        </p>
      </header>

      {/* Tabs métodos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Tab
          active={s.metodoPago === "culqi"}
          onClick={() => s.patch({ metodoPago: "culqi" })}
          title="Tarjeta · Culqi"
          sub="Visa · Mastercard · Amex"
          icon={<IconCard />}
        />
        <Tab
          active={s.metodoPago === "mercadopago"}
          onClick={() => s.patch({ metodoPago: "mercadopago" })}
          title="MercadoPago"
          sub="Tarjeta · cuotas · saldo MP"
          icon={<IconMp />}
        />
        <Tab
          active={s.metodoPago === "yape"}
          onClick={() => s.patch({ metodoPago: "yape" })}
          title="Yape"
          sub="Escanea el QR desde la app"
          icon={<IconYape />}
        />
        <Tab
          active={s.metodoPago === "plin"}
          onClick={() => s.patch({ metodoPago: "plin" })}
          title="Plin"
          sub="Escanea el QR desde tu banca"
          icon={<IconPlin />}
        />
        <Tab
          active={s.metodoPago === "pagoefectivo"}
          onClick={() => s.patch({ metodoPago: "pagoefectivo" })}
          title="PagoEfectivo"
          sub="BCP · Interbank · agentes"
          icon={<IconEfectivo />}
        />
      </div>

      {/* Detalle según método */}
      <div className="border border-[--border-2] rounded-lg p-5 md:p-6 bg-surface">
        {s.metodoPago === "culqi" && <BloqueCulqi total={totalMostrado} />}
        {s.metodoPago === "mercadopago" && <BloqueMp total={totalMostrado} />}
        {s.metodoPago === "yape" && <BloqueQr marca="Yape" total={totalMostrado} numero={YAPE_NUM} />}
        {s.metodoPago === "plin" && <BloqueQr marca="Plin" total={totalMostrado} numero={YAPE_NUM} />}
        {s.metodoPago === "pagoefectivo" && <BloqueEfectivo total={totalMostrado} />}
      </div>

      <p className="text-[11px] text-clay leading-relaxed">
        Al confirmar aceptas nuestros{" "}
        <a href="/terminos" className="underline underline-offset-2">Términos</a>{" "}
        y la{" "}
        <a href="/privacidad" className="underline underline-offset-2">
          Política de privacidad
        </a>
        . Guardamos tus datos bajo la Ley 29733 (PDP · Perú).
      </p>
    </div>
  );
}

/* Ningún campo obligatorio adicional para el paso 3 (por ahora Bricks
   no está montado). El validador solo confirma que hay método pago. */
export const validateStepPago: StepValidator = (s) => {
  const errors: Record<string, string> = {};
  if (!s.metodoPago) errors.metodoPago = "Elige un método";
  return errors;
};

/* ---------------- Bloques por método ---------------- */

function BloqueCulqi({ total }: { total: number }) {
  return (
    <div className="space-y-3">
      <p className="font-serif text-lg text-ink">Pagar con tarjeta</p>
      <div className="rounded-md border border-dashed border-[--border-2] bg-mist/40 p-6 text-center">
        <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-taupe">
          · Payment Brick ·
        </span>
        <p className="mt-2 text-sm text-clay text-pretty">
          Culqi Payment Brick — pendiente configurar{" "}
          <code className="font-mono text-[11px] bg-cream px-1 rounded">
            CULQI_PUBLIC_KEY
          </code>{" "}
          en Vercel.
        </p>
      </div>
      <p className="text-xs text-clay">
        Total a cobrar:{" "}
        <span className="font-mono text-ink">S/{total.toFixed(2)}</span>
      </p>
    </div>
  );
}

function BloqueMp({ total }: { total: number }) {
  return (
    <div className="space-y-3">
      <p className="font-serif text-lg text-ink">MercadoPago</p>
      <div className="rounded-md border border-dashed border-[--border-2] bg-mist/40 p-6 text-center">
        <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-taupe">
          · Payment Brick MP ·
        </span>
        <p className="mt-2 text-sm text-clay text-pretty">
          MercadoPago Payment Brick — pendiente configurar{" "}
          <code className="font-mono text-[11px] bg-cream px-1 rounded">
            NEXT_PUBLIC_MP_PUBLIC_KEY
          </code>{" "}
          en Vercel.
        </p>
      </div>
      <p className="text-xs text-clay">
        Total a cobrar:{" "}
        <span className="font-mono text-ink">S/{total.toFixed(2)}</span>
      </p>
    </div>
  );
}

function BloqueQr({ marca, total, numero }: { marca: string; total: number; numero: string }) {
  const waHref =
    "https://wa.me/" +
    WA_NUM +
    "?text=" +
    encodeURIComponent(`Hola, te envío el voucher de ${marca} por S/${total.toFixed(2)}.`);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[168px_1fr] gap-6 items-center">
      {/* QR placeholder — layout gráfico simple sin dependencias */}
      <div
        className="w-40 h-40 rounded-md bg-cream border border-[--border-2] p-3 relative overflow-hidden"
        aria-label={`Código QR de ${marca}`}
      >
        <QrPattern />
        <span className="absolute bottom-1 inset-x-0 text-center font-mono text-[8px] tracking-[0.2em] uppercase text-clay">
          {marca}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="font-serif text-lg text-ink">Pagar con {marca}</p>
          <p className="text-sm text-clay">
            Escanea el código o transfiere al número
          </p>
        </div>
        <div className="bg-mist rounded-md px-4 py-3 flex items-baseline gap-3">
          <span className="font-mono text-xs uppercase text-taupe">Nº</span>
          <span className="font-mono text-lg text-ink tracking-wider">
            +51 {numero}
          </span>
        </div>
        <div className="bg-champagne/20 border border-champagne/40 rounded-md p-3 text-sm text-ink flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 text-champagne-dark" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
          <span>
            Después del pago,{" "}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 font-medium"
            >
              envía el voucher por WhatsApp
            </a>{" "}
            para confirmar tu pedido en el día.
          </span>
        </div>
        <p className="text-xs text-clay">
          Monto exacto:{" "}
          <span className="font-mono text-ink">S/{total.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

function BloqueEfectivo({ total }: { total: number }) {
  return (
    <div className="space-y-3">
      <p className="font-serif text-lg text-ink">PagoEfectivo</p>
      <div className="rounded-md border border-dashed border-[--border-2] bg-mist/40 p-6 text-center">
        <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-taupe">
          · Cash-in ·
        </span>
        <p className="mt-2 text-sm text-clay text-pretty">
          Al confirmar te generaremos un CIP para pagar en agentes BCP,
          Interbank y afiliados de PagoEfectivo. Vence en 24 h.
        </p>
      </div>
      <p className="text-xs text-clay">
        Total a cobrar:{" "}
        <span className="font-mono text-ink">S/{total.toFixed(2)}</span>
      </p>
    </div>
  );
}

/* ---------------- Iconos ---------------- */

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M3 10h18 M7 15h4" />
    </svg>
  );
}
function IconMp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M8 12c2 2 6 2 8 0 M8 14c2 2 6 2 8 0" />
    </svg>
  );
}
function IconYape() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path strokeLinecap="round" d="M12 17h.01" />
    </svg>
  );
}
function IconPlin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l4-4h8l4 4-4 4H8z" />
    </svg>
  );
}
function IconEfectivo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

/* QR placeholder — patrón decorativo (no es un QR real). */
function QrPattern() {
  return (
    <svg viewBox="0 0 33 33" className="w-full h-full" aria-hidden>
      {/* Corners */}
      {[
        [0, 0],
        [26, 0],
        [0, 26],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width={7} height={7} fill="var(--veliroz-ink)" />
          <rect
            x={x + 1}
            y={y + 1}
            width={5}
            height={5}
            fill="var(--veliroz-cream)"
          />
          <rect
            x={x + 2}
            y={y + 2}
            width={3}
            height={3}
            fill="var(--veliroz-ink)"
          />
        </g>
      ))}
      {/* Random-ish pattern (determinístico para SSR) */}
      {Array.from({ length: 210 }).map((_, i) => {
        const x = (i * 7) % 33;
        const y = Math.floor((i * 7) / 33) % 33;
        const inCorner =
          (x < 8 && y < 8) ||
          (x > 25 && y < 8) ||
          (x < 8 && y > 25);
        if (inCorner) return null;
        if ((i * 13) % 3 === 0) return null;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="var(--veliroz-ink)"
          />
        );
      })}
    </svg>
  );
}
