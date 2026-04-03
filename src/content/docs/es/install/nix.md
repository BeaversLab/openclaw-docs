---
summary: "Instala OpenClaw declarativamente con Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

# Instalación de Nix

Instala OpenClaw declarativamente con **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** -- un módulo de Home Manager que incluye todo lo necesario.

<Info>El repositorio [nix-openclaw](https://github.com/openclaw/nix-openclaw) es la fuente de verdad para la instalación de Nix. Esta página es un resumen rápido.</Info>

## Lo que obtienes

- Gateway + app de macOS + herramientas (whisper, spotify, cámaras) -- todo anclado a versiones específicas
- Servicio Launchd que persiste tras los reinicios
- Sistema de complementos con configuración declarativa
- Reversión instantánea: `home-manager switch --rollback`

## Inicio rápido

<Steps>
  <Step title="Instalar Determinate Nix">Si Nix no está instalado, siga las instrucciones del [instalador Determinate Nix](https://github.com/DeterminateSystems/nix-installer).</Step>
  <Step title="Crear un flake local">Use la plantilla agent-first del repositorio nix-openclaw: ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="Configurar secretos">Configure su token de bot de mensajería y la clave API del proveedor de modelos. Los archivos simples en `~/.secrets/` funcionan bien.</Step>
  <Step title="Rellenar marcadores de posición de la plantilla y cambiar">```bash home-manager switch ```</Step>
  <Step title="Verificar">Confirma que el servicio launchd se está ejecutando y que tu bot responde a los mensajes.</Step>
</Steps>

Consulta el [README de nix-openclaw](https://github.com/openclaw/nix-openclaw) para ver todas las opciones del módulo y ejemplos.

## Comportamiento en tiempo de ejecución del modo Nix

Cuando se establece `OPENCLAW_NIX_MODE=1` (automático con nix-openclaw), OpenClaw entra en un modo determinista que deshabilita los flujos de autoinstalación.

También puedes establecerlo manualmente:

```bash
export OPENCLAW_NIX_MODE=1
```

En macOS, la aplicación GUI no hereda automáticamente las variables de entorno del shell. Habilita el modo Nix a través de defaults en su lugar:

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Qué cambia en el modo Nix

- Los flujos de autoinstalación y automutación están deshabilitados
- Las dependencias faltantes muestran mensajes de corrección específicos de Nix
- La interfaz muestra un banner de solo lectura del modo Nix

### Rutas de configuración y estado

OpenClaw lee la configuración JSON5 de `OPENCLAW_CONFIG_PATH` y almacena datos mutables en `OPENCLAW_STATE_DIR`. Al ejecutarse bajo Nix, establezca explícitamente estos en ubicaciones administradas por Nix para que el estado de ejecución y la configuración permanezcan fuera del almacén inmutable.

| Variable               | Predeterminado                          |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

## Relacionado

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- guía de configuración completa
- [Asistente](/en/start/wizard) -- configuración de CLI sin Nix
- [Docker](/en/install/docker) -- configuración en contenedor
