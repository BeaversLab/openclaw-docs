---
summary: "Referencia de la CLI para `openclaw setup` (inicializar configuración más espacio de trabajo, opcionalmente ejecutar integración)"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
  - You need every flag and how setup decides between baseline and wizard mode
title: "Configuración"
---

# `openclaw setup`

Inicializa la configuración base y el espacio de trabajo del agente. Con cualquier indicador de integración presente, también ejecuta el asistente.

<Note>
  `openclaw setup` es para instalaciones de configuración mutable. En modo Nix (`OPENCLAW_NIX_MODE=1`) OpenClaw rechaza las escrituras de configuración porque el archivo de configuración es administrado por Nix. Use la [Guía de inicio rápido de nix-openclaw](https://github.com/openclaw/nix-openclaw#quick-start) de primera parte o la configuración fuente equivalente para otro paquete Nix.
</Note>

## Opciones

| Indicador                  | Descripción                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | Directorio del espacio de trabajo del agente (predeterminado `~/.openclaw/workspace`; almacenado como `agents.defaults.workspace`). |
| `--wizard`                 | Ejecutar integración interactiva.                                                                                                   |
| `--non-interactive`        | Ejecutar integración sin preguntar.                                                                                                 |
| `--mode <mode>`            | Modo de integración: `local` o `remote`.                                                                                            |
| `--import-from <provider>` | Proveedor de migración que se ejecutará durante la integración.                                                                     |
| `--import-source <path>`   | Origen del hogar del agente para `--import-from`.                                                                                   |
| `--import-secrets`         | Importar secretos compatibles durante la migración de integración.                                                                  |
| `--remote-url <url>`       | URL de WebSocket de Remote Gateway.                                                                                                 |
| `--remote-token <token>`   | Token de Remote Gateway (opcional).                                                                                                 |

### Activación automática del asistente

`openclaw setup` ejecuta el asistente cuando cualquiera de estos indicadores está presente explícitamente, incluso sin `--wizard`:

`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`.

## Ejemplos

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Notas

- `openclaw setup` simple inicializa la configuración y el espacio de trabajo sin ejecutar el flujo de integración completo.
- Después de la configuración básica, ejecute `openclaw onboard` para obtener la guía completa, `openclaw configure` para realizar cambios específicos o `openclaw channels add` para agregar cuentas de canal.
- Si se detecta el estado de Hermes, la incorporación interactiva puede ofrecer la migración automáticamente. La incorporación de importación requiere una configuración nueva; use [Migrate](/es/cli/migrate) para planes de ejecución en seco, copias de seguridad y modo de sobrescritura fuera de la incorporación.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Incorporación (CLI)](/es/start/wizard)
- [Primeros pasos](/es/start/getting-started)
- [Descripción general de la instalación](/es/install)
