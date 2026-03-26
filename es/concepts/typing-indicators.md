---
summary: "Cuándo OpenClaw muestra los indicadores de escritura y cómo ajustarlos"
read_when:
  - Changing typing indicator behavior or defaults
title: "Indicadores de escritura"
---

# Indicadores de escritura

Los indicadores de escritura se envían al canal de chat mientras una ejecución está activa. Use
`agents.defaults.typingMode` para controlar **cuándo** comienza la escritura y `typingIntervalSeconds`
para controlar **con qué frecuencia** se actualiza.

## Valores predeterminados

Cuando `agents.defaults.typingMode` está **sin establecer**, OpenClaw mantiene el comportamiento heredado:

- **Chats directos**: la escritura comienza inmediatamente una vez que inicia el bucle del modelo.
- **Chats grupales con mención**: la escritura comienza inmediatamente.
- **Chats grupales sin mención**: la escritura comienza solo cuando el texto del mensaje comienza a transmitirse.
- **Ejecuciones de latido (Heartbeat runs)**: la escritura está desactivada.

## Modos

Establezca `agents.defaults.typingMode` en uno de:

- `never` — ningún indicador de escritura, nunca.
- `instant` — comenzar a escribir **tan pronto como el bucle del modelo comience**, incluso si la ejecución
  luego devuelve solo el token de respuesta silenciosa.
- `thinking` — comenzar a escribir en el **primer delta de razonamiento** (requiere
  `reasoningLevel: "stream"` para la ejecución).
- `message` — comenzar a escribir en el **primer delta de texto no silencioso** (ignora
  el token silencioso `NO_REPLY`).

Orden de “qué tan pronto se activa”:
`never` → `message` → `thinking` → `instant`

## Configuración

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

Puede anular el modo o el cadencia por sesión:

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## Notas

- El modo `message` no mostrará escritura para respuestas solo silenciosas (ej. el token `NO_REPLY`
  utilizado para suprimir la salida).
- `thinking` solo se activa si la ejecución transmite razonamiento (`reasoningLevel: "stream"`).
  Si el modelo no emite deltas de razonamiento, la escritura no comenzará.
- Los latidos (heartbeats) nunca muestran escritura, independientemente del modo.
- `typingIntervalSeconds` controla la **cadencia de actualización**, no la hora de inicio.
  El valor predeterminado es 6 segundos.

import es from "/components/footer/es.mdx";

<es />
