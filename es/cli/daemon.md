---
summary: "Referencia de la CLI para `openclaw daemon` (alias heredado para la gestión del servicio de gateway)"
read_when:
  - Aún usa `openclaw daemon ...` en scripts
  - Necesita comandos del ciclo de vida del servicio (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Alias heredado para los comandos de gestión del servicio Gateway.

`openclaw daemon ...` se asigna a la misma superficie de control de servicio que los comandos de servicio `openclaw gateway ...`.

## Uso

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## Subcomandos

- `status`: mostrar el estado de instalación del servicio y sondear el estado de Gateway
- `install`: instalar servicio (`launchd`/`systemd`/`schtasks`)
- `uninstall`: eliminar servicio
- `start`: iniciar servicio
- `stop`: detener servicio
- `restart`: reiniciar servicio

## Opciones comunes

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- ciclo de vida (`uninstall|start|stop|restart`): `--json`

Notas:

- `status` resuelve los SecretRefs de autenticación configurados para la autenticación de sonda cuando es posible.
- Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `daemon status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
- En las instalaciones de Linux systemd, las comprobaciones de deriva de tokens de `status` incluyen ambas fuentes de unidad `Environment=` y `EnvironmentFile=`.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `install` valida que el SecretRef se pueda resolver pero no persiste el token resuelto en los metadatos del entorno de servicio.
- Si la autenticación por token requiere un token y el token configurado SecretRef no está resuelto, la instalación falla de forma segura.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.

## Preferir

Use [`openclaw gateway`](/es/cli/gateway) para la documentación y los ejemplos actuales.

import en from "/components/footer/en.mdx";

<en />
