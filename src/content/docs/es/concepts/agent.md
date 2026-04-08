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

Diseño completo del espacio de trabajo + guía de copia de seguridad: [Agente espacio de trabajo](/en/concepts/agent-workspace)

Si `agents.defaults.sandbox` está habilitado, las sesiones que no son principales pueden anular esto con
espacios de trabajo por sesión bajo `agents.defaults.sandbox.workspaceRoot` (ver
[Configuración de puerta de enlace](/en/gateway/configuration)).

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

OpenClaw carga habilidades desde estas ubicaciones (primera la máxima precedencia):

- Espacio de trabajo: `<workspace>/skills`
- Habilidades de agente del proyecto: `<workspace>/.agents/skills`
- Habilidades de agente personal: `~/.agents/skills`
- Gestionado/local: `~/.openclaw/skills`
- Incluido (enviado con la instalación)
- Carpetas de habilidades adicionales: `skills.load.extraDirs`

Las habilidades pueden ser restringidas por configuración/entorno (ver `skills` en [Configuración de puerta de enlace](/en/gateway/configuration)).

## Límites de tiempo de ejecución

El tiempo de ejecución del agente integrado se basa en el núcleo del agente Pi (modelos, herramientas y
conducto de avisos). La gestión de sesiones, descubrimiento, cableado de herramientas y entrega de
canal son capas propiedad de OpenClaw encima de ese núcleo.

## Sesiones

Las transcripciones de sesión se almacenan como JSONL en:

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

El ID de sesión es estable y es elegido por OpenClaw.
Las carpetas de sesión heredadas de otras herramientas no se leen.

## Dirección mientras se transmite

Cuando el modo de cola es `steer`, los mensajes entrantes se inyectan en la ejecución actual.
La dirección en cola se entrega **después de que el turno del asistente actual termine
de ejecutar sus llamadas a herramientas**, antes de la siguiente llamada LLM. La dirección ya no omite
las llamadas a herramientas restantes del mensaje del asistente actual; en su lugar, inyecta el mensaje
en cola en el siguiente límite del modelo.

Cuando el modo de cola es `followup` o `collect`, los mensajes entrantes se mantienen hasta que
termina el turno actual, luego comienza un nuevo turno de agente con las cargas útiles en cola. Vea
[Cola](/en/concepts/queue) para el modo + comportamiento de rebote/limite.

La transmisión en bloques envía bloques completos del asistente tan pronto como terminan; está
**desactivada por defecto** (`agents.defaults.blockStreamingDefault: "off"`).
Ajuste el límite mediante `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; por defecto es text_end).
Controle la fragmentación de bloques suaves con `agents.defaults.blockStreamingChunk` (por defecto
800–1200 caracteres; prefiere saltos de párrafo, luego saltos de línea; oraciones al final).
Fusione los fragmentos transmitidos con `agents.defaults.blockStreamingCoalesce` para reducir
el spam de una sola línea (fusión basada inactividad antes de enviar). Los canales que no sean Telegram requieren
un `*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
Los resúmenes detallados de herramientas se emiten al inicio de la herramienta (sin rebote); La interfaz de control
transmite la salida de la herramienta a través de eventos del agente cuando están disponibles.
Más detalles: [Streaming + chunking](/en/concepts/streaming).

## Referencias de modelo

Las referencias de modelo en la configuración (por ejemplo `agents.defaults.model` y `agents.defaults.models`) se analizan dividiendo en el **primer** `/`.

- Use `provider/model` al configurar modelos.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw intenta primero un alias, luego una coincidencia única
  de proveedor configurado para ese ID de modelo exacto, y solo entonces recurre
  al proveedor predeterminado configurado. Si ese proveedor ya no expone el
  modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo
  configurado en lugar de mostrar un predeterminado obsoleto de proveedor eliminado.

## Configuración (mínima)

Como mínimo, configure:

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (altamente recomendado)

---

_Siguiente: [Group Chats](/en/channels/group-messages)_ 🦞
