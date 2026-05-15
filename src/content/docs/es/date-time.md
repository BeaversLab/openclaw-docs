---
summary: "Manejo de fecha y hora en sobres, avisos, herramientas y conectores"
read_when:
  - You are changing how timestamps are shown to the model or users
  - You are debugging time formatting in messages or system prompt output
title: "Fecha y hora"
---

OpenClaw usa por defecto la **hora local del host para las marcas de tiempo de transporte** y **la zona horaria del usuario solo en el prompt del sistema**.
Las marcas de tiempo del proveedor se conservan para que las herramientas mantengan su semántica nativa (la hora actual está disponible a través de `session_status`).

## Sobres de mensajes (local por defecto)

Los mensajes entrantes se envuelven con una marca de tiempo (precisión de minutos):

```
[Provider ... 2026-01-05 16:26 PST] message text
```

Esta marca de tiempo del sobre es **local del host por defecto**, independientemente de la zona horaria del proveedor.

Puedes anular este comportamiento:

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
- Usa una zona horaria IANA explícita (por ejemplo, `"America/Chicago"`) para una zona fija.
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

## Prompt del sistema: fecha y hora actual

Si se conoce la zona horaria del usuario, el prompt del sistema incluye una sección dedicada
**Fecha y Hora Actual** con **solo la zona horaria** (sin formato de reloj/hora)
para mantener estable el almacenamiento en caché del prompt:

```
Time zone: America/Chicago
```

Cuando el agente necesita la hora actual, use la herramienta `session_status`; la tarjeta de estado
incluye una línea de marca de tiempo.

## Líneas de eventos del sistema (local por defecto)

Los eventos del sistema en cola que se insertan en el contexto del agente tienen el prefijo de una marca de tiempo usando la
misma selección de zona horaria que los sobres de mensajes (predeterminado: local del host).

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### Configurar zona horaria del usuario + formato

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

- `userTimezone` establece la **zona horaria local del usuario** para el contexto del prompt.
- `timeFormat` controla la **visualización de 12h/24h** en el prompt. `auto` sigue las preferencias del SO.

## Detección de formato de hora (automático)

Cuando `timeFormat: "auto"`, OpenClaw inspecciona la preferencia del sistema operativo (macOS/Windows)
y recurre al formato de configuración regional. El valor detectado se **almacena en caché por proceso**
para evitar llamadas repetidas al sistema.

## Cargas útiles de herramientas + conectores (hora en bruto del proveedor + campos normalizados)

Las herramientas del canal devuelven **marcas de tiempo nativas del proveedor** y agregan campos normalizados para coherencia:

- `timestampMs`: milisegundos de época (UTC)
- `timestampUtc`: cadena ISO 8601 UTC

Los campos originales del proveedor se conservan para no perder nada.

- Slack: cadenas tipo época de la API
- Discord: marcas de tiempo ISO UTC
- Telegram/WhatsApp: marcas de tiempo numéricas/ISO específicas del proveedor

Si necesita la hora local, conviértala posteriormente utilizando la zona horaria conocida.

## Documentos relacionados

- [Prompt del sistema](/es/concepts/system-prompt)
- [Zonas horarias](/es/concepts/timezone)
- [Mensajes](/es/concepts/messages)
