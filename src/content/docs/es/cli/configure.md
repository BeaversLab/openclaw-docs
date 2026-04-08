---
summary: "Referencia de la CLI para `openclaw configure` (indicaciones interactivas de configuración)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

Indicación interactiva para configurar las credenciales, los dispositivos y los valores predeterminados del agente.

Nota: La sección **Modelo** ahora incluye una selección múltiple para la lista de permitidos de `agents.defaults.models` (lo que aparece en `/model` y el selector de modelos).

Cuando configure se inicia desde una elección de autenticación de proveedor, los selectores de modelo predeterminado y lista de permitidos prefieren automáticamente ese proveedor. Para proveedores emparejados como Volcengine/BytePlus, la misma preferencia también coincide con sus variantes de plan de codificación (`volcengine-plan/*`, `byteplus-plan/*`). Si el filtro de proveedor preferido produjera una lista vacía, configure vuelve al catálogo sin filtrar en lugar de mostrar un selector en blanco.

Consejo: `openclaw config` sin un subcomando abre el mismo asistente. Use `openclaw config get|set|unset` para ediciones no interactivas.

Para la búsqueda web, `openclaw configure --section web` le permite elegir un proveedor y configurar sus credenciales. Algunos proveedores también muestran mensajes de seguimiento específicos del proveedor:

- **Grok** puede ofrecer una configuración opcional de `x_search` con el mismo `XAI_API_KEY` y permitirle elegir un modelo `x_search`.
- **Kimi** puede solicitar la región de la API de Moonshot (`api.moonshot.ai` vs `api.moonshot.cn`) y el modelo de búsqueda web predeterminado de Kimi.

Relacionado:

- Referencia de configuración de Gateway: [Configuration](/en/gateway/configuration)
- CLI de Config: [Config](/en/cli/config)

## Opciones

- `--section <section>`: filtro de sección repetible

Secciones disponibles:

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

Notas:

- Elegir dónde se ejecuta el Gateway siempre actualiza `gateway.mode`. Puede seleccionar "Continuar" sin otras secciones si eso es todo lo que necesita.
- Los servicios orientados a canales (Slack/Discord/Matrix/Microsoft Teams) solicitan listas de permitidos de canales/salas durante la configuración. Puede ingresar nombres o IDs; el asistente resuelve los nombres a IDs cuando es posible.
- Si ejecuta el paso de instalación del demonio, la autenticación por token requiere un token, y si `gateway.auth.token` está administrado por SecretRef, configure valida el SecretRef pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y la referencia secreta (SecretRef) del token configurado no está resuelta, configure bloquea la instalación del demonio con una guía de remediation accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, configure bloquea la instalación del demonio hasta que el modo se establezca explícitamente.

## Ejemplos

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```
