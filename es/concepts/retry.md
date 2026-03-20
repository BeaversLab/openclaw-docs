---
summary: "Política de reintentos para llamadas al proveedor de salida"
read_when:
  - Actualizar el comportamiento de reintentos del proveedor o los valores predeterminados
  - Depurar errores de envío del proveedor o límites de tasa
title: "Política de reintentos"
---

# Política de reintentos

## Objetivos

- Reintentar por cada solicitud HTTP, no por cada flujo de varios pasos.
- Conservar el orden reintentando solo el paso actual.
- Evitar duplicar operaciones no idempotentes.

## Valores predeterminados

- Intentos: 3
- Límite máximo de retraso: 30000 ms
- Jitter: 0.1 (10 por ciento)
- Valores predeterminados del proveedor:
  - Retraso mínimo de Telegram: 400 ms
  - Retraso mínimo de Discord: 500 ms

## Comportamiento

### Discord

- Reintenta solo en errores de límite de tasa (HTTP 429).
- Usa el `retry_after` de Discord cuando está disponible; de lo contrario, usa retroceso exponencial.

### Telegram

- Reintenta en errores transitorios (429, tiempo de espera, conexión/restablecimiento/cierre, no disponible temporalmente).
- Usa `retry_after` cuando está disponible; de lo contrario, usa retroceso exponencial.
- Los errores de análisis de Markdown no se reintentan; vuelven al texto sin formato.

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

import en from "/components/footer/en.mdx";

<en />
