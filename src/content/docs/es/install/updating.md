---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde fuente), más estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

# Actualizando

Mantén OpenClaw actualizado.

## Recomendado: `openclaw update`

La forma más rápida de actualizar. Detecta tu tipo de instalación (npm o git), busca la última versión, ejecuta `openclaw doctor` y reinicia la puerta de enlace.

```bash
openclaw update
```

Para cambiar de canal o apuntar a una versión específica:

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` prefiere beta, pero el tiempo de ejecución vuelve a estable/última cuando
falta la etiqueta beta o es anterior a la última versión estable. Usa `--tag beta`
si quieres la etiqueta de distribución beta cruda de npm para una actualización de paquete única.

Consulta [Canales de desarrollo](/es/install/development-channels) para conocer la semántica de los canales.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Añade `--no-onboard` para omitir la incorporación. Para instalaciones desde fuente, pasa `--install-method git --no-onboard`.

## Alternativa: npm, pnpm o bun manual

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

## Actualizador automático

El actualizador automático está desactivado por defecto. Actívalo en `~/.openclaw/openclaw.json`:

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| Canal    | Comportamiento                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `stable` | Espera `stableDelayHours`, luego aplica con fluctuación determinista a través de `stableJitterHours` (despliegue gradual). |
| `beta`   | Comprueba cada `betaCheckIntervalHours` (por defecto: cada hora) y aplica inmediatamente.                                  |
| `dev`    | Sin aplicación automática. Usa `openclaw update` manualmente.                                                              |

La puerta de enlace también registra un consejo de actualización al inicio (desactívalo con `update.checkOnStart: false`).

## Después de actualizar

<Steps>

### Ejecutar doctor

```bash
openclaw doctor
```

Migra la configuración, audita las políticas de DM y comprueba el estado de la puerta de enlace. Detalles: [Doctor](/es/gateway/doctor)

### Reiniciar la puerta de enlace

```bash
openclaw gateway restart
```

### Verificar

```bash
openclaw health
```

</Steps>

## Revertir

### Fijar una versión (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

Consejo: `npm view openclaw version` muestra la versión publicada actual.

### Fijar un commit (fuente)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

Para volver a la última versión: `git checkout main && git pull`.

## Si estás atascado

- Ejecuta `openclaw doctor` de nuevo y lee la salida cuidadosamente.
- Para `openclaw update --channel dev` en checkouts de código fuente, el actualizador inicia automáticamente `pnpm` cuando es necesario. Si ve un error de arranque de pnpm/corepack, instale `pnpm` manualmente (o reactive `corepack`) y vuelva a ejecutar la actualización.
- Consulte: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunte en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/es/install) — todos los métodos de instalación
- [Doctor](/es/gateway/doctor) — comprobaciones de salud después de las actualizaciones
- [Migración](/es/install/migrating) — guías de migración de versiones principales
