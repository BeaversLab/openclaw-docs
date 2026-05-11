---
summary: "Cuándo OpenClaw muestra los indicadores de escritura y cómo ajustarlos"
read_when:
  - Changing typing indicator behavior or defaults
title: "Indicadores de escritura"
---

Los indicadores de escritura se envían al canal de chat mientras una ejecución está activa. Use
`agents.defaults.typingMode` para controlar **cuándo** comienza la escritura y `typingIntervalSeconds`
para controlar **con qué frecuencia** se actualiza.

## Valores predeterminados

Cuando `agents.defaults.typingMode` está **sin establecer**, OpenClaw mantiene el comportamiento heredado:

- **Chats directos**: la escritura comienza inmediatamente una vez que inicia el bucle del modelo.
- **Chats grupales con mención**: la escritura comienza inmediatamente.
- **Chats grupales sin mención**: la escritura comienza solo cuando el texto del mensaje empieza a transmitirse.
- **Ejecuciones de latido (Heartbeat runs)**: la escritura comienza cuando inicia la ejecución de latido si el
  objetivo de latido resuelto es un chat capaz de mostrar estado de escritura y la escritura no está deshabilitada.

## Modos

Establezca `agents.defaults.typingMode` en uno de los siguientes:

- `never` — sin indicador de escritura, nunca.
- `instant` — comenzar a escribir **tan pronto como inicie el bucle del modelo**, incluso si la ejecución
  más tarde devuelve solo el token de respuesta silenciosa.
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

- El modo `message` no mostrará estado de escritura para respuestas solo silenciosas cuando toda
  la carga útil es el token silencioso exacto (por ejemplo `NO_REPLY` / `no_reply`,
  coincidiendo sin distinción de mayúsculas y minúsculas).
- `thinking` solo se activa si la ejecución transmite razonamiento (`reasoningLevel: "stream"`).
  Si el modelo no emite deltas de razonamiento, la escritura no comenzará.
- La escritura de latido es una señal de actividad para el objetivo de entrega resuelto. Esta
  comienza al inicio de la ejecución de latido en lugar de seguir el tiempo de transmisión de `message` o `thinking`.
  Establezca `typingMode: "never"` para deshabilitarla.
- Los latidos no muestran que se está escribiendo cuando `target: "none"`, cuando el destino no se puede resolver, cuando la entrega de chat está deshabilitada para el latido, o cuando el canal no admite la escritura.
- `typingIntervalSeconds` controla el **ritmo de actualización**, no la hora de inicio. El valor predeterminado es 6 segundos.

## Relacionado

- [Presencia](/es/concepts/presence)
- [Transmisión y fragmentación](/es/concepts/streaming)
