---
summary: "Memoria de seguimiento inferida para registros que no son recordatorios exactos"
title: "Compromisos inferidos"
sidebarTitle: "Compromisos"
read_when:
  - You want OpenClaw to remember natural follow-ups
  - You want to understand how inferred check-ins differ from reminders
  - You want to review or dismiss follow-up commitments
---

Los compromisos son memorias de seguimiento de corta duración. Cuando están activados, OpenClaw puede notar que una conversación creó una oportunidad de registro futuro y acordarse de traerla de vuelta más tarde.

Ejemplos:

- Mencionas una entrevista mañana. OpenClaw puede hacer un seguimiento después.
- Dices que estás agotado. OpenClaw puede preguntar más tarde si dormiste.
- El agente dice que hará un seguimiento después de que algo cambie. OpenClaw puede rastrear ese bucle abierto.

Los compromisos no son hechos duraderos como `MEMORY.md`, y no son recordatorios exactos. Se sitúan entre la memoria y la automatización: OpenClaw recuerda una obligación ligada a la conversación y luego el latido (heartbeat) la entrega cuando corresponde.

## Activar compromisos

Los compromisos están desactivados por defecto. Actívalos en la configuración:

```bash
openclaw config set commitments.enabled true
openclaw config set commitments.maxPerDay 3
```

`openclaw.json` equivalente:

```json
{
  "commitments": {
    "enabled": true,
    "maxPerDay": 3
  }
}
```

`commitments.maxPerDay` limita cuántos seguimientos inferidos pueden entregarse por sesión de agente en un día móvil. El valor predeterminado es `3`.

## Cómo funciona

Después de una respuesta del agente, OpenClaw puede ejecutar un paso de extracción en segundo plano oculto en un contexto separado. Ese paso solo busca compromisos de seguimiento inferidos. No escribe en la conversación visible ni pide al agente principal que razone sobre la extracción.

Cuando encuentra un candidato con alta confianza, OpenClaw almacena un compromiso con:

- el id del agente
- la clave de sesión
- el canal original y el objetivo de entrega
- una ventana de vencimiento
- un registro sugerido breve
- metadatos no instruccionales para que el latido decida si enviarlo

La entrega ocurre a través del latido. Cuando un compromiso vence, el latido añade el compromiso al turno de latido para el mismo agente y ámbito de canal. El modelo puede enviar un registro natural o una respuesta `HEARTBEAT_OK` para descartarlo. Si el latido está configurado con `target: "none"`, los compromisos vencidos permanecen internos y no envían registros externos. Los indicadores de entrega de compromisos no reproducen el texto de la conversación original, y los turnos de latido de compromisos vencidos se ejecutan sin herramientas de OpenClaw.

OpenClaw nunca entrega un compromiso inferido inmediatamente después de escribirlo.
La hora de vencimiento se limita al menos a un intervalo de latido después de que el compromiso
se crea, por lo que el seguimiento no puede repetirse en el mismo momento en que se
infirió.

## Alcance

Los compromisos se limitan al contexto exacto del agente y el canal donde se
crearon. Un seguimiento inferido mientras se habla con un agente en Discord no es
entregado por otro agente, otro canal o una sesión no relacionada.

Este alcance es parte de la función. Los registros naturales deberían sentirse como la misma
conversación continuando, no como un sistema global de recordatorios.

## Compromisos vs recordatorios

| Necesidad                                               | Uso                                            |
| ------------------------------------------------------- | ---------------------------------------------- |
| "Recuérdame a las 3 PM"                                 | [Tareas programadas](/es/automation/cron-jobs) |
| "Avísame en 20 minutos"                                 | [Tareas programadas](/es/automation/cron-jobs) |
| "Ejecuta este informe cada día laborable"               | [Tareas programadas](/es/automation/cron-jobs) |
| "Tengo una entrevista mañana"                           | Compromisos                                    |
| "Estuve despierto toda la noche"                        | Compromisos                                    |
| "Haz un seguimiento si no respondo a este hilo abierto" | Compromisos                                    |

Las solicitudes exactas del usuario ya pertenecen a la ruta del planificador. Los compromisos son solo
para seguimientos inferidos: los momentos en los que el usuario no pidió un recordatorio,
pero la conversación claramente creó un registro futuro útil.

## Gestionar compromisos

Use la CLI para inspeccionar y borrar los compromisos almacenados:

```bash
openclaw commitments
openclaw commitments --all
openclaw commitments --agent main
openclaw commitments --status snoozed
openclaw commitments dismiss cm_abc123
```

Consulte [`openclaw commitments`](/es/cli/commitments) para la referencia de comandos.

## Privacidad y costo

La extracción de compromisos utiliza un paso de LLM, por lo que habilitarlo añade el uso del modelo en segundo plano
después de turnos elegibles. El paso está oculto para la conversación
visible para el usuario, pero puede leer el intercambio reciente necesario para decidir si existe
un seguimiento.

Los compromisos almacenados son un estado local de OpenClaw. Son memoria operativa, no
memoria a largo plazo. Deshabilite la función con:

```bash
openclaw config set commitments.enabled false
```

## Solución de problemas

Si los seguimientos esperados no aparecen:

- Confirme que `commitments.enabled` es `true`.
- Verifique `openclaw commitments --all` para ver registros pendientes, descartados, pospuestos o caducados.
- Asegúrese de que el latido se esté ejecutando para el agente.
- Compruebe si `commitments.maxPerDay` ya se ha alcanzado para esa
  sesión de agente.
- Recuerde que los recordatorios exactos se omiten en la extracción de compromisos y deben aparecer en [tareas programadas](/es/automation/cron-jobs) en su lugar.

## Relacionado

- [Información general sobre la memoria](/es/concepts/memory)
- [Memoria activa](/es/concepts/active-memory)
- [Latido](/es/gateway/heartbeat)
- [Tareas programadas](/es/automation/cron-jobs)
- [`openclaw commitments`](/es/cli/commitments)
- [Referencia de configuración](/es/gateway/configuration-reference#commitments)
