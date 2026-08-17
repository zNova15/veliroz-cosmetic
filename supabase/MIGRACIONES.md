# Inventario de migraciones — Supabase `usfpzlxmmgruydqbymsx`

Un solo proyecto Supabase da servicio a **tres frentes**: Veliroz Cosmetic (`veliroz.com`),
Flores/Bienestar/Chocotejas (`flores.veliroz.com`) y el CRM (`crm.veliroz.com`).
Por eso las migraciones están repartidas entre repos y conviene tener el orden global a la vista.

Última verificación: **17-ago-2026** con `list_migrations`.

## Estado real en la base

| Versión | Nombre | Repo donde vive el .sql | Qué hace |
|---|---|---|---|
| — | `001_schema` | `Veliroz Flores eternas/supabase/migrations/` | Base: clientes, pedidos, lineas_pedido, eventos_carrito, cupones, catalogo, RPC `crear_pedido` |
| — | `002_seed_flores` | idem | Seed de 29 SKUs de flores |
| — | `003_fix_rpc_ambiguity` | idem | Fix de alias en el INSERT de líneas |
| — | `004_crm_staff_roles` (+ a/b/c) | `Veliroz CRM/supabase/migrations/` | staff, invitaciones, roles, timeline, evidencias, audit, RLS |
| — | `005_fix_view_fecha_pedido` | idem | `v_repartos_dia` con drop+create (42P16) |
| — | `006_chocotejas_realtime` | idem | Línea chocotejas + `catalogo.stock` + Realtime |
| 20260816205850 | `007_cosmetic_productos` | ⚠️ **solo en Studio** | marcas, productos, variantes_producto, lotes_inventario, bundle_composicion, reviews + trigger de sync a `catalogo` + RLS + Realtime |
| 20260817001506 | `008_cosmetic_seed_hero` | ⚠️ **solo en Studio** | Seed inicial de 7 SKUs (reemplazado luego por la 013) |
| 20260817002125 | `007_reviews_moderacion` | `Veliroz CRM/supabase/migrations/008_reviews_moderacion.sql` | `rechazado`, `updated_at`, `moderado_por`, policy `reviews_staff_read` |
| 20260817005951 | `009_cupones_v2_cosmetic` | ⚠️ **solo en Studio** | `tipo_regla`, `scope_id`, `bogo_x/y`, `max_por_cliente` + seed COSMETIC10 y ENVIOGRATIS |
| 20260817010014 | `010_email_queue` | ⚠️ **solo en Studio** | Cola de emails + triggers en INSERT y cambio de estado de pedidos |
| 20260817010046 | `011_sunat_comprobantes` | ⚠️ **solo en Studio** | `comprobantes_electronicos` + trigger al pasar a pagado (calcula IGV 18%) |
| 20260817015413 | `012_bucket_productos_publico` | ⚠️ **solo en Studio** | Bucket `productos` público + policies |
| 20260817015452 | `012b_seed_temp_upload_policy` | ⚠️ **solo en Studio** | Policy temporal de INSERT para cargar los packshots |
| 20260817015530 | `012c_revocar_policy_temporal` | ⚠️ **solo en Studio** | Revoca la anterior (la anon key ya no escribe al bucket) |
| 20260817015759 | `013_catalogo_real_12_skus` | ⚠️ **solo en Studio** | Catálogo real: 8 marcas nuevas + 12 productos + 12 variantes, borra el seed de la 008 |
| 20260817044338 | `014_fix_imagen_mixsoon` | ⚠️ **solo en Studio** | Mixsoon apuntaba al packshot de Purito → `imagen_principal = null` |
| — | `015_desactivar_marcas_sin_productos` | ⚠️ **solo en Studio** | The Ordinary, CeraVe y Xhekpon quedaron sin productos → `activo = false` |
| 20260817… | `016_bundles_rutina` | `veliroz-cosmetic/supabase/migrations/` | ⚠️ **revertida por la 017.** Creó 3 bundles inventando precios y composiciones, ignorando que `src/lib/rutinas.ts` ya definía 5 rutinas curadas. El .sql quedó sin sentencias (su contenido no aporta al estado final) |
| 20260817… | `018_referidos` | idem (consolidada con el fix 018d) | Programa de referidos: `referidos` (código VELI-XXXX por cliente), `referidos_usos`, `referidos_config` (parámetros sin deploy), `clientes.credito_disponible`, 3 RPC SECURITY DEFINER + trigger que acredita al pasar a `pagado`. **Trampa:** `ON CONFLICT` contra índice único PARCIAL exige repetir el `WHERE` o tira 42P10 |
| — | `018b/c/e/f_sim_referidos*` | no versionadas | Simulación temporal para verificar el anti-abuso (dominio `@veliroz-sim.invalid`). Datos borrados en la 018f; base verificada en 0 |
| 20260817… | `017_bundles_alineados_a_rutinas` | idem | Deshace la 016 y crea **un bundle comprable por rutina** espejando `rutinas.ts` (mismos SKUs, mismos precios, mismos textos) + `meta.rutina_slug`. Así el carrito cobra el precio que la página anuncia en vez de sumar los sueltos |

## El riesgo

Las marcadas con ⚠️ **no tienen respaldo en git**. Si la base se resetea o hay que
levantar un entorno nuevo, ese schema se pierde y hay que reconstruirlo a mano.

Incluye cosas que no son triviales de rehacer: el trigger que sincroniza
`variantes_producto` → `catalogo` (que es lo que mantiene funcionando al RPC
`crear_pedido` sin cambios), las policies de RLS de las 6 tablas nuevas, y los
triggers de `email_queue` y `comprobantes_electronicos`.

## Cómo respaldar (pendiente)

Con la CLI de Supabase, desde este repo:

```bash
npx supabase link --project-ref usfpzlxmmgruydqbymsx
npx supabase db pull            # baja el schema real a supabase/migrations/
```

Eso genera un archivo con el estado actual completo. Requiere la contraseña de
la base (Dashboard → Settings → Database).

Alternativa sin CLI: Dashboard → Database → Backups → descargar el dump y
guardar el `.sql` acá.

## Reglas para las próximas

1. **Numerar mirando esta tabla, no el repo.** Ya pasó una colisión: dos `007`
   distintos (uno de cosmetic, otro de reviews) porque cada agente miró su
   propio repo. La versión con timestamp de Supabase los desempata, pero el
   nombre duplicado confunde.
2. **Las de Cosmetic van en este repo**, las del CRM en `Veliroz CRM`, las de
   Flores en `Veliroz Flores eternas`.
3. **Toda migración aplicada en Studio se commitea el mismo día.** Es la regla
   que se rompió acá y por eso existe este documento. Las 016 y 017 sí están
   versionadas; las ⚠️ de arriba siguen pendientes de `db pull`.
4. **Antes de sembrar datos de catálogo, revisar si el front ya los define.**
   La 016 creó bundles con precios propios sin ver que `src/lib/rutinas.ts`
   ya tenía 5 rutinas curadas con SUS precios, y dejó dos fuentes de verdad
   contradictorias (la misma rutina a S/225 en un lado y S/209 en el otro).
   El catálogo de Cosmetic vive en tres capas —`productos`/`variantes_producto`
   en la BD, `rutinas.ts` para las rutinas curadas y los `FACETS` hardcodeados
   de `productos/page.tsx`— y cambiar una obliga a mirar las otras dos.
