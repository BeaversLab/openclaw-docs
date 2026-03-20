---
summary: "Consideraciones de seguridad y modelo de amenazas para ejecutar una puerta de enlace de IA con acceso a shell"
read_when:
  - Adding features that widen access or automation
title: "Security"
---

# Seguridad 🔒

> [!WARNING]
> **Personal assistant trust model:** this guidance assumes one trusted operator boundary per gateway (single-user/personal assistant model).
> OpenClaw is **not** a hostile multi-tenant security boundary for multiple adversarial users sharing one agent/gateway.
> If you need mixed-trust or adversarial-user operation, split trust boundaries (separate gateway + credentials, ideally separate OS users/hosts).

## Alcance primero: modelo de seguridad de asistente personal

La guía de seguridad de OpenClaw asume un despliegue de **asistente personal**: un límite de operador de confianza, potencialmente muchos agentes.

- Postura de seguridad admitida: un usuario/límite de confianza por puerta de enlace (preferiblemente un usuario/host/VPS de SO por límite).
- Límite de seguridad no admitido: una puerta de enlace/agente compartido utilizado por usuarios mutuamente no confiables o adversarios.
- Si se requiere aislamiento de usuarios adversarios, divídalo por límite de confianza (puerta de enlace + credenciales separadas, e idealmente usuarios/hosts de SO separados).
- Si varios usuarios no confiables pueden enviar mensajes a un agente con herramientas habilitadas, trátelos como si compartieran la misma autoridad de herramienta delegada para ese agente.

Esta página explica el endurecimiento **dentro de ese modelo**. No reclama aislamiento multiinquilino hostil en una puerta de enlace compartida.

## Quick check: `openclaw security audit`

See also: [Formal Verification (Security Models)](/es/security/formal-verification/)

Ejecute esto regularmente (especialmente después de cambiar la configuración o exponer superficies de red):

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

Marca errores comunes (Exposición de autenticación de la puerta de enlace, exposición del control del navegador, listas de permitidos elevadas, permisos del sistema de archivos).

OpenClaw es tanto un producto como un experimento: está conectando el comportamiento de modelos de frontera a superfices de mensajería reales y herramientas reales. **No hay una configuración "perfectamente segura".** El objetivo es ser deliberado acerca de:

- quién puede hablar con su bot
- dónde se permite que actúe el bot
- qué puede tocar el bot

Comience con el acceso más pequeño que aún funcione, luego ábralo a medida que gane confianza.

## Supuesto de despliegue (importante)

OpenClaw asume que el host y el límite de configuración son de confianza:

- If someone can modify Gateway host state/config (`~/.openclaw`, including `openclaw.json`), treat them as a trusted operator.
- Ejecutar un Gateway para múltiples operadores mutuamente no confiables/adversarios **no es una configuración recomendada**.
- Para equipos de confianza mixta, separe los límites de confianza con gateways independientes (o como mínimo usuarios/hosts de SO independientes).
- OpenClaw puede ejecutar múltiples instancias de gateway en una máquina, pero las operaciones recomendadas favorecen una separación limpia de los límites de confianza.
- Predeterminado recomendado: un usuario por máquina/host (o VPS), un gateway para ese usuario, y uno o más agentes en ese gateway.
- Si varios usuarios quieren OpenClaw, use un VPS/host por usuario.

### Consecuencia práctica (límite de confianza del operador)

Dentro de una instancia de Gateway, el acceso de operador autenticado es un rol de plano de control de confianza, no un rol de inquilino por usuario.

- Los operadores con acceso de lectura/plano de control pueden inspeccionar los metadatos/historial de la sesión del gateway por diseño.
- Session identifiers (`sessionKey`, session IDs, labels) are routing selectors, not authorization tokens.
- Example: expecting per-operator isolation for methods like `sessions.list`, `sessions.preview`, or `chat.history` is outside this model.
- Si necesita aislamiento de usuarios adversarios, ejecute gateways separados por cada límite de confianza.
- Múltiples gateways en una máquina son técnicamente posibles, pero no es la línea base recomendada para el aislamiento multiusuario.

## Modelo de asistente personal (no un bus multiinquilino)

OpenClaw está diseñado como un modelo de seguridad de asistente personal: un límite de operador de confianza, potencialmente muchos agentes.

- Si varias personas pueden enviar mensajes a un agente con herramientas habilitadas, cada una de ellas puede dirigir ese mismo conjunto de permisos.
- El aislamiento de sesión/memoria por usuario ayuda a la privacidad, pero no convierte un agente compartido en autorización de host por usuario.
- Si los usuarios pueden ser adversarios entre sí, ejecute gateways separados (o usuarios/hosts de SO separados) por cada límite de confianza.

### Espacio de trabajo de Slack compartido: un riesgo real

Si "todos en Slack pueden enviar mensajes al bot", el riesgo central es la autoridad de herramienta delegada:

- any allowed sender can induce tool calls (`exec`, browser, network/file tools) within the agent's policy;
- la inyección de prompt/contenido de un remitente puede causar acciones que afecten el estado compartido, los dispositivos o las salidas;
- si un agente compartido tiene credenciales/archivos confidenciales, cualquier remitente permitido puede potencialmente provocar una exfiltración mediante el uso de herramientas.

Utilice agentes/gateways separados con herramientas mínimas para los flujos de trabajo del equipo; mantenga privados los agentes de datos personales.

### Agente compartido por la empresa: patrón aceptable

Esto es aceptable cuando todos los que usan ese agente están en el mismo límite de confianza (por ejemplo, un equipo de la empresa) y el agente está estrictamente limitado al ámbito comercial.

- ejecútelo en una máquina/VM/contenedor dedicado;
- utilice un usuario de sistema operativo dedicado + navegador/perfil/cuentas dedicadas para ese tiempo de ejecución;
- no inicie sesión en ese tiempo de ejecución con cuentas personales de Apple/Google ni con perfiles personales de gestor de contraseñas/navegador.

Si mezcla identidades personales y de la empresa en el mismo tiempo de ejecución, colapsa la separación y aumenta el riesgo de exposición de datos personales.

## Concepto de confianza de Gateway y nodo

Trate el Gateway y el nodo como un dominio de confianza del operador, con diferentes roles:

- **Gateway** is the control plane and policy surface (`gateway.auth`, tool policy, routing).
- **Nodo** es la superficie de ejecución remota emparejada con ese Gateway (comandos, acciones de dispositivo, capacidades locales del host).
- Un interlocutor autenticado en el Gateway es confiable en el ámbito del Gateway. Después del emparejamiento, las acciones del nodo son acciones confiables del operador en ese nodo.
- `sessionKey` is routing/context selection, not per-user auth.
- Las aprobaciones de ejecución (lista blanca + preguntar) son salvaguardas para la intención del operador, no un aislamiento multiinquilino hostil.
- Las aprobaciones de ejecución vinculan el contexto exacto de la solicitud y operandos de archivos locales directos de mejor esfuerzo; no modelan semánticamente todas las rutas de carga del tiempo de ejecución/intérprete. Utilice sandboxing y aislamiento del host para límites sólidos.

Si necesita aislamiento de usuarios hostiles, separe los límites de confianza por usuario/host del sistema operativo y ejecute gateways separados.

## Matriz de límites de confianza

Utilice esto como el modelo rápido al clasificar los riesgos:

| Límite o control                            | Lo que significa                                                 | Error común de interpretación                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `gateway.auth` (token/password/device auth) | Autentica a los interlocutores ante las API del gateway          | "Necesita firmas por mensaje en cada trama para ser seguro"                                                 |
| `sessionKey`                                | Clave de enrutamiento para la selección de contexto/sesión       | "La clave de sesión es un límite de autenticación de usuario"                                               |
| Barreras de aviso/contenido                 | Reducir el riesgo de abuso del modelo                            | "La inyección de avisos por sí sola demuestra una omisión de autenticación"                                 |
| `canvas.eval` / browser evaluate            | Capacidad intencional del operador cuando está habilitada        | "Cualquier primitiva de evaluación de JS es automáticamente una vulnerabilidad en este modelo de confianza" |
| Local TUI `!` shell                         | Ejecución local activada explícitamente por el operador          | "El comando de conveniencia del shell local es una inyección remota"                                        |
| Emparejamiento de nodos y comandos de nodo  | Ejecución remota a nivel de operador en dispositivos emparejados | "El control remoto del dispositivo debe tratarse como acceso de usuario no confiable por defecto"           |

## No son vulnerabilidades por diseño

Estos patrones se reportan comúnmente y generalmente se cierran sin acción a menos que se muestre una omisión real de un límite:

- Cadenas que solo implican inyección de avisos sin una omisión de política/autenticación/sandbox.
- Afirmaciones que asumen una operación multiinquilino hostil en un host/configuración compartida.
- Claims that classify normal operator read-path access (for example `sessions.list`/`sessions.preview`/`chat.history`) as IDOR in a shared-gateway setup.
- Hallazgos de implementación solo en localhost (por ejemplo HSTS en puerta de enlace solo de loopback).
- Hallazgos de firma de webhook entrante de Discord para rutas entrantes que no existen en este repositorio.
- "Missing per-user authorization" findings that treat `sessionKey` as an auth token.

## Lista de verificación previa para investigadores

Antes de abrir un GHSA, verifique todo lo siguiente:

1. Repro still works on latest `main` or latest release.
2. Report includes exact code path (`file`, function, line range) and tested version/commit.
3. El impacto cruza un límite de confianza documentado (no solo inyección de avisos).
4. La reclamación no figura en [Fuera del alcance](https://github.com/openclaw/openclaw/blob/main/SECURITY.md#out-of-scope).
5. Se verificaron los avisos existentes para buscar duplicados (reutilizar el GHSA canónico cuando corresponda).
6. Las suposiciones de implementación son explícitas (loopback/local frente a expuesto, operadores de confianza frente a no confiables).

## Línea base endurecida en 60 segundos

Use esta línea base primero, luego vuelva a habilitar selectivamente las herramientas por agente de confianza:

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

Esto mantiene la puerta de enlace solo local, aísla los mensajes directos y deshabilita las herramientas del plano de control/tiempo de ejecución de forma predeterminada.

## Regla rápida para bandeja de entrada compartida

Si más de una persona puede enviar mensajes directos a su bot:

- Configure `session.dmScope: "per-channel-peer"` (o `"per-account-channel-peer"` para canales multicuenta).
- Mantenga `dmPolicy: "pairing"` o listas de permitidos estrictas.
- Nunca combine MD compartidos con acceso amplio a herramientas.
- Esto endurece las bandejas de entrada cooperativas/compartidas, pero no está diseñado como aislamiento de co-inquilinos hostiles cuando los usuarios comparten acceso de escritura al host/configuración.

### Lo que verifica la auditoría (nivel alto)

- **Acceso entrante** (políticas de MD, políticas de grupo, listas de permisos): ¿pueden extraños activar el bot?
- **Radio de explosión de herramientas** (herramientas elevadas + salas abiertas): ¿podría la inyección de prompts convertirse en acciones de shell/archivo/red?
- **Exposición de red** (enlace/autenticación de Gateway, Tailscale Serve/Funnel, tokens de autenticación débiles/cortos).
- **Exposición del control del navegador** (nodos remotos, puertos de retransmisión, endpoints CDP remotos).
- **Higiene del disco local** (permisos, enlaces simbólicos, inclusiones de configuración, rutas de "carpeta sincronizada").
- **Complementos** (existen extensiones sin una lista de permisos explícita).
- **Deriva de la política/configuración incorrecta** (configuración de Docker de sandbox configurada pero modo de sandbox desactivado; patrones `gateway.nodes.denyCommands` ineficaces porque la coincidencia es solo por nombre de comando exacto (por ejemplo, `system.run`) y no inspecciona el texto del shell; entradas `gateway.nodes.allowCommands` peligrosas; `tools.profile="minimal"` global anulada por perfiles por agente; herramientas de plugins de extensión accesibles bajo una política de herramientas permisiva).
- **Deriva de las expectativas de tiempo de ejecución** (por ejemplo, `tools.exec.host="sandbox"` mientras el modo de sandbox está desactivado, lo que se ejecuta directamente en el host de la puerta de enlace).
- **Higiene del modelo** (avisa cuando los modelos configurados parecen heredados; no es un bloqueo estricto).

Si ejecuta `--deep`, OpenClaw también intenta un sondeo en vivo de la puerta de enlace con el mejor esfuerzo posible.

## Mapa de almacenamiento de credenciales

Úselo al auditar el acceso o decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token de bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos)
- **Token de bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permisos de emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelos**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Payload de secretos respaldado en archivo (opcional)**: `~/.openclaw/secrets.json`
- **Importación de OAuth heredada**: `~/.openclaw/credentials/oauth.json`

## Lista de verificación de auditoría de seguridad

Cuando la auditoría imprima hallazgos, trátelos en el siguiente orden de prioridad:

1. **Cualquier cosa “abierta” + herramientas habilitadas**: bloquee primero los MDs/grupos (emparejamiento/listas de permitidos), luego ajuste la política de herramientas/sandbox.
2. **Exposición de red pública** (vinculación LAN, Funnel, autenticación faltante): corríjalo inmediatamente.
3. **Exposición remota del control del navegador**: trátelo como acceso de operador (solo tailnet, empareje nodos deliberadamente, evite la exposición pública).
4. **Permisos**: asegúrese de que el estado/configuración/credenciales/autenticación no sean legibles por el grupo/mundo.
5. **Complementos/extensions**: cargue solo lo que confíe explícitamente.
6. **Elección del modelo**: prefiera modelos modernos y fortalecidos por instrucciones para cualquier bot con herramientas.

## Glosario de auditoría de seguridad

Valores de `checkId` de alta señal que es muy probable que vea en implementaciones reales (no exhaustivo):

| `checkId`                                          | Gravedad            | Por qué importa                                                                                                                                | Clave/ruta de corrección principal                                                                                                                     | Auto-corrección |
| -------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `fs.state_dir.perms_world_writable`                | crítica             | Otros usuarios/procesos pueden modificar el estado completo de OpenClaw                                                                        | permisos del sistema de archivos en `~/.openclaw`                                                                                                      | sí              |
| `fs.config.perms_writable`                         | crítica             | Otros pueden cambiar la política/configuración de autenticación/herramientas                                                                   | permisos del sistema de archivos en `~/.openclaw/openclaw.json`                                                                                        | sí              |
| `fs.config.perms_world_readable`                   | crítica             | La configuración puede exponer tokens/configuración                                                                                            | permisos de sistema de archivos en el archivo de configuración                                                                                         | sí              |
| `gateway.bind_no_auth`                             | crítica             | Vinculación remota sin secreto compartido                                                                                                      | `gateway.bind`, `gateway.auth.*`                                                                                                                       | no              |
| `gateway.loopback_no_auth`                         | crítica             | El bucle invertido con proxy inverso puede quedar sin autenticar                                                                               | `gateway.auth.*`, configuración de proxy                                                                                                               | no              |
| `gateway.http.no_auth`                             | advertencia/crítica | APIs HTTP de la puerta de enlace accesibles con `auth.mode="none"`                                                                             | `gateway.auth.mode`, `gateway.http.endpoints.*`                                                                                                        | no              |
| `gateway.tools_invoke_http.dangerous_allow`        | advertencia/crítica | Reactiva herramientas peligrosas a través de la API HTTP                                                                                       | `gateway.tools.allow`                                                                                                                                  | no              |
| `gateway.nodes.allow_commands_dangerous`           | advertencia/crítica | Habilita comandos de nodo de alto impacto (cámara/pantalla/contactos/calendario/SMS)                                                           | `gateway.nodes.allowCommands`                                                                                                                          | no              |
| `gateway.tailscale_funnel`                         | crítico             | Exposición a Internet pública                                                                                                                  | `gateway.tailscale.mode`                                                                                                                               | no              |
| `gateway.control_ui.allowed_origins_required`      | crítico             | Interfaz de usuario de control no local sin lista de permitidos explícita de origen del navegador                                              | `gateway.controlUi.allowedOrigins`                                                                                                                     | no              |
| `gateway.control_ui.host_header_origin_fallback`   | advertencia/crítico | Habilita la reserva de origen del encabezado Host (reducción del endurecimiento contra el rebind de DNS)                                       | `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`                                                                                           | no              |
| `gateway.control_ui.insecure_auth`                 | advertencia         | Activado el interruptor de compatibilidad de autenticación insegura                                                                            | `gateway.controlUi.allowInsecureAuth`                                                                                                                  | no              |
| `gateway.control_ui.device_auth_disabled`          | crítico             | Deshabilita la verificación de identidad del dispositivo                                                                                       | `gateway.controlUi.dangerouslyDisableDeviceAuth`                                                                                                       | no              |
| `gateway.real_ip_fallback_enabled`                 | advertencia/crítico | Confiar en la reserva `X-Real-IP` puede habilitar la suplantación de IP de origen a través de una configuración incorrecta del proxy           | `gateway.allowRealIpFallback`, `gateway.trustedProxies`                                                                                                | no              |
| `discovery.mdns_full_mode`                         | advertencia/crítico | El modo completo mDNS anuncia metadatos de `cliPath`/`sshPort` en la red local                                                                 | `discovery.mdns.mode`, `gateway.bind`                                                                                                                  | no              |
| `config.insecure_or_dangerous_flags`               | advertencia         | Cualquier indicador de depuración inseguro/peligroso habilitado                                                                                | múltiples claves (ver detalle del hallazgo)                                                                                                            | no              |
| `hooks.token_reuse_gateway_token`                  | crítico             | El token de entrada de hook también desbloquea la autenticación del Gateway                                                                    | `hooks.token`, `gateway.auth.token`                                                                                                                    | no              |
| `hooks.token_too_short`                            | advertir            | Fuerza bruta más fácil en la entrada del hook                                                                                                  | `hooks.token`                                                                                                                                          | no              |
| `hooks.default_session_key_unset`                  | advertir            | El agente de hook ejecuta una distribución en sesiones generadas por solicitud                                                                 | `hooks.defaultSessionKey`                                                                                                                              | no              |
| `hooks.allowed_agent_ids_unrestricted`             | advertir/crítico    | Los llamadores de hook autenticados pueden enrutar a cualquier agente configurado                                                              | `hooks.allowedAgentIds`                                                                                                                                | no              |
| `hooks.request_session_key_enabled`                | advertir/crítico    | El llamador externo puede elegir sessionKey                                                                                                    | `hooks.allowRequestSessionKey`                                                                                                                         | no              |
| `hooks.request_session_key_prefixes_missing`       | advertir/crítico    | Sin límite en las formas de claves de sesión externas                                                                                          | `hooks.allowedSessionKeyPrefixes`                                                                                                                      | no              |
| `logging.redact_off`                               | advertencia         | Filtración de valores confidenciales a los registros/estado                                                                                    | `logging.redactSensitive`                                                                                                                              | sí              |
| `sandbox.docker_config_mode_off`                   | advertencia         | Configuración de Sandbox Docker presente pero inactiva                                                                                         | `agents.*.sandbox.mode`                                                                                                                                | no              |
| `sandbox.dangerous_network_mode`                   | crítico             | La red de Sandbox Docker utiliza el modo de unión al espacio de nombres `host` o `container:*`                                                 | `agents.*.sandbox.docker.network`                                                                                                                      | no              |
| `tools.exec.host_sandbox_no_sandbox_defaults`      | advertencia         | `exec host=sandbox` se resuelve en exec del host cuando el sandbox está desactivado                                                            | `tools.exec.host`, `agents.defaults.sandbox.mode`                                                                                                      | no              |
| `tools.exec.host_sandbox_no_sandbox_agents`        | advertencia         | `exec host=sandbox` por agente se resuelve en exec del host cuando el sandbox está desactivado                                                 | `agents.list[].tools.exec.host`, `agents.list[].sandbox.mode`                                                                                          | no              |
| `tools.exec.safe_bins_interpreter_unprofiled`      | advertencia         | Los intérpretes/binarios de runtime en `safeBins` sin perfiles explícitos amplían el riesgo de exec                                            | `tools.exec.safeBins`, `tools.exec.safeBinProfiles`, `agents.list[].tools.exec.*`                                                                      | no              |
| `skills.workspace.symlink_escape`                  | advertencia         | El `skills/**/SKILL.md` del espacio de trabajo se resuelve fuera de la raíz del espacio de trabajo (deriva de la cadena de enlaces simbólicos) | estado del sistema de archivos `skills/**` del espacio de trabajo                                                                                      | no              |
| `security.exposure.open_groups_with_elevated`      | crítico             | Los grupos abiertos + herramientas elevadas crean rutas de inyección de prompts de alto impacto                                                | `channels.*.groupPolicy`, `tools.elevated.*`                                                                                                           | no              |
| `security.exposure.open_groups_with_runtime_or_fs` | crítico/advertencia | Los grupos abiertos pueden alcanzar herramientas de comando/archivo sin protecciones de sandbox/espacio de trabajo                             | `channels.*.groupPolicy`, `tools.profile/deny`, `tools.fs.workspaceOnly`, `agents.*.sandbox.mode`                                                      | no              |
| `security.trust_model.multi_user_heuristic`        | advertencia         | La configuración parece multiusuario mientras que el modelo de confianza de la puerta de enlace es de asistente personal                       | separar los límites de confianza o endurecimiento para usuarios compartidos (`sandbox.mode`, denegación de herramientas/ámbito del espacio de trabajo) | no              |
| `tools.profile_minimal_overridden`                 | advertencia         | Las anulaciones del agente omiten el perfil mínimo global                                                                                      | `agents.list[].tools.profile`                                                                                                                          | no              |
| `plugins.tools_reachable_permissive_policy`        | advertencia         | Herramientas de extensión accesibles en contextos permisivos                                                                                   | `tools.profile` + permiso/denegación de herramientas                                                                                                   | no              |
| `models.small_params`                              | crítico/información | Modelos pequeños + superficies de herramientas inseguras aumentan el riesgo de inyección                                                       | elección del modelo + política de sandbox/herramienta                                                                                                  | no              |

## Interfaz de usuario de control a través de HTTP

La interfaz de usuario de control necesita un **contexto seguro** (HTTPS o localhost) para generar la identidad del dispositivo. `gateway.controlUi.allowInsecureAuth` es un interruptor de compatibilidad local:

- En localhost, permite la autenticación de la interfaz de usuario de control sin identidad del dispositivo cuando la página se carga a través de HTTP no seguro.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad del dispositivo remoto (no localhost).

Se prefiere HTTPS (Tailscale Serve) o abrir la interfaz de usuario en `127.0.0.1`.

Solo para escenarios de emergencia, `gateway.controlUi.dangerouslyDisableDeviceAuth`
desactiva las comprobaciones de identidad del dispositivo por completo. Esto es una degradación grave de la seguridad;
manténgalo desactivado a menos que esté depurando activamente y pueda revertir rápidamente.

`openclaw security audit` advierte cuando esta configuración está activada.

## Resumen de indicadores inseguros o peligrosos

`openclaw security audit` incluye `config.insecure_or_dangerous_flags` cuando
se activan interruptores de depuración inseguros/peligrosos conocidos. Esa comprobación actualmente
agrupa:

- `gateway.controlUi.allowInsecureAuth=true`
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
- `hooks.gmail.allowUnsafeExternalContent=true`
- `hooks.mappings[<index>].allowUnsafeExternalContent=true`
- `tools.exec.applyPatch.workspaceOnly=false`

Claves de configuración completas de `dangerous*` / `dangerously*` definidas en el esquema de configuración
de OpenClaw:

- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
- `gateway.controlUi.dangerouslyDisableDeviceAuth`
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `channels.discord.dangerouslyAllowNameMatching`
- `channels.discord.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.slack.dangerouslyAllowNameMatching`
- `channels.slack.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.googlechat.dangerouslyAllowNameMatching`
- `channels.googlechat.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.msteams.dangerouslyAllowNameMatching`
- `channels.zalouser.dangerouslyAllowNameMatching` (canal de extensión)
- `channels.irc.dangerouslyAllowNameMatching` (canal de extensión)
- `channels.irc.accounts.<accountId>.dangerouslyAllowNameMatching` (canal de extensión)
- `channels.mattermost.dangerouslyAllowNameMatching` (canal de extensión)
- `channels.mattermost.accounts.<accountId>.dangerouslyAllowNameMatching` (canal de extensión)
- `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

## Configuración de proxy inverso

Si ejecuta el Gateway detrás de un proxy inverso (nginx, Caddy, Traefik, etc.), debe configurar `gateway.trustedProxies` para una detección adecuada de la IP del cliente.

Cuando el Gateway detecta encabezados de proxy de una dirección que **no** está en `trustedProxies`, **no** tratará las conexiones como clientes locales. Si la autenticación del gateway está deshabilitada, esas conexiones se rechazan. Esto evita la omisión de autenticación donde, de otro modo, las conexiones proxy parecerían provenir de localhost y recibirían confianza automática.

```yaml
gateway:
  trustedProxies:
    - "127.0.0.1" # if your proxy runs on localhost
  # Optional. Default false.
  # Only enable if your proxy cannot provide X-Forwarded-For.
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

Cuando se configura `trustedProxies`, el Gateway usa `X-Forwarded-For` para determinar la IP del cliente. `X-Real-IP` se ignora de forma predeterminada a menos que `gateway.allowRealIpFallback: true` se establezca explícitamente.

Buen comportamiento del proxy inverso (sobrescribir los encabezados de reenvío entrantes):

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

Mal comportamiento del proxy inverso (adjuntar/preservar encabezados de reenvío que no son de confianza):

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## Notas sobre HSTS y el origen

- El gateway de OpenClaw es local/de bucle de retorno (loopback) primero. Si termina TLS en un proxy inverso, configure HSTS en el dominio HTTPS orientado al proxy allí.
- Si el propio gateway termina HTTPS, puede establecer `gateway.http.securityHeaders.strictTransportSecurity` para emitir el encabezado HSTS desde las respuestas de OpenClaw.
- La guía detallada de implementación se encuentra en [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth#tls-termination-and-hsts).
- Para las implementaciones de la interfaz de usuario de Control que no son de bucle de retorno (loopback), `gateway.controlUi.allowedOrigins` se requiere de forma predeterminada.
- `gateway.controlUi.allowedOrigins: ["*"]` es una política explícita de permitir todos los orígenes del navegador, no un valor predeterminado reforzado. Evítela fuera de las pruebas locales estrictamente controladas.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de reserva de origen del encabezado Host; trátelo como una política peligrosa seleccionada por el operador.
- Trate la reasignación de DNS y el comportamiento del encabezado de host del proxy como preocupaciones de endurecimiento de la implementación; mantenga `trustedProxies` estricto y evite exponer el gateway directamente a Internet pública.

## Los registros de sesión locales residen en el disco

OpenClaw almacena las transcripciones de sesión en el disco bajo `~/.openclaw/agents/<agentId>/sessions/*.jsonl`.
Esto es necesario para la continuidad de la sesión y (opcionalmente) la indexación de la memoria de la sesión, pero también significa
que **cualquier proceso/usuario con acceso al sistema de archivos puede leer esos registros**. Trate el acceso al disco como el límite
de confianza y bloquee los permisos en `~/.openclaw` (consulte la sección de auditoría a continuación). Si necesita
un aislamiento más fuerte entre agentes, ejecútelos bajo usuarios de sistema operativo separados o hosts separados.

## Ejecución de nodo (system.run)

Si se empareja un nodo macOS, la puerta de enlace puede invocar `system.run` en ese nodo. Esto es **ejecución remota de código** en la Mac:

- Requiere emparejamiento de nodo (aprobación + token).
- Controlado en la Mac a través de **Configuración → Aprobaciones de ejecución** (seguridad + preguntar + lista de permitidos).
- El modo de aprobación vincula el contexto exacto de la solicitud y, cuando es posible, un operando de script/archivo local concreto. Si OpenClaw no puede identificar exactamente un archivo local directo para un comando de intérprete/tiempo de ejecución, la ejecución respaldada por aprobación se deniega en lugar de prometer una cobertura semántica completa.
- Si no desea ejecución remota, configure la seguridad en **denegar** y elimine el emparejamiento del nodo para esa Mac.

## Habilidades dinámicas (observador / nodos remotos)

OpenClaw puede actualizar la lista de habilidades a mitad de la sesión:

- **Observador de habilidades**: los cambios en `SKILL.md` pueden actualizar la instantánea de habilidades en el siguiente turno del agente.
- **Nodos remotos**: conectar un nodo macOS puede hacer que las habilidades exclusivas de macOS sean elegibles (basado en la sondificación de binarios).

Trate las carpetas de habilidades como **código de confianza** y restrinja quién puede modificarlas.

## El modelo de amenazas

Su asistente de IA puede:

- Ejecutar comandos de shell arbitrarios
- Leer/escribir archivos
- Acceder a servicios de red
- Enviar mensajes a cualquiera (si le da acceso a WhatsApp)

Las personas que le envían mensajes pueden:

- Intentar engañar a su IA para que haga cosas malas
- Ingeniería social para acceder a sus datos
- Sondear detalles de la infraestructura

## Concepto clave: control de acceso antes que la inteligencia

La mayoría de las fallas aquí no son exploits sofisticados; son “alguien envió un mensaje al bot y el bot hizo lo que le pidieron”.

La postura de OpenClaw:

- **Primero la identidad:** decida quién puede hablar con el bot (emparejamiento por DM / listas de permitidos / “abierto” explícito).
- **Luego el alcance:** decida dónde se permite que el bot actúe (listas de permitidos de grupos + filtrado de menciones, herramientas, sandbox, permisos de dispositivos).
- **El modelo al final:** asuma que el modelo puede ser manipulado; diseñe para que la manipulación tenga un radio de explosión limitado.

## Modelo de autorización de comandos

Los comandos de barra y directivas solo se respetan para **remitentes autorizados**. La autorización se deriva de
listas de permitidos/emparejamiento de canales más `commands.useAccessGroups` (ver [Configuration](/es/gateway/configuration)
y [Slash commands](/es/tools/slash-commands)). Si una lista de permitidos de canales está vacía o incluye `"*"`,
los comandos están efectivamente abiertos para ese canal.

`/exec` es una conveniencia solo de sesión para operadores autorizados. **No** escribe configuración o
cambia otras sesiones.

## Riesgo de herramientas del plano de control

Dos herramientas integradas pueden realizar cambios persistentes en el plano de control:

- `gateway` puede llamar a `config.apply`, `config.patch` y `update.run`.
- `cron` puede crear trabajos programados que siguen ejecutándose después de que finaliza el chat/tarea original.

Para cualquier agente/superficie que maneje contenido que no es de confianza, deniegue estos de forma predeterminada:

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` solo bloquea las acciones de reinicio. No deshabilita las acciones de configuración/actualización de `gateway`.

## Complementos/extensiones

Los complementos se ejecutan **en proceso** con el Gateway. Trátelos como código de confianza:

- Solo instale complementos de fuentes en las que confíe.
- Prefiera listas de permitidos explícitas de `plugins.allow`.
- Revise la configuración del complemento antes de habilitarlo.
- Reinicie el Gateway después de cambiar los complementos.
- Si instala complementos desde npm (`openclaw plugins install <npm-spec>`), trátelo como ejecutar código que no es de confianza:
  - La ruta de instalación es `~/.openclaw/extensions/<pluginId>/` (o `$OPENCLAW_STATE_DIR/extensions/<pluginId>/`).
  - OpenClaw usa `npm pack` y luego ejecuta `npm install --omit=dev` en ese directorio (los scripts del ciclo de vida de npm pueden ejecutar código durante la instalación).
  - Prefiera versiones fijas y exactas (`@scope/pkg@1.2.3`) e inspeccione el código descomprimido en el disco antes de habilitar.

Detalles: [Plugins](/es/tools/plugin)

## Modelo de acceso por MD (emparejamiento / lista de permitidos / abierto / deshabilitado)

Todos los canales actuales con capacidad de MD admiten una política de MD (`dmPolicy` o `*.dm.policy`) que restringe los MD entrantes **antes** de que se procese el mensaje:

- `pairing` (predeterminado): los remitentes desconocidos reciben un código de emparejamiento corto y el bot ignora sus mensajes hasta que sean aprobados. Los códigos caducan después de 1 hora; los MD repetidos no reenviarán un código hasta que se cree una nueva solicitud. Las solicitudes pendientes están limitadas a **3 por canal** de forma predeterminada.
- `allowlist`: los remitentes desconocidos están bloqueados (sin protocolo de enlace de emparejamiento).
- `open`: permite que cualquiera envíe un MD (público). **Requiere** que la lista de permitidos del canal incluya `"*"` (aceptación explícita).
- `disabled`: ignora por completo los MD entrantes.

Aprobar a través de CLI:

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

Detalles + archivos en disco: [Emparejamiento](/es/channels/pairing)

## Aislamiento de sesión de MD (modo multiusuario)

De forma predeterminada, OpenClaw enruta **todos los MD a la sesión principal** para que su asistente tenga continuidad entre dispositivos y canales. Si **varias personas** pueden enviar MD al bot (MD abiertos o una lista de permitidos para varias personas), considere aislar las sesiones de MD:

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

Esto evita filtraciones de contexto entre usuarios mientras se mantienen aislados los chats grupales.

Este es un límite de contexto de mensajería, no un límite de administración del host. Si los usuarios son mutuamente adversarios y comparten el mismo host/configuración de Gateway, ejecute gateways separados para cada límite de confianza.

### Modo de MD seguro (recomendado)

Trate el fragmento anterior como **modo de MD seguro**:

- Predeterminado: `session.dmScope: "main"` (todos los MD comparten una sesión para la continuidad).
- Predeterminado de incorporación de CLI local: escribe `session.dmScope: "per-channel-peer"` cuando no está configurado (mantiene los valores explícitos existentes).
- Modo de MD seguro: `session.dmScope: "per-channel-peer"` (cada par de canal+remitente obtiene un contexto de MD aislado).

Si ejecuta varias cuentas en el mismo canal, use `per-account-channel-peer` en su lugar. Si la misma persona se pone en contacto con usted en varios canales, use `session.identityLinks` para fusionar esas sesiones de MD en una identidad canónica. Consulte [Gestión de sesiones](/es/concepts/session) y [Configuración](/es/gateway/configuration).

## Listas de permitidos (MD + grupos) - terminología

OpenClaw tiene dos capas separadas de "¿quién puede activarme?":

- **Lista blanca de MD** (`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`; heredado: `channels.discord.dm.allowFrom`, `channels.slack.dm.allowFrom`): quién tiene permiso para hablar con el bot en mensajes directos.
  - Cuando `dmPolicy="pairing"`, las aprobaciones se escriben en el almacenamiento de listas blancas de emparejamiento con ámbito de cuenta bajo `~/.openclaw/credentials/` (`<channel>-allowFrom.json` para la cuenta predeterminada, `<channel>-<accountId>-allowFrom.json` para cuentas no predeterminadas), combinado con las listas blancas de configuración.
- **Lista blanca de grupos** (específica del canal): de qué grupos/canales/gremios el bot aceptará mensajes.
  - Patrones comunes:
    - `channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`: valores predeterminados por grupo como `requireMention`; cuando se establece, también actúa como una lista blanca de grupos (incluya `"*"` para mantener el comportamiento de permitir todo).
    - `groupPolicy="allowlist"` + `groupAllowFrom`: restringe quién puede activar el bot _dentro_ de una sesión de grupo (WhatsApp/Telegram/Signal/iMessage/Microsoft Teams).
    - `channels.discord.guilds` / `channels.slack.channels`: listas blancas por superficie + valores predeterminados de mención.
  - Las comprobaciones de grupo se ejecutan en este orden: `groupPolicy`/listas blancas de grupo primero, activación de mención/respuesta segundo.
  - Responder a un mensaje del bot (mención implícita) **no** omite las listas blancas de remitentes como `groupAllowFrom`.
  - **Nota de seguridad:** trate `dmPolicy="open"` y `groupPolicy="open"` como configuraciones de último recurso. Deben usarse apenas; prefiera el emparejamiento + listas blancas a menos que confíe completamente en cada miembro de la sala.

Detalles: [Configuración](/es/gateway/configuration) y [Grupos](/es/channels/groups)

## Inyección de mensajes (prompt) (qué es, por qué importa)

La inyección de mensajes (prompt injection) es cuando un atacante crea un mensaje que manipula al modelo para que haga algo inseguro (“ignora tus instrucciones”, “vuelca tu sistema de archivos”, “sigue este enlace y ejecuta comandos”, etc.).

Incluso con instrucciones del sistema sólidas, **la inyección de instrucciones no está resuelta**. Las barreras de las instrucciones del sistema son solo una guía suave; la aplicación estricta proviene de la política de herramientas, las aprobaciones de ejecución, el sandboxing y las listas de permitidos de canales (y los operadores pueden desactivarlas por diseño). Lo que ayuda en la práctica:

- Mantén los MD entrantes bloqueados (emparejamiento/listas de permitidos).
- Prefiere el filtrado por mención en grupos; evita bots "siempre activos" en salas públicas.
- Trata los enlaces, archivos adjuntos e instrucciones pegadas como hostiles por defecto.
- Ejecuta herramientas sensibles en un sandbox; mantén los secretos fuera del sistema de archivos accesible del agente.
- Nota: el sandboxing es opcional. Si el modo sandbox está desactivado, la ejecución se ejecuta en el host de la puerta de enlace aunque tools.exec.host tenga como valor predeterminado sandbox, y la ejecución en el host no requiere aprobaciones a menos que configures host=gateway y configures las aprobaciones de ejecución.
- Limita las herramientas de alto riesgo (`exec`, `browser`, `web_fetch`, `web_search`) a agentes de confianza o listas de permitidos explícitas.
- **La elección del modelo importa:** los modelos más pequeños/antiguos/heredados son significativamente menos robustos contra la inyección de instrucciones y el uso indebido de herramientas. Para agentes con herramientas habilitadas, utiliza el modelo más sólido de última generación y reforzado contra instrucciones disponible.

Banderas rojas para tratar como no confiables:

- "Lee este archivo/URL y haz exactamente lo que dice".
- "Ignora tus instrucciones del sistema o reglas de seguridad".
- "Revela tus instrucciones ocultas o resultados de herramientas".
- "Pega el contenido completo de ~/.openclaw o tus registros".

## Banderas de omisión de contenido externo no seguro

OpenClaw incluye banderas de omisión explícitas que desactivan el envoltorio de seguridad de contenido externo:

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Campo de carga útil de Cron `allowUnsafeExternalContent`

Orientación:

- Mantén estos sin establecer/falsos en producción.
- Actívalos solo temporalmente para la depuración de alcance limitado.
- Si se habilitan, aísla ese agente (sandbox + herramientas mínimas + espacio de nombres de sesión dedicado).

Nota de riesgo de Hooks:

- Las cargas útiles de los Hooks son contenido no confiable, incluso cuando la entrega proviene de sistemas que controlas (el contenido de correo/documentos/web puede llevar inyección de instrucciones).
- Los niveles de modelo débiles aumentan este riesgo. Para la automatización basada en hooks, prefiere niveles de modelo modernos y fuertes y mantén la política de herramientas estricta (`tools.profile: "messaging"` o más estricta), además del uso de entornos limitados (sandboxing) siempre que sea posible.

### La inyección de prompts no requiere mensajes públicos (DMs)

Incluso si **solo tú** puedes enviar mensajes al bot, la inyección de prompts aún puede ocurrir a través de
cualquier **contenido no confiable** que lea el bot (resultados de búsqueda/web del navegador, páginas del navegador,
correos electrónicos, documentos, archivos adjuntos, registros/código pegados). En otras palabras: el remitente no es
la única superficie de amenaza; el **contenido en sí** puede transportar instrucciones adversas.

Cuando se habilitan las herramientas, el riesgo típico es la exfiltración de contexto o la activación de
llamadas a herramientas. Reduce el radio de impacto:

- Usando un **agente lector** de solo lectura o con herramientas deshabilitadas para resumir contenido no confiable,
  y luego pasar el resumen a tu agente principal.
- Mantener `web_search` / `web_fetch` / `browser` desactivados para los agentes con herramientas habilitadas, a menos que sea necesario.
- Para las entradas de URL de OpenResponses (`input_file` / `input_image`), establece
  `gateway.http.endpoints.responses.files.urlAllowlist` y
  `gateway.http.endpoints.responses.images.urlAllowlist` estrictos,
  y mantén `maxUrlParts` bajo.
  Las listas de permitidos (allowlists) vacías se tratan como no establecidas; usa `files.allowUrl: false` / `images.allowUrl: false`
  si deseas deshabilitar por completo la obtención de URL.
- Habilitar el uso de entornos limitados (sandboxing) y listas de permitidos (allowlists) estrictas para herramientas para cualquier agente que toque entradas no confiables.
- Mantener los secretos fuera de los prompts; pásalos mediante variables de entorno/configuración en el host de la puerta de enlace (gateway) en su lugar.

### Fortaleza del modelo (nota de seguridad)

La resistencia a la inyección de prompts **no** es uniforme en los niveles de modelo. Los modelos más pequeños/baratos son generalmente más susceptibles al uso indebido de herramientas y al secuestro de instrucciones, especialmente bajo prompts adversos.

<Warning>
  Para agentes con herramientas habilitadas o agentes que leen contenido no confiable, el riesgo de
  inyección de prompts con modelos más antiguos/más pequeños a menudo es demasiado alto. No ejecutes
  esas cargas de trabajo en niveles de modelo débiles.
</Warning>

Recomendaciones:

- **Usa el modelo de la última generación y del mejor nivel** para cualquier bot que pueda ejecutar herramientas o tocar archivos/redes.
- **No uses niveles más antiguos/más débiles/más pequeños** para agentes con herramientas habilitadas o bandejas de entrada no confiables; el riesgo de inyección de prompts es demasiado alto.
- Si debes usar un modelo más pequeño, **reduce el radio de impacto** (herramientas de solo lectura, sandbox fuerte, acceso mínimo al sistema de archivos, listas de permitidos estrictas).
- Al ejecutar modelos pequeños, **habilita el sandbox para todas las sesiones** y **deshabilita web_search/web_fetch/browser** a menos que las entradas estén estrictamente controladas.
- Para asistentes personales de solo chat con entradas confiables y sin herramientas, los modelos pequeños suelen ser adecuados.

## Razonamiento y salida detallada en grupos

`/reasoning` y `/verbose` pueden exponer el razonamiento interno o la salida de herramientas que
no estaba destinada a un canal público. En entornos grupales, trátalos como **solo
de depuración** y manténlos desactivados a menos que los necesites explícitamente.

Guía:

- Mantén `/reasoning` y `/verbose` desactivados en salas públicas.
- Si los habilitas, hazlo solo en MDs confiables o salas estrictamente controladas.
- Recuerda: la salida detallada puede incluir argumentos de herramientas, URL y datos que el modelo vio.

## Endurecimiento de la configuración (ejemplos)

### 0) Permisos de archivos

Mantén la configuración + el estado privados en el host de la puerta de enlace:

- `~/.openclaw/openclaw.json`: `600` (solo lectura/escritura del usuario)
- `~/.openclaw`: `700` (solo usuario)

`openclaw doctor` puede advertir y ofrecer ajustar estos permisos.

### 0.4) Exposición de red (bind + puerto + firewall)

La puerta de enlace multiplexa **WebSocket + HTTP** en un solo puerto:

- Predeterminado: `18789`
- Configuración/banderas/entorno: `gateway.port`, `--port`, `OPENCLAW_GATEWAY_PORT`

Esta superficie HTTP incluye la interfaz de usuario de control y el host del lienzo:

- Interfaz de usuario de control (activos de SPA) (ruta base predeterminada `/`)
- Host del lienzo: `/__openclaw__/canvas/` y `/__openclaw__/a2ui/` (HTML/JS arbitrario; tratar como contenido no confiable)

Si cargas contenido del lienzo en un navegador normal, trátalo como cualquier otra página web no confiable:

- No expongas el host del lienzo a redes o usuarios no confiables.
- No hagas que el contenido del lienzo comparta el mismo origen que las superficies web privilegiadas a menos que comprendas completamente las implicaciones.

El modo de enlace controla dónde escucha la puerta de enlace:

- `gateway.bind: "loopback"` (predeterminado): solo los clientes locales pueden conectarse.
- Los enlaces no locales (`"lan"`, `"tailnet"`, `"custom"`) amplían la superficie de ataque. Úsalos solo con un token/contraseña compartido y un firewall real.

Reglas generales:

- Prefiere Tailscale Serve sobre los enlaces LAN (Serve mantiene el Gateway en loopback y Tailscale maneja el acceso).
- Si debes enlazar a la LAN, restringe el puerto con una lista de permitidos estricta de IPs de origen; no hagas reenvío de puertos de forma amplia.
- Nunca expongas el Gateway sin autenticación en `0.0.0.0`.

### 0.4.1) Publicación de puertos Docker + UFW (`DOCKER-USER`)

Si ejecutas OpenClaw con Docker en un VPS, recuerda que los puertos de contenedor publicados
(`-p HOST:CONTAINER` o Compose `ports:`) se enrutan a través de las cadenas de reenvío
de Docker, no solo de las reglas `INPUT` del host.

Para mantener el tráfico de Docker alineado con tu política de firewall, aplica reglas en
`DOCKER-USER` (esta cadena se evalúa antes que las reglas de aceptación propias de Docker).
En muchas distribuciones modernas, `iptables`/`ip6tables` usan el frontend `iptables-nft`
y aún aplican estas reglas al backend nftables.

Ejemplo de lista de permitidos mínima (IPv4):

```bash
# /etc/ufw/after.rules (append as its own *filter section)
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DOCKER-USER -s 127.0.0.0/8 -j RETURN
-A DOCKER-USER -s 10.0.0.0/8 -j RETURN
-A DOCKER-USER -s 172.16.0.0/12 -j RETURN
-A DOCKER-USER -s 192.168.0.0/16 -j RETURN
-A DOCKER-USER -s 100.64.0.0/10 -j RETURN
-A DOCKER-USER -p tcp --dport 80 -j RETURN
-A DOCKER-USER -p tcp --dport 443 -j RETURN
-A DOCKER-USER -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
COMMIT
```

IPv6 tiene tablas separadas. Añade una política coincidente en `/etc/ufw/after6.rules` si
IPv6 de Docker está habilitado.

Evita codificar nombres de interfaz como `eth0` en los fragmentos de documentación. Los nombres de interfaz
varían según las imágenes de VPS (`ens3`, `enp*`, etc.) y las discrepancias pueden accidentalmente
saltarse tu regla de denegación.

Validación rápida después de recargar:

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

Los puertos externos esperados deben ser solo aquellos que expongas intencionalmente (para la mayoría
de configuraciones: SSH + tus puertos de proxy inverso).

### 0.4.2) Descubrimiento mDNS/Bonjour (divulgación de información)

El Gateway difunde su presencia mediante mDNS (`_openclaw-gw._tcp` en el puerto 5353) para el descubrimiento de dispositivos locales. En modo completo, esto incluye registros TXT que pueden exponer detalles operativos:

- `cliPath`: ruta completa del sistema de archivos al binario de la CLI (revela el nombre de usuario y la ubicación de instalación)
- `sshPort`: anuncia la disponibilidad de SSH en el host
- `displayName`, `lanHost`: información del nombre de host

**Consideración de seguridad operativa:** La difusión de detalles de la infraestructura facilita el reconocimiento a cualquier persona en la red local. Incluso la información "inofensiva", como las rutas del sistema de archivos y la disponibilidad de SSH, ayuda a los atacantes a mapear su entorno.

**Recomendaciones:**

1. **Modo mínimo** (predeterminado, recomendado para gateways expuestos): omite los campos sensibles de las transmisiones mDNS:

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **Deshabilitar completamente** si no necesita el descubrimiento de dispositivos locales:

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

3. **Modo completo** (opcional): incluye `cliPath` + `sshPort` en los registros TXT:

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

4. **Variable de entorno** (alternativa): establece `OPENCLAW_DISABLE_BONJOUR=1` para deshabilitar mDNS sin cambios en la configuración.

En modo mínimo, el Gateway aún transmite lo suficiente para el descubrimiento de dispositivos (`role`, `gatewayPort`, `transport`), pero omite `cliPath` y `sshPort`. Las aplicaciones que necesiten información sobre la ruta de la CLI pueden obtenerla a través de la conexión WebSocket autenticada.

### 0.5) Bloquear el WebSocket del Gateway (autenticación local)

La autenticación del Gateway es **obligatoria de forma predeterminada**. Si no se configura ningún token/contraseña,
el Gateway rechaza las conexiones WebSocket (fail‑closed).

La incorporación genera un token de forma predeterminada (incluso para el bucle local) para que
los clientes locales deban autenticarse.

Establezca un token para que **todos** los clientes de WS deban autenticarse:

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor puede generar uno para usted: `openclaw doctor --generate-gateway-token`.

Nota: `gateway.remote.token` / `.password` son fuentes de credenciales de cliente. Por sí mismos, **no** protegen el acceso local a WS.
Las rutas de llamada locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*`
no está establecido.
Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente mediante
SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de reserva remota).
Opcional: fijar el TLS remoto con `gateway.remote.tlsFingerprint` al usar `wss://`.
El `ws://` en texto sin formato es solo de bucle local (loopback) de forma predeterminada. Para rutas de red privada de confianza, establezca `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el proceso del cliente como método de emergencia.

Emparejamiento de dispositivo local:

- El emparejamiento de dispositivos se aprueba automáticamente para conexiones **locales** (bucle local o la
  dirección propia de tailnet del host de la puerta de enlace) para mantener a los clientes del mismo host sin problemas.
- Otros pares de tailnet **no** se tratan como locales; aún necesitan aprobación de emparejamiento.

Modos de autenticación:

- `gateway.auth.mode: "token"`: token de portador compartido (recomendado para la mayoría de las configuraciones).
- `gateway.auth.mode: "password"`: autenticación por contraseña (se prefiere establecer a través de env: `OPENCLAW_GATEWAY_PASSWORD`).
- `gateway.auth.mode: "trusted-proxy"`: confiar en un proxy inverso con reconocimiento de identidad para autenticar usuarios y pasar la identidad a través de encabezados (ver [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)).

Lista de verificación de rotación (token/contraseña):

1. Generar/establecer un nuevo secreto (`gateway.auth.token` o `OPENCLAW_GATEWAY_PASSWORD`).
2. Reiniciar la puerta de enlace (o reiniciar la aplicación de macOS si supervisa la puerta de enlace).
3. Actualizar cualquier cliente remoto (`gateway.remote.token` / `.password` en las máquinas que llaman a la puerta de enlace).
4. Verificar que ya no puede conectarse con las credenciales antiguas.

### 0.6) Encabezados de identidad de Tailscale Serve

Cuando `gateway.auth.allowTailscale` es `true` (predeterminado para Serve), OpenClaw
acepta los encabezados de identidad de Tailscale Serve (`tailscale-user-login`) para la autenticación de
Control UI/WebSocket. OpenClaw verifica la identidad resolviendo la
dirección `x-forwarded-for` a través del demonio local de Tailscale (`tailscale whois`)
y coincidiéndola con el encabezado. Esto solo se activa para las solicitudes que llegan al loopback
e incluyen `x-forwarded-for`, `x-forwarded-proto` y `x-forwarded-host` tal como
son inyectados por Tailscale.
Los endpoints de la API HTTP (por ejemplo `/v1/*`, `/tools/invoke` y `/api/channels/*`)
aún requieren autenticación por token/contraseña.

Nota importante sobre el límite:

- La autenticación HTTP bearer del Gateway es efectivamente un acceso de operador de todo o nada.
- Trate las credenciales que pueden llamar a `/v1/chat/completions`, `/v1/responses`, `/tools/invoke` o `/api/channels/*` como secretos de operador de acceso completo para ese gateway.
- No comparta estas credenciales con llamadores no confiables; prefiera gateways separados por cada límite de confianza.

**Supuesto de confianza:** la autenticación sin token de Serve asume que el host del gateway es confiable.
No trate esto como una protección contra procesos hostiles en el mismo host. Si código
local no confiable puede ejecutarse en el host del gateway, deshabilite `gateway.auth.allowTailscale`
y requiera autenticación por token/contraseña.

**Regla de seguridad:** no reenvíe estos encabezados desde su propio proxy inverso. Si
termina TLS o hace de proxy frente al gateway, deshabilite
`gateway.auth.allowTailscale` y use autenticación por token/contraseña (o [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)) en su lugar.

Proxies confiables:

- Si termina TLS frente al Gateway, establezca `gateway.trustedProxies` a sus IPs de proxy.
- OpenClaw confiará en `x-forwarded-for` (o `x-real-ip`) de esas IPs para determinar la IP del cliente para verificaciones de emparejamiento local y verificaciones de autenticación HTTP/local.
- Asegúrese de que su proxy **sobrescriba** `x-forwarded-for` y bloquee el acceso directo al puerto del Gateway.

Consulte [Tailscale](/es/gateway/tailscale) y [Web overview](/es/web).

### 0.6.1) Control del navegador a través del host de nodos (recomendado)

Si su Gateway está remoto pero el navegador se ejecuta en otra máquina, ejecute un **node host**
en la máquina del navegador y deje que el Gateway actúe como proxy de las acciones del navegador (consulte [Browser tool](/es/tools/browser)).
Trate el emparejamiento de nodos como un acceso de administrador.

Patrón recomendado:

- Mantenga el Gateway y el host de nodos en la misma tailnet (Tailscale).
- Empareje el nodo intencionalmente; desactive el enrutamiento del proxy del navegador si no lo necesita.

Evite:

- Exponer puertos de retransmisión/control a través de la LAN o Internet pública.
- Tailscale Funnel para puntos de conexión de control del navegador (exposición pública).

### 0.7) Secretos en el disco (datos confidenciales)

Asuma que cualquier cosa en `~/.openclaw/` (o `$OPENCLAW_STATE_DIR/`) puede contener secretos o datos privados:

- `openclaw.json`: la configuración puede incluir tokens (gateway, gateway remoto), configuración del proveedor y listas de permitidos.
- `credentials/**`: credenciales del canal (ejemplo: credenciales de WhatsApp), listas de permitidos de emparejamiento, importaciones heredadas de OAuth.
- `agents/<agentId>/agent/auth-profiles.json`: claves API, perfiles de token, tokens de OAuth y `keyRef`/`tokenRef` opcionales.
- `secrets.json` (opcional): carga útil de secreto respaldada en archivo utilizada por proveedores SecretRef de `file` (`secrets.providers`).
- `agents/<agentId>/agent/auth.json`: archivo de compatibilidad heredada. Las entradas `api_key` estáticas se eliminan al descubrirse.
- `agents/<agentId>/sessions/**`: transcripciones de sesión (`*.jsonl`) + metadatos de enrutamiento (`sessions.json`) que pueden contener mensajes privados y resultados de herramientas.
- `extensions/**`: complementos instalados (además de sus `node_modules/`).
- `sandboxes/**`: espacios de trabajo del entorno sandbox de herramientas; pueden acumular copias de los archivos que lee/escribe dentro del entorno sandbox.

Consejos de endurecimiento:

- Mantenga los permisos restringidos (`700` en directorios, `600` en archivos).
- Utilice el cifrado de disco completo en el host del gateway.
- Prefiera una cuenta de usuario de sistema operativo dedicada para el Gateway si el host es compartido.

### 0.8) Registros + transcripciones (redacción + retención)

Los registros y las transcripciones pueden filtrar información confidencial incluso cuando los controles de acceso son correctos:

- Los registros del Gateway pueden incluir resúmenes de herramientas, errores y URL.
- Las transcripciones de las sesiones pueden incluir secretos pegados, contenidos de archivos, salidas de comandos y enlaces.

Recomendaciones:

- Mantenga la redacción del resumen de herramientas activada (`logging.redactSensitive: "tools"`; por defecto).
- Añada patrones personalizados para su entorno a través de `logging.redactPatterns` (tokens, nombres de host, URL internas).
- Al compartir diagnósticos, prefiera `openclaw status --all` (pegable, secretos redactados) sobre los registros sin procesar.
- Pode las transcripciones de sesiones antiguas y los archivos de registro si no necesita una retención prolongada.

Detalles: [Logging](/es/gateway/logging)

### 1) Mensajes directos: emparejamiento por defecto

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 2) Grupos: requerir mención en todas partes

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "groupChat": { "mentionPatterns": ["@openclaw", "@mybot"] }
      }
    ]
  }
}
```

En los chats de grupo, responder solo cuando se mencione explícitamente.

### 3. Números separados

Considere ejecutar su IA en un número de teléfono separado del suyo personal:

- Número personal: Sus conversaciones permanecen privadas
- Número de bot: La IA maneja estos, con los límites apropiados

### 4. Modo de solo lectura (Hoy, vía sandbox + herramientas)

Ya puede crear un perfil de solo lectura combinando:

- `agents.defaults.sandbox.workspaceAccess: "ro"` (o `"none"` para sin acceso al espacio de trabajo)
- listas de permitidos/denegados de herramientas que bloquean `write`, `edit`, `apply_patch`, `exec`, `process`, etc.

Es posible que añadamos un único indicador `readOnlyMode` más adelante para simplificar esta configuración.

Opciones adicionales de endurecimiento:

- `tools.exec.applyPatch.workspaceOnly: true` (por defecto): asegura que `apply_patch` no pueda escribir/eliminar fuera del directorio del espacio de trabajo incluso cuando el sandbox está desactivado. Establézcalo en `false` solo si intencionalmente desea que `apply_patch` toque archivos fuera del espacio de trabajo.
- `tools.fs.workspaceOnly: true` (opcional): restringe las rutas `read`/`write`/`edit`/`apply_patch` y las rutas de carga automática de imágenes de indicador nativo al directorio del espacio de trabajo (útil si hoy permites rutas absolutas y deseas una única barrera de protección).
- Mantenga los raíces del sistema de archivos estrechos: evite raíces amplias como su directorio de inicio para los espacios de trabajo del agente/espacios de trabajo de sandbox. Los raíces amplios pueden exponer archivos locales confidenciales (por ejemplo, estado/configuración bajo `~/.openclaw`) a las herramientas del sistema de archivos.

### 5) Línea de base segura (copiar/pegar)

Una configuración de “valor predeterminado seguro” que mantiene el Gateway privado, requiere el emparejamiento por MD y evita bots de grupo siempre activos:

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "your-long-random-token" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

Si también desea una ejecución de herramientas “más segura de forma predeterminada”, agregue un sandbox + deniegue herramientas peligrosas para cualquier agente que no sea el propietario (ejemplo a continuación en “Perfiles de acceso por agente”).

Línea de base integrada para los turnos del agente impulsados por chat: los remitentes que no sean el propietario no pueden utilizar las herramientas `cron` o `gateway`.

## Aislamiento en sandbox (recomendado)

Documento dedicado: [Sandboxing](/es/gateway/sandboxing)

Dos enfoques complementarios:

- **Ejecutar el Gateway completo en Docker** (límite del contenedor): [Docker](/es/install/docker)
- **Sandbox de herramienta** (`agents.defaults.sandbox`, gateway host + herramientas aisladas en Docker): [Sandboxing](/es/gateway/sandboxing)

Nota: para evitar el acceso entre agentes, mantenga `agents.defaults.sandbox.scope` en `"agent"` (predeterminado)
o `"session"` para un aislamiento más estricto por sesión. `scope: "shared"` utiliza un único contenedor/espacio de trabajo.

Considere también el acceso al espacio de trabajo del agente dentro del sandbox:

- `agents.defaults.sandbox.workspaceAccess: "none"` (predeterminado) mantiene el espacio de trabajo del agente fuera de los límites; las herramientas se ejecutan contra un espacio de trabajo de sandbox bajo `~/.openclaw/sandboxes`
- `agents.defaults.sandbox.workspaceAccess: "ro"` monta el espacio de trabajo del agente como de solo lectura en `/agent` (desactiva `write`/`edit`/`apply_patch`)
- `agents.defaults.sandbox.workspaceAccess: "rw"` monta el espacio de trabajo del agente como lectura/escritura en `/workspace`

Importante: `tools.elevated` es la opción de escape global de línea base que ejecuta exec en el host. Mantenga `tools.elevated.allowFrom` restringida y no la habilite para desconocidos. Puede restringir aún más el acceso elevado por agente mediante `agents.list[].tools.elevated`. Consulte [Modo elevado](/es/tools/elevated).

### Barandilla de delegación de subagentes

Si permite herramientas de sesión, trate las ejecuciones delegadas de subagentes como otra decisión de límite:

- Deniegue `sessions_spawn` a menos que el agente realmente necesite delegación.
- Mantenga `agents.list[].subagents.allowAgents` restringido a agentes objetivo conocidos como seguros.
- Para cualquier flujo de trabajo que deba permanecer en sandbox, llame a `sessions_spawn` con `sandbox: "require"` (el valor predeterminado es `inherit`).
- `sandbox: "require"` falla rápidamente cuando el tiempo de ejecución hijo objetivo no está en sandbox.

## Riesgos de control del navegador

Habilitar el control del navegador otorga al modelo la capacidad de controlar un navegador real.
Si ese perfil de navegador ya contiene sesiones iniciadas, el modelo puede
acceder a esas cuentas y datos. Trate los perfiles del navegador como **estado confidencial**:

- Prefiera un perfil dedicado para el agente (el perfil `openclaw` predeterminado).
- Evite dirigir el agente a su perfil personal de uso diario.
- Mantenga el control del navegador del host deshabilitado para agentes en sandbox a menos que confíe en ellos.
- Trate las descargas del navegador como entrada no confiable; prefiera un directorio de descargas aislado.
- Deshabilite la sincronización del navegador/gestores de contraseñas en el perfil del agente si es posible (reduce el radio de explosión).
- Para gateways remotos, asuma que "control del navegador" es equivalente a "acceso de operador" a cualquier cosa que ese perfil pueda alcanzar.
- Mantenga los hosts del Gateway y de los nodos solo en tailnet; evite exponer los puertos de control del navegador a la LAN o a Internet pública.
- Deshabilite el enrutamiento del proxy del navegador cuando no lo necesite (`gateway.nodes.browser.mode="off"`).
- El modo de sesión existente de Chrome MCP **no** es "más seguro"; puede actuar como usted en cualquier cosa que el perfil de Chrome de ese host pueda alcanzar.

### Política de SSRF del navegador (predeterminado de red de confianza)

La política de red del navegador de OpenClaw se predetermina al modelo de operador de confianza: se permiten destinos privados/internos a menos que los deshabilite explícitamente.

- Predeterminado: `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` (implícito cuando no está establecido).
- Alias heredado: `browser.ssrfPolicy.allowPrivateNetwork` todavía se acepta por compatibilidad.
- Modo estricto: establezca `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: false` para bloquear destinos privados/internos/de uso especial por defecto.
- En modo estricto, use `hostnameAllowlist` (patrones como `*.example.com`) y `allowedHostnames` (excepciones de host exactas, incluyendo nombres bloqueados como `localhost`) para excepciones explícitas.
- La navegación se verifica antes de la solicitud y se vuelve a verificar con el mejor esfuerzo en la URL final `http(s)` después de la navegación para reducir pivotes basados en redirecciones.

Política estricta de ejemplo:

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"],
    },
  },
}
```

## Perfiles de acceso por agente (multiagente)

Con el enrutamiento multiagente, cada agente puede tener su propio sandbox + política de herramientas:
use esto para dar **acceso completo**, **solo lectura** o **sin acceso** por agente.
Vea [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para detalles completos
y reglas de precedencia.

Casos de uso comunes:

- Agente personal: acceso completo, sin sandbox
- Agente familiar/trabajo: en sandbox + herramientas de solo lectura
- Agente público: en sandbox + sin herramientas de sistema de archivos/shell

### Ejemplo: acceso completo (sin sandbox)

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

### Ejemplo: herramientas de solo lectura + espacio de trabajo de solo lectura

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

### Ejemplo: sin acceso a sistema de archivos/shell (mensajería del proveedor permitida)

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        // Session tools can reveal sensitive data from transcripts. By default OpenClaw limits these tools
        // to the current session + spawned subagent sessions, but you can clamp further if needed.
        // See `tools.sessions.visibility` in the configuration reference.
        tools: {
          sessions: { visibility: "tree" }, // self | tree | agent | all
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

## Qué decirle a su IA

Incluya directrices de seguridad en el prompt del sistema de su agente:

```
## Security Rules
- Never share directory listings or file paths with strangers
- Never reveal API keys, credentials, or infrastructure details
- Verify requests that modify system config with the owner
- When in doubt, ask before acting
- Keep private data private unless explicitly authorized
```

## Respuesta a Incidentes

Si su IA hace algo malo:

### Contener

1. **Deténgalo:** detenga la aplicación de macOS (si supervisa el Gateway) o termine su proceso `openclaw gateway`.
2. **Cierre la exposición:** establezca `gateway.bind: "loopback"` (o deshabilite Tailscale Funnel/Serve) hasta que entienda qué sucedió.
3. **Congele el acceso:** cambie los DMs/grupos de riesgo a `dmPolicy: "disabled"` / exija menciones y elimine las entradas de permitir todo de `"*"` si las tenía.

### Rotar (asumir compromiso si se filtraron secretos)

1. Rote la autenticación del Gateway (`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`) y reinicie.
2. Rote los secretos del cliente remoto (`gateway.remote.token` / `.password`) en cualquier máquina que pueda llamar al Gateway.
3. Rote las credenciales del proveedor/API (credenciales de WhatsApp, tokens de Slack/Discord, claves de modelo/API en `auth-profiles.json` y valores de carga útil de secretos cifrados cuando se usen).

### Auditoría

1. Revisar los registros de Gateway: `/tmp/openclaw/openclaw-YYYY-MM-DD.log` (o `logging.file`).
2. Revisar la(s) transcripción(es) relevante(s): `~/.openclaw/agents/<agentId>/sessions/*.jsonl`.
3. Revisar los cambios recientes en la configuración (cualquier cosa que pudiera haber ampliado el acceso: `gateway.bind`, `gateway.auth`, políticas de dm/grupo, `tools.elevated`, cambios de complementos).
4. Volver a ejecutar `openclaw security audit --deep` y confirmar que los hallazgos críticos estén resueltos.

### Recopilar para un informe

- Marca de tiempo, sistema operativo host del gateway + versión de OpenClaw
- La(s) transcripción(es) de la sesión + un extracto corto del registro (después de redactar)
- Lo que envió el atacante + lo que hizo el agente
- Si el Gateway estaba expuesto más allá del loopback (LAN/Tailscale Funnel/Serve)

## Escaneo de secretos (detect-secrets)

La CI ejecuta el gancho de pre-commit `detect-secrets` en el trabajo `secrets`.
Las confirmaciones (pushes) a `main` siempre ejecutan un escaneo de todos los archivos. Las solicitudes de extracción (pull requests) usan una ruta rápida de archivos modificados cuando hay una confirmación base disponible y recurren a un escaneo de todos los archivos en caso contrario. Si falla, hay nuevos candidatos que aún no están en la línea base.

### Si falla la CI

1. Reproducir localmente:

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. Entender las herramientas:
   - `detect-secrets` en pre-commit ejecuta `detect-secrets-hook` con la línea base y las exclusiones del repositorio.
   - `detect-secrets audit` abre una revisión interactiva para marcar cada elemento de la línea base como real o falso positivo.
3. Para secretos reales: rótatelos/elimínalos y luego vuelve a ejecutar el escaneo para actualizar la línea base.
4. Para falsos positivos: ejecuta la auditoría interactiva y márcalos como falsos:

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. Si necesitas nuevas exclusiones, agrégalas a `.detect-secrets.cfg` y regenera la línea base con las banderas `--exclude-files` / `--exclude-lines` coincidentes (el archivo de configuración es solo de referencia; detect-secrets no lo lee automáticamente).

Confirma (commit) la `.secrets.baseline` actualizada una vez que refleje el estado deseado.

## Informar de problemas de seguridad

¿Encontraste una vulnerabilidad en OpenClaw? Por favor, infórmala de manera responsable:

1. Correo electrónico: [security@openclaw.ai](mailto:security@openclaw.ai)
2. No lo hagas público hasta que se solucione
3. Te daremos crédito (a menos que prefiras el anonimato)

import es from "/components/footer/es.mdx";

<es />
