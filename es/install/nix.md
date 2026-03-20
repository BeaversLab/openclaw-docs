---
summary: "Instalar OpenClaw declarativamente con Nix"
read_when:
  - Quieres instalaciones reproducibles y con capacidad de reversión
  - Ya estás usando Nix/NixOS/Home Manager
  - Quieres todo fijado y gestionado declarativamente
title: "Nix"
---

# Instalación de Nix

La forma recomendada de ejecutar OpenClaw con Nix es a través de **[nix-openclaw](https://github.com/openclaw/nix-openclaw)**: un módulo de Home Manager que incluye todo lo necesario.

## Inicio rápido

Pega esto en tu agente de IA (Claude, Cursor, etc.):

```text
I want to set up nix-openclaw on my Mac.
Repository: github:openclaw/nix-openclaw

What I need you to do:
1. Check if Determinate Nix is installed (if not, install it)
2. Create a local flake at ~/code/openclaw-local using templates/agent-first/flake.nix
3. Help me create a Telegram bot (@BotFather) and get my chat ID (@userinfobot)
4. Set up secrets (bot token, model provider API key) - plain files at ~/.secrets/ is fine
5. Fill in the template placeholders and run home-manager switch
6. Verify: launchd running, bot responds to messages

Reference the nix-openclaw README for module options.
```

> **📦 Guía completa: [github.com/openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw)**
>
> El repositorio nix-openclaw es la fuente de verdad para la instalación de Nix. Esta página es solo una visión general rápida.

## Lo que obtienes

- Gateway + aplicación macOS + herramientas (whisper, spotify, cámaras) — todo fijado
- Servicio Launchd que sobrevive a los reinicios
- Sistema de complementos con configuración declarativa
- Reversión instantánea: `home-manager switch --rollback`

---

## Comportamiento en tiempo de ejecución en modo Nix

Cuando `OPENCLAW_NIX_MODE=1` está configurado (automático con nix-openclaw):

OpenClaw admite un **modo Nix** que hace que la configuración sea determinista y deshabilita los flujos de instalación automática.
Actívalo exportando:

```bash
OPENCLAW_NIX_MODE=1
```

En macOS, la aplicación GUI no hereda automáticamente las variables de entorno del shell. También puedes
activar el modo Nix a través de defaults:

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Rutas de configuración y estado

OpenClaw lee la configuración JSON5 de `OPENCLAW_CONFIG_PATH` y almacena datos mutables en `OPENCLAW_STATE_DIR`.
Cuando sea necesario, también puedes establecer `OPENCLAW_HOME` para controlar el directorio base utilizado para la resolución de rutas internas.

- `OPENCLAW_HOME` (precedencia predeterminada: `HOME` / `USERPROFILE` / `os.homedir()`)
- `OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`)
- `OPENCLAW_CONFIG_PATH` (predeterminado: `$OPENCLAW_STATE_DIR/openclaw.json`)

Al ejecutarse bajo Nix, establece estos explícitamente en ubicaciones gestionadas por Nix para que el estado de ejecución y la configuración
no se almacenen en el almacén inmutable.

### Comportamiento en tiempo de ejecución en modo Nix

- Los flujos de instalación automática y automodificación están deshabilitados
- Las dependencias faltantes muestran mensajes de reparación específicos de Nix
- La interfaz de usuario muestra un banner de modo Nix de solo lectura cuando está presente

## Nota de empaquetado (macOS)

El flujo de empaquetado de macOS espera una plantilla estable de Info.plist en:

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) copia esta plantilla en el paquete de la aplicación y parchea los campos dinámicos
(ID del paquete, versión/compilación, Git SHA, claves de Sparkle). Esto mantiene el plist determinista para el empaquetado con SwiftPM
y las construcciones de Nix (que no dependen de una cadena de herramientas completa de Xcode).

## Relacionado

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — guía completa de configuración
- [Wizard](/es/start/wizard) — configuración de CLI sin Nix
- [Docker](/es/install/docker) — configuración en contenedor

import es from "/components/footer/es.mdx";

<es />
