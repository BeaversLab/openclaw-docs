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

Establezca `agents.defaults.typingMode` en uno de:

- `never` - ningún indicador de escritura, nunca.
- `instant` - comenzar a escribir **tan pronto como comience el bucle del modelo**, incluso si la ejecución
  luego devuelve solo el token de respuesta silenciosa.
- `thinking` - comenzar a escribir en el **primer delta de razonamiento** (requiere
  `reasoningLevel: "stream"` para la ejecución).
- `message` - comenzar a escribir en el **primer delta de texto no silencioso** (ignora
  el token silencioso `NO_REPLY`).

Orden de "qué tan pronto se activa":
`never` → `message` → `thinking` → `instant`

## Configuración

Establecer el valor predeterminado del nivel de agente:

```json5
{
  agents: {
    defaults: {
      typingMode: "thinking",
      typingIntervalSeconds: 6,
    },
  },
}
```

Anular el modo o la cadencia por sesión:

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## Notas

- El modo `message` no mostrará que está escribiendo para las respuestas que sean solo silencio cuando toda la carga útil sea el token de silencio exacto (por ejemplo `NO_REPLY` / `no_reply`, coincidiendo sin distinción de mayúsculas y minúsculas).
- `thinking` solo se activa si la ejecución transmite el razonamiento (`reasoningLevel: "stream"`). Si el modelo no emite deltas de razonamiento, la indicación de escritura no comenzará.
- La escritura del latido es una señal de actividad para el destino de entrega resuelto. Comienza al inicio de la ejecución del latido en lugar de seguir el tiempo de transmisión de `message` o `thinking`. Establezca `typingMode: "never"` para desactivarla.
- Los latidos no muestran que se está escribiendo cuando `target: "none"`, cuando no se puede resolver el destino, cuando la entrega por chat está desactivada para el latido, o cuando el canal no admite la indicación de escritura.
- `typingIntervalSeconds` controla la **cadencia de actualización**, no la hora de inicio. El valor predeterminado es de 6 segundos.

## Relacionado

<CardGroup cols={2}>
  <Card title="Presence" href="/es/concepts/presence" icon="signal">
    Cómo el Gateway rastrea a los clientes conectados y los muestra en la pestaña Instancias de macOS.
  </Card>
  <Card title="Streaming and chunking" href="/es/concepts/streaming" icon="bars-staggered">
    Comportamiento de transmisión saliente, límites de los fragmentos y entrega específica del canal.
  </Card>
</CardGroup>
