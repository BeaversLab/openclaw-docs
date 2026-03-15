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

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- ciclo de vida (`uninstall|start|stop|restart`): `--json`

Notas:

- `status` resuelve los SecretRefs de autenticación configurados para la autenticación de sonda cuando es posible.
- En las instalaciones de Linux systemd, las comprobaciones de deriva de tokens `status` incluyen ambas fuentes de unidades `Environment=` y `EnvironmentFile=`.
- Cuando la autenticación de token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `install` valida que el SecretRef se pueda resolver, pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación de token requiere un token y el SecretRef del token configurado no se resuelve, la instalación falla cerrada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, la instalación se bloquea hasta que el modo se establezca explícitamente.

## Preferir

Use [`openclaw gateway`](/es/cli/gateway) para la documentación y los ejemplos actuales.

import es from "/components/footer/es.mdx";

<es />
