---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde fuente), además de la estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualización"
---

# Actualizando

Mantén OpenClaw actualizado.

## Recomendado: `openclaw update`

La forma más rápida de actualizar. Detecta tu tipo de instalación (npm o git), busca la última versión, ejecuta `openclaw doctor` y reinicia el gateway.

```bash
openclaw update
```

Para cambiar de canal o apuntar a una versión específica:

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

Consulta [Canales de desarrollo](/en/install/development-channels) para conocer la semántica de los canales.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Añade `--no-onboard` para omitir el onboarding. Para instalaciones desde fuente, pasa `--install-method git --no-onboard`.

## Alternativa: npm o pnpm manual

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

## Actualización automática

La actualización automática está desactivada por defecto. Actívala en `~/.openclaw/openclaw.json`:

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

| Canal    | Comportamiento                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `stable` | Espera `stableDelayHours` y luego aplica con un jitter determinista a lo largo de `stableJitterHours` (despliegue escalonado). |
| `beta`   | Comprueba cada `betaCheckIntervalHours` (por defecto: cada hora) y aplica inmediatamente.                                      |
| `dev`    | Sin aplicación automática. Usa `openclaw update` manualmente.                                                                  |

El gateway también registra un consejo de actualización al iniciar (desactívalo con `update.checkOnStart: false`).

## Después de actualizar

<Steps>

### Ejecutar doctor

```bash
openclaw doctor
```

Migra la configuración, audita las políticas de DM y comprueba el estado del gateway. Detalles: [Doctor](/en/gateway/doctor)

### Reiniciar el gateway

```bash
openclaw gateway restart
```

### Verificar

```bash
openclaw health
```

</Steps>

## Reversión

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
- Consulta: [Solución de problemas](/en/gateway/troubleshooting)
- Pregunta en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/en/install) — todos los métodos de instalación
- [Doctor](/en/gateway/doctor) — comprobaciones de estado después de las actualizaciones
- [Migración](/en/install/migrating) — guías de migración de versiones principales
