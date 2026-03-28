---
summary: "Ciclo de vida de Gateway en macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Ciclo de vida de Gateway"
---

# Ciclo de vida de Gateway en macOS

De forma predeterminada, la aplicación de macOS **gestiona el Gateway a través de launchd** y no genera
el Gateway como proceso secundario. Primero intenta conectarse a un Gateway
ya en ejecución en el puerto configurado; si no es accesible, habilita el servicio
launchd a través de la CLI externa `openclaw` (sin tiempo de ejecución integrado). Esto le proporciona
un inicio de sesión automático fiable y un reinicio en caso de fallos.

El modo de proceso secundario (Gateway generado directamente por la aplicación) **no está en uso**
hoy en día.
Si necesita una integración más estrecha con la interfaz de usuario, ejecute el Gateway manualmente en una terminal.

## Comportamiento predeterminado (launchd)

- La aplicación instala un LaunchAgent por usuario etiquetado como `ai.openclaw.gateway`
  (o `ai.openclaw.<profile>` cuando se usa `--profile`/`OPENCLAW_PROFILE`; se admite el `com.openclaw.*` heredado).
- Cuando el modo Local está habilitado, la aplicación asegura que el LaunchAgent esté cargado e
  inicia el Gateway si es necesario.
- Los registros se escriben en la ruta del registro de gateway de launchd (visible en Configuración de depuración).

Comandos comunes:

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

Reemplace la etiqueta con `ai.openclaw.<profile>` cuando ejecute un perfil con nombre.

## Compilaciones de desarrollo sin firmar

`scripts/restart-mac.sh --no-sign` es para compilaciones locales rápidas cuando no tiene
claves de firma. Para evitar que launchd apunte a un binario de retransmisión sin firmar, hace lo siguiente:

- Escribe `~/.openclaw/disable-launchagent`.

Las ejecuciones firmadas de `scripts/restart-mac.sh` borran esta anulación si el marcador
está presente. Para restablecer manualmente:

```bash
rm ~/.openclaw/disable-launchagent
```

## Modo solo conexión

Para forzar a la aplicación de macOS a que **nunca instale o gestione launchd**, iníciela con
`--attach-only` (o `--no-launchd`). Esto establece `~/.openclaw/disable-launchagent`,
por lo que la aplicación solo se conecta a un Gateway que ya se esté ejecutando. Puede alternar el mismo
comportamiento en Configuración de depuración.

## Modo remoto

El modo remoto nunca inicia un Gateway local. La aplicación usa un túnel SSH al
host remoto y se conecta a través de ese túnel.

## Por qué preferimos launchd

- Inicio automático al iniciar sesión.
- Semánticas de reinicio/KeepAlive integradas.
- Registros y supervisión predecibles.

Si alguna vez vuelve a ser necesario un modo de proceso secundario real, se debe documentar como un modo separado y explícito solo para desarrolladores.
