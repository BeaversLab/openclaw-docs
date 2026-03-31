---
summary: "Preguntas laterales efímeras con /btw"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "Preguntas laterales BTW"
---

# Preguntas laterales BTW

`/btw` le permite hacer una pregunta lateral rápida sobre la **sesión actual** sin
convertir esa pregunta en el historial de conversación normal.

Está modelado según el comportamiento de `/btw` de Claude Code, pero adaptado a la
Puerta de enlace (Gateway) y a la arquitectura multicanal de OpenClaw.

## Lo que hace

Cuando envías:

```text
/btw what changed?
```

OpenClaw:

1. captura el contexto de la sesión actual,
2. ejecuta una llamada de modelo separada **sin herramientas**,
3. responde solo a la pregunta lateral,
4. deja la ejecución principal en paz,
5. **no** escribe la pregunta o respuesta BTW en el historial de la sesión,
6. emite la respuesta como un **resultado lateral en vivo** en lugar de un mensaje normal del asistente.

El modelo mental importante es:

- mismo contexto de sesión
- consulta lateral de un solo tiro separada
- sin llamadas a herramientas
- sin contaminación del contexto futuro
- sin persistencia de la transcripción

## Lo que no hace

`/btw` **no**:

- crea una nueva sesión duradera,
- continúa la tarea principal inacabada,
- ejecuta herramientas o bucles de herramientas de agentes,
- escribe datos de preguntas/respuestas BTW en el historial de la transcripción,
- aparece en `chat.history`,
- sobrevive a una recarga.

Es intencionalmente **efímero**.

## Cómo funciona el contexto

BTW usa la sesión actual **solo como contexto de fondo**.

Si la ejecución principal está actualmente activa, OpenClaw captura el estado actual del mensaje
e incluye el mensaje principal en curso como contexto de fondo, al mismo tiempo que
le dice explícitamente al modelo:

- responde solo a la pregunta lateral,
- no reanudes ni completes la tarea principal inacabada,
- no emitas llamadas a herramientas ni llamadas seudo-herramientas.

Eso mantiene a BTW aislado de la ejecución principal mientras sigue siendo consciente de lo
que trata la sesión.

## Modelo de entrega

BTW **no** se entrega como un mensaje normal de transcripción del asistente.

A nivel del protocolo de Gateway:

- el chat normal del asistente usa el evento `chat`
- BTW usa el evento `chat.side_result`

Esta separación es intencional. Si BTW reutilizara la ruta del evento normal `chat`,
los clientes lo tratarían como el historial de conversación normal.

Debido a que BTW utiliza un evento en vivo separado y no se reproduce desde
`chat.history`, desaparece después de recargar.

## Comportamiento de la superficie

### TUI

En la TUI, BTW se representa en línea en la vista de la sesión actual, pero permanece
efímero:

- visiblemente distinto de una respuesta normal del asistente
- descartable con `Enter` o `Esc`
- no se reproduce al recargar

### Canales externos

En canales como Telegram, WhatsApp y Discord, BTW se entrega como una
respuesta única claramente etiquetada porque esas superficies no tienen un
concepto de superposición efímera local.

La respuesta aún se trata como un resultado secundario, no como historial de sesión normal.

### Interfaz de control / web

El Gateway emite BTW correctamente como `chat.side_result`, y BTW no se incluye
en `chat.history`, por lo que el contrato de persistencia ya es correcto para la web.

La interfaz de control actual aún necesita un consumidor dedicado `chat.side_result` para
representar BTW en vivo en el navegador. Hasta que llegue ese soporte del lado del cliente, BTW es una
función a nivel de Gateway con comportamiento completo de TUI y canal externo, pero aún no
una experiencia de usuario de navegador completa.

## Cuándo usar BTW

Use `/btw` cuando quiera:

- una aclaración rápida sobre el trabajo actual,
- una respuesta lateral fáctica mientras una ejecución larga aún está en progreso,
- una respuesta temporal que no debería convertirse parte del contexto de sesión futuro.

Ejemplos:

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## Cuándo no usar BTW

No use `/btw` cuando quiera que la respuesta se convierta en parte del
contexto de trabajo futuro de la sesión.

En ese caso, pregunte normalmente en la sesión principal en lugar de usar BTW.

## Relacionado

- [Comandos de barra](/en/tools/slash-commands)
- [Niveles de pensamiento](/en/tools/thinking)
- [Sesión](/en/concepts/session)
