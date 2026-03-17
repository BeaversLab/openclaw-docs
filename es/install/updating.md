---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde el código fuente), además de la estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

# Actualizando

OpenClaw avanza rápido (pre “1.0”). Trate las actualizaciones como el envío de infraestructura: actualizar → ejecutar comprobaciones → reiniciar (o usar `openclaw update`, que reinicia) → verificar.

## Recomendado: volver a ejecutar el instalador del sitio web (actualización in situ)

La ruta de actualización **preferida** es volver a ejecutar el instalador desde el sitio web. Detecta instalaciones existentes, actualiza en su lugar y ejecuta `openclaw doctor` cuando es necesario.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Notas:

- Agregue `--no-onboard` si no quiere que se ejecute la incorporación nuevamente.
- Para **instalaciones desde fuente**, use:

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  El instalador `git pull --rebase` **solo** si el repositorio está limpio.

- Para **instalaciones globales**, el script usa `npm install -g openclaw@latest` entre bastidores.
- Nota heredada: `clawdbot` sigue disponible como una capa de compatibilidad.

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

Use `--tag <dist-tag|version|spec>` para una anulación puntual del destino del paquete.

Para la `main` actual de GitHub mediante una instalación con gestor de paquetes:

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

También puede pasar una especificación de paquete explícita a `--tag` para actualizaciones puntuales (por ejemplo, una referencia de GitHub o una URL de archivo tar).

Consulte [Canales de desarrollo](/es/install/development-channels) para conocer la semántica de los canales y las notas de la versión.

Nota: en instalaciones npm, el gateway registra un consejo de actualización al inicio (comprueba la etiqueta del canal actual). Desactívelo mediante `update.checkOnStart: false`.

### Actualizador automático del núcleo (opcional)

El actualizador automático está **desactivado por defecto** y es una función central del Gateway (no un complemento).

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

- `stable`: cuando se detecta una nueva versión, OpenClaw espera `stableDelayHours` y luego aplica un «jitter» determinista por instalación en `stableJitterHours` (despliegue escalonado).
- `beta`: comprueba con una cadencia de `betaCheckIntervalHours` (por defecto: cada hora) y aplica cuando hay una actualización disponible.
- `dev`: sin aplicación automática; use `openclaw update` manual.

Use `openclaw update --dry-run` para previsualizar las acciones de actualización antes de habilitar la automatización.

Entonces:

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

Notas:

- Si su Gateway se ejecuta como un servicio, se prefiere `openclaw gateway restart` antes que matar los PIDs.
- Si está fijado a una versión específica, consulte "Rollback / pinning" a continuación.

## Update (`openclaw update`)

Para **source installs** (git checkout), se prefiere:

```bash
openclaw update
```

Ejecuta un flujo de actualización relativamente seguro:

- Requiere un árbol de trabajo limpio.
- Cambia al canal seleccionado (etiqueta o rama).
- Obtiene y hace rebase contra el upstream configurado (canal dev).
- Instala dependencias, compila, compila la Interfaz de Control y ejecuta `openclaw doctor`.
- Reinicia el gateway de forma predeterminada (use `--no-restart` para omitir).

Si instaló mediante **npm/pnpm** (sin metadatos git), `openclaw update` intentará actualizar a través de su gestor de paquetes. Si no puede detectar la instalación, use "Update (global install)" en su lugar.

## Update (Control UI / RPC)

La Interfaz de Control tiene **Update & Restart** (RPC: `update.run`). Esta:

1. Ejecuta el mismo flujo de actualización de código fuente que `openclaw update` (solo git checkout).
2. Escribe un centinela de reinicio con un informe estructurado (cola de stdout/stderr).
3. Reinicia el gateway y envía un ping a la última sesión activa con el informe.

Si el rebase falla, el gateway aborta y se reinicia sin aplicar la actualización.

## Update (from source)

Desde la descarga del repositorio:

Preferido:

```bash
openclaw update
```

Manual (equivalente aproximado):

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
- Si ejecuta desde una descarga del repositorio sin una instalación global, use `pnpm openclaw ...` para los comandos CLI.
- Si ejecuta directamente desde TypeScript (`pnpm openclaw ...`), generalmente no es necesario recompilar, pero **las migraciones de configuración aún se aplican** → ejecute doctor.
- Cambiar entre instalaciones globales y de git es fácil: instale la otra variante y luego ejecute `openclaw doctor` para que el punto de entrada del servicio del gateway se reescriba a la instalación actual.

## Always Run: `openclaw doctor`

Doctor es el comando de "actualización segura". Es intencionalmente aburrido: reparar + migrar + advertir.

Nota: si está en una **instalación desde código fuente** (git checkout), `openclaw doctor` ofrecerá ejecutar `openclaw update` primero.

Cosas típicas que hace:

- Migrar claves de configuración obsoletas / ubicaciones de archivos de configuración heredados.
- Auditar políticas de DM y advertir sobre configuraciones "abiertas" de riesgo.
- Verificar el estado de la puerta de enlace y puede ofrecer reiniciarla.
- Detectar y migrar servicios de puerta de enlace antiguos (launchd/systemd; schtasks heredado) a los servicios actuales de OpenClaw.
- En Linux, asegurar la persistencia del usuario de systemd (para que la puerta de enlace sobreviva al cierre de sesión).

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

Si está supervisado:

- macOS launchd (LaunchAgent incluido en la aplicación): `launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (use `ai.openclaw.<profile>`; `com.openclaw.*` heredado todavía funciona)
- servicio de usuario de Linux systemd: `systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2): `systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` solo funcionan si el servicio está instalado; de lo contrario, ejecute `openclaw gateway install`.

Manual + etiquetas de servicio exactas: [Manual de la puerta de enlace](/es/gateway)

## Revertir / fijar (cuando algo se rompe)

### Fijar (instalación global)

Instalar una versión conocida buena (reemplace `<version>` con la última que funcionó):

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

Elija una confirmación de una fecha (ejemplo: "estado de main a partir del 2026-01-01"):

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

Luego reinstale dependencias + reinicie:

```bash
pnpm install
pnpm build
openclaw gateway restart
```

Si desea volver a la última más adelante:

```bash
git checkout main
git pull
```

## Si está atascado

- Ejecute `openclaw doctor` nuevamente y lea el resultado cuidadosamente (a menudo le indica la solución).
- Consulte: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunte en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

import es from "/components/footer/es.mdx";

<es />
