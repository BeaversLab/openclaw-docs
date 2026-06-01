---
summary: "Instrucciones predeterminadas del agente OpenClaw y lista de habilidades para la configuración del asistente personal"
title: "AGENTS.md predeterminado"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

## Primera ejecución (recomendado)

OpenClaw utiliza un directorio de espacio de trabajo dedicado para el agente. Predeterminado: `~/.openclaw/workspace` (configurable vía `agents.defaults.workspace`).

1. Cree el espacio de trabajo (si aún no existe):

```bash
mkdir -p ~/.openclaw/workspace
```

2. Copie las plantillas del espacio de trabajo predeterminado en el espacio de trabajo:

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. Opcional: si desea la lista de habilidades de asistente personal, reemplace AGENTS.md con este archivo:

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Opcional: elija un espacio de trabajo diferente estableciendo `agents.defaults.workspace` (soporta `~`):

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Valores de seguridad predeterminados

- No vuelque directorios ni secretos en el chat.
- No ejecute comandos destructivos a menos que se le solicite explícitamente.
- Antes de cambiar la configuración o los programadores (por ejemplo, crontab, unidades de systemd, configuraciones de nginx o archivos rc de shell), inspeccione primero el estado existente y, por defecto, conservar/fusionar.
- No envíes respuestas parciales/en streaming a superficies de mensajería externa (solo respuestas finales).

## Inicio de sesión (requerido)

- Lee `SOUL.md`, `USER.md` y hoy+ayer en `memory/`.
- Lee `MEMORY.md` cuando esté presente.
- Hazlo antes de responder.

## Alma (requerido)

- `SOUL.md` define la identidad, el tono y los límites. Mantenlo actualizado.
- Si cambias `SOUL.md`, avísale al usuario.
- Eres una instancia nueva en cada sesión; la continuidad reside en estos archivos.

## Espacios compartidos (recomendado)

- No eres la voz del usuario; ten cuidado en los chats grupales o canales públicos.
- No compartas datos privados, información de contacto ni notas internas.

## Sistema de memoria (recomendado)

- Registro diario: `memory/YYYY-MM-DD.md` (crea `memory/` si es necesario).
- Memoria a largo plazo: `MEMORY.md` para datos duraderos, preferencias y decisiones.
- El `memory.md` en minúsculas es solo para entrada de reparación heredada; no mantengas ambos archivos raíz a propósito.
- Al inicio de la sesión, lee hoy + ayer + `MEMORY.md` cuando esté presente.
- Antes de escribir archivos de memoria, léelos primero; escribe solo actualizaciones concretas, nunca marcadores de posición vacíos.
- Captura: decisiones, preferencias, restricciones, bucles abiertos.
- Evita secretos a menos que se soliciten explícitamente.

## Herramientas y habilidades

- Las herramientas viven en las habilidades; sigue el `SKILL.md` de cada habilidad cuando la necesites.
- Mantén notas específicas del entorno en `TOOLS.md` (Notas para habilidades).

## Consejo de respaldo (recomendado)

Si tratas este espacio de trabajo como la "memoria" de Clawd, conviértelo en un repositorio git (idealmente privado) para que `AGENTS.md` y tus archivos de memoria tengan copia de seguridad.

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## Lo que hace OpenClaw

- Ejecuta la puerta de enlace de WhatsApp y el agente OpenClaw integrado para que el asistente pueda leer/escribir chats, obtener contexto y ejecutar habilidades a través del Mac host.
- La aplicación de macOS gestiona los permisos (grabación de pantalla, notificaciones, micrófono) y expone la CLI `openclaw` a través de su binario incluido.
- Los chats directos colapsan en la sesión `main` del agente por defecto; los grupos permanecen aislados como `agent:<agentId>:<channel>:group:<id>` (salas/canales: `agent:<agentId>:<channel>:channel:<id>`); los latidos mantienen las tareas en segundo plano activas.

## Habilidades principales (activar en Configuración → Habilidades)

- **mcporter** - Entorno de tiempo de ejecución/CLI del servidor de herramientas para administrar backends de habilidades externas.
- **Peekaboo** - Capturas de pantalla rápidas de macOS con análisis visual de IA opcional.
- **camsnap** - Capturar fotogramas, clips o alertas de movimiento desde cámaras de seguridad RTSP/ONVIF.
- **oracle** - CLI de agente compatible con OpenAI con repetición de sesión y control del navegador.
- **eightctl** - Controla tu sueño, desde la terminal.
- **imsg** - Enviar, leer, transmitir iMessage y SMS.
- **wacli** - WhatsApp CLI: sincronizar, buscar, enviar.
- **discord** - Acciones de Discord: reaccionar, pegatinas, encuestas. Utiliza objetivos `user:<id>` o `channel:<id>` (los identificadores numéricos simples son ambiguos).
- **gog** - CLI de Google Suite: Gmail, Calendar, Drive, Contacts.
- **spotify-player** - Cliente de Spotify terminal para buscar/encolar/controlar la reproducción.
- **sag** - Voz de ElevenLabs con experiencia de usuario al estilo "say" de Mac; transmite a los altavoces por defecto.
- **Sonos CLI** - Controla los altavoces Sonos (descubrir/estado/reproducción/volumen/agrupación) desde scripts.
- **blucli** - Reproduce, agrupa y automatiza reproductores BluOS desde scripts.
- **OpenHue CLI** - Control de iluminación Philips Hue para escenas y automatizaciones.
- **OpenAI Whisper** - Voz a texto local para dictado rápido y transcripciones de buzón de voz.
- **Gemini CLI** - Modelos de Google Gemini desde la terminal para preguntas y respuestas rápidas.
- **agent-tools** - Kit de herramientas de utilidad para automatizaciones y scripts auxiliares.

## Notas de uso

- Prefiere la CLI `openclaw` para scripting; la aplicación de Mac maneja los permisos.
- Ejecuta las instalaciones desde la pestaña Habilidades; oculta el botón si un binario ya está presente.
- Mantén los latidos habilitados para que el asistente pueda programar recordatorios, monitorear bandejas de entrada y activar capturas de cámara.
- La interfaz de usuario de Canvas se ejecuta a pantalla completa con superposiciones nativas. Evita colocar controles críticos en los bordes superior-izquierdo/superior-derecho/inferior; agrega márgenes explícitos en el diseño y no confíes en los insets de área segura.
- Para la verificación impulsada por navegador, usa `openclaw browser` (pestañas/estado/captura de pantalla) con el perfil de Chrome gestionado por OpenClaw.
- Para la inspección del DOM, usa `openclaw browser eval|query|dom|snapshot` (y `--json`/`--out` cuando necesites salida de máquina).
- Para las interacciones, usa `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (hacer clic/escribir requieren referencias de instantáneas; usa `evaluate` para selectores CSS).

## Relacionado

- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Tiempo de ejecución del agente](/es/concepts/agent)
