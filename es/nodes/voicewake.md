---
summary: "Palabras de activación de voz globales (propiedad del Gateway) y cómo se sincronizan entre los nodos"
read_when:
  - Cambiar el comportamiento o los valores predeterminados de las palabras de activación de voz
  - Añadir nuevas plataformas de nodos que necesiten sincronización de palabras de activación
title: "Voice Wake"
---

# Voice Wake (Palabras de activación globales)

OpenClaw trata **las palabras de activación como una única lista global** propiedad del **Gateway**.

- **No hay palabras de activación personalizadas por nodo**.
- **Cualquier interfaz de usuario de nodo/aplicación puede editar** la lista; los cambios son guardados por el Gateway y transmitidos a todos.
- macOS e iOS mantienen interruptores locales de **Voice Wake activado/desactivado** (la experiencia de usuario local y los permisos difieren).
- Actualmente, Android mantiene Voice Wake desactivado y utiliza un flujo de micrófono manual en la pestaña Voz.

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

- Los disparadores se normalizan (se eliminan los espacios en blanco, se eliminan los vacíos). Las listas vacías vuelven a los valores predeterminados.
- Se aplican límites por seguridad (límites de recuento/longitud).

### Eventos

- `voicewake.changed` carga útil `{ triggers: string[] }`

Quién lo recibe:

- Todos los clientes WebSocket (aplicación macOS, WebChat, etc.)
- Todos los nodos conectados (iOS/Android), y también al conectar el nodo como un envío inicial del "estado actual".

## Comportamiento del cliente

### Aplicación macOS

- Usa la lista global para filtrar los disparadores `VoiceWakeRuntime`.
- Editar "Palabras de activación" en la configuración de Voice Wake llama a `voicewake.set` y luego se basa en la transmisión para mantener sincronizados a los demás clientes.

### Nodo iOS

- Usa la lista global para la detección de disparadores `VoiceWakeManager`.
- Editar Palabras de activación en Configuración llama a `voicewake.set` (a través del WebSocket del Gateway) y también mantiene la detección local de palabras de activación receptiva.

### Nodo Android

- Voice Wake está actualmente desactivado en el tiempo de ejecución/Configuración de Android.
- La voz de Android utiliza la captura manual del micrófono en la pestaña Voz en lugar de los disparadores de palabras de activación.

import en from "/components/footer/en.mdx";

<en />
