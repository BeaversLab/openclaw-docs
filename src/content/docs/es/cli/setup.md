---
summary: "Referencia de CLI para `openclaw setup` (inicializar configuración + espacio de trabajo)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "configuración"
---

# `openclaw setup`

Inicializa `~/.openclaw/openclaw.json` y el espacio de trabajo del agente.

Relacionado:

- Para empezar: [Para empezar](/en/start/getting-started)
- Incorporación a la CLI: [Incorporación (CLI)](/en/start/wizard)

## Ejemplos

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Opciones

- `--workspace <dir>`: directorio del área de trabajo del agente (almacenado como `agents.defaults.workspace`)
- `--wizard`: ejecutar la incorporación
- `--non-interactive`: ejecutar la incorporación sin avisos
- `--mode <local|remote>`: modo de incorporación
- `--remote-url <url>`: URL de WebSocket remota de Gateway
- `--remote-token <token>`: token de Gateway remoto

Para ejecutar la incorporación a través de la configuración:

```bash
openclaw setup --wizard
```

Notas:

- El `openclaw setup` normal inicializa la configuración y el área de trabajo sin el flujo completo de incorporación.
- La incorporación se ejecuta automáticamente cuando hay presentes cualquier indicador de incorporación (`--wizard`, `--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).
