---
summary: "Tiempo de ejecución del agente (pi-mono incrustado), contrato del espacio de trabajo e inicio de sesión"
read_when:
  - Cambiar el tiempo de ejecución del agente, el inicio del espacio de trabajo o el comportamiento de la sesión
title: "Agent Runtime"
---

# Tiempo de ejecución del agente 🤖

OpenClaw ejecuta un único tiempo de ejecución de agente integrado derivado de **pi-mono**.

## Espacio de trabajo (requerido)

OpenClaw utiliza un único directorio de espacio de trabajo del agente (`agents.defaults.workspace`) como el directorio de trabajo **único** (`cwd`) para herramientas y contexto.

Recomendado: usar `openclaw setup` para crear `~/.openclaw/openclaw.json` si falta e inicializar los archivos del espacio de trabajo.

Diseño completo del espacio de trabajo + guía de copia de seguridad: [Agent workspace](/es/concepts/agent-workspace)

Si `agents.defaults.sandbox` está habilitado, las sesiones que no sean principales pueden anular esto con
espacios de trabajo por sesión bajo `agents.defaults.sandbox.workspaceRoot` (ver
[Gateway configuration](/es/gateway/configuration)).

## Archivos de inicio (inyectados)

Dentro de `agents.defaults.workspace`, OpenClaw espera estos archivos editables por el usuario:

- `AGENTS.md` — instrucciones de funcionamiento + "memoria"
- `SOUL.md` — persona, límites, tono
- `TOOLS.md` — notas sobre herramientas mantenidas por el usuario (p. ej., `imsg`, `sag`, convenciones)
- `BOOTSTRAP.md` — ritual de primer uso único (eliminado después de completarse)
- `IDENTITY.md` — nombre/vibración/emoji del agente
- `USER.md` — perfil de usuario + dirección preferida

En el primer turno de una nueva sesión, OpenClaw inyecta el contenido de estos archivos directamente en el contexto del agente.

Se omiten los archivos en blanco. Los archivos grandes se recortan y truncan con un marcador para que los avisos se mantengan ligeros (lea el archivo para obtener el contenido completo).

Si falta un archivo, OpenClaw inyecta una sola línea de marcador de "archivo faltante" (e `openclaw setup` creará una plantilla predeterminada segura).

`BOOTSTRAP.md` solo se crea para un **espacio de trabajo totalmente nuevo** (sin otros archivos de inicio presentes). Si lo elimina después de completar el ritual, no debería recrearse en reinicios posteriores.

Para deshabilitar completamente la creación de archivos de inicio (para espacios de trabajo presembrados), establezca:

```json5
{ agent: { skipBootstrap: true } }
```

## Herramientas integradas

Las herramientas principales (read/exec/edit/write y herramientas del sistema relacionadas) siempre están disponibles,
sujetas a la política de herramientas. `apply_patch` es opcional y está restringida por
`tools.exec.applyPatch`. `TOOLS.md` **no** controla qué herramientas existen; es
una guía sobre cómo _usted_ quiere que se usen.

## Habilidades

OpenClaw carga habilidades desde tres ubicaciones (el espacio de trabajo prevalece en caso de conflicto de nombres):

- Incluidas (enviadas con la instalación)
- Gestionada/local: `~/.openclaw/skills`
- Espacio de trabajo: `<workspace>/skills`

Las habilidades pueden estar limitadas por config/env (ver `skills` en [Gateway configuration](/es/gateway/configuration)).

## integración pi-mono

OpenClaw reutiliza partes del código base de pi-mono (modelos/herramientas), pero **la gestión de sesiones, el descubrimiento y el cableado de herramientas son propiedad de OpenClaw**.

- No hay tiempo de ejecución del agente pi-coding.
- No se consultan las configuraciones de `~/.pi/agent` ni `<workspace>/.pi`.

## Sesiones

Las transcripciones de sesión se almacenan como JSONL en:

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

El ID de sesión es estable y es elegido por OpenClaw.
Las carpetas de sesión heredadas de Pi/Tau **no** se leen.

## Direccionamiento durante la transmisión

Cuando el modo de cola es `steer`, los mensajes entrantes se inyectan en la ejecución actual.
La cola se verifica **después de cada llamada de herramienta**; si hay un mensaje en cola,
se omiten las llamadas de herramientas restantes del mensaje del asistente actual (resultados de
herramienta de error con "Skipped due to queued user message."), y luego el mensaje de usuario
en cola se inyecta antes de la siguiente respuesta del asistente.

Cuando el modo de cola es `followup` o `collect`, los mensajes entrantes se retienen hasta que
termina el turno actual, luego comienza un nuevo turno de agente con las cargas en cola. Véase
[Queue](/es/concepts/queue) para el comportamiento del modo + debounce/cap.

La transmisión en bloques envía bloques completados del asistente tan pronto como terminan; está
**desactivada por defecto** (`agents.defaults.blockStreamingDefault: "off"`).
Ajuste el límite mediante `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; por defecto es text_end).
Controle la fragmentación de bloques suaves con `agents.defaults.blockStreamingChunk` (por defecto
800–1200 caracteres; prefiere saltos de párrafo, luego nuevas líneas; oraciones al final).
Fusione los fragmentos transmitidos con `agents.defaults.blockStreamingCoalesce` para reducir
el spam de una sola línea (fusión basada en inactividad antes del envío). Los canales que no sean Telegram requieren
`*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
Los resúmenes detallados de herramientas se emiten al inicio de la herramienta (sin debounce); la interfaz de Control
transmite la salida de la herramienta a través de eventos del agente cuando están disponibles.
Más detalles: [Streaming + chunking](/es/concepts/streaming).

## Model refs

Las referencias de modelo en la configuración (por ejemplo `agents.defaults.model` y `agents.defaults.models`) se analizan dividiendo por el **primer** `/`.

- Use `provider/model` al configurar modelos.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw trata la entrada como un alias o un modelo para el **proveedor predeterminado** (solo funciona cuando no hay `/` en el ID del modelo).

## Configuration (minimal)

Como mínimo, configure:

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (muy recomendado)

---

_Siguiente: [Chats grupales](/es/channels/group-messages)_ 🦞

import en from "/components/footer/en.mdx";

<en />
