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

Use la extensión de VS Code **Copilot Proxy** como un puente local. OpenClaw se comunica con
el endpoint `/v1` del proxy y usa la lista de modelos que configure allí. Elija
esta opción cuando ya ejecute Copilot Proxy en VS Code o necesite enrutar a través de él.
Debe habilitar el complemento y mantener la extensión de VS Code en ejecución.

Use GitHub Copilot como proveedor de modelos (`github-copilot`). El comando de inicio de sesión ejecuta
el flujo de dispositivo de GitHub, guarda un perfil de autenticación y actualiza su configuración para usar ese
perfil.

## Configuración de CLI

```bash
openclaw models auth login-github-copilot
```

Se te pedirá que visites una URL e ingreses un código de un solo uso. Mantén la terminal abierta hasta que se complete.

### Opciones opcionales

```bash
openclaw models auth login-github-copilot --yes
```

Para también aplicar el modelo predeterminado recomendado por el proveedor en un solo paso, use el
comando de autenticación genérico en su lugar:

```bash
openclaw models auth login --provider github-copilot --method device --set-default
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

- Requiere una TTY interactiva; ejecútelo directamente en una terminal.
- La disponibilidad del modelo Copilot depende de su plan; si un modelo es rechazado, intente
  con otro ID (por ejemplo `github-copilot/gpt-4.1`).
- Los IDs de modelo Claude usan el transporte Anthropic Messages automáticamente; los modelos GPT, serie o
  y Gemini mantienen el transporte OpenAI Responses.
- El inicio de sesión almacena un token de GitHub en el almacén de perfiles de autenticación y lo intercambia por un
  token de API de Copilot cuando OpenClaw se ejecuta.
