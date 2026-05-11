---
summary: "Gestión de zonas horarias para agentes, sobres y avisos"
read_when:
  - You need to understand how timestamps are normalized for the model
  - Configuring the user timezone for system prompts
title: "Zonas horarias"
---

OpenClaw normaliza las marcas de tiempo para que el modelo vea una **única hora de referencia**.

## Sobrescrituras de mensajes (local por defecto)

Los mensajes entrantes se envuelven en una sobrescritura como:

```
[Provider ... 2026-01-05 16:26 PST] message text
```

La marca de tiempo en la sobrescritura es **local del host por defecto**, con precisión de minutos.

Puede anular esto con:

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` usa UTC.
- `envelopeTimezone: "user"` usa `agents.defaults.userTimezone` (se recurre a la zona horaria del host).
- Use una zona horaria IANA explícita (por ejemplo, `"Europe/Vienna"`) para un desfijo fijo.
- `envelopeTimestamp: "off"` elimina las marcas de tiempo absolutas de los encabezados de la sobrescritura.
- `envelopeElapsed: "off"` elimina los sufijos de tiempo transcurrido (el estilo `+2m`).

### Ejemplos

**Local (predeterminado):**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**Zona horaria fija:**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**Tiempo transcurrido:**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## Cargas útiles de herramientas (datos sin procesar del proveedor + campos normalizados)

Las llamadas a herramientas (`channels.discord.readMessages`, `channels.slack.readMessages`, etc.) devuelven **marcas de tiempo sin procesar del proveedor**.
También adjuntamos campos normalizados para mayor coherencia:

- `timestampMs` (milisegundos de la época UTC)
- `timestampUtc` (cadena UTC ISO 8601)

Los campos sin procesar del proveedor se conservan.

## Zona horaria del usuario para el indicador del sistema

Establezca `agents.defaults.userTimezone` para indicar al modelo la zona horaria local del usuario. Si no está
establecido, OpenClaw resuelve la **zona horaria del host en tiempo de ejecución** (sin escritura de configuración).

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

El indicador del sistema incluye:

- sección `Current Date & Time` con la hora local y la zona horaria
- `Time format: 12-hour` o `24-hour`

Puede controlar el formato del indicador con `agents.defaults.timeFormat` (`auto` | `12` | `24`).

Consulte [Fecha y hora](/es/date-time) para conocer el comportamiento completo y los ejemplos.

## Relacionado

- [Latido](/es/gateway/heartbeat) — las horas activas utilizan la zona horaria para la programación
- [Trabajos de Cron](/es/automation/cron-jobs) — las expresiones cron utilizan la zona horaria para la programación
- [Fecha y hora](/es/date-time) — comportamiento completo de fecha/hora y ejemplos
