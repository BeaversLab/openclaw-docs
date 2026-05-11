---
summary: "Referencia de CLI para `openclaw setup` (inicializar configuración + espacio de trabajo)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "Configuración"
---

# `openclaw setup`

Inicializa `~/.openclaw/openclaw.json` y el espacio de trabajo del agente.

Relacionado:

- Para comenzar: [Para comenzar](/es/start/getting-started)
- Incorporación a la CLI: [Incorporación (CLI)](/es/start/wizard)

## Ejemplos

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Opciones

- `--workspace <dir>`: directorio del área de trabajo del agente (almacenado como `agents.defaults.workspace`)
- `--wizard`: ejecutar la incorporación
- `--non-interactive`: ejecutar la incorporación sin avisos
- `--mode <local|remote>`: modo de incorporación
- `--import-from <provider>`: proveedor de migración que se ejecutará durante la incorporación
- `--import-source <path>`: directorio de inicio del agente de origen para `--import-from`
- `--import-secrets`: importar los secretos admitidos durante la migración de incorporación
- `--remote-url <url>`: URL de WebSocket remota de Gateway
- `--remote-token <token>`: token de Gateway remoto

Para ejecutar la incorporación a través de la configuración:

```bash
openclaw setup --wizard
```

Notas:

- El `openclaw setup` sencillo inicializa la configuración y el espacio de trabajo sin el flujo completo de incorporación.
- La incorporación se ejecuta automáticamente cuando hay presentes cualquier indicador de incorporación (`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`).
- Si se detecta el estado de Hermes, la incorporación interactiva puede ofrecer la migración automáticamente. La incorporación de importación requiere una configuración nueva; use [Migrar](/es/cli/migrate) para planes de ejecución en seco, copias de seguridad y el modo de sobrescritura fuera de la incorporación.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Descripción general de la instalación](/es/install)
