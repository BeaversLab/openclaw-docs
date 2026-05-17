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
- `status --deep` también ejecuta la validación de configuración en modo consciente de complementos y expone advertencias del manifiesto de complementos configurados (por ejemplo, metadatos de configuración de canal faltantes) para que las comprobaciones de humo de instalación y actualización las detecten. El valor predeterminado `status` mantiene la ruta rápida de solo lectura que omite la validación de complementos.
- En instalaciones de systemd en Linux, las comprobaciones de desviación de tokens `status` incluyen tanto las fuentes de unidad `Environment=` como `EnvironmentFile=`.
- Las comprobaciones de desviación resuelven `gateway.auth.token` SecretRefs utilizando el entorno de tiempo de ejecución combinado (primero el entorno del comando de servicio, luego el respaldo del entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato a token puede ganar), las comprobaciones de desviación de tokens omiten la resolución del token de configuración.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `install` valida que el SecretRef se pueda resolver, pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma cerrada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- En macOS, `install` mantiene los plists de LaunchAgent solo para el propietario y carga los valores de entorno del servicio gestionado a través de un archivo y un contenedor solo para el propietario, en lugar de serializar claves de API o referencias de entorno de perfil de autenticación en `EnvironmentVariables`.
- Si ejecuta intencionalmente múltiples gateways en un solo host, aisle los puertos, la configuración/estado y los espacios de trabajo; consulte [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host).
- `restart --safe` le pide al Gateway en ejecución que realice un vuelo de prueba del trabajo activo y programe un reinicio consolidado después de que se drene el trabajo activo. `restart` plano mantiene el comportamiento existente del gestor de servicios; `--force` sigue siendo la ruta de anulación inmediata.
- `restart --safe --skip-deferral` ejecuta el reinicio seguro compatible con OpenClaw pero omite el control de aplazamiento de trabajo activo para que el Gateway emita el reinicio inmediatamente, incluso si se informan bloqueadores. Escapatoria para el operador cuando una ejecución de tarea atascada fija el reinicio seguro; requiere `--safe`.

## Preferir

Use [`openclaw gateway`](/es/cli/gateway) para la documentación y ejemplos actuales.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Manual de procedimientos de Gateway](/es/gateway)
