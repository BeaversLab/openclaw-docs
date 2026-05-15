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
- No envíe respuestas parciales/en flujo a superficies de mensajería externas (solo respuestas finales).

## Inicio de sesión (requerido)

- Lea `SOUL.md`, `USER.md` y hoy+ayer en `memory/`.
- Lea `MEMORY.md` cuando esté presente.
- Hágalo antes de responder.

## Alma (requerido)

- `SOUL.md` define la identidad, el tono y los límites. Manténgalo actualizado.
- Si cambia `SOUL.md`, informe al usuario.
- Usted es una instancia nueva en cada sesión; la continuidad reside en estos archivos.

## Espacios compartidos (recomendado)

- Usted no es la voz del usuario; tenga cuidado en chats grupales o canales públicos.
- No comparta datos privados, información de contacto o notas internas.

## Sistema de memoria (recomendado)

- Registro diario: `memory/YYYY-MM-DD.md` (cree `memory/` si es necesario).
- Memoria a largo plazo: `MEMORY.md` para datos duraderos, preferencias y decisiones.
- `memory.md` en minúsculas es solo para entrada de reparación heredada; no mantenga ambos archivos raíz a propósito.
- Al iniciar la sesión, lea hoy + ayer + `MEMORY.md` cuando esté presente.
- Captura: decisiones, preferencias, restricciones, bucles abiertos.
- Evite secretos a menos que se solicite explícitamente.

## Herramientas y habilidades

- Las herramientas viven en habilidades; siga el `SKILL.md` de cada habilidad cuando la necesite.
- Mantenga notas específicas del entorno en `TOOLS.md` (Notas para habilidades).

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

- Ejecuta la puerta de enlace de WhatsApp + el agente de codificación Pi para que el asistente pueda leer/escribir chats, obtener contexto y ejecutar habilidades a través del host Mac.
- La aplicación de macOS gestiona los permisos (grabación de pantalla, notificaciones, micrófono) y expone la CLI de `openclaw` a través de su binario incluido.
- Los chats directos se colapsan en la sesión `main` del agente de forma predeterminada; los grupos se mantienen aislados como `agent:<agentId>:<channel>:group:<id>` (rooms/channels: `agent:<agentId>:<channel>:channel:<id>`); los latidos mantienen las tareas en segundo plano activas.

## Habilidades principales (activar en Configuración → Habilidades)

- **mcporter** - Entorno de ejecución/CLI del servidor de herramientas para gestionar los backends de habilidades externas.
- **Peekaboo** - Capturas de pantalla rápidas de macOS con análisis de visión con IA opcional.
- **camsnap** - Captura fotogramas, clips o alertas de movimiento de cámaras de seguridad RTSP/ONVIF.
- **oracle** - CLI de agente compatible con OpenAI con repetición de sesión y control del navegador.
- **eightctl** - Controla tu sueño, desde la terminal.
- **imsg** - Enviar, leer, transmitir iMessage y SMS.
- **wacli** - CLI de WhatsApp: sincronizar, buscar, enviar.
- **discord** - Acciones de Discord: reaccionar, pegatinas, encuestas. Usa objetivos `user:<id>` o `channel:<id>` (los ids numéricos simples son ambiguos).
- **gog** - CLI de Google Suite: Gmail, Calendario, Drive, Contactos.
- **spotify-player** - Cliente de Spotify en terminal para buscar/encolar/controlar la reproducción.
- **sag** - Voz de ElevenLabs con experiencia de usuario estilo mac say; transmite a los altavoces de forma predeterminada.
- **Sonos CLI** - Controla los altavoces Sonos (descubrir/estado/reproducción/volumen/agrupación) desde scripts.
- **blucli** - Reproduce, agrupa y automatiza reproductores BluOS desde scripts.
- **OpenHue CLI** - Control de iluminación Philips Hue para escenas y automatizaciones.
- **OpenAI Whisper** - Voz a texto local para dictados rápidos y transcripciones de buzón de voz.
- **Gemini CLI** - Modelos de Google Gemini desde la terminal para preguntas y respuestas rápidas.
- **agent-tools** - Kit de herramientas de utilidad para automatizaciones y scripts de ayuda.

## Notas de uso

- Prefiere la CLI de `openclaw` para scripts; la aplicación de mac gestiona los permisos.
- Ejecuta instalaciones desde la pestaña Habilidades; oculta el botón si un binario ya está presente.
- Mantén los latidos habilitados para que el asistente pueda programar recordatorios, supervisar bandejas de entrada y activar capturas de cámara.
- La interfaz de usuario de Canvas se ejecuta en pantalla completa con superposiciones nativas. Evita colocar controles críticos en los bordes superior izquierdo/superior derecho/inferior; añade márgenes explícitos en el diseño y no confíes en los insets de área segura.
- Para la verificación impulsada por el navegador, usa `openclaw browser` (pestañas/estado/captura de pantalla) con el perfil de Chrome gestionado por OpenClaw.
- Para la inspección del DOM, usa `openclaw browser eval|query|dom|snapshot` (y `--json`/`--out` cuando necesites resultados de máquina).
- Para las interacciones, usa `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (clic/escritura requieren referencias de instantánea; usa `evaluate` para selectores CSS).

## Relacionado

- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Tiempo de ejecución del agente](/es/concepts/agent)
