---
summary: "Inicia sesión en GitHub Copilot desde OpenClaw usando el flujo de dispositivo"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

## ¿Qué es GitHub Copilot?

GitHub Copilot es el asistente de codificación con IA de GitHub. Proporciona acceso a modelos de Copilot para tu cuenta y plan de GitHub. OpenClaw puede usar Copilot como proveedor de modelos de dos maneras diferentes.

## Dos formas de usar Copilot en OpenClaw

### 1) Proveedor integrado de GitHub Copilot (`github-copilot`)

Usa el flujo de inicio de sesión de dispositivo nativo para obtener un token de GitHub y luego cámbialo por tokens de API de Copilot cuando se ejecuta OpenClaw. Esta es la ruta **predeterminada** y más sencilla porque no requiere VS Code.

### 2) Complemento Copilot Proxy (`copilot-proxy`)

Usa la extensión de VS Code **Copilot Proxy** como puente local. OpenClaw se comunica con el endpoint `/v1` del proxy y usa la lista de modelos que configures allí. Elige esta opción cuando ya ejecutes Copilot Proxy en VS Code o necesites enrutar a través de él. Debes habilitar el complemento y mantener la extensión de VS Code en ejecución.

Usa GitHub Copilot como proveedor de modelos (`github-copilot`). El comando de inicio de sesión ejecuta el flujo de dispositivo de GitHub, guarda un perfil de autenticación y actualiza tu configuración para usar ese perfil.

## Configuración de CLI

```bash
openclaw models auth login-github-copilot
```

Se te pedirá que visites una URL e ingreses un código de un solo uso. Mantén la terminal abierta hasta que se complete.

### Opciones opcionales

```bash
openclaw models auth login-github-copilot --profile-id github-copilot:work
openclaw models auth login-github-copilot --yes
```

## Establecer un modelo predeterminado

```bash
openclaw models set github-copilot/gpt-4o
```

### Fragmento de configuración

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
}
```

## Notas

- Requiere una TTY interactiva; ejecútalo directamente en una terminal.
- La disponibilidad del modelo de Copilot depende de tu plan; si se rechaza un modelo, prueba con otro ID (por ejemplo `github-copilot/gpt-4.1`).
- El inicio de sesión almacena un token de GitHub en el almacén de perfiles de autenticación y lo cambia por un token de API de Copilot cuando se ejecuta OpenClaw.
