---
summary: "Dónde aparecen las zonas horarias en OpenClaw: sobres, cargas útiles de herramientas, mensaje del sistema"
read_when:
  - You want a quick mental model for timezone handling
  - You are deciding where to set or override a timezone
title: "Zonas horarias"
---

OpenClaw estandariza las marcas de tiempo para que el modelo vea una **única hora de referencia** en lugar de una mezcla de relojes locales del proveedor. Hay tres superficies donde aparecen las zonas horarias, cada una con su propio propósito:

## Tres superficies de zona horaria

| Superficie                    | Lo que muestra                                                                                                                         | Predeterminado                                              | Configurado mediante                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Sobres de mensajes            | Envuelve los mensajes del canal entrante: `[Signal +1555 Sun 2026-01-18 00:19:42 PST] hello`                                           | Local del host                                              | `agents.defaults.envelopeTimezone`                                    |
| Cargas útiles de herramientas | Las herramientas de estilo `readMessages` del canal devuelven la hora bruta del proveedor + `timestampMs` normalizada / `timestampUtc` | Campos UTC siempre presentes                                | No configurable — conserva las marcas de tiempo nativas del proveedor |
| Mensaje del sistema           | Un pequeño bloque `Current Date & Time` con **solo la zona horaria** (sin valor de reloj, para la estabilidad de la caché)             | Zona horaria del host si `userTimezone` no está establecido | `agents.defaults.userTimezone`                                        |

El mensaje del sistema omite deliberadamente el reloj en vivo para mantener el almacenamiento en caché del mensaje estable entre turnos. Cuando el agente necesita la hora actual, llama a `session_status`.

## Configuración de la zona horaria del usuario

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

Si `userTimezone` no está establecido, OpenClaw resuelve la zona horaria del host en tiempo de ejecución (sin escritura de configuración). `agents.defaults.timeFormat` (`auto` | `12` | `24`) controla el renderizado de 12h/24h en sobres y superficies posteriores, no en la sección del mensaje del sistema.

## Cuándo anular

- **Use sobres UTC** (`envelopeTimezone: "utc"`) cuando desee marcas de tiempo estables en hosts en diferentes regiones, o cuando desee registros alineados con UTC para que coincidan con el resultado de diagnósticos.
- **Use una zona IANA fija** (ej. `"Europe/Vienna"`) cuando el host de la puerta de enlace está en una zona pero el usuario está en otra y desea que los sobres se lean en la zona del usuario independientemente de la migración del host.
- **Establezca `envelopeTimestamp: "off"`** para sobres con pocos tokens cuando el contexto de la marca de tiempo no sea útil para la conversación.

Para obtener la referencia completa del comportamiento, ejemplos por proveedor y formato de tiempo transcurrido, consulte [Fecha y hora](/es/date-time).

## Relacionado

- [Fecha y hora](/es/date-time) — comportamiento y ejemplos completos de sobre/herramienta/prompt.
- [Heartbeat](/es/gateway/heartbeat) — las horas activas utilizan la zona horaria para la programación.
- [Cron Jobs](/es/automation/cron-jobs) — las expresiones cron utilizan la zona horaria para la programación.
