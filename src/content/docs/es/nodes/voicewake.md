---
summary: "Palabras de activación de voz globales (propiedad del Gateway) y cómo se sincronizan entre nodos"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "Activación por voz"
---

OpenClaw trata las **palabras de activación como una sola lista global** propiedad del **Gateway**.

- **No hay palabras de activación personalizadas por nodo**.
- **Cualquier interfaz de usuario de nodo/aplicación puede editar** la lista; los cambios son guardados por el Gateway y transmitidos a todos.
- macOS e iOS mantienen interruptores locales de **Activación por voz activada/desactivada** (la UX local y los permisos difieren).
- Android actualmente mantiene la Activación por voz apagada y usa un flujo de micrófono manual en la pestaña Voice.

## Almacenamiento (host Gateway)

Las palabras de activación se almacenan en la máquina gateway en:

- `~/.openclaw/settings/voicewake.json`

Forma:

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## Protocolo

### Métodos

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` con parámetros `{ triggers: string[] }` → `{ triggers: string[] }`

Notas:

- Los activadores se normalizan (se recortan espacios, se eliminan los vacíos). Las listas vacías vuelven a los valores predeterminados.
- Se aplican límites por seguridad (límites de recuento/longitud).

### Métodos de enrutamiento (activador → objetivo)

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.set` con parámetros `{ config: VoiceWakeRoutingConfig }` → `{ config: VoiceWakeRoutingConfig }`

Forma `VoiceWakeRoutingConfig`:

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

Los objetivos de ruta soportan exactamente uno de:

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### Eventos

- payload `voicewake.changed` `{ triggers: string[] }`
- payload `voicewake.routing.changed` `{ config: VoiceWakeRoutingConfig }`

Quién lo recibe:

- Todos los clientes WebSocket (aplicación macOS, WebChat, etc.)
- Todos los nodos conectados (iOS/Android), y también al conectar el nodo como un envío inicial del "estado actual".

## Comportamiento del cliente

### Aplicación macOS

- Usa la lista global para filtrar los activadores `VoiceWakeRuntime`.
- Editar "Palabras activadoras" en la configuración de Activación por voz llama a `voicewake.set` y luego se basa en la transmisión para mantener sincronizados a otros clientes.

### Nodo iOS

- Usa la lista global para la detección de activadores `VoiceWakeManager`.
- Editar las palabras de activación en Ajustes llama a `voicewake.set` (a través del WS de la Gateway) y también mantiene la detección local de palabras de activación con capacidad de respuesta.

### Nodo Android

- Activación por voz está actualmente deshabilitada en el tiempo de ejecución/Ajustes de Android.
- La voz de Android utiliza la captura manual del micrófono en la pestaña Voz en lugar de los activadores de palabras de activación.

## Relacionado

- [Modo de conversación](/es/nodes/talk)
- [Notas de audio y voz](/es/nodes/audio)
- [Comprensión de medios](/es/nodes/media-understanding)
