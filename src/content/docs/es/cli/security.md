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
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

La auditoría advierte cuando varios remitentes de MD comparten la sesión principal y recomienda el **modo seguro de MD**: `session.dmScope="per-channel-peer"` (o `per-account-channel-peer` para canales multicuenta) para bandejas de entrada compartidas.
Esto es para el endurecimiento de bandejas de entrada cooperativas/compartidas. Una única puerta de enlace compartida por operadores que no confían mutuamente o que son adversarios no es una configuración recomendada; divida los límites de confianza con puertas de enlace separadas (o usuarios/sistemas operativos/host separados).
También emite `security.trust_model.multi_user_heuristic` cuando la configuración sugiere un ingreso probable de usuario compartido (por ejemplo, política de MD/grupo abierto, objetivos de grupo configurados o reglas de remitente comodín), y le recuerda que OpenClaw es un modelo de confianza de asistente personal de forma predeterminada.
Para configuraciones intencionales de usuario compartido, la guía de auditoría es poner en modo sandbox todas las sesiones, mantener el acceso al sistema de archivos limitado al espacio de trabajo y mantener las identidades o credenciales personales/privadas fuera de ese tiempo de ejecución.
También advierte cuando se usan modelos pequeños (`<=300B`) sin sandbox y con herramientas web/navegador habilitadas.
Para el ingreso de webhook, advierte cuando `hooks.token` reutiliza el token de la puerta de enlace, cuando `hooks.defaultSessionKey` no está configurado, cuando `hooks.allowedAgentIds` está sin restricciones, cuando las anulaciones de solicitud `sessionKey` están habilitadas y cuando las anulaciones están habilitadas sin `hooks.allowedSessionKeyPrefixes`.
También advierte cuando la configuración de Docker del sandbox está configurada mientras el modo sandbox está desactivado, cuando `gateway.nodes.denyCommands` usa entradas ineficaces tipo patrón/desconocidas (solo coincidencia exacta del nombre del comando del nodo, no filtrado de texto de shell), cuando `gateway.nodes.allowCommands` habilita explícitamente comandos de nodo peligrosos, cuando el `tools.profile="minimal"` global es anulado por perfiles de herramientas de agente, cuando los grupos abiertos exponen herramientas de tiempo de ejecución/sistema de archivos sin protecciones de sandbox/espacio de trabajo y cuando las herramientas de complementos de extensión instalados pueden ser accesibles bajo una política de herramientas permisiva.
También marca `gateway.allowRealIpFallback=true` (riesgo de suplantación de encabezados si los proxies están mal configurados) y `discovery.mdns.mode="full"` (fuga de metadatos a través de registros TXT mDNS).
También advierte cuando el navegador en modo sandbox usa la red Docker `bridge` sin `sandbox.browser.cdpSourceRange`.
También marca modos de red peligrosos de Docker en sandbox (incluyendo `host` y uniones de espacio de nombres `container:*`).
También advierte cuando los contenedores Docker del navegador en modo sandbox existentes tienen etiquetas de hash faltantes/obsoletas (por ejemplo, contenedores previos a la migración que carecen de `openclaw.browserConfigEpoch`) y recomienda `openclaw sandbox recreate --browser --all`.
También advierte cuando los registros de instalación de complementos/ganchos basados en npm no están anclados, carecen de metadatos de integridad o difieren de las versiones de paquetes instaladas actualmente.
Advierte cuando las listas permitidas de canales dependen de nombres/correos/etiquetas mutables en lugar de IDs estables (alcances de Discord, Slack, Google Chat, Microsoft Teams, Mattermost, IRC cuando corresponda).
Advierte cuando `gateway.auth.mode="none"` deja las API HTTP de la puerta de enlace accesibles sin un secreto compartido (`/tools/invoke` más cualquier punto final `/v1/*` habilitado).
Las configuraciones con el prefijo `dangerous`/`dangerously` son anulaciones explícitas del operador de ruptura de cristal; habilitar una de ellas no es, por sí misma, un informe de vulnerabilidad de seguridad.
Para el inventario completo de parámetros peligrosos, consulte la sección "Resumen de indicadores inseguros o peligrosos" en [Seguridad](/es/gateway/security).

Comportamiento de SecretRef:

- `security audit` resuelve los SecretRefs admitidos en modo de solo lectura para sus rutas de destino.
- Si un SecretRef no está disponible en la ruta del comando actual, la auditoría continúa e informa `secretDiagnostics` (en lugar de fallar).
- `--token` y `--password` solo anulan la autenticación de sondas profundas para esa invocación de comando; no reescriben la configuración ni las asignaciones de SecretRef.

## Salida JSON

Use `--json` para verificaciones de CI/políticas:

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

Si se combinan `--fix` y `--json`, la salida incluye tanto las acciones de corrección como el informe final:

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## Qué cambia `--fix`

`--fix` aplica remedios seguros y deterministas:

- cambia los `groupPolicy="open"` comunes a `groupPolicy="allowlist"` (incluidas las variantes de cuenta en los canales compatibles)
- establece `logging.redactSensitive` de `"off"` a `"tools"`
- limita los permisos para estado/configuración y archivos confidenciales comunes (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, sesión `*.jsonl`)

`--fix` **no**:

- rota tokens/contraseñas/claves de API
- deshabilita herramientas (`gateway`, `cron`, `exec`, etc.)
- cambia las opciones de enlace/autenticación/exposición de red de la puerta de enlace
- elimina o reescribe complementos/habilidades
