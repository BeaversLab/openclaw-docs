---
summary: "Referencia de la CLI para `openclaw dashboard` (abrir la interfaz de usuario de Control)"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: "Dashboard"
---

# `openclaw dashboard`

Abra la interfaz de usuario de Control usando su autenticación actual.

```bash
openclaw dashboard
openclaw dashboard --no-open
```

Notas:

- `dashboard` resuelve los SecretRefs de `gateway.auth.token` configurados cuando sea posible.
- `dashboard` sigue `gateway.tls.enabled`: las gateways con TLS activado imprimen/abren
  URLs de la `https://` Control UI y se conectan a través de `wss://`.
- Si la entrega al portapapeles/navegador falla para una URL de panel autenticada con token, `dashboard` registra una pista de autenticación manual segura que nombra `OPENCLAW_GATEWAY_TOKEN`, `gateway.auth.token` y la clave de fragmento `token` sin imprimir el valor del token.
- Para los tokens administrados por SecretRef (resueltos o no resueltos), `dashboard` imprime/copia/abre una URL sin token para evitar exponer secretos externos en la salida de la terminal, el historial del portapapeles o los argumentos de lanzamiento del navegador.
- Si `gateway.auth.token` está administrado por SecretRef pero no está resuelto en esta ruta de comando, el comando imprime una URL sin token y una guía de remediación explícita en lugar de incrustar un marcador de posición de token no válido.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Panel](/es/web/dashboard)
