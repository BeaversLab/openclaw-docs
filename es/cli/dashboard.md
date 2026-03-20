---
summary: "Referencia de la CLI para `openclaw dashboard` (abrir la Interfaz de Control)"
read_when:
  - Desea abrir la Interfaz de Control con su token actual
  - Desea imprimir la URL sin iniciar un navegador
title: "dashboard"
---

# `openclaw dashboard`

Abra la Interfaz de Control usando su autenticación actual.

```bash
openclaw dashboard
openclaw dashboard --no-open
```

Notas:

- `dashboard` resuelve los SecretRefs de `gateway.auth.token` configurados cuando es posible.
- Para los tokens gestionados por SecretRef (resueltos o no resueltos), `dashboard` imprime/copia/abre una URL sin token para evitar exponer secretos externos en la salida de la terminal, el historial del portapapeles o los argumentos de lanzamiento del navegador.
- Si `gateway.auth.token` está gestionado por SecretRef pero no está resuelto en esta ruta de comando, el comando imprime una URL sin token y una guía de remediation explícita en lugar de incrustar un marcador de posición de token no válido.

import en from "/components/footer/en.mdx";

<en />
