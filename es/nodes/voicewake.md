---
summary: "Palabras de activación por voz globales (propiedad de Gateway) y cómo se sincronizan entre nodos"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "Activación por Voz"
---

# Activación por Voz (Palabras de activación globales)

OpenClaw trata las **palabras de activación como una única lista global** propiedad del **Gateway**.

- **No hay palabras de activación personalizadas por nodo**.
- **Cualquier interfaz de nodo/aplicación puede editar** la lista; los cambios son guardados por el Gateway y transmitidos a todos.
- macOS e iOS mantienen interruptores locales de **Activación por Voz activada/desactivada** (la UX local y los permisos difieren).
- Actualmente, Android mantiene la Activación por Voz apagada y usa un flujo de micrófono manual en la pestaña Voz.

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

- Los activadores se normalizan (se recortan los espacios, se eliminan los vacíos). Las listas vacías vuelven a los valores predeterminados.
- Se aplican límites por seguridad (límites de recuento/longitud).

### Eventos

- carga útil `voicewake.changed` `{ triggers: string[] }`

Quién lo recibe:

- Todos los clientes WebSocket (aplicación macOS, WebChat, etc.)
- Todos los nodos conectados (iOS/Android), y también al conectar el nodo como un envío inicial de "estado actual".

## Comportamiento del cliente

### aplicación macOS

- Usa la lista global para filtrar los activadores `VoiceWakeRuntime`.
- Editar "Palabras de activación" en la configuración de Activación por Voz llama a `voicewake.set` y luego confía en la transmisión para mantener sincronizados los demás clientes.

### nodo iOS

- Usa la lista global para la detección de activadores `VoiceWakeManager`.
- Editar Palabras de activación en Configuración llama a `voicewake.set` (a través del Gateway WS) y también mantiene la detección de palabras de activación local responsiva.

### nodo Android

- La Activación por Voz está actualmente deshabilitada en el tiempo de ejecución/Configuración de Android.
- La voz de Android usa la captura manual del micrófono en la pestaña Voz en lugar de los activadores de palabras de activación.

import es from "/components/footer/es.mdx";

<es />
