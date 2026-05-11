---
summary: "Instala OpenClaw declarativamente con Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

Instala OpenClaw de forma declarativa con **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** — un módulo de Home Manager que incluye todo lo necesario.

<Info>El repositorio [nix-openclaw](https://github.com/openclaw/nix-openclaw) es la fuente de verdad para la instalación con Nix. Esta página es un resumen rápido.</Info>

## Lo que obtienes

- Gateway + aplicación macOS + herramientas (whisper, spotify, cámaras) — todo fijado
- Servicio Launchd que sobrevive a los reinicios
- Sistema de complementos con configuración declarativa
- Reversión instantánea: `home-manager switch --rollback`

## Inicio rápido

<Steps>
  <Step title="Instalar Determinate Nix">Si Nix aún no está instalado, sigue las instrucciones del [instalador de Determinate Nix](https://github.com/DeterminateSystems/nix-installer).</Step>
  <Step title="Crear un flake local">Usa la plantilla agent-first del repositorio nix-openclaw: ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="Configurar secretos">Configura tu token de bot de mensajería y tu clave API del proveedor de modelos. Los archivos planos en `~/.secrets/` funcionan bien.</Step>
  <Step title="Rellenar los marcadores de posición de la plantilla y cambiar">```bash home-manager switch ```</Step>
  <Step title="Verificar">Confirma que el servicio launchd se esté ejecutando y que tu bot responda a los mensajes.</Step>
</Steps>

Consulta el [README de nix-openclaw](https://github.com/openclaw/nix-openclaw) para ver todas las opciones del módulo y ejemplos.

## Comportamiento en tiempo de ejecución en modo Nix

Cuando se establece `OPENCLAW_NIX_MODE=1` (automático con nix-openclaw), OpenClaw entra en un modo determinista que deshabilita los flujos de instalación automática.

También puedes establecerlo manualmente:

```bash
export OPENCLAW_NIX_MODE=1
```

En macOS, la aplicación GUI no hereda automáticamente las variables de entorno del shell. Activa el modo Nix a través de defaults en su lugar:

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Qué cambia en el modo Nix

- Los flujos de autoinstalación y automutación están deshabilitados
- Las dependencias faltantes muestran mensajes de corrección específicos de Nix
- La interfaz de usuario muestra un banner de modo Nix de solo lectura

### Rutas de configuración y estado

OpenClaw lee la configuración JSON5 de `OPENCLAW_CONFIG_PATH` y almacena datos mutables en `OPENCLAW_STATE_DIR`. Al ejecutarse bajo Nix, establece estos explícitamente en ubicaciones gestionadas por Nix para que el estado de ejecución y la configuración se mantengan fuera del almacenamiento inmutable.

| Variable               | Por defecto                             |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### Descubrimiento de PATH del servicio

El servicio de puerta de enlace launchd/systemd descubre automáticamente los binarios del perfil de Nix para que
los complementos y herramientas que ejecutan comandos en ejecutables instalados por `nix` funcionen sin
configuración manual de PATH:

- Cuando se establece `NIX_PROFILES`, cada entrada se agrega al PATH del servicio con
  precedencia de derecha a izquierda (coincide con la precedencia del shell de Nix — gana el más a la derecha).
- Cuando `NIX_PROFILES` no está establecido, `~/.nix-profile/bin` se agrega como alternativa.

Esto se aplica tanto a los entornos de servicio de macOS launchd como a los de Linux systemd.

## Relacionado

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- guía de configuración completa
- [Asistente](/es/start/wizard) -- configuración de CLI sin Nix
- [Docker](/es/install/docker) -- configuración en contenedores
