---
summary: "Tiempo de ejecución del agente, contrato del espacio de trabajo e inicio de sesión"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Tiempo de ejecución del agente"
---

OpenClaw ejecuta un **single embedded agent runtime** (único tiempo de ejecución de agente integrado) - un proceso de agente por Gateway, con su propio workspace, archivos de arranque y almacenamiento de sesiones. Esta página cubre ese contrato de tiempo de ejecución: qué debe contener el workspace, qué archivos se inyectan y cómo las sesiones se inician sobre él.

## Espacio de trabajo (obligatorio)

OpenClaw utiliza un único directorio de espacio de trabajo del agente (`agents.defaults.workspace`) como el **único** directorio de trabajo (`cwd`) para herramientas y contexto.

Recomendado: use `openclaw setup` para crear `~/.openclaw/openclaw.json` si falta e inicializar los archivos del espacio de trabajo.

Diseño completo del espacio de trabajo + guía de copia de seguridad: [Espacio de trabajo del agente](/es/concepts/agent-workspace)

Si `agents.defaults.sandbox` está habilitado, las sesiones que no son principales pueden anular esto con espacios de trabajo por sesión bajo `agents.defaults.sandbox.workspaceRoot` (consulte [Configuración de la puerta de enlace](/es/gateway/configuration)).

## Archivos de arranque (inyectados)

Dentro de `agents.defaults.workspace`, OpenClaw espera estos archivos editables por el usuario:

- `AGENTS.md` - instrucciones de operación + "memoria"
- `SOUL.md` - persona, límites, tono
- `TOOLS.md` - notas de herramientas mantenidas por el usuario (ej. `imsg`, `sag`, convenciones)
- `BOOTSTRAP.md` - ritual de primera ejecución única (eliminado después de completarse)
- `IDENTITY.md` - nombre/vibración/emoji del agente
- `USER.md` - perfil de usuario + dirección preferida

En el primer turno de una nueva sesión, OpenClaw inyecta el contenido de estos archivos en el Contexto del Proyecto del prompt del sistema.

Los archivos en blanco se omiten. Los archivos grandes se recortan y truncan con un marcador para que las solicitudes se mantengan ligeras (lea el archivo para obtener el contenido completo).

Si falta un archivo, OpenClaw inyecta una sola línea de marcador de "archivo faltante" (y `openclaw setup` creará una plantilla predeterminada segura).

`BOOTSTRAP.md` solo se crea para un **brand new workspace** (espacio de trabajo totalmente nuevo) (no hay otros archivos de arranque presentes). Mientras está pendiente, OpenClaw lo mantiene en el Contexto del Proyecto y agrega orientación de arranque del prompt del sistema para el ritual inicial en lugar de copiarlo en el mensaje del usuario. Si lo elimina después de completar el ritual, no debería recrearse en reinicios posteriores.

Para deshabilitar por completo la creación de archivos de arranque (para espacios de trabajo presembrados), establezca:

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Herramientas integradas

Las herramientas principales (read/exec/edit/write y herramientas del sistema relacionadas) siempre están disponibles, sujetas a la política de herramientas. `apply_patch` es opcional y está controlada por `tools.exec.applyPatch`. `TOOLS.md` **no** controla qué herramientas existen; es una orientación sobre cómo _usted_ quiere que se usen.

## Habilidades

OpenClaw carga habilidades desde estas ubicaciones (de mayor a menor precedencia):

- Espacio de trabajo: `<workspace>/skills`
- Habilidades del agente del proyecto: `<workspace>/.agents/skills`
- Habilidades del agente personal: `~/.agents/skills`
- Gestionado/local: `~/.openclaw/skills`
- Incluido (enviado con la instalación)
- Carpetas de habilidades adicionales: `skills.load.extraDirs`

Las habilidades pueden estar restringidas por configuración/entorno (consulte `skills` en [Configuración de la puerta de enlace](/es/gateway/configuration)).

## Límites de tiempo de ejecución

El tiempo de ejecución del agente integrado se basa en el núcleo del agente Pi (modelos, herramientas y canalización de instrucciones). La gestión de sesiones, el descubrimiento, la conexión de herramientas y la entrega de canales son capas propiedad de OpenClaw encima de ese núcleo.

## Sesiones

Las transcripciones de sesión se almacenan como JSONL en:

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

El ID de sesión es estable y lo elige OpenClaw.
No se leen las carpetas de sesiones heredadas de otras herramientas.

## Dirección durante el streaming

Los mensajes entrantes que llegan a mitad de la ejecución se dirigen a la ejecución actual de forma predeterminada.
La dirección se entrega **después de que el turno del asistente actual termine de ejecutar sus
llamadas a herramientas**, antes de la siguiente llamada al LLM, y ya no omite las llamadas a herramientas restantes
del mensaje del asistente actual.

`/queue steer` es el comportamiento predeterminado de ejecución activa. `/queue followup` y
`/queue collect` hacen que los mensajes esperen a un turno posterior en lugar de dirigir.
`/queue interrupt` aborta la ejecución activa en su lugar. Consulte [Queue](/es/concepts/queue)
y [Steering queue](/es/concepts/queue-steering) para conocer el comportamiento de la cola y los límites.

La transmisión en bloques envía bloques completos del asistente tan pronto como terminan; está **desactivada por defecto** (`agents.defaults.blockStreamingDefault: "off"`).
Ajuste el límite a través de `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; por defecto es text_end).
Controle la fragmentación de bloques suaves con `agents.defaults.blockStreamingChunk` (por defecto 800-1200 caracteres; prefiere saltos de párrafo, luego saltos de línea; oraciones al final).
Fusione los fragmentos transmitidos con `agents.defaults.blockStreamingCoalesce` para reducir spam de una sola línea (fusión basada inactividad antes de enviar). Los canales que no sean Telegram requieren `*.blockStreaming: true` explícito para habilitar respuestas en bloque.
Los resúmenes detallados de herramientas se emiten al inicio de la herramienta (sin rebote); La interfaz de Control transmite la salida de la herramienta a través de eventos del agente cuando está disponible.
Más detalles: [Streaming + chunking](/es/concepts/streaming).

## Model refs

Las referencias de modelos en la configuración (por ejemplo, `agents.defaults.model` y `agents.defaults.models`) se analizan dividiendo en el **primer** `/`.

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

_Siguiente: [Chats grupales](/es/channels/group-messages)_ 🦞

## Related

- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Gestión de sesiones](/es/concepts/session)
