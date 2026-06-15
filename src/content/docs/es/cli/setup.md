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

<Note>`openclaw setup` es para instalaciones de configuración mutable. En modo Nix (`OPENCLAW_NIX_MODE=1`) OpenClaw rechaza las escrituras de configuración porque el archivo de configuración está administrado por Nix. Utilice el [inicio rápido de nix-openclaw](https://github.com/openclaw/nix-openclaw#quick-start) de primera parte o la configuración fuente equivalente para otro paquete Nix.</Note>

## Opciones

| Indicador                  | Descripción                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | Directorio del espacio de trabajo del agente (predeterminado `~/.openclaw/workspace`; almacenado como `agents.defaults.workspace`). |
| `--wizard`                 | Ejecutar integración interactiva.                                                                                                   |
| `--non-interactive`        | Ejecutar integración sin preguntar.                                                                                                 |
| `--accept-risk`            | Reconocer el riesgo de acceso del agente a todo el sistema; necesario con `--non-interactive`.                                      |
| `--mode <mode>`            | Modo de incorporación: `local` o `remote`.                                                                                          |
| `--import-from <provider>` | Proveedor de migración para ejecutar durante la incorporación.                                                                      |
| `--import-source <path>`   | Inicio del agente de origen para `--import-from`.                                                                                   |
| `--import-secrets`         | Importar los secretos admitidos durante la migración de incorporación.                                                              |
| `--remote-url <url>`       | URL de WebSocket de la puerta de enlace remota.                                                                                     |
| `--remote-token <token>`   | Token de la puerta de enlace remota (opcional).                                                                                     |

### Activación automática del asistente

`openclaw setup` ejecuta el asistente cuando cualquiera de estas opciones está presente explícitamente, incluso sin `--wizard`:

`--wizard`, `--non-interactive`, `--accept-risk`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`.

## Ejemplos

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Notas

- El `openclaw setup` simple inicializa la configuración y el espacio de trabajo sin ejecutar el flujo completo de incorporación.
- Después de una configuración simple, ejecute `openclaw onboard` para el viaje guiado completo, `openclaw configure` para cambios específicos o `openclaw channels add` para agregar cuentas de canal.
- Si se detecta el estado de Hermes, la incorporación interactiva puede ofrecer la migración automáticamente. La incorporación de importación requiere una configuración nueva; use [Migrar](/es/cli/migrate) para planes de ejecución en seco, copias de seguridad y el modo de sobrescritura fuera de la incorporación.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Incorporación (CLI)](/es/start/wizard)
- [Primeros pasos](/es/start/getting-started)
- [Resumen de la instalación](/es/install)
