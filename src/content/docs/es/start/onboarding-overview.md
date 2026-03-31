---
summary: "Descripción general de las opciones y flujos de incorporación de OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Descripción general de la incorporación"
sidebarTitle: "Descripción general de la incorporación"
---

# Descripción general de la incorporación

OpenClaw tiene dos rutas de incorporación. Ambas configuran la autenticación, la Gateway y los canales opcionales; solo difieren en la forma en que interactúas con la configuración.

## ¿Qué ruta debería usar?

|                    | Incorporación mediante CLI                      | Incorporación mediante la aplicación macOS |
| ------------------ | ----------------------------------------------- | ------------------------------------------ |
| **Plataformas**    | macOS, Linux, Windows (nativo o WSL2)           | Solo macOS                                 |
| **Interfaz**       | Asistente de terminal                           | Interfaz guiada en la aplicación           |
| **Lo mejor para**  | Servidores, sin interfaz gráfica, control total | Mac de escritorio, configuración visual    |
| **Automatización** | `--non-interactive` para scripts                | Solo manual                                |
| **Comando**        | `openclaw onboard`                              | Abrir la aplicación                        |

La mayoría de los usuarios deberían comenzar con la **incorporación mediante CLI**; funciona en todas partes y te brinda el mayor control.

## Lo que configura la incorporación

Independientemente de la ruta que elijas, la incorporación configura:

1. **Proveedor de modelos y autenticación** — clave de API, OAuth o token de configuración para el proveedor elegido
2. **Espacio de trabajo (Workspace)** — directorio para los archivos de los agentes, plantillas de arranque y memoria
3. **Gateway** — puerto, dirección de enlace (bind address), modo de autenticación
4. **Canales** (opcional) — WhatsApp, Telegram, Discord y más
5. **Demonio (Daemon)** (opcional) — servicio en segundo plano para que la Gateway se inicie automáticamente

## Incorporación mediante CLI

Ejecuta en cualquier terminal:

```bash
openclaw onboard
```

Añade `--install-daemon` para instalar también el servicio en segundo plano en un solo paso.

Referencia completa: [Onboarding (CLI)](/en/start/wizard)
Documentación del comando CLI: [`openclaw onboard`](/en/cli/onboard)

## Incorporación mediante la aplicación macOS

Abre la aplicación OpenClaw. El asistente de primera ejecución te guiará a través de los mismos pasos con una interfaz visual.

Referencia completa: [Onboarding (macOS App)](/en/start/onboarding)

## Proveedores personalizados o no listados

Si tu proveedor no aparece en la lista de incorporación, elige **Proveedor personalizado** e introduce:

- Modo de compatibilidad de la API (compatible con OpenAI, compatible con Anthropic o autodetección)
- URL base y clave de API
- ID del modelo y alias opcional

Pueden coexistir múltiples puntos de conexión personalizados; cada uno obtiene su propio ID de punto de conexión.
