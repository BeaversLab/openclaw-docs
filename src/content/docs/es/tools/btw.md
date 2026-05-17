---
summary: "Preguntas laterales efímeras con /btw"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "Preguntas secundarias BTW"
---

`/btw` te permite hacer una pregunta lateral rápida sobre la **sesión actual** sin
cconvertir esa pregunta en el historial normal de conversación. `/side` es un alias.

Está modelado según el comportamiento `/btw` de Claude Code, pero adaptado a la
Gateway y a la arquitectura de múltiples canales de OpenClaw.

## Lo que hace

Cuando envías:

```text
/btw what changed?
```

OpenClaw:

1. captura el contexto de la sesión actual,
2. ejecuta una consulta lateral efímera separada,
3. responde solo a la pregunta secundaria,
4. deja la ejecución principal tranquila,
5. **no** escribe la pregunta o respuesta BTW en el historial de la sesión,
6. emite la respuesta como un **resultado secundario en vivo** en lugar de un mensaje normal del asistente.

El modelo mental importante es:

- mismo contexto de sesión
- consulta secundaria única y separada
- el mismo transporte de arnés nativo cuando la sesión utiliza un arnés nativo
- sin contaminación del contexto futuro
- sin persistencia de la transcripción

Para sesiones con arnés Codex, BTW permanece dentro de Codex al bifurcar el subproceso activo del servidor de aplicaciones como un subproceso lateral efímero. Esto mantiene el comportamiento de OAuth y el subproceso nativo de Codex intactos, aislando aún así la respuesta lateral de la transcripción principal. Al igual que `/side` de Codex, el subproceso lateral mantiene los permisos actuales de Codex y la superficie de herramientas nativas, con barreras que indican al modelo que no trate el trabajo heredado del subproceso principal como instrucciones activas. Los entornos de ejecución que no son Codex mantienen la ruta directa de un solo shot más antigua.

## Lo que no hace

`/btw` **no**:

- crea una nueva sesión duradera,
- continúa la tarea principal sin terminar,
- escribe datos de preguntas/respuestas BTW en el historial de transcripciones,
- aparece en `chat.history`,
- sobrevive a una recarga.

Es intencionalmente **efímero**.

## Cómo funciona el contexto

BTW utiliza la sesión actual solo como **contexto de fondo**.

Si la ejecución principal está activa actualmente, OpenClaw captura el estado del mensaje
actual e incluye el mensaje principal en curso como contexto de fondo, mientras
le dice explícitamente al modelo:

- responda solo a la pregunta secundaria,
- no reanude ni complete la tarea principal inacabada,
- no dirigen la conversación principal.

Eso mantiene BTW aislado de la ejecución principal mientras sigue siendo consciente de lo que
es la sesión.

## Modelo de entrega

BTW **no** se entrega como un mensaje normal de transcripción del asistente.

A nivel del protocolo Gateway:

- el chat normal del asistente utiliza el evento `chat`
- BTW utiliza el evento `chat.side_result`

Esta separación es intencional. Si BTW reutilizara la ruta de eventos normal `chat`,
los clientes la tratarían como el historial de conversación regular.

Debido a que BTW utiliza un evento en vivo separado y no se reproduce desde
`chat.history`, desaparece después de recargar.

## Comportamiento superficial

### TUI

En la TUI, BTW se representa en línea en la vista de la sesión actual, pero permanece
efímero:

- visualmente distinto de una respuesta normal del asistente
- descartable con `Enter` o `Esc`
- no se reproduce al recargar

### Canales externos

En canales como Telegram, WhatsApp y Discord, BTW se entrega como una
respuesta única claramente etiquetada porque esas superficies no tienen el
concepto de una superposición efímera local.

La respuesta aún se trata como un resultado lateral, no como historial normal de la sesión.

### UI de control / web

El Gateway emite BTW correctamente como `chat.side_result`, y BTW no está incluido
en `chat.history`, por lo que el contrato de persistencia ya es correcto para la web.

El Control UI actual todavía necesita un consumidor dedicado `chat.side_result` para
renderizar BTW en vivo en el navegador. Hasta que llegue ese soporte del lado del cliente, BTW es una
función a nivel de Gateway con comportamiento completo de TUI y canales externos, pero aún no
una experiencia de usuario completa en el navegador.

## Cuándo usar BTW

Usa `/btw` cuando quieras:

- una aclaración rápida sobre el trabajo actual,
- una respuesta lateral fáctica mientras una ejecución larga todavía está en progreso,
- una respuesta temporal que no debe convertirse en parte del contexto futuro de la sesión.

Ejemplos:

```text
/btw what file are we editing?
/side what changed while the main run continued?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## Cuándo no usar BTW

No uses `/btw` cuando quieras que la respuesta se convierta en parte del contexto de trabajo futuro de la sesión.

En ese caso, pregunte normalmente en la sesión principal en lugar de usar BTW.

## Relacionado

<CardGroup cols={2}>
  <Card title="Slash commands" href="/es/tools/slash-commands" icon="terminal">
    Catálogo de comandos nativos y directivas de chat.
  </Card>
  <Card title="Thinking levels" href="/es/tools/thinking" icon="brain">
    Niveles de esfuerzo de razonamiento para la llamada al modelo de pregunta lateral.
  </Card>
  <Card title="Sesión" href="/es/concepts/session" icon="comentarios">
    Claves de sesión, historial y semántica de persistencia.
  </Card>
  <Card title="Comando de dirección" href="/es/tools/steer" icon="flecha-derecha">
    Inyecta un mensaje de dirección en la ejecución activa sin terminarla.
  </Card>
</CardGroup>
