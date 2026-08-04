-- Festivales de agosto de 2026.
--
-- Ejecutar desde el SQL Editor del panel de Supabase: corre como `postgres` y
-- salta RLS. La clave anónima no puede escribir aquí desde que
-- supabase/migrations/20260429140000_lock_concerts_festis_writes.sql eliminó
-- las políticas públicas de INSERT/UPDATE/DELETE.
--
-- `fecha` es TEXT en formato corto español; parseFechaToDate (lib/cache.ts) lo
-- interpreta y el cron diario (app/api/cron/cleanup/route.ts) borra las filas
-- una vez pasadas.
--
-- Datos:
--   Jardín de las Delicias — Edición Boutique, jue 13 ago 2026,
--     OMA Sound (Recinto Ferial de San Pedro de Alcántara), Marbella.
--   Finde Grande Playa Madre, 21-22 ago 2026, Playa de Moracey,
--     Caravia Baja (Asturias). Besmaya toca el 22.

INSERT INTO public.festis (fecha, ciudad, sala, link)
SELECT v.fecha, v.ciudad, v.sala, v.link
FROM (VALUES
  ('13-ago', 'Marbella', 'Jardín de las Delicias',
   'https://www.jardindeliciasfestival.com/marbella/comprar-entradas/'),
  ('22-ago', 'Caravia', 'Playa Madre',
   'https://woutick.com/es/entradas/finde-grande-playa-madre-2026')
) AS v(fecha, ciudad, sala, link)
WHERE NOT EXISTS (
  SELECT 1 FROM public.festis f
  WHERE f.fecha = v.fecha AND f.ciudad = v.ciudad
);
