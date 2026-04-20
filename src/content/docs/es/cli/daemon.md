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
- `status --deep` añade un escaneo de servicio a nivel de sistema con el mejor esfuerzo. Cuando encuentra otros servicios similares a gateways, la salida humana imprime sugerencias de limpieza y advierte que un gateway por máquina sigue siendo la recomendación normal.
- En instalaciones de Linux systemd, las comprobaciones de deriva de token de `status` incluyen tanto las fuentes de unidad `Environment=` como `EnvironmentFile=`.
- Las comprobaciones de deriva resuelven los SecretRefs de `gateway.auth.token` utilizando el entorno de tiempo de ejecución combinado (primero el entorno de comandos del servicio, luego el respaldo del entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo sin establecer donde la contraseña puede ganar y ningún candidato a token puede ganar), las comprobaciones de deriva de token omiten la resolución del token de configuración.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `install` valida que el SecretRef se pueda resolver pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma cerrada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Si ejecuta intencionadamente múltiples gateways en un solo host, aisle los puertos, la configuración/estado y los espacios de trabajo; consulte [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host).

## Preferir

Utilice [`openclaw gateway`](/es/cli/gateway) para la documentación y los ejemplos actuales.
