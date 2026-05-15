---
summary: "Ritual de arranque del agente que inicializa el espacio de trabajo y los archivos de identidad"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Inicialización del agente"
sidebarTitle: "Arranque"
---

El arranque (bootstrapping) es el ritual de **primera ejecución** que prepara un espacio de trabajo del agente y recopila detalles de identidad. Ocurre después de la incorporación (onboarding), cuando el agente se inicia por primera vez.

## Qué hace la inicialización

En la primera ejecución del agente, OpenClaw inicializa el espacio de trabajo (predeterminado
`~/.openclaw/workspace`):

- Siembra `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Ejecuta un breve ritual de preguntas y respuestas (una pregunta a la vez).
- Escribe la identidad y las preferencias en `IDENTITY.md`, `USER.md`, `SOUL.md`.
- Elimina `BOOTSTRAP.md` cuando termina para que solo se ejecute una vez.

Para ejecuciones con modelos integrados o locales, OpenClaw mantiene `BOOTSTRAP.md` fuera del contexto del sistema privilegiado. En la primera ejecución interactiva principal, aún pasa el contenido del archivo en el mensaje del usuario para que los modelos que no llaman de manera confiable a la herramienta `read` puedan completar el ritual. Si la ejecución actual no puede acceder de manera segura al espacio de trabajo, el agente recibe una nota de arranque limitada en lugar de un saludo genérico.

## Omitir el arranque

Para omitir esto en un espacio de trabajo presembrado, ejecute `openclaw onboard --skip-bootstrap`.

## Dónde se ejecuta

El arranque siempre se ejecuta en el **host de puerta de enlace (gateway host)**. Si la aplicación de macOS se conecta a una puerta de enlace remota, el espacio de trabajo y los archivos de arranque residen en esa máquina remota.

<Note>Cuando la puerta de enlace se ejecuta en otra máquina, edite los archivos del espacio de trabajo en el host de la puerta de enlace (por ejemplo, `user@gateway-host:~/.openclaw/workspace`).</Note>

## Documentos relacionados

- Incorporación de la aplicación macOS: [Incorporación](/es/start/onboarding)
- Diseño del espacio de trabajo: [Espacio de trabajo del agente](/es/concepts/agent-workspace)
