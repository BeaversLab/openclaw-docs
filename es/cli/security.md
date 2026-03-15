---
summary: "Referencia de CLI para `openclaw security` (auditar y corregir problemas comunes de seguridad)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

Herramientas de seguridad (auditoría + correcciones opcionales).

Relacionado:

- Guía de seguridad: [Security](/es/gateway/security)

## Auditoría

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

La auditoría advierte cuando varios remitentes de MD comparten la sesión principal y recomienda el **modo MD seguro**: `session.dmScope="per-channel-peer"` (o `per-account-channel-peer` para canales multicuenta) para bandejas de entrada compartidas.
Esto es para el endurecimiento de bandejas de entrada cooperativas/compartidas. Una única puerta de enlace (Gateway) compartida por operadores mutuamente no confiables/antagónicos no es una configuración recomendada; divida los límites de confianza con puertas de enlace separadas (o usuarios de SO/hosts separados).
También emite `security.trust_model.multi_user_heuristic` cuando la configuración sugiere un ingreso probable de usuario compartido (por ejemplo, política de MD/grupo abierto, objetivos de grupo configurados o reglas de remitente con comodines), y le recuerda que OpenClaw es un modelo de confianza de asistente personal por defecto.
Para configuraciones intencionales de usuario compartido, la guía de la auditoría es aislar todas las sesiones, mantener el acceso al sistema de archivos limitado al espacio de trabajo y mantener identidades o credenciales personales/privadas fuera de ese tiempo de ejecución.
También advierte cuando se utilizan modelos pequeños (`<=300B`) sin aislamiento y con herramientas web/navegador habilitadas.
Para el ingreso a través de webhooks, advierte cuando `hooks.defaultSessionKey` no está establecido, cuando las anulaciones de solicitud `sessionKey` están habilitadas y cuando las anulaciones están habilitadas sin `hooks.allowedSessionKeyPrefixes`.
También advierte cuando la configuración de Docker de sandbox está configurada mientras el modo sandbox está desactivado, cuando `gateway.nodes.denyCommands` usa entradas ineficaces tipo patrón/desconocidas (solo coincidencia exacta del nombre del comando del nodo, no filtrado de texto de shell), cuando `gateway.nodes.allowCommands` habilita explícitamente comandos de nodo peligrosos, cuando `tools.profile="minimal"` global es anulado por perfiles de herramientas de agente, cuando grupos abiertos exponen herramientas de tiempo de ejecución/sistema de archivos sin guardias de sandbox/espacio de trabajo, y cuando las herramientas de complementos de extensión instaladas pueden ser accesibles bajo una política de herramientas permisiva.
También marca `gateway.allowRealIpFallback=true` (riesgo de suplantación de encabezados si los servidores proxy están mal configurados) y `discovery.mdns.mode="full"` (fuga de metadatos a través de registros TXT mDNS).
También advierte cuando el navegador sandbox usa la red Docker `bridge` sin `sandbox.browser.cdpSourceRange`.
También marca modos de red Docker de sandbox peligrosos (incluyendo `host` y uniones de espacio de nombres `container:*`).
También advierte cuando los contenedores Docker del navegador sandbox existentes tienen etiquetas de hash faltantes/obsoletas (por ejemplo, contenedores anteriores a la migración que carecen de `openclaw.browserConfigEpoch`) y recomienda `openclaw sandbox recreate --browser --all`.
También advierte cuando los registros de instalación de complementos/enlaces basados en npm no están anclados, carecen de metadatos de integridad o difieren de las versiones de paquetes instaladas actualmente.
Advierte cuando las listas de permitidos de canales dependen de nombres/correos/etiquetas mutables en lugar de ID estables (ámbitos de Discord, Slack, Google Chat, MS Teams, Mattermost, IRC, cuando corresponda).
Advierte cuando `gateway.auth.mode="none"` deja las API HTTP de puerta de enlace accesibles sin un secreto compartido (`/tools/invoke` más cualquier punto final `/v1/*` habilitado).
La configuración con el prefijo `dangerous`/`dangerously` son anulaciones explícitas del operador de romper el cristal; habilitar una no es, por sí misma, un informe de vulnerabilidad de seguridad.
Para ver el inventario completo de parámetros peligrosos, consulte la sección "Resumen de indicadores inseguros o peligrosos" en [Security](/es/gateway/security).

## Salida JSON

Use `--json` para comprobaciones de CI/políticas:

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

Si se combinan `--fix` y `--json`, la salida incluye tanto las acciones de reparación como el informe final:

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## Qué cambia `--fix`

`--fix` aplica reparaciones seguras y deterministas:

- cambia `groupPolicy="open"` comunes a `groupPolicy="allowlist"` (incluidas las variantes de cuenta en los canales compatibles)
- establece `logging.redactSensitive` de `"off"` a `"tools"`
- ajusta los permisos para el estado/la configuración y los archivos confidenciales comunes (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, sesión `*.jsonl`)

`--fix` **no**:

- rota tokens/contraseñas/claves de API
- deshabilita herramientas (`gateway`, `cron`, `exec`, etc.)
- cambia las opciones de enlace de puerta de enlace/autenticación/exposición de red
- elimina o reescribe plugins/habilidades

import es from "/components/footer/es.mdx";

<es />
