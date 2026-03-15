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

## Dónde aparece

- `/status` en los chats: tarjeta de estado con emojis con tokens de sesión + costo estimado (solo clave de API). El uso del proveedor se muestra para el **proveedor del modelo actual** cuando está disponible.
- `/usage off|tokens|full` en los chats: pie de página de uso por respuesta (OAuth muestra solo tokens).
- `/usage cost` en los chats: resumen de costos locales agregado a partir de registros de sesión de OpenClaw.
- CLI: `openclaw status --usage` imprime un desglose completo por proveedor.
- CLI: `openclaw channels list` imprime la misma instantánea de uso junto con la configuración del proveedor (use `--no-usage` para omitir).
- Barra de menú de macOS: sección "Usage" (Uso) bajo Context (Contexto) (solo si está disponible).

## Proveedores + credenciales

- **Anthropic (Claude)**: tokens OAuth en perfiles de autenticación.
- **GitHub Copilot**: tokens OAuth en perfiles de autenticación.
- **Gemini CLI**: tokens OAuth en perfiles de autenticación.
- **Antigravity**: tokens OAuth en perfiles de autenticación.
- **OpenAI Codex**: tokens OAuth en perfiles de autenticación (se usa accountId cuando está presente).
- **MiniMax**: clave de API (clave del plan de codificación; `MINIMAX_CODE_PLAN_KEY` o `MINIMAX_API_KEY`); usa la ventana del plan de codificación de 5 horas.
- **z.ai**: clave de API a través de env/config/auth store.

El uso se oculta si no existen credenciales OAuth/API coincidentes.

import es from "/components/footer/es.mdx";

<es />
