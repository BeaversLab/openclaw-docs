---
summary: "Instala OpenClaw declarativamente con Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

Instala OpenClaw declarativamente con **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** - el módulo de Home Manager de primera parte y con todo incluido.

<Info>El repositorio [nix-openclaw](https://github.com/openclaw/nix-openclaw) es la fuente de verdad para la instalación con Nix. Esta página es una visión general rápida.</Info>

## Lo que obtienes

- Gateway + aplicación macOS + herramientas (whisper, spotify, cámaras) — todo fijado
- Servicio Launchd que sobrevive a los reinicios
- Sistema de complementos con configuración declarativa
- Reversión instantánea: `home-manager switch --rollback`

## Inicio rápido

<Steps>
  <Step title="Instalar Determinate Nix">Si Nix aún no está instalado, sigue las instrucciones del [instalador de Determinate Nix](https://github.com/DeterminateSystems/nix-installer).</Step>
  <Step title="Crear un flake local">Usa la plantilla agent-first del repositorio nix-openclaw: ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="Configurar secretos">Configura el token de tu bot de mensajería y la clave API del proveedor de modelos. Los archivos simples en `~/.secrets/` funcionan bien.</Step>
  <Step title="Rellenar los marcadores de posición de la plantilla y cambiar">```bash home-manager switch ```</Step>
  <Step title="Verificar">Confirma que el servicio launchd se esté ejecutando y que tu bot responda a los mensajes.</Step>
</Steps>

Consulta el [README de nix-openclaw](https://github.com/openclaw/nix-openclaw) para ver las opciones completas del módulo y ejemplos.

## Comportamiento en tiempo de ejecución en modo Nix

Cuando se establece `OPENCLAW_NIX_MODE=1` (automático con nix-openclaw), OpenClaw entra en un modo determinista para instalaciones gestionadas por Nix. Otros paquetes de Nix pueden establecer el mismo modo; nix-openclaw es la referencia de primera parte.

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
- `openclaw.json` se trata como inmutable. Los valores predeterminados derivados del inicio permanecen solo en tiempo de ejecución, y los escritores de configuración como la configuración, la incorporación, la mutación de `openclaw update`, la instalación/actualización/desinstalación/habilitación de complementos, `doctor --fix`, `doctor --generate-gateway-token` y `openclaw config set` se niegan a editar el archivo.
- Los agentes deben editar la fuente de Nix en su lugar. Para nix-openclaw, utiliza el [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) con prioridad para agentes y establece la configuración en `programs.openclaw.config` o `instances.<name>.config`.
- Las dependencias faltantes muestran mensajes de reparación específicos de Nix
- La interfaz de usuario muestra un banner de modo Nix de solo lectura

### Rutas de configuración y estado

OpenClaw lee la configuración JSON5 de `OPENCLAW_CONFIG_PATH` y almacena datos mutables en `OPENCLAW_STATE_DIR`. Al ejecutarse bajo Nix, establece estos explícitamente en ubicaciones gestionadas por Nix para que el estado y la configuración en tiempo de ejecución se mantengan fuera del almacén inmutable.

| Variable               | Predeterminado                          |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### Descubrimiento del PATH del servicio

El servicio de puerta de enlace launchd/systemd detecta automáticamente los binarios del perfil de Nix para que los complementos y herramientas que ejecutan ejecutables instalados por `nix` funcionen sin configuración manual del PATH:

- Cuando se establece `NIX_PROFILES`, cada entrada se agrega al PATH del servicio con precedencia de derecha a izquierda (coincide con la precedencia del shell de Nix - gana el más a la derecha).
- Cuando no se establece `NIX_PROFILES`, se agrega `~/.nix-profile/bin` como alternativa.

Esto se aplica tanto a los entornos de servicio macOS launchd como Linux systemd.

## Relacionado

<CardGroup cols={2}>
  <Card title="nix-openclaw" href="https://github.com/openclaw/nix-openclaw" icon="arrow-up-right-from-square">
    Módulo de Home Manager fuente de verdad y guía de configuración completa.
  </Card>
  <Card title="Asistente de configuración" href="/es/start/wizard" icon="wand-magic-sparkles">
    Tutorial de configuración de CLI no Nix.
  </Card>
  <Card title="Docker" href="/es/install/docker" icon="docker">
    Configuración en contenedores como alternativa no Nix.
  </Card>
  <Card title="Actualización" href="/es/install/updating" icon="arrow-up-right-from-square">
    Actualización de instalaciones gestionadas por Home Manager junto con el paquete.
  </Card>
</CardGroup>
