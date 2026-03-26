---
summary: "Tiempo de ejecución del agente, contrato del espacio de trabajo e inicio de sesión"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Tiempo de ejecución del agente"
---

# Tiempo de ejecución del agente

OpenClaw ejecuta un único tiempo de ejecución de agente integrado.

## Espacio de trabajo (requerido)

OpenClaw utiliza un directorio de espacio de trabajo de agente único (`agents.defaults.workspace`) como el **único** directorio de trabajo (`cwd`) del agente para herramientas y contexto.

Recomendado: utilice `openclaw setup` para crear `~/.openclaw/openclaw.json` si falta e inicialice los archivos del espacio de trabajo.

Guía completa del diseño del espacio de trabajo + copia de seguridad: [Espacio de trabajo del agente](/es/concepts/agent-workspace)

Si `agents.defaults.sandbox` está habilitado, las sesiones que no sean principales pueden anular esto con
espacios de trabajo por sesión bajo `agents.defaults.sandbox.workspaceRoot` (consulte
[Configuración de la pasarela](/es/gateway/configuration)).

## Archivos de inicio (inyectados)

Dentro de `agents.defaults.workspace`, OpenClaw espera estos archivos editables por el usuario:

- `AGENTS.md` — instrucciones de operación + "memoria"
- `SOUL.md` — persona, límites, tono
- `TOOLS.md` — notas de herramientas mantenidas por el usuario (p. ej., `imsg`, `sag`, convenciones)
- `BOOTSTRAP.md` — ritual de primera ejecución única (eliminado después de completarse)
- `IDENTITY.md` — nombre/vibración/emoji del agente
- `USER.md` — perfil de usuario + dirección preferida

En el primer turno de una nueva sesión, OpenClaw inyecta el contenido de estos archivos directamente en el contexto del agente.

Se omiten los archivos en blanco. Los archivos grandes se recortan y truncan con un marcador para que los avisos se mantengan ligeros (lea el archivo para obtener el contenido completo).

Si falta un archivo, OpenClaw inyecta una sola línea de marcador de "archivo faltante" (e `openclaw setup` creará una plantilla predeterminada segura).

`BOOTSTRAP.md` solo se crea para un **espacio de trabajo totalmente nuevo** (no hay otros archivos de inicio presentes). Si lo elimina después de completar el ritual, no debería volver a crearse en reinicios posteriores.

Para deshabilitar completamente la creación de archivos de inicio (para espacios de trabajo presembrados), establezca:

```json5
{ agent: { skipBootstrap: true } }
```

## Herramientas integradas

Las herramientas principales (read/exec/edit/write y herramientas del sistema relacionadas) siempre están disponibles, sujetas a la política de herramientas. `apply_patch` es opcional y está controlado por `tools.exec.applyPatch`. `TOOLS.md` **no** controla qué herramientas existen; es una guía sobre cómo desea que se usen.

## Habilidades

OpenClaw carga habilidades desde tres ubicaciones (el espacio de trabajo prevalece en caso de conflicto de nombres):

- Incluidas (enviadas con la instalación)
- Administradas locales: `~/.openclaw/skills`
- Espacio de trabajo: `<workspace>/skills`

Las habilidades pueden estar restringidas por configuración/entorno (ver `skills` en [Configuración de la pasarela](/es/gateway/configuration)).

## Límites del tiempo de ejecución

El tiempo de ejecución del agente integrado se basa en el núcleo del agente Pi (modelos, herramientas y
flujo de instrucciones). La gestión de sesiones, el descubrimiento, el cableado de herramientas y la entrega
de canales son capas propiedad de OpenClaw sobre ese núcleo.

## Sesiones

Las transcripciones de las sesiones se almacenan como JSONL en:

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

El ID de sesión es estable y es elegido por OpenClaw.
No se leen las carpetas de sesión heredadas de otras herramientas.

## Dirección durante la transmisión

Cuando el modo de cola es `steer`, los mensajes entrantes se inyectan en la ejecución actual.
La cola se verifica **después de cada llamada a herramienta**; si hay un mensaje en cola presente,
se saltan las llamadas a herramientas restantes del mensaje del asistente actual (resultados de herramienta de error
con "Omitido debido a un mensaje de usuario en cola."), y luego se inyecta el mensaje de usuario
en cola antes de la siguiente respuesta del asistente.

Cuando el modo de cola es `followup` o `collect`, los mensajes entrantes se retienen hasta que
termina el turno actual, luego comienza un nuevo turno de agente con las cargas útiles en cola. Consulte
[Cola](/es/concepts/queue) para conocer el comportamiento del modo + rebote/ límite.

La transmisión en bloque envía bloques completos del asistente tan pronto como terminan; está
desactivada por defecto (`agents.defaults.blockStreamingDefault: "off"`).
Ajuste el límite a través de `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; por defecto es text_end).
Controle la fragmentación de bloques suaves con `agents.defaults.blockStreamingChunk` (por defecto
800–1200 caracteres; prefiere saltos de párrafo, luego nuevas líneas; oraciones al final).
Fusione los fragmentos transmitidos con `agents.defaults.blockStreamingCoalesce` para reducir
el spam de una sola línea (fusión basada en inactividad antes del envío). Los canales que no sean Telegram requieren
`*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
Los resúmenes detallados de herramientas se emiten al inicio de la herramienta (sin rebote); La interfaz de control
transmite la salida de la herramienta a través de eventos del agente cuando está disponible.
Más detalles: [Streaming + chunking](/es/concepts/streaming).

## Referencias de modelo

Las referencias de modelo en la configuración (por ejemplo `agents.defaults.model` y `agents.defaults.models`) se analizan dividiendo por el **primer** `/`.

- Use `provider/model` al configurar modelos.
- Si el ID del modelo en sí contiene `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw trata la entrada como un alias o un modelo para el **proveedor predeterminado** (solo funciona cuando no hay `/` en el ID del modelo).

## Configuración (mínima)

Como mínimo, configure:

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (muy recomendado)

---

_Siguiente: [Group Chats](/es/channels/group-messages)_ 🦞

import es from "/components/footer/es.mdx";

<es />
