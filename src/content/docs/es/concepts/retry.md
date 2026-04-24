---
summary: "Política de reintentos para llamadas salientes al proveedor"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "Política de reintentos"
---

# Política de reintentos

## Objetivos

- Reintentar por cada solicitud HTTP, no por cada flujo de varios pasos.
- Mantener el orden reintentando solo el paso actual.
- Evitar duplicar operaciones no idempotentes.

## Valores predeterminados

- Intentos: 3
- Límite máximo de retraso: 30000 ms
- Jitter: 0,1 (10 por ciento)
- Valores predeterminados del proveedor:
  - Retraso mínimo de Telegram: 400 ms
  - Retraso mínimo de Discord: 500 ms

## Comportamiento

### Proveedores de modelos

- OpenClaw permite que los SDK de los proveedores manejen los reintentos cortos normales.
- Para los SDK basados en Stainless como Anthropic y OpenAI, las respuestas reintentables
  (`408`, `409`, `429` y `5xx`) pueden incluir `retry-after-ms` o
  `retry-after`. Cuando esa espera es superior a 60 segundos, OpenClaw inyecta
  `x-should-retry: false` para que el SDK muestre el error inmediatamente y el
  failover del modelo pueda rotar a otro perfil de autenticación o modelo alternativo.
- Anule el límite con `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>`.
  Establézcalo en `0`, `false`, `off`, `none` o `disabled` para permitir que los SDK respeten las
  esperas `Retry-After` largas internamente.

### Discord

- Solo reintentos en errores de límite de velocidad (HTTP 429).
- Usa el `retry_after` de Discord cuando está disponible, de lo contrario, retroceso exponencial.

### Telegram

- Reintentos en errores transitorios (429, tiempo de espera agotado, conexión/restablecimiento/cierre, no disponible temporalmente).
- Usa `retry_after` cuando está disponible, de lo contrario, retroceso exponencial.
- Los errores de análisis de Markdown no se reintentan; recurren a texto sin formato.

## Configuración

Establezca la política de reintentos por proveedor en `~/.openclaw/openclaw.json`:

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## Notas

- Los reintentos se aplican por solicitud (envío de mensaje, carga de medios, reacción, encuesta, pegatina).
- Los flujos compuestos no reintentan los pasos completados.
