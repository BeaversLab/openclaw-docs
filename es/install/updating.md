---
summary: "Actualización segura de OpenClaw (instalación global o desde fuente), más estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

# Actualizando

OpenClaw avanza rápido (pre “1.0”). Trate las actualizaciones como el envío de infra: actualizar → ejecutar comprobaciones → reiniciar (o usar `openclaw update`, que reinicia) → verificar.

## Recomendado: volver a ejecutar el instalador del sitio web (actualización in situ)

La ruta de actualización **preferida** es volver a ejecutar el instalador desde el sitio web. Detecta instalaciones existentes, actualiza in situ y ejecuta `openclaw doctor` cuando es necesario.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Notas:

- Agregue `--no-onboard` si no desea que el asistente de configuración inicial se ejecute nuevamente.
- Para **instalaciones desde fuente**, use:

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  El instalador `git pull --rebase` **solo** si el repositorio está limpio.

- Para **instalaciones globales**, el script usa `npm install -g openclaw@latest` entre bambalinas.
- Nota heredada: `clawdbot` sigue disponible como una shim de compatibilidad.

## Antes de actualizar

- Sepa cómo instaló: **global** (npm/pnpm) vs **desde fuente** (git clone).
- Sepa cómo se está ejecutando su Gateway: **terminal en primer plano** vs **servicio supervisado** (launchd/systemd).
- Guarde una instantánea de su personalización:
  - Configuración: `~/.openclaw/openclaw.json`
  - Credenciales: `~/.openclaw/credentials/`
  - Espacio de trabajo: `~/.openclaw/workspace`

## Actualizar (instalación global)

Instalación global (elija una):

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

No **recomendamos** Bun para el tiempo de ejecución del Gateway (errores de WhatsApp/Telegram).

Para cambiar de canales de actualización (instalaciones git + npm):

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

Use `--tag <dist-tag|version>` para una etiqueta/versión de instalación única.

Consulte [Canales de desarrollo](/es/install/development-channels) para obtener la semántica de los canales y las notas de la versión.

Nota: en las instalaciones npm, la puerta de enlace registra una sugerencia de actualización al inicio (verifica la etiqueta del canal actual). Desactive mediante `update.checkOnStart: false`.

### Actualizador automático central (opcional)

El actualizador automático está **desactivado de forma predeterminada** y es una función central del Gateway (no un complemento).

```json
{
  "update": {
    "channel": "stable",
    "auto": {
      "enabled": true,
      "stableDelayHours": 6,
      "stableJitterHours": 12,
      "betaCheckIntervalHours": 1
    }
  }
}
```

Comportamiento:

- `stable`: cuando se ve una nueva versión, OpenClaw espera `stableDelayHours` y luego aplica un jitter determinista por instalación en `stableJitterHours` (despliegue escalonado).
- `beta`: comprueba con una cadencia de `betaCheckIntervalHours` (predeterminado: cada hora) y aplica cuando hay una actualización disponible.
- `dev`: sin aplicación automática; use `openclaw update` manual.

Use `openclaw update --dry-run` para previsualizar las acciones de actualización antes de habilitar la automatización.

Entonces:

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

Notas:

- Si su Gateway se ejecuta como servicio, se prefiere `openclaw gateway restart` antes que matar los PIDs.
- Si está fijado a una versión específica, consulte "Rollback / pinning" (Revertir / fijar) a continuación.

## Actualizar (`openclaw update`)

Para **instalaciones desde código fuente** (git checkout), se prefiere:

```bash
openclaw update
```

Ejecuta un flujo de actualización más o menos seguro:

- Requiere un árbol de trabajo limpio.
- Cambia al canal seleccionado (etiqueta o rama).
- Obtiene + hace rebase contra el upstream configurado (canal de desarrollo).
- Instala dependencias, compila, compila la Interfaz de Control (Control UI) y ejecuta `openclaw doctor`.
- Reinicia el gateway de forma predeterminada (use `--no-restart` para omitir).

Si instaló mediante **npm/pnpm** (sin metadatos de git), `openclaw update` intentará actualizar mediante su gestor de paquetes. Si no puede detectar la instalación, use "Update (global install)" (Actualizar instalación global) en su lugar.

## Actualizar (Interfaz de Control / RPC)

La Interfaz de Control tiene **Update & Restart** (Actualizar y reiniciar) (RPC: `update.run`). Esto:

1. Ejecuta el mismo flujo de actualización desde código fuente que `openclaw update` (solo git checkout).
2. Escribe un centinela de reinicio con un informe estructurado (final de stdout/stderr).
3. Reinicia el gateway y envía un ping a la última sesión activa con el informe.

Si el rebase falla, el gateway aborta y se reinicia sin aplicar la actualización.

## Actualizar (desde código fuente)

Desde el repositorio checkout:

Preferido:

```bash
openclaw update
```

Manual (aproximadamente equivalente):

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

Notas:

- `pnpm build` es importante cuando ejecuta el binario empaquetado `openclaw` ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) o usa Node para ejecutar `dist/`.
- Si ejecuta desde un repositorio checkout sin una instalación global, use `pnpm openclaw ...` para los comandos CLI.
- Si ejecuta directamente desde TypeScript (`pnpm openclaw ...`), una recompilación generalmente no es necesaria, pero **las migraciones de configuración todavía se aplican** → ejecute doctor.
- Cambiar entre instalaciones globales y de git es fácil: instala la otra variante y luego ejecuta `openclaw doctor` para que el punto de entrada del servicio de la puerta de enlace se reescriba a la instalación actual.

## Ejecutar siempre: `openclaw doctor`

Doctor es el comando de “actualización segura”. Es intencionalmente aburrido: reparar + migrar + advertir.

Nota: si estás en una **instalación desde el código fuente** (git checkout), `openclaw doctor` te ofrecerá ejecutar `openclaw update` primero.

Cosas típicas que hace:

- Migrar claves de configuración obsoletas / ubicaciones de archivos de configuración heredados.
- Auditar las políticas de DM y advertir sobre configuraciones de “apertura” arriesgadas.
- Verificar el estado de la puerta de enlace y ofrecer reiniciarla.
- Detectar y migrar servicios de puerta de enlace antiguos (launchd/systemd; schtasks heredados) a los servicios actuales de OpenClaw.
- En Linux, asegurar el lingering del usuario de systemd (para que la puerta de enlace sobreviva al cierre de sesión).

Detalles: [Doctor](/es/gateway/doctor)

## Iniciar / detener / reiniciar la puerta de enlace

CLI (funciona independientemente del sistema operativo):

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

Si estás supervisado:

- macOS launchd (LaunchAgent incluido en la aplicación): `launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (usa `ai.openclaw.<profile>`; el heredado `com.openclaw.*` todavía funciona)
- Servicio de usuario de systemd en Linux: `systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2): `systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` solo funcionan si el servicio está instalado; de lo contrario, ejecuta `openclaw gateway install`.

Manual de procedimientos + etiquetas de servicio exactas: [Manual de procedimientos de la puerta de enlace](/es/gateway)

## Reversión / fijación (cuando algo se rompe)

### Fijar (instalación global)

Instala una versión conocida como buena (reemplaza `<version>` con la última que funcionó):

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

Consejo: para ver la versión publicada actual, ejecuta `npm view openclaw version`.

Luego reinicia + vuelve a ejecutar doctor:

```bash
openclaw doctor
openclaw gateway restart
```

### Fijar (fuente) por fecha

Elige un commit de una fecha (ejemplo: “estado de main a fecha de 2026-01-01”):

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

Luego reinstala las dependencias + reinicia:

```bash
pnpm install
pnpm build
openclaw gateway restart
```

Si quieres volver a lo más adelante más tarde:

```bash
git checkout main
git pull
```

## Si estás atascado

- Ejecuta `openclaw doctor` de nuevo y lee la salida con cuidado (a menudo te dice la solución).
- Consulta: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunta en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

import es from "/components/footer/es.mdx";

<es />
