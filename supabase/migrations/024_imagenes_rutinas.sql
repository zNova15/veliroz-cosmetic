-- ============================================================
-- 024 — Imágenes de rutina en Storage (a/c: policy temporal + revocación)
-- Aplicada: 2026-08-19 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- Las cards de rutina eran sólo color de fondo y texto: se veían apagadas
-- al lado de las de producto, que sí tienen packshot.
--
-- Se compuso una imagen por rutina (1200x800) con los packshots REALES de
-- sus productos sobre el color de acento de esa misma rutina. Al compartir
-- el color, el borde inferior de la foto funde con la card en vez de
-- verse como un recuadro pegado.
--
-- Técnica: los packshots del CDN vienen con fondo BLANCO OPACO (sin canal
-- alfa), así que se componen con `multiply` — el blanco multiplicado por
-- el fondo da el fondo, y el envase conserva sus tonos. Es la misma receta
-- que el PDP usa con `mix-blend-multiply`.
--
-- Quedan a `productos/rutinas/<slug>.jpg`. Las URLs viven en
-- `src/lib/rutinas.ts` (campo `imagen`).
--
-- PROCEDIMIENTO (igual que las 012b/012c de los packshots):
--   024a → abre INSERT/UPDATE al rol anon, ACOTADO a la carpeta rutinas/
--   (subida de los 5 archivos)
--   024c → revoca. Verificado después: lectura pública 200, escritura 400.
--
-- Mixsoon y el set Gua Sha todavía no tienen packshot, así que sus rutinas
-- se compusieron con los productos restantes. Al fotografiarlos, regenerar.
-- ============================================================

-- 024a (temporal, YA REVOCADA — se deja como registro del procedimiento)
-- create policy productos_upload_temporal_rutinas on storage.objects
--   for insert to anon
--   with check (bucket_id = 'productos'
--               and (storage.foldername(name))[1] = 'rutinas');

-- 024c (el estado final que debe quedar)
drop policy if exists productos_upload_temporal_rutinas on storage.objects;
drop policy if exists productos_update_temporal_rutinas on storage.objects;
