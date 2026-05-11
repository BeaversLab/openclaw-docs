---
summary: "Tiempo de ejecución del agente, contrato del espacio de trabajo e inicio de sesión"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Tiempo de ejecución del agente"
---

OpenClaw ejecuta un **único tiempo de ejecución de agente integrado** — un proceso de agente por
Gateway, con su propio espacio de trabajo, archivos de arranque y almacén de sesiones. Esta página
cubre ese contrato de tiempo de ejecución: qué debe contener el espacio de trabajo, qué archivos se
inyectan y cómo las sesiones se inician con él.

## Espacio de trabajo (obligatorio)

OpenClaw utiliza un único directorio de espacio de trabajo del agente (`agents.defaults.workspace`) como el **único** directorio de trabajo (`cwd`) del agente para herramientas y contexto.

Recomendado: use `openclaw setup` para crear `~/.openclaw/openclaw.json` si falta e inicializar los archivos del espacio de trabajo.

Diseño completo del espacio de trabajo + guía de copia de seguridad: [Espacio de trabajo del agente](/es/concepts/agent-workspace)

Si `agents.defaults.sandbox` está habilitado, las sesiones que no sean las principales pueden anular esto con
espacios de trabajo por sesión bajo `agents.defaults.sandbox.workspaceRoot` (ver
[Configuración de Gateway](/es/gateway/configuration)).

## Archivos de arranque (inyectados)

Dentro de `agents.defaults.workspace`, OpenClaw espera estos archivos editables por el usuario:

- `AGENTS.md` — instrucciones de operación + “memoria”
- `SOUL.md` — persona, límites, tono
- `TOOLS.md` — notas de herramientas mantenidas por el usuario (ej. `imsg`, `sag`, convenciones)
- `BOOTSTRAP.md` — ritual de inicio único de primera ejecución (eliminado después de completarse)
- `IDENTITY.md` — nombre/vibración/emoji del agente
- `USER.md` — perfil de usuario + dirección preferida

En el primer turno de una nueva sesión, OpenClaw inyecta el contenido de estos archivos directamente en el contexto del agente.

Los archivos en blanco se omiten. Los archivos grandes se recortan y truncan con un marcador para que las solicitudes se mantengan ligeras (lea el archivo para obtener el contenido completo).

Si falta un archivo, OpenClaw inyecta una sola línea de marcador de “archivo faltante” (e `openclaw setup` creará una plantilla predeterminada segura).

`BOOTSTRAP.md` solo se crea para un **espacio de trabajo totalmente nuevo** (sin otros archivos de arranque presentes). Si lo elimina después de completar el ritual, no debería recrearse en reinicios posteriores.

Para deshabilitar por completo la creación de archivos de arranque (para espacios de trabajo presembrados), establezca:

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Herramientas integradas

Las herramientas principales (read/exec/edit/write y herramientas del sistema relacionadas) siempre están disponibles, sujetas a la política de herramientas. `apply_patch` es opcional y está limitado por `tools.exec.applyPatch`. `TOOLS.md` **no** controla qué herramientas existen; es una guía de cómo _usted_ desea que se utilicen.

## Habilidades

OpenClaw carga habilidades desde estas ubicaciones (de mayor a menor precedencia):

- Espacio de trabajo: `<workspace>/skills`
- Habilidades del agente del proyecto: `<workspace>/.agents/skills`
- Habilidades del agente personal: `~/.agents/skills`
- Gestionado/local: `~/.openclaw/skills`
- Incluido (enviado con la instalación)
- Carpetas de habilidades adicionales: `skills.load.extraDirs`

Las habilidades pueden estar limitadas por configuración/entorno (ver `skills` en [Configuración de Gateway](/es/gateway/configuration)).

## Límites de tiempo de ejecución

El tiempo de ejecución del agente integrado se basa en el núcleo del agente Pi (modelos, herramientas y canalización de instrucciones). La gestión de sesiones, el descubrimiento, la conexión de herramientas y la entrega de canales son capas propiedad de OpenClaw encima de ese núcleo.

## Sesiones

Las transcripciones de sesión se almacenan como JSONL en:

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

El ID de sesión es estable y lo elige OpenClaw.
No se leen las carpetas de sesiones heredadas de otras herramientas.

## Dirección durante el streaming

Cuando el modo de cola es `steer`, los mensajes entrantes se inyectan en la ejecución actual.
La dirección en cola se entrega **después de que el turno del asistente actual termina
de ejecutar sus llamadas a herramientas**, antes de la siguiente llamada al LLM. La dirección ya no omite
las llamadas a herramientas restantes del mensaje del asistente actual; en su lugar, inyecta el mensaje
en cola en el siguiente límite del modelo.

Cuando el modo de cola es `followup` o `collect`, los mensajes entrantes se retienen hasta que
termina el turno actual, luego comienza un nuevo turno de agente con las cargas útiles en cola. Vea
[Cola](/es/concepts/queue) para el comportamiento del modo + rebote/limite.

Block streaming envía bloques completos del asistente tan pronto como terminan; está **desactivado por defecto** (`agents.defaults.blockStreamingDefault: "off"`).
Ajuste el límite mediante `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; por defecto es text_end).
Controle la fragmentación de bloques suaves con `agents.defaults.blockStreamingChunk` (por defecto es
800–1200 caracteres; prefiere saltos de párrafo, luego saltos de línea; oraciones al final).
Fusione los fragmentos transmitidos con `agents.defaults.blockStreamingCoalesce` para reducir
el spam de una sola línea (fusión basada en inactividad antes de enviar). Los canales que no sean Telegram requieren
un `*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
Los resúmenes detallados de herramientas se emiten al inicio de la herramienta (sin rebote); La interfaz de control
transmite el resultado de la herramienta a través de eventos del agente cuando están disponibles.
Más detalles: [Streaming + chunking](/es/concepts/streaming).

## Model refs

Las referencias de modelo en la configuración (por ejemplo `agents.defaults.model` y `agents.defaults.models`) se analizan dividiendo por el **primer** `/`.

- Use `provider/model` al configurar modelos.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw intenta primero un alias, luego una coincidencia única de proveedor configurado para ese ID de modelo exacto, y solo luego recurre
  al proveedor predeterminado configurado. Si ese proveedor ya no expone el
  modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo
  configurado en lugar de mostrar un predeterminado obsoleto de proveedor eliminado.

## Configuration (minimal)

Como mínimo, establezca:

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (muy recomendado)

---

_Siguiente: [Group Chats](/es/channels/group-messages)_ 🦞

## Related

- [Agent workspace](/es/concepts/agent-workspace)
- [Multi-agent routing](/es/concepts/multi-agent)
- [Session management](/es/concepts/session)
