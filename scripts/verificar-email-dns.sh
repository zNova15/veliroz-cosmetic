#!/usr/bin/env bash
# ============================================================
# Verifica que el DNS de correo de veliroz.com esté completo.
#
# Correrlo DESPUÉS de pegar en Cloudflare los registros que muestra
# Resend. Dice qué falta, no sólo si pasa o no.
#
#   bash scripts/verificar-email-dns.sh
#
# El DNS de Cloudflare tarda entre 1 y 5 minutos en propagar. Si algo
# sale ✗ recién pegado, esperar y repetir antes de tocar nada.
# ============================================================
set -uo pipefail
D="${1:-veliroz.com}"
ok=0; fail=0

chk() { # nombre  comando  pista
  local nombre="$1" valor; valor="$(eval "$2" 2>/dev/null | head -3 | tr '\n' ' ' | sed 's/ *$//')"
  if [ -n "$valor" ]; then
    printf '  \033[32m✓\033[0m %-34s %s\n' "$nombre" "$(echo "$valor" | cut -c1-56)"
    ok=$((ok+1))
  else
    printf '  \033[31m✗\033[0m %-34s \033[2m%s\033[0m\n' "$nombre" "$3"
    fail=$((fail+1))
  fi
}

echo ""
echo "Correo saliente de $D"
echo "────────────────────────────────────────────────────────────────"

# Los tres que exige Resend para verificar el dominio.
chk "DKIM (resend._domainkey)" \
    "dig +short TXT resend._domainkey.$D | grep -i 'p='" \
    "falta el TXT con la llave pública que muestra Resend"

chk "SPF del subdominio (send)" \
    "dig +short TXT send.$D | grep -i 'v=spf1'" \
    "falta TXT en 'send' → v=spf1 include:amazonses.com ~all"

chk "MX de rebotes (send)" \
    "dig +short MX send.$D" \
    "falta MX en 'send' → feedback-smtp.<region>.amazonses.com prio 10"

echo ""
echo "Reputación y respuestas"
echo "────────────────────────────────────────────────────────────────"

# Sin DMARC, Gmail y Outlook mandan a spam el correo de dominios nuevos.
chk "DMARC (_dmarc)" \
    "dig +short TXT _dmarc.$D | grep -i 'v=DMARC1'" \
    "recomendado: v=DMARC1; p=none; rua=mailto:hola@$D"

# Si un cliente responde la confirmación, ese correo tiene que llegar
# a algún lado. Sin MX en la raíz, la respuesta rebota en silencio.
chk "MX de la raíz (recibir respuestas)" \
    "dig +short MX $D" \
    "sin esto, responder a hola@$D rebota — usar Cloudflare Email Routing"

echo ""
echo "────────────────────────────────────────────────────────────────"
if [ "$fail" -eq 0 ]; then
  printf '  \033[32m%s de %s listos.\033[0m El dominio puede enviar y recibir.\n' "$ok" "$((ok+fail))"
else
  printf '  %s listos, \033[31m%s pendientes.\033[0m\n' "$ok" "$fail"
fi
echo ""
exit 0
