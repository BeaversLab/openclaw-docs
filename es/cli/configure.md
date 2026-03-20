---
summary: "Referencia de la CLI para `openclaw configure` (sugerencias de configuración interactiva)"
read_when:
  - Deseas ajustar credenciales, dispositivos o valores predeterminados del agente de forma interactiva
title: "configure"
---

# `openclaw configure`

Indicación interactiva para configurar las credenciales, los dispositivos y los valores predeterminados del agente.

Nota: La sección **Model** ahora incluye una selección múltiple para la lista de permitidos (allowlist) de `agents.defaults.models` (lo que se muestra en `/model` y en el selector de modelos).

Sugerencia: `openclaw config` sin un subcomando abre el mismo asistente. Usa
`openclaw config get|set|unset` para ediciones no interactivas.

Relacionado:

- Referencia de configuración de Gateway: [Configuration](/es/gateway/configuration)
- CLI de configuración: [Config](/es/cli/config)

Notas:

- Elegir dónde se ejecuta el Gateway siempre actualiza `gateway.mode`. Puedes seleccionar "Continue" sin otras secciones si eso es todo lo que necesitas.
- Los servicios orientados a canales (Slack/Discord/Matrix/Microsoft Teams) solicitan listas de permitidos de canales/salas durante la configuración. Puede introducir nombres o ID; el asistente resuelve los nombres a ID cuando es posible.
- Si ejecutas el paso de instalación del daemon, la autenticación por token requiere un token, y si `gateway.auth.token` está gestionado por SecretRef, configure valida el SecretRef pero no persiste los valores de token en texto plano resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, configure bloquea la instalación del demonio con orientación de remediation accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, configure bloquea la instalación del daemon hasta que el modo se establezca explícitamente.

## Ejemplos

```bash
openclaw configure
openclaw configure --section model --section channels
```

import es from "/components/footer/es.mdx";

<es />
