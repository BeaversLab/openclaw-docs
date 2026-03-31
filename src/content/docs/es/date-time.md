---
summary: "Manejo de fecha y hora en sobres, avisos, herramientas y conectores"
read_when:
  - You are changing how timestamps are shown to the model or users
  - You are debugging time formatting in messages or system prompt output
title: "Fecha y Hora"
---

# Fecha y Hora

De forma predeterminada, OpenClaw utiliza la **hora local del host para las marcas de tiempo de transporte** y **la zona horaria del usuario solo en el aviso del sistema**.
Las marcas de tiempo del proveedor se conservan para que las herramientas mantengan su semántica nativa (la hora actual está disponible a través de `session_status`).

## Sobres de mensajes (local de forma predeterminada)

Los mensajes entrantes se envuelven con una marca de tiempo (precisión de minutos):

```
[Provider ... 2026-01-05 16:26 PST] message text
```

Esta marca de tiempo del sobre es **local del host de forma predeterminada**, independientemente de la zona horaria del proveedor.

Puede anular este comportamiento:

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
- `envelopeTimezone: "local"` usa la zona horaria del host.
- `envelopeTimezone: "user"` usa `agents.defaults.userTimezone` (recurre a la zona horaria del host).
- Use una zona horaria IANA explícita (por ejemplo, `"America/Chicago"`) para una zona fija.
- `envelopeTimestamp: "off"` elimina las marcas de tiempo absolutas de los encabezados del sobre.
- `envelopeElapsed: "off"` elimina los sufijos de tiempo transcurrido (el estilo `+2m`).

### Ejemplos

**Local (predeterminado):**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**Zona horaria del usuario:**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**Tiempo transcurrido habilitado:**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## Aviso del sistema: Fecha y Hora Actual

Si se conoce la zona horaria del usuario, el aviso del sistema incluye una sección dedicada
**Fecha y Hora Actual** con **solo la zona horaria** (sin formato de reloj/hora)
para mantener estable el almacenamiento en caché de avisos:

```
Time zone: America/Chicago
```

Cuando el agente necesita la hora actual, use la herramienta `session_status`; la tarjeta de estado
incluye una línea de marca de tiempo.

## Líneas de eventos del sistema (local de forma predeterminada)

Los eventos del sistema en cola que se insertan en el contexto del agente tienen el prefijo de una marca de tiempo utilizando la
misma selección de zona horaria que los sobres de mensajes (predeterminado: local del host).

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### Configurar zona horaria + formato del usuario

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

- `userTimezone` establece la **zona horaria local del usuario** para el contexto del aviso.
- `timeFormat` controla la **visualización de 12h/24h** en el aviso. `auto` sigue las preferencias del sistema operativo.

## Detección de formato de hora (automática)

Cuando `timeFormat: "auto"`, OpenClaw inspecciona la preferencia del sistema operativo (macOS/Windows)
y recurre al formato de configuración regional. El valor detectado se **almacena en caché por proceso**
para evitar llamadas repetidas al sistema.

## Cargas útiles de herramientas + conectores (hora sin procesar del proveedor + campos normalizados)

Las herramientas de canal devuelven **marcas de tiempo nativas del proveedor** y añaden campos normalizados para mayor coherencia:

- `timestampMs`: milisegundos de época (UTC)
- `timestampUtc`: cadena UTC ISO 8601

Los campos originales del proveedor se conservan para que no se pierda nada.

- Slack: cadenas tipo época de la API
- Discord: marcas de tiempo ISO UTC
- Telegram/WhatsApp: marcas de tiempo numéricas/ISO específicas del proveedor

Si necesita la hora local, conviértala más adelante utilizando la zona horaria conocida.

## Documentos relacionados

- [System Prompt](/en/concepts/system-prompt)
- [Timezones](/en/concepts/timezone)
- [Messages](/en/concepts/messages)
