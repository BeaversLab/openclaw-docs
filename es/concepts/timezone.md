---
summary: "Manejo de zonas horarias para agentes, sobres y mensajes del sistema"
read_when:
  - Necesitas entender cómo se normalizan las marcas de tiempo para el modelo
  - Configuración de la zona horaria del usuario para los mensajes del sistema
title: "Zonas horarias"
---

# Zonas horarias

OpenClaw estandariza las marcas de tiempo para que el modelo vea una **única hora de referencia**.

## Sobres de mensajes (local por defecto)

Los mensajes entrantes se envuelven en un sobre así:

```
[Provider ... 2026-01-05 16:26 PST] message text
```

La marca de tiempo en el sobre es **local del host por defecto**, con precisión de minutos.

Puedes anular esto con:

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
- `envelopeTimezone: "user"` usa `agents.defaults.userTimezone` (recae en la zona horaria del host).
- Use una zona horaria IANA explícita (por ejemplo, `"Europe/Vienna"`) para un desplazamiento fijo.
- `envelopeTimestamp: "off"` elimina las marcas de tiempo absolutas de los encabezados del sobre.
- `envelopeElapsed: "off"` elimina los sufijos de tiempo transcurrido (el estilo `+2m`).

### Ejemplos

**Local (por defecto):**

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
También adjuntamos campos normalizados para la coherencia:

- `timestampMs` (milisegundos de época UTC)
- `timestampUtc` (cadena ISO 8601 UTC)

Los campos sin procesar del proveedor se conservan.

## Zona horaria del usuario para el mensaje del sistema

Establezca `agents.defaults.userTimezone` para indicar al modelo la zona horaria local del usuario. Si no está
configurado, OpenClaw resuelve la **zona horaria del host en tiempo de ejecución** (sin escritura de configuración).

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

El mensaje del sistema incluye:

- sección `Current Date & Time` con la hora local y la zona horaria
- `Time format: 12-hour` o `24-hour`

Puede controlar el formato del mensaje con `agents.defaults.timeFormat` (`auto` | `12` | `24`).

Consulte [Fecha y hora](/es/date-time) para obtener el comportamiento completo y los ejemplos.

import en from "/components/footer/en.mdx";

<en />
