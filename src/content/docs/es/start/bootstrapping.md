---
summary: "Ritual de arranque del agente que inicializa el espacio de trabajo y los archivos de identidad"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Arranque del agente"
sidebarTitle: "Arranque"
---

# Arranque del agente

El arranque es el ritual de **primera ejecución** que prepara un espacio de trabajo del agente y
recopila detalles de identidad. Ocurre después de la incorporación, cuando el agente se inicia
por primera vez.

## Qué hace el arranque

En la primera ejecución del agente, OpenClaw inicializa el espacio de trabajo (predeterminado
`~/.openclaw/workspace`):

- Inicializa `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Ejecuta un breve ritual de preguntas y respuestas (una pregunta a la vez).
- Escribe la identidad y las preferencias en `IDENTITY.md`, `USER.md`, `SOUL.md`.
- Elimina `BOOTSTRAP.md` cuando termina para que solo se ejecute una vez.

## Dónde se ejecuta

El arranque siempre se ejecuta en el **host de puerta de enlace**. Si la aplicación de macOS se conecta a
una puerta de enlace remota, el espacio de trabajo y los archivos de arranque residen en esa máquina
remota.

<Note>Cuando el Gateway se ejecuta en otra máquina, edite los archivos del espacio de trabajo en el host del gateway (por ejemplo, `user@gateway-host:~/.openclaw/workspace`).</Note>

## Documentos relacionados

- Incorporación de la aplicación macOS: [Incorporación](/es/start/onboarding)
- Diseño del espacio de trabajo: [Espacio de trabajo del agente](/es/concepts/agent-workspace)
