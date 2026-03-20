---
summary: "Actualización segura de OpenClaw (instalación global o desde código fuente), además de estrategia de reversión"
read_when:
  - Actualizando OpenClaw
  - Algo se rompe después de una actualización
title: "Updating"
---

# Actualizando

OpenClaw avanza rápido (antes de la versión "1.0"). Trate las actualizaciones como el despliegue de infraestructura: actualizar → ejecutar comprobaciones → reiniciar (o usar `openclaw update`, que reinicia) → verificar.

## Recomendado: volver a ejecutar el instalador del sitio web (actualización en el lugar)

La ruta de actualización **preferida** es volver a ejecutar el instalador desde el sitio web. Detecta instalaciones existentes, actualiza en el lugar y ejecuta `openclaw doctor` cuando es necesario.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Notas:

- Añada `--no-onboard` si no quiere que la incorporación se ejecute de nuevo.
- Para **instalaciones desde código fuente**, use:

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  El instalador `git pull --rebase` **solo** si el repositorio está limpio.

- Para **instalaciones globales**, el script usa `npm install -g openclaw@latest` por debajo.
- Nota heredada: `clawdbot` sigue disponible como shim de compatibilidad.

## Antes de actualizar

- Sepa cómo instaló: **global** (npm/pnpm) frente a **desde código fuente** (git clone).
- Sepa cómo se está ejecutando su Gateway: **terminal en primer plano** frente a **servicio supervisado** (launchd/systemd).
- Haga una instantánea de sus personalizaciones:
  - Configuración: `~/.openclaw/openclaw.json`
  - Credenciales: `~/.openclaw/credentials/`
  - Espacio de trabajo: `~/.openclaw/workspace`

## Actualizar (instalación global)

Instalación global (elija uno):

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

No **recomendamos** Bun para el tiempo de ejecución del Gateway (errores de WhatsApp/Telegram).

Para cambiar de canales de actualización (instalaciones de git + npm):

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

Use `--tag <dist-tag|version|spec>` para una anulación de destino de paquete única.

Para el GitHub `main` head actual a través de una instalación de gestor de paquetes:

```bash
openclaw update --tag main
```

Equivalentes manuales:

```bash
npm i -g github:openclaw/openclaw#main
```

```bash
pnpm add -g github:openclaw/openclaw#main
```

También puede pasar una especificación de paquete explícita a `--tag` para actualizaciones únicas (por ejemplo, una referencia de GitHub o una URL de archivo tarball).

Consulte [Development channels](/es/install/development-channels) para conocer la semántica de los canales y las notas de la versión.

Nota: en las instalaciones de npm, el gateway registra un consejo de actualización al iniciarse (comprueba la etiqueta del canal actual). Desactívelo mediante `update.checkOnStart: false`.

### Actualizador automático principal (opcional)

El actualizador automático está **desactivado por defecto** y es una función principal del Gateway (no un complemento).

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

- `stable`: cuando se detecta una nueva versión, OpenClaw espera `stableDelayHours` y luego aplica un jitter determinista por instalación en `stableJitterHours` (despliegue escalonado).
- `beta`: comprueba con una cadencia `betaCheckIntervalHours` (por defecto: cada hora) y se aplica cuando hay una actualización disponible.
- `dev`: sin aplicación automática; use `openclaw update` manual.

Use `openclaw update --dry-run` para previsualizar las acciones de actualización antes de activar la automatización.

Entonces:

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

Notas:

- Si su Gateway se ejecuta como un servicio, se prefiere `openclaw gateway restart` antes que matar los PIDs.
- Si está anclado a una versión específica, consulte "Rollback / pinning" (Revertir / anclar) a continuación.

## Actualizar (`openclaw update`)

Para **instalaciones desde código fuente** (git checkout), se prefiere:

```bash
openclaw update
```

Ejecuta un flujo de actualización relativamente seguro:

- Requiere un árbol de trabajo limpio.
- Cambia al canal seleccionado (etiqueta o rama).
- Recupera y hace rebase contra el upstream configurado (canal de desarrollo).
- Instala dependencias, compila, compila la Interfaz de Control y ejecuta `openclaw doctor`.
- Reinicia el gateway de forma predeterminada (use `--no-restart` para omitir).

Si instaló mediante **npm/pnpm** (sin metadatos de git), `openclaw update` intentará actualizar mediante su gestor de paquetes. Si no puede detectar la instalación, use en su lugar "Update (global install)" (Actualización [instalación global]).

## Actualizar (Interfaz de Control / RPC)

La Interfaz de Control tiene **Update & Restart** (Actualizar y reiniciar) (RPC: `update.run`). Esto:

1. Ejecuta el mismo flujo de actualización desde código fuente que `openclaw update` (solo git checkout).
2. Escribe un centinela de reinicio con un informe estructurado (final de stdout/stderr).
3. Reinicia el gateway y envía un ping a la última sesión activa con el informe.

Si el rebase falla, el gateway aborta y se reinicia sin aplicar la actualización.

## Actualizar (desde código fuente)

Desde la descarga del repositorio:

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

- `pnpm build` importa cuando ejecuta el binario `openclaw` empaquetado ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) o usa Node para ejecutar `dist/`.
- Si ejecuta desde una descarga del repositorio sin una instalación global, use `pnpm openclaw ...` para los comandos de CLI.
- Si ejecuta directamente desde TypeScript (`pnpm openclaw ...`), una recompilación suele ser innecesaria, pero **las migraciones de configuración aún se aplican** → ejecute doctor.
- Cambiar entre instalaciones globales y git es fácil: instale la otra variante y luego ejecute `openclaw doctor` para que el punto de entrada del servicio de gateway se reescriba a la instalación actual.

## Ejecutar siempre: `openclaw doctor`

Doctor es el comando de "actualización segura". Es intencionalmente aburrido: reparar + migrar + avisar.

Nota: si está en una **instalación desde código fuente** (git checkout), `openclaw doctor` le ofrecerá ejecutar `openclaw update` primero.

Tareas típicas que realiza:

- Migrar claves de configuración obsoletas / ubicaciones de archivos de configuración heredados.
- Auditar las políticas de DM y avisar sobre configuraciones de "abierto" arriesgadas.
- Verificar el estado del Gateway y puede ofrecer reiniciarlo.
- Detectar y migrar servicios de gateway antiguos (launchd/systemd; schtasks heredados) a los servicios OpenClaw actuales.
- En Linux, garantizar la persistencia del usuario de systemd (para que el Gateway sobreviva al cierre de sesión).

Detalles: [Doctor](/es/gateway/doctor)

## Iniciar / detener / reiniciar el Gateway

CLI (funciona independientemente del sistema operativo):

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

Si está supervisado:

- macOS launchd (LaunchAgent incluido en la aplicación): `launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (use `ai.openclaw.<profile>`; el `com.openclaw.*` heredado todavía funciona)
- Servicio de usuario systemd en Linux: `systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2): `systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` solo funcionan si el servicio está instalado; de lo contrario, ejecute `openclaw gateway install`.

Manual + etiquetas exactas de servicio: [Manual del Gateway](/es/gateway)

## Revertir / fijar versión (cuando algo falla)

### Fijar (instalación global)

Instale una versión conocida como buena (reemplace `<version>` con la última que funcionó):

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

Consejo: para ver la versión publicada actual, ejecute `npm view openclaw version`.

Luego reinicie + vuelva a ejecutar doctor:

```bash
openclaw doctor
openclaw gateway restart
```

### Fijar (fuente) por fecha

Elija un compromiso (commit) de una fecha (ejemplo: "estado de main a partir de 2026-01-01"):

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

Luego reinstale las dependencias + reinicie:

```bash
pnpm install
pnpm build
openclaw gateway restart
```

Si desea volver a la más tarde:

```bash
git checkout main
git pull
```

## Si está atascado

- Ejecute `openclaw doctor` nuevamente y lea la salida cuidadosamente (a menudo le indica la solución).
- Consulte: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunte en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

import en from "/components/footer/en.mdx";

<en />
