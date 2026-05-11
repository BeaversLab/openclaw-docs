---
summary: "Descripción general de las opciones y flujos de incorporación de OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Resumen de incorporación"
sidebarTitle: "Descripción general de la incorporación"
---

OpenClaw tiene dos rutas de incorporación. Ambas configuran la autenticación, el Gateway y
los canales de chat opcionales; solo difieren en la forma en que interactúas con la configuración.

## ¿Qué ruta debo usar?

|                    | Incorporación por CLI                 | Incorporación por aplicación macOS      |
| ------------------ | ------------------------------------- | --------------------------------------- |
| **Plataformas**    | macOS, Linux, Windows (nativo o WSL2) | Solo macOS                              |
| **Interfaz**       | Asistente de terminal                 | Interfaz guiada en la aplicación        |
| **Lo mejor para**  | Servidores, headless, control total   | Mac de escritorio, configuración visual |
| **Automatización** | `--non-interactive` para scripts      | Solo manual                             |
| **Comando**        | `openclaw onboard`                    | Iniciar la aplicación                   |

La mayoría de los usuarios deberían comenzar con la **Incorporación por CLI**; funciona en todas partes y te brinda
el mayor control.

## Qué configura la incorporación

Independientemente de la ruta que elijas, la incorporación configura:

1. **Proveedor de modelos y autenticación** — clave de API, OAuth o token de configuración para tu proveedor elegido
2. **Espacio de trabajo** — directorio para los archivos de los agentes, plantillas de arranque y memoria
3. **Gateway** — puerto, dirección de enlace, modo de autenticación
4. **Canales** (opcional) — canales de chat integrados y empaquetados como
   BlueBubbles, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams,
   Telegram, WhatsApp y más
5. **Demonio** (opcional) — servicio en segundo plano para que el Gateway se inicie automáticamente

## Incorporación por CLI

Ejecuta en cualquier terminal:

```bash
openclaw onboard
```

Añade `--install-daemon` para también instalar el servicio en segundo plano en un solo paso.

Referencia completa: [Incorporación (CLI)](/es/start/wizard)
Documentos de comandos de CLI: [`openclaw onboard`](/es/cli/onboard)

## Incorporación por aplicación macOS

Abre la aplicación OpenClaw. El asistente de primera ejecución te guía a través de los mismos pasos
con una interfaz visual.

Referencia completa: [Incorporación (App macOS)](/es/start/onboarding)

## Proveedores personalizados o no listados

Si tu proveedor no está listado en la incorporación, elige **Proveedor personalizado** e
introduce:

- Modo de compatibilidad de API (compatible con OpenAI, compatible con Anthropic o autodetección)
- URL base y clave de API
- ID del modelo y alias opcional

Pueden coexistir múltiples puntos finales personalizados; cada uno obtiene su propio ID de punto final.

## Relacionado

- [Primeros pasos](/es/start/getting-started)
- [Referencia de configuración de CLI](/es/start/wizard-cli-reference)
