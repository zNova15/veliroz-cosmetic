import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, hayServiceRole } from "@/lib/supabase-admin";
import {
  createPreference,
  mpDisponible,
  type PedidoParaMP,
} from "@/lib/mercadopago";

/* ============================================================
   POST /api/pagos/mercadopago/preference
   -------------------------------------------------------------
   Body: { pedido_codigo: "VLZ-…" }
   Devuelve: { ok: true, init_point, preference_id }

   El checkout crea el pedido primero (RPC crear_pedido) y recién
   después pide la preference: así el pedido existe aunque la persona
   abandone la pasarela, y `external_reference` = pedido_codigo es lo
   único que ata el pago al pedido cuando vuelve el webhook.

   EL MONTO NO VIENE DEL NAVEGADOR. Se lee de `pedidos` con el cliente
   service_role y se cobra ESO. Aceptar el total que manda el cliente es
   el error clásico de todo checkout con pasarela: quien edite el fetch
   paga S/1 por un pedido de S/300 y el webhook lo marca 'pagado' igual,
   porque MP confirma que el pago se hizo, no que el monto sea el justo.

   Por qué service_role y no la anon key: `pedidos` tiene RLS y con la
   anon un SELECT devuelve cero filas sin error — el endpoint diría
   "pedido no encontrado" para todos los pedidos del mundo.

   Idempotencia: pedir dos veces la preference del mismo pedido crea dos
   preferences en MP, y eso está bien (la segunda es un reintento tras
   un abandono). Lo que NO se hace es armar preference de un pedido ya
   pagado o cancelado: eso sería cobrar dos veces.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PreferenceBody {
  pedido_codigo?: string;
}

interface PedidoRow {
  id: string;
  pedido_codigo: string;
  cliente_email: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  total: number | null;
  costo_envio: number | null;
  estado: string | null;
}

interface LineaRow {
  producto_id: string | null;
  nombre: string | null;
  precio_unit: number | null;
  cantidad: number | null;
  imagen: string | null;
}

export async function POST(req: NextRequest) {
  let body: PreferenceBody;
  try {
    body = (await req.json()) as PreferenceBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const codigo = body?.pedido_codigo?.trim();
  if (!codigo) {
    return NextResponse.json(
      { ok: false, error: "pedido_codigo requerido" },
      { status: 400 }
    );
  }

  if (!mpDisponible()) {
    /* 503 y no 500: no está roto, está sin credencial. El checkout lo
       traduce a "elige otro método" en vez de a "algo explotó". */
    return NextResponse.json(
      {
        ok: false,
        error: "mp_no_configurado",
        hint: "Falta MERCADOPAGO_ACCESS_TOKEN en Vercel.",
      },
      { status: 503 }
    );
  }

  if (!hayServiceRole()) {
    return NextResponse.json(
      {
        ok: false,
        error: "sin_service_role",
        hint:
          "pedidos tiene RLS: con la anon key el SELECT devuelve 0 filas sin " +
          "error. Configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      },
      { status: 500 }
    );
  }

  const sb = getSupabaseAdmin();

  const { data: pedidoData, error: errPedido } = await sb
    .from("pedidos")
    .select(
      "id, pedido_codigo, cliente_email, cliente_nombre, cliente_telefono, total, costo_envio, estado"
    )
    .eq("pedido_codigo", codigo)
    .maybeSingle();

  if (errPedido) {
    console.error("[mp/preference] lectura del pedido falló:", errPedido);
    return NextResponse.json(
      { ok: false, error: `lectura: ${errPedido.message}` },
      { status: 500 }
    );
  }

  const pedido = (pedidoData as PedidoRow | null) ?? null;
  if (!pedido) {
    return NextResponse.json(
      { ok: false, error: "pedido_no_encontrado" },
      { status: 404 }
    );
  }

  if (pedido.estado === "pagado") {
    return NextResponse.json(
      { ok: false, error: "pedido_ya_pagado" },
      { status: 409 }
    );
  }
  if (pedido.estado === "cancelado") {
    return NextResponse.json(
      { ok: false, error: "pedido_cancelado" },
      { status: 409 }
    );
  }

  const total = Number(pedido.total ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    console.error("[mp/preference] total inválido en", codigo, pedido.total);
    return NextResponse.json(
      { ok: false, error: "total_invalido" },
      { status: 422 }
    );
  }

  const { data: lineasData, error: errLineas } = await sb
    .from("lineas_pedido")
    .select("producto_id, nombre, precio_unit, cantidad, imagen")
    .eq("pedido_id", pedido.id);

  if (errLineas) {
    console.error("[mp/preference] lectura de líneas falló:", errLineas);
    return NextResponse.json(
      { ok: false, error: `lineas: ${errLineas.message}` },
      { status: 500 }
    );
  }

  const lineas = (lineasData as LineaRow[] | null) ?? [];

  const pedidoMp: PedidoParaMP = {
    pedido_codigo: pedido.pedido_codigo,
    /* MP exige un email de payer; el pedido siempre trae uno (el RPC lo
       valida antes de insertar), pero si faltara mandamos vacío antes
       que romper el cobro. */
    cliente_email: pedido.cliente_email ?? "",
    cliente_nombre: pedido.cliente_nombre,
    cliente_telefono: pedido.cliente_telefono,
    total,
    costo_envio: Number(pedido.costo_envio ?? 0),
    lineas: lineas.map((l) => ({
      sku: l.producto_id ?? "item",
      nombre: l.nombre ?? "Producto Veliroz",
      cantidad: Number(l.cantidad ?? 1),
      precio_unitario: Number(l.precio_unit ?? 0),
      /* `lineas_pedido.imagen` NO guarda una URL: guarda el swatch de
         marca, que es un color hex ('#F5EFE7'). Lo llena el checkout con
         snapshot.imagenSwatch. Mandarlo como picture_url hace que
         MercadoPago muestre una imagen rota en la pantalla de pago —
         justo donde la clienta decide si confía. */
      imagen: l.imagen?.startsWith("http") ? l.imagen : null,
    })),
  };

  const pref = await createPreference(pedidoMp);
  if (!pref.ok) {
    console.error("[mp/preference] createPreference falló:", pref.error);
    return NextResponse.json(
      { ok: false, error: pref.error ?? "error_mp" },
      { status: 502 }
    );
  }

  /* Con un access token de test MP devuelve los dos; init_point ya
     apunta al entorno correcto en cada caso. */
  const initPoint = pref.init_point ?? pref.sandbox_init_point;
  if (!initPoint) {
    console.error("[mp/preference] preference sin init_point:", pref.preference_id);
    return NextResponse.json(
      { ok: false, error: "sin_init_point" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    init_point: initPoint,
    preference_id: pref.preference_id ?? null,
  });
}
