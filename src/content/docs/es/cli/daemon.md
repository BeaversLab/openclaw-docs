---
summary: "Referencia de la CLI para `openclaw daemon` (alias heredado para la gestión del servicio de Gateway)"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "Demonio"
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
- `restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
- ciclo de vida (`uninstall|start|stop`): `--json`

Notas:

- `status` resuelve los SecretRefs de autenticación configurados para la autenticación de sondas cuando es posible.
- Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `daemon status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero el origen del secreto.
- Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
- `status --deep` añade un escaneo de servicios a nivel de sistema de mejor esfuerzo. Cuando encuentra otros servicios similares a una puerta de enlace, la salida humana imprime sugerencias de limpieza y advierte que una puerta de enlace por máquina sigue siendo la recomendación normal.
- En las instalaciones de systemd en Linux, las comprobaciones de deriva de tokens de `status` incluyen tanto los orígenes de unidad `Environment=` como `EnvironmentFile=`.
- Las comprobaciones de deriva resuelven los SecretRefs `gateway.auth.token` utilizando el entorno de tiempo de ejecución combinado (primero el entorno de comandos de servicio, luego el respaldo del entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva de tokens omiten la resolución del token de configuración.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `install` valida que el SecretRef sea resoluble pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no se resuelve, la instalación falla de forma cerrada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- En macOS, `install` mantiene los plist de LaunchAgent solo para el propietario y carga los valores de entorno del servicio administrado a través de un archivo y un contenedor exclusivos del propietario, en lugar de serializar las claves de API o las referencias de entorno de perfil de autenticación en `EnvironmentVariables`.
- Si ejecuta intencionadamente varias pasarelas en un solo host, aisle los puertos, la configuración/el estado y los espacios de trabajo; consulte [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host).
- `restart --safe` solicita a la Gateway en ejecución que realice una verificación previa del trabajo activo y programe un reinicio consolidado después de que se drene el trabajo activo. El `restart` plano mantiene el comportamiento del gestor de servicios existente; `--force` sigue siendo la ruta de anulación inmediata.
- `restart --safe --skip-deferral` ejecuta el reinicio seguro compatible con OpenClaw, pero omite el control de aplazamiento del trabajo activo para que la Gateway emita el reinicio inmediatamente incluso cuando se informan bloqueadores. Escapatoria para el operador cuando una ejecución de tarea bloqueada fija el reinicio seguro; requiere `--safe`.

## Preferir

Utilice [`openclaw gateway`](/es/cli/gateway) para la documentación y los ejemplos actuales.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Manual de procedimientos de Gateway](/es/gateway)
