# Migraciones pendientes de aplicar

Cambios listos que **NO se aplicaron todavía** porque tocan a la vez el código y
la base, y aplicarlos por separado dejaría producción mostrando un precio y
cobrando otro.

Aplicar el `.sql` **y** el `.patch` juntos, en ese orden.

---

## 023 — Protector solar en la rutina de piel reactiva

**El defecto:** `piel-reactiva` es la única rutina de cuidado diario sin
protector solar. Sus 3 pasos son limpiador + esencia + crema. La advertencia lo
resolvía mandando al cliente a *"sumá tu protector solar habitual"*.

Eso está mal por tres razones:

1. **Dermatológica.** Es la rutina para piel con la barrera comprometida, que
   es **más** fotosensible, no menos. Es justo donde el protector más importa.
2. **De promesa.** La home dice que cada rutina es *"limpieza, activo y
   protección"*. Esta no tenía protección.
3. **Comercial.** Le vendemos un bundle de S/219 y lo mandamos a conseguir por
   fuera el producto que más le importa — y que nosotros vendemos.

**El arreglo:** sumar `S1004-SUNSERUM-50ML` (SKIN1004 Madagascar Centella) como
paso 4, sólo AM. Se eligió ese entre los tres protectores del catálogo porque la
centella asiática es calmante y es el perfil correcto para piel reactiva.

Precio: S/243 → **S/322** de lista, bundle S/219 → **S/289**, ahorro S/24 → S/33
(se mantuvo el ~10% de descuento de las demás rutinas).

### Cómo aplicar

```bash
# 1. La base primero (precio y composición del bundle)
#    Aplicar 023_piel_reactiva_spf.sql vía MCP de Supabase o el SQL Editor.

# 2. Después el código
git apply supabase/pendientes/023_piel_reactiva_spf.patch

# 3. Verificar que coinciden ANTES de deployar
#    página /rutinas/piel-reactiva → S/289 · carrito → S/289
```

### Por qué está acá y no aplicado
El MCP de Supabase se desconectó a mitad de sesión y en el entorno sólo hay
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, que RLS no deja escribir en `productos`.
