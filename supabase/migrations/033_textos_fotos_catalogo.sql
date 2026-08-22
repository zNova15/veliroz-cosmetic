-- ============================================================
-- 033 — Catálogo: la foto de los bundles, el SPF que se cobra dos veces
--       y el voseo que quedó en la base
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- Tres arreglos de DATOS sobre `public.productos`. No toca schema: no
-- crea ni borra tablas, columnas, funciones ni policies. Corre entera
-- dentro de una transacción, muestra por NOTICE qué cambia cada bloque y
-- recién al final commitea. Si los números no cuadran: `rollback` y no
-- pasó nada.
--
-- RE-EJECUTABLE: los tres bloques están condicionados al estado VIEJO
-- (imagen_principal null, la advertencia vieja, la palabra en voseo).
-- La segunda pasada actualiza 0 filas y no pisa una corrección hecha a
-- mano después.
--
-- ------------------------------------------------------------
-- A. Los 4 bundles de rutina salían con placeholder gris
-- ------------------------------------------------------------
-- La 024 compuso y subió las 5 imágenes de rutina al bucket `productos`
-- (carpeta rutinas/) y guardó las URLs en `src/lib/rutinas.ts` (campo
-- `imagen`), que es lo que usa /rutinas. Pero los productos tipo bundle
-- que la 017 creó en la BD nunca recibieron esa URL: `imagen_principal`
-- quedó en null. Resultado: en /productos y en la home —donde el
-- catálogo se lee de la BD, no de rutinas.ts— las cuatro rutinas activas
-- salen con el placeholder gris. Son los productos de mayor ticket del
-- catálogo (S/247 a S/322 de precio lista) y son justo los que se ven
-- peor. Los JPG existen y responden 200 (verificado 21-ago-2026).
--
-- Sólo se escribe donde `imagen_principal is null`.
--
-- `glow-evento` queda fuera a propósito: su bundle está desactivado
-- desde la 026 porque el gua sha salió del catálogo. Cuando el gua sha
-- vuelva y se reactive la rutina, sumarle
-- .../productos/rutinas/glow-evento.jpg (ya está subida).
--
-- ------------------------------------------------------------
-- B. La contradicción del protector solar
-- ------------------------------------------------------------
-- La 017 escribió en `advertencias` de la rutina de piel reactiva:
--   "...En AM sumá tu protector solar habitual: sigue siendo obligatorio."
-- Dos días después la 023 metió S1004-SUNSERUM-50ML DENTRO del bundle y
-- subió el precio de S/219 a S/289 justamente por eso. La ficha quedó
-- diciéndole a la clienta que consiga por su cuenta un producto por el
-- que ya pagó S/70. La 023 actualizó `descripcion_corta` y se olvidó de
-- `advertencias`.
--
-- El texto correcto es el que ya muestra el front en
-- src/lib/rutinas.ts:271-272.
--
-- ------------------------------------------------------------
-- C. Seis textos quedaron en voseo argentino
-- ------------------------------------------------------------
-- El sitio se migró a español neutro latinoamericano ("tú/tienes") pero
-- las columnas de texto de `productos` no: quedaron en voseo. La 017 es
-- prueba en el mismo repo — dejó "separá AM y PM" y "sumá tu protector"
-- en `advertencias`. La auditoría marcó 6 textos: dr-althea (dos
-- columnas), rutina-manchas-tono, rutina-piel-reactiva,
-- the-ordinary-retinal y skin1004-madagascar-sun-serum.
--
-- POR QUÉ NO SE ESCRIBEN LOS TEXTOS A MANO: esta migración se escribió
-- sin acceso de lectura a la base. Poner texto literal sería inventar el
-- contenido actual y pisarlo. En vez de eso se reemplaza PALABRA por
-- PALABRA con regexp_replace, que sólo toca lo que está mal y deja el
-- resto intacto.
--
-- POR QUÉ SE APLICA A TODAS LAS FILAS Y NO A ESOS 6 SLUGS: los slugs de
-- la auditoría vienen abreviados ("the-ordinary-retinal" es el SKU
-- TO-RETINAL-15ML de la 027; "rutina-manchas-tono" es el SKU, el slug
-- del producto es rutina-manchas-tono-desparejo). Filtrar por un slug
-- mal escrito no arregla nada y no avisa. El reemplazo por palabra es
-- inofensivo donde no hay voseo —no cambia nada— así que barre la tabla
-- entera y reporta fila por fila lo que tocó.
--
-- COLUMNAS: la auditoría habla de `descripcion`, pero en esta base la
-- columna se llama `descripcion_larga` (ver src/lib/types.ts). Se
-- consulta information_schema y se salta la que no exista, así que la
-- lista sirve en cualquiera de los dos casos.
-- `ingredientes_full` queda fuera: es lista de INCI, no prosa.
--
-- QUÉ NO SE REEMPLAZA, A PROPÓSITO: los imperativos vos terminados en -í
-- (seguí, sentí, elegí, pedí, repetí) son idénticos al pretérito de
-- primera persona del español neutro ("yo seguí la rutina"). Cambiarlos
-- rompería una frase correcta. Si aparecen, se corrigen a mano.
-- Tampoco entra "tomás": colisiona con el nombre propio Tomás. Ni el
-- voseo EN VERSALITAS: "SOS" en mayúscula es la señal de auxilio, no el
-- verbo. Se reemplaza la forma en minúscula y la de inicio de frase; lo
-- que quede en mayúsculas lo reporta el bloque 4.
-- ============================================================

begin;

-- ---------- 1. La foto de los bundles de rutina ----------
do $$
declare
  v_base  text := 'https://usfpzlxmmgruydqbymsx.supabase.co/storage/v1/object/public/productos/rutinas/';
  v_total int  := 0;
  v_n     int;
  r       record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '1. Foto de los bundles de rutina';

  for r in
    -- Los nombres de archivo salen de `imagen` en src/lib/rutinas.ts.
    select * from (values
      ('primera-vez',            'primera-vez.jpg'),
      ('manchas-tono-desparejo', 'manchas-tono-desparejo.jpg'),
      ('antiedad-honesta',       'antiedad-honesta.jpg'),
      ('piel-reactiva',          'piel-reactiva.jpg')
    ) as d(rutina_slug, archivo)
  loop
    -- Se busca por meta->>'rutina_slug' (el vínculo que la 017 dejó a
    -- propósito para linkear /rutinas/<slug>) O por slug, porque el slug
    -- del producto es 'rutina-' || rutina_slug y depende de que ese
    -- prefijo no haya cambiado nunca. Con los dos caminos, alcanza con
    -- que uno esté bien.
    update public.productos p
       set imagen_principal = v_base || r.archivo
     where (p.meta->>'rutina_slug' = r.rutina_slug or p.slug = 'rutina-' || r.rutina_slug)
       and p.imagen_principal is null;

    get diagnostics v_n = row_count;
    v_total := v_total + v_n;

    if v_n > 0 then
      raise notice '   % ← %', rpad(r.rutina_slug, 24), r.archivo;
    elsif exists (
      select 1 from public.productos p
       where p.meta->>'rutina_slug' = r.rutina_slug or p.slug = 'rutina-' || r.rutina_slug
    ) then
      raise notice '   % ya tenía imagen — no se toca', rpad(r.rutina_slug, 24);
    else
      raise warning '   % NO existe como producto — revisar el slug', rpad(r.rutina_slug, 24);
    end if;
  end loop;

  raise notice '   → % fila(s) actualizada(s)', v_total;
end $$;

-- ---------- 2. La advertencia del protector solar ----------
do $$
declare
  v_n int;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '2. Advertencia de piel reactiva (el SPF ya está en el bundle)';

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'productos'
       and column_name = 'advertencias'
  ) then
    raise warning '   productos.advertencias no existe — bloque salteado';
    return;
  end if;

  -- La condición es el fragmento característico del texto VIEJO. Si
  -- alguien ya lo corrigió a mano, esto no lo pisa.
  update public.productos
     set advertencias = 'Pausar todo activo (retinoides, AHA/BHA, vitamina C) durante 3-4 semanas. El protector va sí o sí en AM, aunque no salgas.'
   where (meta->>'rutina_slug' = 'piel-reactiva' or slug = 'rutina-piel-reactiva')
     and advertencias like '%protector solar habitual%';

  get diagnostics v_n = row_count;

  if v_n > 0 then
    raise notice '   → corregida (% fila)', v_n;
  else
    raise notice '   → 0 filas: ya estaba corregida o el texto viejo cambió';
  end if;
end $$;

-- ---------- 3. Voseo argentino → español neutro ----------
do $$
declare
  /* patrón (voseo)  →  reemplazo (neutro).
     Se aplica en ORDEN y con bordes de palabra (\m ... \M), así que
     'usá' no puede comerse el principio de 'usás'. El único orden que
     SÍ importa es el del grupo 0: '\mvos\M' matchearía adentro de
     'para vos', y "para tú" no existe. Por eso las formas con
     preposición van primero. */
  v_pares text[][] := array[
    /* --- 0. pronombre (multipalabra primero) --- */
    ['para vos','para ti'], ['con vos','contigo'], ['a vos','a ti'],
    ['de vos','de ti'],     ['en vos','en ti'],    ['por vos','por ti'],
    ['sin vos','sin ti'],   ['vos','tú'],          ['sos','eres'],

    /* --- 1. presente --- */
    ['tenés','tienes'],     ['podés','puedes'],    ['querés','quieres'],
    ['sabés','sabes'],      ['hacés','haces'],     ['ponés','pones'],
    ['volvés','vuelves'],
    ['usás','usas'],        ['aplicás','aplicas'], ['notás','notas'],
    ['buscás','buscas'],    ['necesitás','necesitas'], ['dejás','dejas'],
    ['llevás','llevas'],    ['comprás','compras'], ['esperás','esperas'],
    ['evitás','evitas'],    ['mezclás','mezclas'], ['combinás','combinas'],
    ['cuidás','cuidas'],    ['empezás','empiezas'],['sumás','sumas'],
    ['sentís','sientes'],   ['elegís','eliges'],   ['decís','dices'],
    ['seguís','sigues'],    ['preferís','prefieres'], ['vivís','vives'],
    ['salís','sales'],      ['venís','vienes'],    ['repetís','repites'],

    /* --- 2. imperativos --- */
    ['aplicá','aplica'],    ['usá','usa'],         ['mirá','mira'],
    ['dejá','deja'],        ['probá','prueba'],    ['sumá','suma'],
    ['evitá','evita'],      ['empezá','empieza'],  ['tené','ten'],
    ['poné','pon'],         ['hacé','haz'],        ['separá','separa'],
    ['mezclá','mezcla'],    ['esperá','espera'],   ['guardá','guarda'],
    ['llevá','lleva'],      ['tomá','toma'],       ['cuidá','cuida'],
    ['enjuagá','enjuaga'],  ['masajeá','masajea'], ['secá','seca'],
    ['sacá','saca'],        ['buscá','busca'],     ['agregá','agrega'],
    ['alterná','alterna'],  ['hidratá','hidrata'], ['limpiá','limpia'],
    ['revisá','revisa'],    ['consultá','consulta'],['pasá','pasa'],
    ['comprá','compra'],    ['combiná','combina'], ['prepará','prepara'],
    ['mejorá','mejora'],    ['aclará','aclara'],   ['asegurá','asegura'],
    ['considerá','considera'], ['retirá','retira'],['protegé','protege'],
    ['suspendé','suspende'],['volvé','vuelve'],    ['cerrá','cierra'],

    /* --- 3. imperativos reflexivos (el neutro lleva tilde) --- */
    ['aplicate','aplícate'],['cuidate','cuídate'], ['fijate','fíjate'],
    ['acordate','acuérdate'],['dejate','déjate'],  ['lavate','lávate'],
    ['enjuagate','enjuágate'],['masajeate','masajéate'],['secate','sécate'],
    ['ponete','ponte'],     ['hacete','hazte'],    ['llevate','llévate'],
    ['probate','pruébate']
  ];
  v_cols  text[] := array['descripcion_corta','descripcion','descripcion_larga',
                          'modo_uso','advertencias'];
  v_col     text;
  v_pat     text;
  v_rep     text;
  v_nuevo   text;
  v_re_todo text;
  v_pats    text[] := '{}';
  v_i       int;
  v_filas   int;
  v_total   int := 0;
  v_quedan  int;
  v_n       int;
  r         record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '3. Voseo → español neutro';

  /* Los bordes \m y \M dependen de que el servidor trate las vocales
     acentuadas como letra (lc_ctype UTF-8). Si no lo hiciera, cada
     regexp_replace devolvería el texto sin cambios y la migración
     "pasaría" sin arreglar nada. Mejor romper acá y a la vista. */
  if regexp_replace('aplicá el sérum', '\maplicá\M', 'aplica', 'g') <> 'aplica el sérum' then
    raise exception 'El motor de regex no reconoce las vocales acentuadas como letra: los bordes de palabra no matchean y el reemplazo sería un no-op. Revisar lc_ctype de la base.';
  end if;

  foreach v_col in array v_cols loop
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'productos'
         and column_name  = v_col
         and data_type in ('text','character varying')
    ) then
      raise notice '   (productos.% no existe — se salta)', v_col;
      continue;
    end if;

    v_filas := 0;

    for r in execute format(
      'select id, slug, %I as txt from public.productos where %I is not null order by slug',
      v_col, v_col)
    loop
      v_nuevo := r.txt;

      for v_i in 1 .. array_length(v_pares, 1) loop
        v_pat := v_pares[v_i][1];
        v_rep := v_pares[v_i][2];
        -- minúscula
        v_nuevo := regexp_replace(v_nuevo, '\m' || v_pat || '\M', v_rep, 'g');
        -- inicio de frase: se capitaliza SÓLO la primera letra. initcap()
        -- no sirve acá: convertiría 'con vos' en 'Con Vos'.
        v_nuevo := regexp_replace(
          v_nuevo,
          '\m' || upper(left(v_pat, 1)) || substr(v_pat, 2) || '\M',
          upper(left(v_rep, 1)) || substr(v_rep, 2),
          'g');
      end loop;

      if v_nuevo is distinct from r.txt then
        execute format('update public.productos set %I = $1 where id = $2', v_col)
          using v_nuevo, r.id;
        v_filas := v_filas + 1;
        raise notice '   ── % · % ──', r.slug, v_col;
        raise notice '      antes:   %', r.txt;
        raise notice '      después: %', v_nuevo;
      end if;
    end loop;

    raise notice '   %: % fila(s)', rpad(v_col, 18), v_filas;
    v_total := v_total + v_filas;
  end loop;

  raise notice '   → % fila(s) actualizada(s) en total', v_total;

  /* Comprobación inmediata: ninguna palabra de la lista debe seguir viva
     en las dos formas que se reemplazaron (minúscula e inicio de frase).
     Si quedara alguna, el reemplazo no corrió como se espera y hay que
     mirarlo antes de commitear.

     La comparación es SENSIBLE a mayúsculas a propósito. El voseo en
     VERSALITAS no se reemplaza: 'SOS' en mayúscula es la señal de
     auxilio, no el verbo, y cambiarlo por 'ERES' sería peor que dejarlo.
     Si aparece uno, lo reporta el bloque 4 como aviso. */
  for v_i in 1 .. array_length(v_pares, 1) loop
    v_pats := array_append(v_pats, v_pares[v_i][1]);
    v_pats := array_append(v_pats,
      upper(left(v_pares[v_i][1], 1)) || substr(v_pares[v_i][1], 2));
  end loop;
  v_re_todo := '\m(' || array_to_string(v_pats, '|') || ')\M';

  v_quedan := 0;
  foreach v_col in array v_cols loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'productos'
         and column_name = v_col and data_type in ('text','character varying')
    ) then
      execute format('select count(*) from public.productos where %I ~ $1', v_col)
        into v_n using v_re_todo;
      v_quedan := v_quedan + v_n;
    end if;
  end loop;

  if v_quedan <> 0 then
    raise exception 'Quedaron % fila(s) con palabras de la lista de voseo después del reemplazo — el UPDATE no se aplicó bien', v_quedan;
  end if;
  raise notice '   ✓ 0 filas con las palabras de la lista';
end $$;

-- ---------- 4. Verificación: ¿quedó voseo fuera de la lista? ----------
-- Barrido heurístico: junta todas las columnas de texto y busca palabras
-- terminadas en vocal acentuada (+s opcional), que es la forma del voseo
-- (usás, tenés, sentís, aplicá, tené). Después descarta:
--   · las palabras del español neutro que caen en la misma forma
--     (además, después, país, está, café...);
--   · las terminadas en -rá/-ré/-rí, porque ahí vive el FUTURO neutro
--     (verás, notarás, mejorará) y ensuciaría la salida entera. El costo
--     es que un imperativo tipo 'considerá' se escapa del detector — por
--     eso los -rá conocidos (mirá, comprá, separá, esperá, mejorá,
--     aclará, asegurá, considerá, retirá) ya están en la lista del
--     bloque 3.
-- Avisa, no aborta: lo que salga es material para revisar a mano, no un
-- error de esta migración.
do $$
declare
  v_cols  text[] := array['descripcion_corta','descripcion','descripcion_larga',
                          'modo_uso','advertencias'];
  v_exist text[] := '{}';
  v_col   text;
  v_texto text;
  v_det   text := '\m[a-záéíóúñ]{2,}[áéí]s?\M';
  v_ok    text[] := array[
    'además','jamás','quizás','quizá','compás','través','inglés','francés',
    'japonés','portugués','después','revés','interés','cortés','estrés',
    'país','países','está','acá','allá','allí','aquí','ahí','así','ojalá',
    'café','bebé','canapé','sofá','papá','mamá','qué','porqué','tomás'
  ];
  v_n     int := 0;
  r       record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '4. Verificación final';

  foreach v_col in array v_cols loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'productos'
         and column_name = v_col and data_type in ('text','character varying')
    ) then
      v_exist := array_append(v_exist, quote_ident(v_col));
    end if;
  end loop;

  if array_length(v_exist, 1) is null then
    raise warning '   No hay columnas de texto que verificar en productos';
    return;
  end if;

  v_texto := 'concat_ws('' '', ' || array_to_string(v_exist, ', ') || ')';

  for r in execute format(
    'select p.slug, lower(m.g[1]) as palabra, count(*) as veces
       from public.productos p
       cross join lateral regexp_matches(%s, %L, ''gi'') as m(g)
      group by 1, 2
      order by 1, 2', v_texto, v_det)
  loop
    continue when r.palabra = any(v_ok);
    continue when r.palabra ~ '(rá|ré|rí)s?$';
    raise warning '   posible voseo sin cubrir · % · "%" (× %)', r.slug, r.palabra, r.veces;
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    raise notice '   ✓ no quedan palabras sospechosas de voseo';
  else
    raise warning '   % palabra(s) para revisar a mano antes de dar esto por cerrado', v_n;
  end if;
  raise notice '─────────────────────────────────────────────────────';
end $$;

-- Revisar los NOTICE de arriba (sobre todo el antes/después del bloque 3).
-- Si los textos quedaron bien:
commit;
-- Si no:  rollback;
