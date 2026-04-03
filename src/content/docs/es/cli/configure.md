---
summary: "Referencia de la CLI para `openclaw configure` (indicaciones interactivas de configuración)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

Indicación interactiva para configurar las credenciales, los dispositivos y los valores predeterminados del agente.

Nota: La sección **Modelo** ahora incluye una selección múltiple para la lista de permitidos de `agents.defaults.models` (lo que aparece en `/model` y el selector de modelos).

Consejo: `openclaw config` sin un subcomando abre el mismo asistente. Use
`openclaw config get|set|unset` para ediciones no interactivas.

Para la búsqueda web, `openclaw configure --section web` te permite elegir un proveedor
y configurar sus credenciales. Si eliges **Grok**, configure también puede mostrar
un paso de seguimiento separado para habilitar `x_search` con el mismo `XAI_API_KEY` y
seleccionar un modelo `x_search`. Otros proveedores de búsqueda web no muestran ese paso.

Relacionado:

- Referencia de configuración de Gateway: [Configuration](/en/gateway/configuration)
- CLI de Config: [Config](/en/cli/config)

Notas:

- Elegir dónde se ejecuta el Gateway siempre actualiza `gateway.mode`. Puedes seleccionar "Continue" sin otras secciones si eso es todo lo que necesitas.
- Los servicios orientados a canales (Slack/Discord/Matrix/Microsoft Teams) solicitan listas de permitidos de canales/salas durante la configuración. Puedes ingresar nombres o ID; el asistente resuelve los nombres a ID cuando es posible.
- Si ejecutas el paso de instalación del demonio, la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, configure valida el SecretRef pero no persiste los valores de token en texto plano resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, configure bloquea la instalación del demonio con orientación de remediación procesable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, configure bloquea la instalación del demonio hasta que el modo se establezca explícitamente.

## Ejemplos

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
```
