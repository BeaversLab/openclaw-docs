---
summary: "Preguntas secundarias efímeras con /btw"
read_when:
  - Quieres hacer una pregunta secundaria rápida sobre la sesión actual
  - Estás implementando o depurando el comportamiento de BTW en varios clientes
title: "Preguntas secundarias BTW"
---

# Preguntas secundarias BTW

`/btw` te permite hacer una pregunta secundaria rápida sobre la **sesión actual** sin
convertir esa pregunta en el historial de conversación normal.

Está modelado según el comportamiento `/btw` de Claude Code, pero adaptado a la puerta de enlace
(Gateway) de OpenClaw y a su arquitectura multicanal.

## Lo que hace

Cuando envías:

```text
/btw what changed?
```

OpenClaw:

1. captura el contexto de la sesión actual,
2. ejecuta una llamada de modelo separada **sin herramientas**,
3. responde solo a la pregunta secundaria,
4. deja la ejecución principal intacta,
5. **no** escribe la pregunta BTW ni su respuesta en el historial de la sesión,
6. emite la respuesta como un **resultado lateral en vivo** en lugar de un mensaje normal del asistente.

El modelo mental importante es:

- mismo contexto de sesión
- consulta lateral separada de un solo uso
- sin llamadas a herramientas
- sin contaminación del contexto futuro
- sin persistencia de la transcripción

## Lo que no hace

`/btw` **no**:

- crea una nueva sesión duradera,
- continúa la tarea principal inacabada,
- ejecuta herramientas o bucles de herramientas de agente,
- escribe datos de la pregunta/respuesta BTW en el historial de la transcripción,
- aparece en `chat.history`,
- sobrevive a una recarga.

Es intencionalmente **efímero**.

## Cómo funciona el contexto

BTW utiliza la sesión actual solo como **contexto de fondo**.

Si la ejecución principal está activa actualmente, OpenClaw captura el estado del mensaje
actual e incluye el mensaje principal en curso como contexto de fondo, al tiempo que
indica explícitamente al modelo:

- responda solo a la pregunta secundaria,
- no reanude ni complete la tarea principal inacabada,
- no emita llamadas a herramientas ni pseudollamadas a herramientas.

Eso mantiene BTW aislado de la ejecución principal al tiempo que sigue permitiendo que sea consciente de
lo que trata la sesión.

## Modelo de entrega

BTW **no** se entrega como un mensaje de transcripción normal del asistente.

A nivel del protocolo de Gateway:

- el chat normal del asistente utiliza el evento `chat`
- BTW utiliza el evento `chat.side_result`

Esta separación es intencional. Si BTW reutilizara la ruta del evento normal `chat`,
los clientes lo tratarían como el historial de conversación normal.

Debido a que BTW usa un evento en vivo separado y no se reproduce desde
`chat.history`, desaparece después de recargar.

## Comportamiento de la superficie

### TUI

En TUI, BTW se representa en línea en la vista de la sesión actual, pero permanece
efímero:

- visualmente distinto de una respuesta normal del asistente
- descartable con `Enter` o `Esc`
- no se reproduce al recargar

### Canales externos

En canales como Telegram, WhatsApp y Discord, BTW se entrega como una
respuesta única claramente etiquetada porque esas superficies no tienen un concepto
de superposición efímera local.

La respuesta aún se trata como un resultado secundario, no como un historial de sesión normal.

### Interfaz de usuario de control / web

El Gateway emite BTW correctamente como `chat.side_result`, y BTW no está incluido
en `chat.history`, por lo que el contrato de persistencia ya es correcto para la web.

La interfaz de usuario de control actual aún necesita un consumidor dedicado `chat.side_result` para
representar BTW en vivo en el navegador. Hasta que llegue ese soporte del lado del cliente, BTW es una
función a nivel de Gateway con un comportamiento completo de TUI y canal externo, pero aún no
una experiencia de usuario de navegador completa.

## Cuándo usar BTW

Use `/btw` cuando desee:

- una aclaración rápida sobre el trabajo actual,
- una respuesta lateral fáctica mientras una ejecución larga aún está en progreso,
- una respuesta temporal que no debe formar parte del contexto de la sesión futura.

Ejemplos:

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## Cuándo no usar BTW

No use `/btw` cuando desee que la respuesta sea parte del contexto
futuro de la sesión.

En ese caso, pregunte normalmente en la sesión principal en lugar de usar BTW.

## Relacionado

- [Comandos de barra](/es/tools/slash-commands)
- [Niveles de pensamiento](/es/tools/thinking)
- [Sesión](/es/concepts/session)

import es from "/components/footer/es.mdx";

<es />
