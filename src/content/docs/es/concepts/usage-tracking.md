---
summary: "Superficies de seguimiento de uso y requisitos de credenciales"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Seguimiento de uso"
---

## Qué es

- Obtiene el uso/cuota del proveedor directamente desde sus puntos de conexión de uso.
- No hay costos estimados; solo ventanas de cuota informadas por el proveedor o resúmenes del estado de la cuenta.
- El resultado del estado de la ventana de cuota legible por humanos se normaliza a `X% left`, incluso cuando una API aguas arriba informa cuota consumida, cuota restante o solo conteos brutos. Los proveedores sin ventanas de cuota reiniciables pueden mostrar el texto de resumen del proveedor en su lugar, como un saldo.
- El `/status` y el `session_status` a nivel de sesión pueden volver a la última
  entrada de uso de la transcripción cuando la instantánea de la sesión en vivo es escasa. Esa
  recuperación llena los contadores de tokens/caché faltantes, puede recuperar la etiqueta del
  modelo de tiempo de ejecución activo y prefiere el total orientado al prompt más grande cuando
  los metadatos de la sesión faltan o son menores. Los valores en vivo distintos de cero existentes
  aún tienen prioridad.

## Dónde aparece

- `/status` en los chats: tarjeta de estado rica en emojis con tokens de sesión + costo estimado (solo clave de API). El uso del proveedor se muestra para el **proveedor del modelo actual** cuando está disponible como una ventana normalizada `X% left` o texto de resumen del proveedor.
- `/usage off|tokens|full` en chats: pie de página de uso por respuesta (OAuth muestra solo tokens).
- `/usage cost` en chats: resumen de costos locales agregado a partir de registros de sesión de OpenClaw.
- CLI: `openclaw status --usage` imprime un desglose completo por proveedor.
- CLI: `openclaw channels list` imprime la misma instantánea de uso junto con la configuración del proveedor (use `--no-usage` para omitir).
- Barra de menú de macOS: sección "Usage" bajo Context (solo si está disponible).

## Proveedores + credenciales

- **Anthropic (Claude)**: tokens OAuth en perfiles de autenticación.
- **GitHub Copilot**: tokens OAuth en perfiles de autenticación.
- **Gemini CLI**: tokens OAuth en perfiles de autenticación.
  - El uso de JSON vuelve a `stats`; `stats.cached` se normaliza en
    `cacheRead`.
- **OpenAI Codex**: tokens OAuth en perfiles de autenticación (se usa accountId cuando está presente).
- **MiniMax**: API key o perfil de autenticación MiniMax OAuth. OpenClaw trata
  `minimax`, `minimax-cn` y `minimax-portal` como la misma superficie de cuota
  de MiniMax, prefiere el MiniMax OAuth almacenado cuando está presente y, de lo contrario, recurre
  a `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` o `MINIMAX_API_KEY`.
  La consulta de uso deriva el host del Coding Plan de `models.providers.minimax-portal.baseUrl`
  o `models.providers.minimax.baseUrl` cuando están configurados y, de lo contrario, usa el
  host MiniMax CN.
  Los campos `usage_percent` / `usagePercent` sin procesar de MiniMax significan **restante**
  de cuota, por lo que OpenClaw los invierte antes de mostrarlos; los campos basados en conteo tienen prioridad cuando
  están presentes.
  - Las etiquetas de ventana del coding-plan provienen de los campos de horas/minutos del proveedor cuando
    están presentes, luego recurren al lapso `start_time` / `end_time`.
  - Si el punto final del coding-plan devuelve `model_remains`, OpenClaw prefiere la
    entrada del modelo de chat, deriva la etiqueta de la ventana de las marcas de tiempo cuando los campos explícitos
    `window_hours` / `window_minutes` están ausentes e incluye el nombre
    del modelo en la etiqueta del plan.
- **Xiaomi MiMo**: API key a través de env/config/auth store (`XIAOMI_API_KEY`).
- **z.ai**: clave de API a través de env/config/auth store.
- **DeepSeek**: clave de API a través de env/config/auth store (`DEEPSEEK_API_KEY`). OpenClaw llama al endpoint de saldo de DeepSeek y muestra el saldo informado por el proveedor como texto en lugar de una ventana de cuota de porcentaje restante.

El uso se oculta cuando no se puede resolver ninguna autenticación de uso del proveedor utilizable. Los proveedores pueden suministrar lógica de autenticación de uso específica del complemento; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales OAuth/API de claves de perfiles de autenticación, variables de entorno o configuración.

## Relacionado

- [Uso de tokens y costos](/es/reference/token-use)
- [Uso de API y costos](/es/reference/api-usage-costs)
- [Caché de avisos](/es/reference/prompt-caching)
