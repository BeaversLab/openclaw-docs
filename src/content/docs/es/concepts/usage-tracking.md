---
summary: "Superficies de seguimiento de uso y requisitos de credenciales"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Seguimiento de uso"
---

# Seguimiento de uso

## Qué es

- Obtiene el uso/cuota del proveedor directamente desde sus puntos de conexión de uso.
- Sin costos estimados; solo las ventanas reportadas por el proveedor.
- La salida de estado legible por humanos se normaliza a `X% left`, incluso cuando una
  API ascendente informa cuota consumida, cuota restante o solo recuentos brutos.
- `/status` y `session_status` a nivel de sesión pueden recurrir a la última
  entrada de uso de la transcripción cuando la instantánea de la sesión en vivo es dispersa. Ese
  respaldo completa los contadores de tokens/caché faltantes, puede recuperar la etiqueta del modelo
  de tiempo de ejecución activo y prefiere el total orientado al prompt más grande cuando los metadatos
  de la sesión faltan o son menores. Los valores en vivo distintos de cero existentes aún tienen prioridad.

## Dónde aparece

- `/status` en chats: tarjeta de estado rica en emojis con tokens de sesión + costo estimado (solo clave de API). El uso del proveedor se muestra para el **proveedor del modelo actual** cuando está disponible como una ventana normalizada `X% left`.
- `/usage off|tokens|full` en chats: pie de página de uso por respuesta (OAuth muestra solo tokens).
- `/usage cost` en chats: resumen de costos locales agregado a partir de registros de sesión de OpenClaw.
- CLI: `openclaw status --usage` imprime un desglose completo por proveedor.
- CLI: `openclaw channels list` imprime la misma instantánea de uso junto con la configuración del proveedor (use `--no-usage` para omitir).
- Barra de menú de macOS: sección "Usage" (Uso) en Context (solo si está disponible).

## Proveedores + credenciales

- **Anthropic (Claude)**: tokens OAuth en perfiles de autenticación.
- **GitHub Copilot**: tokens OAuth en perfiles de autenticación.
- **Gemini CLI**: tokens OAuth en perfiles de autenticación.
  - El uso de JSON recurre a `stats`; `stats.cached` se normaliza en
    `cacheRead`.
- **OpenAI Codex**: tokens OAuth en perfiles de autenticación (se usa accountId cuando está presente).
- **MiniMax**: clave de API o perfil de autenticación MiniMax OAuth. OpenClaw trata
  `minimax`, `minimax-cn` y `minimax-portal` como la misma superficie de cuota
  de MiniMax, prefiere el MiniMax OAuth almacenado cuando está presente y, de lo contrario, recurre
  a `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` o `MINIMAX_API_KEY`.
  Los campos `usage_percent` / `usagePercent` sin procesar de MiniMax significan la cuota **restante**,
  por lo que OpenClaw los invierte antes de mostrarlos; los campos basados en recuento tienen prioridad cuando
  están presentes.
  - Las etiquetas de ventana del plan de codificación provienen de los campos de horas/minutos del proveedor cuando
    están presentes, de lo contrario, recurren al intervalo `start_time` / `end_time`.
  - Si el punto final del plan de codificación devuelve `model_remains`, OpenClaw prefiere la
    entrada del modelo de chat, deriva la etiqueta de la ventana de las marcas de tiempo cuando los campos explícitos
    `window_hours` / `window_minutes` están ausentes e incluye el nombre
    del modelo en la etiqueta del plan.
- **Xiaomi MiMo**: clave de API a través de env/config/auth store (`XIAOMI_API_KEY`).
- **z.ai**: clave de API a través de env/config/auth store.

El uso se oculta cuando no se puede resolver ninguna autenticación de uso del proveedor utilizable. Los proveedores
pueden proporcionar lógica de autenticación de uso específica del complemento; de lo contrario, OpenClaw recurre a
coincidir las credenciales OAuth/API-key de los perfiles de autenticación, variables de entorno
o configuración.
