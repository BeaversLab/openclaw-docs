---
summary: "Referencia de CLI para `openclaw tui` (interfaz de usuario de terminal con respaldo de Gateway o integrada local)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use openclaw chat or openclaw tui --local
title: "TUI"
---

# `openclaw tui`

Abra la interfaz de usuario de terminal conectada a Gateway, o ejecútela en modo integrado local.

Relacionado:

- Guía de TUI: [TUI](/es/web/tui)

Notas:

- `chat` y `terminal` son alias de `openclaw tui --local`.
- `--local` no se puede combinar con `--url`, `--token` o `--password`.
- `tui` resuelve los SecretRefs de autenticación de gateway configurados para autenticación de token/contraseña cuando sea posible (proveedores `env`/`file`/`exec`).
- Cuando se inicia desde dentro de un directorio de espacio de trabajo de un agente configurado, la TUI selecciona automáticamente ese agente como valor predeterminado de la clave de sesión (a menos que `--session` se establezca explícitamente en `agent:<id>:...`).
- El modo local utiliza el tiempo de ejecución del agente integrado directamente. La mayoría de las herramientas locales funcionan, pero las características exclusivas de Gateway no están disponibles.
- El modo local añade `/auth [provider]` dentro de la superficie de comandos de la TUI.
- Las puertas de aprobación de complementos aún se aplican en modo local. Las herramientas que requieren aprobación solicitan una decisión en la terminal; nada se aprueba automáticamente en silencio porque Gateway no está involucrado.

## Ejemplos

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

## Bucle de reparación de configuración

Use el modo local cuando la configuración actual ya sea válida y desee que el agente integrado la inspeccione, la compare con la documentación y ayude a repararla desde la misma terminal:

Si `openclaw config validate` ya está fallando, use `openclaw configure` o
`openclaw doctor --fix` primero. `openclaw chat` no omite el guardián de
configuración no válida.

```bash
openclaw chat
```

Luego, dentro de la TUI:

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

Aplique correcciones específicas con `openclaw config set` o `openclaw configure` y luego
vuelva a ejecutar `openclaw config validate`. Consulte [TUI](/es/web/tui) y [Config](/es/cli/config).

## Relacionado

- [Referencia de la CLI](/es/cli)
- [TUI](/es/web/tui)
