---
summary: "Autenticación de modelos: OAuth, claves de API y token de configuración"
read_when:
  - Depuración de la autenticación del modelo o la caducidad de OAuth
  - Documentación de la autenticación o el almacenamiento de credenciales
title: "Autenticación"
---

# Autenticación

OpenClaw admite OAuth y claves de API para los proveedores de modelos. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser la opción más predecible. También se admiten los flujos de suscripción/OAuth cuando coinciden con el modelo de cuenta de su proveedor.

Consulte [/concepts/oauth](/es/concepts/oauth) para ver el flujo de OAuth completo y el diseño de almacenamiento.
Para la autenticación basada en SecretRef (proveedores `env`/`file`/`exec`), consulte [Gestión de secretos](/es/gateway/secrets).
Para las reglas de elegibilidad de credenciales/códigos de razón utilizadas por `models status --probe`, consulte
[Semántica de credenciales de autenticación](/es/auth-credential-semantics).

## Configuración recomendada (clave de API, cualquier proveedor)

Si está ejecutando una puerta de enlace de larga duración, comience con una clave de API para su proveedor elegido.
Específicamente para Anthropic, la autenticación con clave de API es la opción segura y se recomienda
sobre la autenticación con token de configuración de suscripción.

1. Cree una clave de API en la consola de su proveedor.
2. Póngala en el **host de la puerta de enlace** (la máquina que ejecuta `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la puerta de enlace se ejecuta bajo systemd/launchd, es preferible poner la clave en
   `~/.openclaw/.env` para que el demonio pueda leerla:

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

Luego reinicie el demonio (o reinicie su proceso de puerta de enlace) y vuelva a verificar:

```bash
openclaw models status
openclaw doctor
```

Si prefiere no administrar las variables de entorno usted mismo, la incorporación puede almacenar
claves de API para uso del demonio: `openclaw onboard`.

Consulte [Ayuda](/es/help) para obtener detalles sobre la herencia de variables de entorno (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic: token de configuración (autenticación de suscripción)

Si está utilizando una suscripción a Claude, se admite el flujo de token de configuración. Ejecútelo
en el **host de la puerta de enlace**:

```bash
claude setup-token
```

Luego péguelo en OpenClaw:

```bash
openclaw models auth setup-token --provider anthropic
```

Si el token se creó en otra máquina, péguelo manualmente:

```bash
openclaw models auth paste-token --provider anthropic
```

Si ve un error de Anthropic como:

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

...use una clave de API de Anthropic en su lugar.

<Warning>
  La compatibilidad con el setup-token de Anthropic es solo técnica. Anthropic ha bloqueado algún
  uso de suscripción fuera de Claude Code en el pasado. Úselo solo si decide que el riesgo de la
  política es aceptable, y verifique los términos actuales de Anthropic usted mismo.
</Warning>

Entrada manual de token (cualquier proveedor; escribe `auth-profiles.json` + actualiza la configuración):

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

Las referencias de perfil de autenticación también son compatibles para credenciales estáticas:

- Las credenciales `api_key` pueden usar `keyRef: { source, provider, id }`
- Las credenciales `token` pueden usar `tokenRef: { source, provider, id }`

Verificación compatible con automatización (sale con `1` cuando caduca/falta, `2` cuando está por caducar):

```bash
openclaw models status --check
```

Los scripts de operaciones opcionales (systemd/Termux) están documentados aquí:
[/automation/auth-monitoring](/es/automation/auth-monitoring)

> `claude setup-token` requiere un TTY interactivo.

## Verificar el estado de autenticación del modelo

```bash
openclaw models status
openclaw doctor
```

## Comportamiento de rotación de claves de API (puerta de enlace)

Algunos proveedores admiten reintentar una solicitud con claves alternativas cuando una llamada a la API
alcanza un límite de velocidad del proveedor.

- Orden de prioridad:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (única invalidación)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Los proveedores de Google también incluyen `GOOGLE_API_KEY` como una reserva adicional.
- La misma lista de claves se deduplica antes de su uso.
- OpenClaw reintenta con la siguiente clave solo para errores de límite de velocidad (por ejemplo
  `429`, `rate_limit`, `quota`, `resource exhausted`).
- Los errores que no son de límite de velocidad no se reintentan con claves alternativas.
- Si todas las claves fallan, se devuelve el error final del último intento.

## Controlar qué credencial se utiliza

### Por sesión (comando de chat)

Use `/model <alias-or-id>@<profileId>` para fijar una credencial de proveedor específica para la sesión actual (ids de perfil de ejemplo: `anthropic:default`, `anthropic:work`).

Use `/model` (o `/model list`) para un selector compacto; use `/model status` para la vista completa (candidatos + siguiente perfil de autenticación, más detalles del punto final del proveedor cuando esté configurado).

### Por agente (invalidación de CLI)

Establezca una anulación explícita del orden del perfil de autenticación para un agente (almacenado en ese agente `auth-profiles.json`):

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Use `--agent <id>` para apuntar a un agente específico; omítalo para usar el agente predeterminado configurado.

## Solución de problemas

### "No se encontraron credenciales"

Si falta el perfil de token de Anthropic, ejecute `claude setup-token` en el
**host de la puerta de enlace** y luego vuelva a verificar:

```bash
openclaw models status
```

### Token expirando/expirado

Ejecute `openclaw models status` para confirmar qué perfil está expirando. Si falta el perfil,
vuelva a ejecutar `claude setup-token` y pegue el token nuevamente.

## Requisitos

- Cuenta de suscripción a Anthropic (para `claude setup-token`)
- CLI de Claude Code instalada (comando `claude` disponible)

import es from "/components/footer/es.mdx";

<es />
