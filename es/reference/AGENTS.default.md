---
title: "Default AGENTS.md"
summary: "Default OpenClaw agent instructions and skills roster for the personal assistant setup"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

# AGENTS.md - OpenClaw Personal Assistant (default)

## First run (recommended)

OpenClaw uses a dedicated workspace directory for the agent. Default: `~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

1. Create the workspace (if it doesn’t already exist):

```bash
mkdir -p ~/.openclaw/workspace
```

2. Copy the default workspace templates into the workspace:

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. Optional: if you want the personal assistant skill roster, replace AGENTS.md with this file:

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Optional: choose a different workspace by setting `agents.defaults.workspace` (supports `~`):

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Safety defaults

- Don’t dump directories or secrets into chat.
- Don’t run destructive commands unless explicitly asked.
- Don’t send partial/streaming replies to external messaging surfaces (only final replies).

## Session start (required)

- Read `SOUL.md`, `USER.md`, and today+yesterday in `memory/`.
- Read `MEMORY.md` when present; only fall back to lowercase `memory.md` when `MEMORY.md` is absent.
- Do it before responding.

## Soul (required)

- `SOUL.md` defines identity, tone, and boundaries. Keep it current.
- If you change `SOUL.md`, tell the user.
- You are a fresh instance each session; continuity lives in these files.

## Shared spaces (recommended)

- You’re not the user’s voice; be careful in group chats or public channels.
- Don’t share private data, contact info, or internal notes.

## Memory system (recommended)

- Daily log: `memory/YYYY-MM-DD.md` (create `memory/` if needed).
- Long-term memory: `MEMORY.md` for durable facts, preferences, and decisions.
- Lowercase `memory.md` is legacy fallback only; do not keep both root files on purpose.
- On session start, read today + yesterday + `MEMORY.md` when present, otherwise `memory.md`.
- Capturar: decisiones, preferencias, restricciones, bucles abiertos.
- Evita secretos a menos que se soliciten explícitamente.

## Herramientas y habilidades

- Las herramientas viven en las habilidades; sigue la `SKILL.md` de cada habilidad cuando la necesites.
- Mantén notas específicas del entorno en `TOOLS.md` (Notas para habilidades).

## Consejo de copia de seguridad (recomendado)

Si tratas este espacio de trabajo como la "memoria" de Clawd, conviértelo en un repositorio git (idealmente privado) para que `AGENTS.md` y tus archivos de memoria se respalden.

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## Lo que hace OpenClaw

- Ejecuta el gateway de WhatsApp + el agente de codificación Pi para que el asistente pueda leer/escribir chats, obtener contexto y ejecutar habilidades a través de la Mac anfitriona.
- La aplicación de macOS gestiona los permisos (grabación de pantalla, notificaciones, micrófono) y expone la CLI de `openclaw` a través de su binario incluido.
- Los chats directos colapsan en la sesión `main` del agente por defecto; los grupos se mantienen aislados como `agent:<agentId>:<channel>:group:<id>` (salas/canales: `agent:<agentId>:<channel>:channel:<id>`); los latidos mantienen las tareas en segundo plano vivas.

## Habilidades principales (activar en Configuración → Habilidades)

- **mcporter** — Tiempo de ejecución/CLI del servidor de herramientas para gestionar los backends de habilidades externas.
- **Peekaboo** — Capturas de pantalla rápidas de macOS con análisis de visión de IA opcional.
- **camsnap** — Captura fotogramas, clips o alertas de movimiento desde cámaras de seguridad RTSP/ONVIF.
- **oracle** — CLI de agente listo para OpenAI con repetición de sesión y control del navegador.
- **eightctl** — Controla tu sueño, desde la terminal.
- **imsg** — Enviar, leer, transmitir iMessage y SMS.
- **wacli** — CLI de WhatsApp: sincronizar, buscar, enviar.
- **discord** — Acciones de Discord: reaccionar, pegatinas, encuestas. Usa objetivos `user:<id>` o `channel:<id>` (los ids numéricos por sí solos son ambiguos).
- **gog** — CLI de Google Suite: Gmail, Calendar, Drive, Contactos.
- **spotify-player** — Cliente de Spotify en terminal para buscar/encolar/controlar la reproducción.
- **sag** — Voz de ElevenLabs con experiencia de usuario de estilo mac say; transmite a los altavoces por defecto.
- **Sonos CLI** — Controla los altavoces Sonos (descubrir/estado/reproducción/volumen/agrupación) desde scripts.
- **blucli** — Reproduce, agrupa y automatiza reproductores BluOS desde scripts.
- **OpenHue CLI** — Control de iluminación Philips Hue para escenas y automatizaciones.
- **OpenAI Whisper** — Reconocimiento de voz local para dictados rápidos y transcripciones de correo de voz.
- **Gemini CLI** — Modelos de Google Gemini desde la terminal para preguntas y respuestas rápidas.
- **agent-tools** — Kit de herramientas de utilidad para automatizaciones y scripts auxiliares.

## Notas de uso

- Prefiera la CLI `openclaw` para el scripting; la aplicación de Mac maneja los permisos.
- Ejecute las instalaciones desde la pestaña Habilidades; oculta el botón si un binario ya está presente.
- Mantenga los latidos habilitados para que el asistente pueda programar recordatorios, supervisar bandejas de entrada y activar capturas de cámara.
- La interfaz de usuario de Canvas se ejecuta a pantalla completa con superposiciones nativas. Evite colocar controles críticos en los bordes superior izquierdo/superior derecho/inferior; agregue márgenes explícitos en el diseño y no confíe en los márgenes de área segura.
- Para la verificación impulsada por el navegador, use `openclaw browser` (pestañas/estado/captura de pantalla) con el perfil de Chrome administrado por OpenClaw.
- Para la inspección del DOM, use `openclaw browser eval|query|dom|snapshot` (y `--json`/`--out` cuando necesite salida de máquina).
- Para las interacciones, use `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (hacer clic/escribir requieren referencias de instantánea; use `evaluate` para selectores CSS).

import en from "/components/footer/en.mdx";

<en />
