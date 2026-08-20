-- ============================================================
-- 026 — Fuera los productos propios de Veliroz (brochas y gua sha)
-- Aplicada: 2026-08-20 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- CUIDADO — dos cosas que casi se rompen:
--
-- 1. Las 5 RUTINAS también cuelgan de la marca `veliroz`: las armamos
--    nosotros, así que son "producto propio" en la base. Un
--    "desactivar todo lo de la marca Veliroz" se las llevaba puestas.
--    Por eso el filtro es por SKU y NO por marca.
--
-- 2. `rutina-glow-evento` estaba compuesta por BIODANCE + gua sha. Sin
--    el gua sha queda un bundle de un solo producto, que no es un
--    bundle: es la mascarilla a precio de set. Se desactiva la rutina
--    mientras el gua sha esté fuera.
--
-- Al reactivar el gua sha hay que reactivar también la rutina, y poner
-- `activa: true` en su entrada de src/lib/rutinas.ts.
--
-- activo=false y NO delete: hay historial de precios, y las referencias
-- de bundle_composicion son ON DELETE RESTRICT.
--
-- VERIFICADO: 10 productos activos (eran 12), 4 rutinas activas (eran 5),
-- 0 SKUs VLRZ activos.
-- ============================================================

update productos
set activo = false
where slug in ('veliroz-set-brochas-12', 'veliroz-gua-sha-roller-set');

update variantes_producto
set activo = false
where sku in ('VLRZ-BROCHAS-12', 'VLRZ-GUASHA-SET');

update productos    set activo = false where slug = 'rutina-glow-evento';
update variantes_producto set activo = false where sku  = 'RUTINA-GLOW-EVENTO';
