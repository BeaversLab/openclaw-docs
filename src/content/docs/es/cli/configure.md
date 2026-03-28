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

Relacionado:

- Referencia de configuración de Gateway: [Configuration](/es/gateway/configuration)
- CLI de configuración: [Config](/es/cli/config)

Notas:

- Elegir dónde se ejecuta el Gateway siempre actualiza `gateway.mode`. Puede seleccionar "Continuar" sin otras secciones si eso es todo lo que necesita.
- Los servicios orientados a canales (Slack/Discord/Matrix/Microsoft Teams) solicitan listas de permitidos de canales/salas durante la configuración. Puede introducir nombres o ID; el asistente resuelve los nombres a ID cuando es posible.
- Si ejecuta el paso de instalación del demonio, la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, configure valida el SecretRef pero no persiste los valores de token de texto sin formato resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, configure bloquea la instalación del demonio con orientación de remediation accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, configure bloquea la instalación del demonio hasta que el modo se establezca explícitamente.

## Ejemplos

```bash
openclaw configure
openclaw configure --section model --section channels
```
