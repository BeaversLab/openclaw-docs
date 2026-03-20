---
summary: "Ritual de arranque del agente que inicializa el área de trabajo y los archivos de identidad"
read_when:
  - Entender qué sucede en la primera ejecución del agente
  - Explicar dónde se encuentran los archivos de arranque
  - Depuración de la configuración de identidad de incorporación
title: "Arranque del agente"
sidebarTitle: "Arranque"
---

# Arranque del agente

El arranque es el ritual de **primera ejecución** que prepara un área de trabajo del agente y
recopila los detalles de identidad. Ocurre después de la incorporación, cuando el agente se inicia
por primera vez.

## Qué hace el arranque

En la primera ejecución del agente, OpenClaw inicializa el área de trabajo (predeterminada
`~/.openclaw/workspace`):

- Inicializa `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Ejecuta un breve ritual de preguntas y respuestas (una pregunta a la vez).
- Escribe la identidad y las preferencias en `IDENTITY.md`, `USER.md`, `SOUL.md`.
- Elimina `BOOTSTRAP.md` cuando termina para que solo se ejecute una vez.

## Dónde se ejecuta

El arranque siempre se ejecuta en el **host de puerta de enlace**. Si la aplicación macOS se conecta a
una puerta de enlace remota, el área de trabajo y los archivos de arranque residen en esa máquina
remota.

<Note>
Cuando la puerta de enlace se ejecuta en otra máquina, edite los archivos del área de trabajo en el host
de la puerta de enlace (por ejemplo, `user@gateway-host:~/.openclaw/workspace`).
</Note>

## Documentos relacionados

- Incorporación de la aplicación macOS: [Incorporación](/es/start/onboarding)
- Diseño del área de trabajo: [Área de trabajo del agente](/es/concepts/agent-workspace)

import en from "/components/footer/en.mdx";

<en />
