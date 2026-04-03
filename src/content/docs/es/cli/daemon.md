---
summary: "Referencia de la CLI para `openclaw daemon` (alias heredado para la gestión del servicio de Gateway)"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Alias heredado para los comandos de gestión del servicio Gateway.

`openclaw daemon ...` se asigna a la misma superficie de control de servicio que los comandos del servicio `openclaw gateway ...`.

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

- `status`: muestra el estado de instalación del servicio y sondea el estado de salud de Gateway
- `install`: instala el servicio (`launchd`/`systemd`/`schtasks`)
- `uninstall`: elimina el servicio
- `start`: inicia el servicio
- `stop`: detiene el servicio
- `restart`: reinicia el servicio

## Opciones comunes

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- lifecycle (`uninstall|start|stop|restart`): `--json`

Notas:

- `status` resuelve las SecretRefs de autenticación configuradas para la autenticación de sonda cuando es posible.
- Si una SecretRef de autenticación requerida no se resuelve en esta ruta de comando, `daemon status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero el origen del secreto.
- Si la sonda tiene éxito, se suprimen las advertencias de auth-ref no resueltas para evitar falsos positivos.
- En las instalaciones de Linux systemd, las comprobaciones de token-drift de `status` incluyen los orígenes de la unidad tanto `Environment=` como `EnvironmentFile=`.
- Las comprobaciones de deriva resuelven los SecretRefs de `gateway.auth.token` utilizando el entorno de tiempo de ejecución fusionado (primero el entorno de comandos del servicio y luego el entorno de proceso alternativo).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva de token omiten la resolución del token de configuración.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `install` valida que el SecretRef sea resoluble pero no persiste el token resuelto en los metadatos del entorno de servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma cerrada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establece explícitamente.

## Preferir

Use [`openclaw gateway`](/en/cli/gateway) para la documentación y ejemplos actuales.
