---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde código fuente), más estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

# Actualizando

Mantén OpenClaw actualizado.

## Recomendado: `openclaw update`

La forma más rápida de actualizar. Detecta su tipo de instalación (npm o git), obtiene la última versión, ejecuta `openclaw doctor` y reinicia el gateway.

```bash
openclaw update
```

Para cambiar de canal o apuntar a una versión específica:

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` prefiere beta, pero el tiempo de ejecución vuelve a stable/latest cuando
la etiqueta beta falta o es más antigua que la última versión estable. Use `--tag beta`
si desea la etiqueta de distribución npm beta para una actualización de paquete única.

Vea [Development channels](/es/install/development-channels) para la semántica de los canales.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Añada `--no-onboard` para omitir la incorporación. Para instalaciones desde código fuente, pase `--install-method git --no-onboard`.

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

### Instalaciones globales de npm propiedad de root

Algunas configuraciones de npm en Linux instalan paquetes globales en directorios propiedad de root como
`/usr/lib/node_modules/openclaw`. OpenClaw admite ese diseño: el paquete
instalado se trata como de solo lectura en tiempo de ejecución, y las dependencias de tiempo de ejecución
del complemento empaquetado se colocan en un directorio de tiempo de ejecución grabable en lugar de mutar el
árbol de paquetes.

Para unidades de systemd endurecidas, establezca un directorio de ensayo (stage) grabable que se incluya en
`ReadWritePaths`:

```ini
Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
```

Si `OPENCLAW_PLUGIN_STAGE_DIR` no está establecido, OpenClaw usa `$STATE_DIRECTORY` cuando
systemd lo proporciona, y luego vuelve a `~/.openclaw/plugin-runtime-deps`.

## Actualizador automático

El actualizador automático está desactivado de forma predeterminada. Actívelo en `~/.openclaw/openclaw.json`:

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

| Canal    | Comportamiento                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `stable` | Espera `stableDelayHours`, luego aplica con fluctuación determinista a través de `stableJitterHours` (despliegue escalonado). |
| `beta`   | Verifica cada `betaCheckIntervalHours` (predeterminado: cada hora) y aplica inmediatamente.                                   |
| `dev`    | Sin aplicación automática. Use `openclaw update` manualmente.                                                                 |

El gateway también registra un consejo de actualización al inicio (desactívelo con `update.checkOnStart: false`).

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

- Ejecuta `openclaw doctor` de nuevo y lee la salida con cuidado.
- Para `openclaw update --channel dev` en checkouts de código fuente, el actualizador arranca `pnpm` automáticamente cuando es necesario. Si ves un error de arranque de pnpm/corepack, instala `pnpm` manualmente (o vuelve a habilitar `corepack`) y vuelve a ejecutar la actualización.
- Consultar: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunta en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/es/install) — todos los métodos de instalación
- [Doctor](/es/gateway/doctor) — comprobaciones de estado después de las actualizaciones
- [Migración](/es/install/migrating) — guías de migración de versiones principales
