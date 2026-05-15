---
summary: "Referencia de CLI para `openclaw setup` (inicializar configuración + espacio de trabajo)"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "Configuración"
---

# `openclaw setup`

Inicializa la configuración base y el espacio de trabajo del agente sin ejecutar el flujo completo de incorporación guiada.

<Note>
  `openclaw setup` es para instalaciones de configuración mutable. En modo Nix (`OPENCLAW_NIX_MODE=1`), OpenClaw rechaza las escrituras de configuración porque el archivo de configuración es administrado por Nix. Los agentes deben usar el [inicio rápido nix-openclaw de primera parte](https://github.com/openclaw/nix-openclaw#quick-start) o la configuración fuente equivalente para otro paquete Nix.
</Note>

Relacionado:

- Para empezar: [Para empezar](/es/start/getting-started)
- Incorporación de CLI: [Incorporación (CLI)](/es/start/wizard)

## Ejemplos

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Opciones

- `--workspace <dir>`: directorio del espacio de trabajo del agente (almacenado como `agents.defaults.workspace`)
- `--wizard`: ejecutar incorporación
- `--non-interactive`: ejecutar incorporación sin indicaciones
- `--mode <local|remote>`: modo de incorporación
- `--import-from <provider>`: proveedor de migración para ejecutar durante la incorporación
- `--import-source <path>`: origen del agente home para `--import-from`
- `--import-secrets`: importar secretos compatibles durante la migración de incorporación
- `--remote-url <url>`: URL WebSocket de la puerta de enlace remota
- `--remote-token <token>`: token de la puerta de enlace remota

Para ejecutar la incorporación a través de la configuración:

```bash
openclaw setup --wizard
```

Notas:

- El comando `openclaw setup` sencillo inicializa la configuración y el espacio de trabajo sin el flujo completo de incorporación.
- Después de la configuración sencilla, ejecute `openclaw onboard` para el viaje guiado completo, `openclaw configure` para cambios específicos, o `openclaw channels add` para agregar cuentas de canal.
- La incorporación se ejecuta automáticamente cuando hay presentes marcas de incorporación (`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`).
- Si se detecta el estado de Hermes, la incorporación interactiva puede ofrecer la migración automáticamente. La incorporación por importación requiere una configuración nueva; use [Migrar](/es/cli/migrate) para planes de ejecución en seco, copias de seguridad y modo de sobrescritura fuera de la incorporación.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Visión general de la instalación](/es/install)
