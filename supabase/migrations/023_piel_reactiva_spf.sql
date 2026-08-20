-- ============================================================
-- 023 — Protector solar en el bundle de piel reactiva
-- Aplicada: 2026-08-19 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- EL DEFECTO: `piel-reactiva` era la única rutina de cuidado diario sin
-- protector solar (limpiador + esencia + crema). La advertencia lo
-- resolvía mandando al cliente a "sumá tu protector solar habitual".
--   1. Dermatológica: es la rutina para barrera comprometida, que es MÁS
--      fotosensible. Es justo donde el protector más importa.
--   2. De promesa: la home dice que cada rutina es "limpieza, activo y
--      protección". Esta no tenía protección.
--   3. Comercial: se cobra el set y se manda a conseguir por fuera el
--      producto que más le importa — y que nosotros vendemos.
--
-- Suma S1004-SUNSERUM-50ML (SKIN1004 Madagascar Centella) como paso 4,
-- sólo AM. Elegido entre los tres protectores del catálogo porque la
-- centella asiática es calmante: el perfil correcto para piel reactiva.
--
-- Precio: lista 243 → 322 (79+75+89+79), bundle 219 → 289 (~10% de
-- descuento, igual que las demás rutinas).
--
-- TRAMPA: el borrador inicial asumía una columna `bundle_variante_id`
-- que NO existe. El esquema real es
--   bundle_composicion(bundle_id → productos.id,
--                      componente_variante_id → variantes_producto.id,
--                      cantidad, orden)
-- con PK compuesta (bundle_id, componente_variante_id), que es la que
-- usa el ON CONFLICT. Verificar siempre antes de escribir.
--
-- VERIFICADO tras aplicar: 4 componentes en orden, precio 289, y
-- `catalogo` —de donde crear_pedido toma el precio al cobrar— sincronizado
-- en 289 por el trigger tg_variante_sync_catalogo.
-- ============================================================

insert into bundle_composicion (bundle_id, componente_variante_id, cantidad, orden)
select
  p.id,
  (select id from variantes_producto where sku = 'S1004-SUNSERUM-50ML'),
  1,
  4
from productos p
where p.slug = 'rutina-piel-reactiva'
on conflict (bundle_id, componente_variante_id) do update
  set cantidad = excluded.cantidad,
      orden    = excluded.orden;

update variantes_producto
set precio       = 289,
    precio_antes = 322
where sku = 'RUTINA-PIEL-REACTIVA';

update productos
set descripcion_corta = 'Limpiador suave, esencia de mucina, crema de ceramidas y protector de centella. Calma la piel reactiva sin dejarla sin protección.'
where slug = 'rutina-piel-reactiva';
