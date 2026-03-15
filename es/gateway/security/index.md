---
summary: "Consideraciones de seguridad y modelo de amenazas para ejecutar una puerta de enlace de IA con acceso a shell"
read_when:
  - Adding features that widen access or automation
title: "Seguridad"
---

# Seguridad 🔒

> [!WARNING]
> **Modelo de confianza de asistente personal:** esta guía asume un límite de operador de confianza por puerta de enlace (modelo de usuario único/asistente personal).
> OpenClaw **no** es un límite de seguridad multiinquilino hostil para múltiples usuarios adversarios que comparten un agente/puerta de enlace.
> Si necesita una operación de confianza mixta o de usuario adversario, divida los límites de confianza (puerta de enlace + credenciales separadas, idealmente usuarios/hosts de SO separados).

## Alcance primero: modelo de seguridad de asistente personal

La guía de seguridad de OpenClaw asume un despliegue de **asistente personal**: un límite de operador de confianza, potencialmente muchos agentes.

- Postura de seguridad admitida: un usuario/límite de confianza por puerta de enlace (preferiblemente un usuario/host/VPS de SO por límite).
- Límite de seguridad no admitido: una puerta de enlace/agente compartido utilizado por usuarios mutuamente no confiables o adversarios.
- Si se requiere aislamiento de usuarios adversarios, divídalo por límite de confianza (puerta de enlace + credenciales separadas, e idealmente usuarios/hosts de SO separados).
- Si varios usuarios no confiables pueden enviar mensajes a un agente con herramientas habilitadas, trátelos como si compartieran la misma autoridad de herramienta delegada para ese agente.

Esta página explica el endurecimiento **dentro de ese modelo**. No reclama aislamiento multiinquilino hostil en una puerta de enlace compartida.

## Verificación rápida: `openclaw security audit`

Consulte también: [Verificación formal (Modelos de seguridad)](/es/security/formal-verification/)

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

- Si alguien puede modificar el estado/configuración del host Gateway (`~/.openclaw`, incluyendo `openclaw.json`), tráteselo como un operador de confianza.
- Ejecutar un Gateway para múltiples operadores mutuamente no confiables/adversarios **no es una configuración recomendada**.
- Para equipos de confianza mixta, separe los límites de confianza con gateways independientes (o como mínimo usuarios/hosts de SO independientes).
- OpenClaw puede ejecutar múltiples instancias de gateway en una máquina, pero las operaciones recomendadas favorecen una separación limpia de los límites de confianza.
- Predeterminado recomendado: un usuario por máquina/host (o VPS), un gateway para ese usuario, y uno o más agentes en ese gateway.
- Si varios usuarios quieren OpenClaw, use un VPS/host por usuario.

### Consecuencia práctica (límite de confianza del operador)

Dentro de una instancia de Gateway, el acceso de operador autenticado es un rol de plano de control de confianza, no un rol de inquilino por usuario.

- Los operadores con acceso de lectura/plano de control pueden inspeccionar los metadatos/historial de la sesión del gateway por diseño.
- Los identificadores de sesión (`sessionKey`, IDs de sesión, etiquetas) son selectores de enrutamiento, no tokens de autorización.
- Ejemplo: esperar aislamiento por operador para métodos como `sessions.list`, `sessions.preview` o `chat.history` está fuera de este modelo.
- Si necesita aislamiento de usuarios adversarios, ejecute gateways separados por cada límite de confianza.
- Múltiples gateways en una máquina son técnicamente posibles, pero no es la línea base recomendada para el aislamiento multiusuario.

## Modelo de asistente personal (no un bus multiinquilino)

OpenClaw está diseñado como un modelo de seguridad de asistente personal: un límite de operador de confianza, potencialmente muchos agentes.

- Si varias personas pueden enviar mensajes a un agente con herramientas habilitadas, cada una de ellas puede dirigir ese mismo conjunto de permisos.
- El aislamiento de sesión/memoria por usuario ayuda a la privacidad, pero no convierte un agente compartido en autorización de host por usuario.
- Si los usuarios pueden ser adversarios entre sí, ejecute gateways separados (o usuarios/hosts de SO separados) por cada límite de confianza.

### Espacio de trabajo de Slack compartido: un riesgo real

Si "todos en Slack pueden enviar mensajes al bot", el riesgo central es la autoridad de herramienta delegada:

- cualquier remitente permitido puede inducir llamadas a herramientas (`exec`, navegador, herramientas de red/archivo) dentro de la política del agente;
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

- **Gateway** es el plano de control y la superficie de política (`gateway.auth`, política de herramientas, enrutamiento).
- **Nodo** es la superficie de ejecución remota emparejada con ese Gateway (comandos, acciones de dispositivo, capacidades locales del host).
- Un interlocutor autenticado en el Gateway es confiable en el ámbito del Gateway. Después del emparejamiento, las acciones del nodo son acciones confiables del operador en ese nodo.
- `sessionKey` es selección de enrutamiento/contexto, no autenticación por usuario.
- Las aprobaciones de ejecución (lista blanca + preguntar) son salvaguardas para la intención del operador, no un aislamiento multiinquilino hostil.
- Las aprobaciones de ejecución vinculan el contexto exacto de la solicitud y operandos de archivos locales directos de mejor esfuerzo; no modelan semánticamente todas las rutas de carga del tiempo de ejecución/intérprete. Utilice sandboxing y aislamiento del host para límites sólidos.

Si necesita aislamiento de usuarios hostiles, separe los límites de confianza por usuario/host del sistema operativo y ejecute gateways separados.

## Matriz de límites de confianza

Utilice esto como el modelo rápido al clasificar los riesgos:

| Límite o control                                               | Lo que significa                                                 | Error común de interpretación                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `gateway.auth` (autenticación de token/contraseña/dispositivo) | Autentica a los interlocutores ante las API del gateway          | "Necesita firmas por mensaje en cada trama para ser seguro"                                                 |
| `sessionKey`                                                   | Clave de enrutamiento para la selección de contexto/sesión       | "La clave de sesión es un límite de autenticación de usuario"                                               |
| Barreras de aviso/contenido                                    | Reducir el riesgo de abuso del modelo                            | "La inyección de avisos por sí sola demuestra una omisión de autenticación"                                 |
| `canvas.eval` / evaluación del navegador                       | Capacidad intencional del operador cuando está habilitada        | "Cualquier primitiva de evaluación de JS es automáticamente una vulnerabilidad en este modelo de confianza" |
| Shell TUI local `!`                                            | Ejecución local activada explícitamente por el operador          | "El comando de conveniencia del shell local es una inyección remota"                                        |
| Emparejamiento de nodos y comandos de nodo                     | Ejecución remota a nivel de operador en dispositivos emparejados | "El control remoto del dispositivo debe tratarse como acceso de usuario no confiable por defecto"           |

## No son vulnerabilidades por diseño

Estos patrones se reportan comúnmente y generalmente se cierran sin acción a menos que se muestre una omisión real de un límite:

- Cadenas que solo implican inyección de avisos sin una omisión de política/autenticación/sandbox.
- Afirmaciones que asumen una operación multiinquilino hostil en un host/configuración compartida.
- Afirmaciones que clasifican el acceso normal de lectura del operador (por ejemplo `sessions.list`/`sessions.preview`/`chat.history`) como IDOR en una configuración de puerta de enlace compartida.
- Hallazgos de implementación solo en localhost (por ejemplo HSTS en puerta de enlace solo de loopback).
- Hallazgos de firma de webhook entrante de Discord para rutas entrantes que no existen en este repositorio.
- Hallazgos de "Autorización por usuario faltante" que tratan `sessionKey` como un token de autenticación.

## Lista de verificación previa para investigadores

Antes de abrir un GHSA, verifique todo lo siguiente:

1. La reproducción aún funciona en la última versión `main` o en el último lanzamiento.
2. El informe incluye la ruta exacta del código (`file`, función, rango de líneas) y la versión/commit probado.
3. El impacto cruza un límite de confianza documentado (no solo inyección de avisos).
4. La afirmación no aparece en [Fuera de alcance](https://github.com/openclaw/openclaw/blob/main/SECURITY.md#out-of-scope).
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
- Mantenga `dmPolicy: "pairing"` o listas de permisos estrictas.
- Nunca combine MD compartidos con acceso amplio a herramientas.
- Esto endurece las bandejas de entrada cooperativas/compartidas, pero no está diseñado como aislamiento de co-inquilinos hostiles cuando los usuarios comparten acceso de escritura al host/configuración.

### Lo que verifica la auditoría (nivel alto)

- **Acceso entrante** (políticas de MD, políticas de grupo, listas de permisos): ¿pueden extraños activar el bot?
- **Radio de explosión de herramientas** (herramientas elevadas + salas abiertas): ¿podría la inyección de prompts convertirse en acciones de shell/archivo/red?
- **Exposición de red** (enlace/autenticación de Gateway, Tailscale Serve/Funnel, tokens de autenticación débiles/cortos).
- **Exposición del control del navegador** (nodos remotos, puertos de retransmisión, endpoints CDP remotos).
- **Higiene del disco local** (permisos, enlaces simbólicos, inclusiones de configuración, rutas de "carpeta sincronizada").
- **Complementos** (existen extensiones sin una lista de permisos explícita).
- **Deriva/mala configuración de políticas** (configuración de docker de sandbox activa pero modo de sandbox desactivado; patrones `gateway.nodes.denyCommands` ineficaces porque la coincidencia es solo por nombre de comando exacto (por ejemplo `system.run`) y no inspecciona el texto del shell; entradas `gateway.nodes.allowCommands` peligrosas; `tools.profile="minimal"` global anulado por perfiles por agente; herramientas de complementos de extensión accesibles bajo política de herramientas permisiva).
- **Deriva de expectativas de tiempo de ejecución** (por ejemplo `tools.exec.host="sandbox"` mientras el modo de sandbox está desactivado, lo que se ejecuta directamente en el host Gateway).
- **Higiene del modelo** (avisa cuando los modelos configurados parecen heredados; no es un bloqueo estricto).

Si ejecuta `--deep`, OpenClaw también intenta un sondeo en vivo del Gateway con el mejor esfuerzo posible.

## Mapa de almacenamiento de credenciales

Úselo al auditar el acceso o decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token de bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos)
- **Token de bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permisos de emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelo**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Carga de secretos respaldada en archivo (opcional)**: `~/.openclaw/secrets.json`
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

Valores de `checkId` de alta señal que probablemente verá en implementaciones reales (no exhaustivo):

| `checkId`                                          | Gravedad            | Por qué importa                                                                                                                                    | Clave/ruta de corrección principal                                                                                                                     | Auto-corrección |
| -------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `fs.state_dir.perms_world_writable`                | crítica             | Otros usuarios/procesos pueden modificar el estado completo de OpenClaw                                                                            | permisos de sistema de archivos en `~/.openclaw`                                                                                                       | sí              |
| `fs.config.perms_writable`                         | crítica             | Otros pueden cambiar la política/configuración de autenticación/herramientas                                                                       | permisos de sistema de archivos en `~/.openclaw/openclaw.json`                                                                                         | sí              |
| `fs.config.perms_world_readable`                   | crítica             | La configuración puede exponer tokens/configuración                                                                                                | permisos de sistema de archivos en el archivo de configuración                                                                                         | sí              |
| `gateway.bind_no_auth`                             | crítica             | Vinculación remota sin secreto compartido                                                                                                          | `gateway.bind`, `gateway.auth.*`                                                                                                                       | no              |
| `gateway.loopback_no_auth`                         | crítica             | El bucle invertido con proxy inverso puede quedar sin autenticar                                                                                   | `gateway.auth.*`, configuración del proxy                                                                                                              | no              |
| `gateway.http.no_auth`                             | advertencia/crítica | APIs HTTP de puerta de enlace accesibles con `auth.mode="none"`                                                                                    | `gateway.auth.mode`, `gateway.http.endpoints.*`                                                                                                        | no              |
| `gateway.tools_invoke_http.dangerous_allow`        | advertencia/crítica | Reactiva herramientas peligrosas a través de la API HTTP                                                                                           | `gateway.tools.allow`                                                                                                                                  | no              |
| `gateway.nodes.allow_commands_dangerous`           | advertencia/crítica | Habilita comandos de nodo de alto impacto (cámara/pantalla/contactos/calendario/SMS)                                                               | `gateway.nodes.allowCommands`                                                                                                                          | no              |
| `gateway.tailscale_funnel`                         | crítico             | Exposición a Internet pública                                                                                                                      | `gateway.tailscale.mode`                                                                                                                               | no              |
| `gateway.control_ui.allowed_origins_required`      | crítico             | Interfaz de usuario de control no local sin lista de permitidos explícita de origen del navegador                                                  | `gateway.controlUi.allowedOrigins`                                                                                                                     | no              |
| `gateway.control_ui.host_header_origin_fallback`   | advertencia/crítico | Habilita la reserva de origen del encabezado Host (reducción del endurecimiento contra el rebind de DNS)                                           | `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`                                                                                           | no              |
| `gateway.control_ui.insecure_auth`                 | advertencia         | Activado el interruptor de compatibilidad de autenticación insegura                                                                                | `gateway.controlUi.allowInsecureAuth`                                                                                                                  | no              |
| `gateway.control_ui.device_auth_disabled`          | crítico             | Deshabilita la verificación de identidad del dispositivo                                                                                           | `gateway.controlUi.dangerouslyDisableDeviceAuth`                                                                                                       | no              |
| `gateway.real_ip_fallback_enabled`                 | advertencia/crítico | Confiar en la reserva `X-Real-IP` puede habilitar la suplantación de IP de origen a través de una configuración incorrecta del proxy               | `gateway.allowRealIpFallback`, `gateway.trustedProxies`                                                                                                | no              |
| `discovery.mdns_full_mode`                         | advertencia/crítico | El modo completo mDNS anuncia metadatos de `cliPath`/`sshPort` en la red local                                                                     | `discovery.mdns.mode`, `gateway.bind`                                                                                                                  | no              |
| `config.insecure_or_dangerous_flags`               | advertencia         | Cualquier indicador de depuración inseguro/peligroso habilitado                                                                                    | múltiples claves (ver detalle del hallazgo)                                                                                                            | no              |
| `hooks.token_too_short`                            | advertencia         | Fuerza bruta más fácil en el ingreso de hook                                                                                                       | `hooks.token`                                                                                                                                          | no              |
| `hooks.request_session_key_enabled`                | advertencia/crítico | El llamador externo puede elegir sessionKey                                                                                                        | `hooks.allowRequestSessionKey`                                                                                                                         | no              |
| `hooks.request_session_key_prefixes_missing`       | advertencia/crítico | Sin límite en las formas de clave de sesión externa                                                                                                | `hooks.allowedSessionKeyPrefixes`                                                                                                                      | no              |
| `logging.redact_off`                               | advertencia         | Fugas de valores confidenciales en los registros/estado                                                                                            | `logging.redactSensitive`                                                                                                                              | sí              |
| `sandbox.docker_config_mode_off`                   | advertencia         | Configuración de Sandbox Docker presente pero inactiva                                                                                             | `agents.*.sandbox.mode`                                                                                                                                | no              |
| `sandbox.dangerous_network_mode`                   | crítico             | La red Docker de Sandbox usa el modo de unión al espacio de nombres `host` o `container:*`                                                         | `agents.*.sandbox.docker.network`                                                                                                                      | no              |
| `tools.exec.host_sandbox_no_sandbox_defaults`      | advertencia         | `exec host=sandbox` se resuelve en ejecución del host cuando el sandbox está desactivado                                                           | `tools.exec.host`, `agents.defaults.sandbox.mode`                                                                                                      | no              |
| `tools.exec.host_sandbox_no_sandbox_agents`        | advertencia         | El `exec host=sandbox` por agente se resuelve en ejecución del host cuando el sandbox está desactivado                                             | `agents.list[].tools.exec.host`, `agents.list[].sandbox.mode`                                                                                          | no              |
| `tools.exec.safe_bins_interpreter_unprofiled`      | advertencia         | Los binarios de intérprete/ejecución en `safeBins` sin perfiles explícitos amplían el riesgo de ejecución                                          | `tools.exec.safeBins`, `tools.exec.safeBinProfiles`, `agents.list[].tools.exec.*`                                                                      | no              |
| `skills.workspace.symlink_escape`                  | advertencia         | El `skills/**/SKILL.md` del espacio de trabajo se resuelve fuera de la raíz del espacio de trabajo (desviación de la cadena de enlaces simbólicos) | estado del sistema de archivos del `skills/**` del espacio de trabajo                                                                                  | no              |
| `security.exposure.open_groups_with_elevated`      | crítico             | Grupos abiertos + herramientas elevadas crean rutas de inyección de avisos de alto impacto                                                         | `channels.*.groupPolicy`, `tools.elevated.*`                                                                                                           | no              |
| `security.exposure.open_groups_with_runtime_or_fs` | crítico/advertencia | Los grupos abiertos pueden alcanzar herramientas de comando/archivo sin guardas de sandbox/espacio de trabajo                                      | `channels.*.groupPolicy`, `tools.profile/deny`, `tools.fs.workspaceOnly`, `agents.*.sandbox.mode`                                                      | no              |
| `security.trust_model.multi_user_heuristic`        | advertencia         | La configuración parece multiusuario mientras que el modelo de confianza del gateway es de asistente personal                                      | dividir los límites de confianza o endurecimiento para usuarios compartidos (`sandbox.mode`, denegación de herramientas/ámbito del espacio de trabajo) | no              |
| `tools.profile_minimal_overridden`                 | advertencia         | Las anulaciones del agente omiten el perfil mínimo global                                                                                          | `agents.list[].tools.profile`                                                                                                                          | no              |
| `plugins.tools_reachable_permissive_policy`        | advertencia         | Herramientas de extensión accesibles en contextos permisivos                                                                                       | `tools.profile` + permitir/denegar herramientas                                                                                                        | no              |
| `models.small_params`                              | crítico/información | Modelos pequeños + superficies de herramientas inseguras aumentan el riesgo de inyección                                                           | elección del modelo + política de sandbox/herramientas                                                                                                 | no              |

## Interfaz de usuario de control a través de HTTP

La interfaz de usuario de control necesita un **contexto seguro** (HTTPS o localhost) para generar la identidad
del dispositivo. `gateway.controlUi.allowInsecureAuth` es un interruptor de compatibilidad local:

- En localhost, permite la autenticación de la Interfaz de Control sin identidad del dispositivo cuando la página
  se carga a través de HTTP no seguro.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad del dispositivo remoto (no localhost).

Se prefiere HTTPS (Tailscale Serve) o abrir la interfaz de usuario en `127.0.0.1`.

Solo para escenarios de emergencia, `gateway.controlUi.dangerouslyDisableDeviceAuth`
deshabilita por completo las comprobaciones de identidad del dispositivo. Esto es una degradación grave de la seguridad;
manténgalo desactivado a menos que esté depurando activamente y pueda revertirlo rápidamente.

`openclaw security audit` advierte cuando esta configuración está habilitada.

## Resumen de indicadores inseguros o peligrosos

`openclaw security audit` incluye `config.insecure_or_dangerous_flags` cuando
los interruptores de depuración inseguros/peligrosos conocidos están habilitados. Esa comprobación actualmente
agrupa:

- `gateway.controlUi.allowInsecureAuth=true`
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
- `hooks.gmail.allowUnsafeExternalContent=true`
- `hooks.mappings[<index>].allowUnsafeExternalContent=true`
- `tools.exec.applyPatch.workspaceOnly=false`

Claves de configuración completas `dangerous*` / `dangerously*` definidas en el esquema de configuración
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

## Configuración de Proxy Inverso

Si ejecuta el Gateway detrás de un proxy inverso (nginx, Caddy, Traefik, etc.), debe configurar `gateway.trustedProxies` para la detección adecuada de la IP del cliente.

Cuando el Gateway detecta encabezados de proxy de una dirección que **no** está en `trustedProxies`, **no** tratará las conexiones como clientes locales. Si la autenticación del gateway está deshabilitada, esas conexiones se rechazan. Esto evita la elusión de la autenticación donde las conexiones proxyadas de otro modo parecerían provenir de localhost y recibirían confianza automática.

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

Cuando se configura `trustedProxies`, el Gateway usa `X-Forwarded-For` para determinar la IP del cliente. `X-Real-IP` se ignora de manera predeterminada a menos que `gateway.allowRealIpFallback: true` se configure explícitamente.

Buen comportamiento de proxy inverso (sobrescribir encabezados de reenvío entrantes):

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

Mal comportamiento de proxy inverso (añadir/preservar encabezados de reenvío que no son de confianza):

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## Notas sobre HSTS y origen

- El gateway de OpenClaw es prioritario local/bucle. Si termina TLS en un proxy inverso, configure HSTS en el dominio HTTPS orientado al proxy allí.
- Si el propio gateway termina HTTPS, puede configurar `gateway.http.securityHeaders.strictTransportSecurity` para emitir el encabezado HSTS desde las respuestas de OpenClaw.
- La guía detallada de implementación se encuentra en [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth#tls-termination-and-hsts).
- Para las implementaciones de la interfaz de usuario de Control que no son de bucle, se requiere `gateway.controlUi.allowedOrigins` de manera predeterminada.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de respaldo de origen del encabezado Host; trátelo como una política peligrosa seleccionada por el operador.
- Trate la reasignación de DNS y el comportamiento del encabezado de host del proxy como preocupaciones de endurecimiento de la implementación; mantenga `trustedProxies` estricto y evite exponer el gateway directamente a la internet pública.

## Los registros de sesión locales residen en el disco

OpenClaw almacena las transcripciones de sesión en el disco bajo `~/.openclaw/agents/<agentId>/sessions/*.jsonl`.
Esto es necesario para la continuidad de la sesión y (opcionalmente) la indexación de memoria de sesión, pero también significa que
**cualquier proceso/usuario con acceso al sistema de archivos puede leer esos registros**. Trate el acceso al disco como el límite de
confianza y restrinja los permisos en `~/.openclaw` (vea la sección de auditoría a continuación). Si necesita
un aislamiento más fuerte entre agentes, ejecútelos bajo usuarios de sistema operativo separados o hosts separados.

## Ejecución de nodos (system.run)

Si se empareja un nodo macOS, el Gateway puede invocar `system.run` en ese nodo. Esto es **ejecución remota de código** en el Mac:

- Requiere emparejamiento de nodos (aprobación + token).
- Controlado en el Mac a través de **Ajustes → Aprobaciones de ejecución** (seguridad + pedir + lista blanca).
- El modo de aprobación vincula el contexto exacto de la solicitud y, cuando es posible, un operando concreto de script/archivo local. Si OpenClaw no puede identificar exactamente un archivo local directo para un comando de intérprete/runtime, la ejecución respaldada por aprobación se deniega en lugar de prometer una cobertura semántica completa.
- Si no desea la ejecución remota, configure la seguridad en **denegar** y elimine el emparejamiento del nodo para ese Mac.

## Habilidades dinámicas (watcher / nodos remotos)

OpenClaw puede actualizar la lista de habilidades a mitad de la sesión:

- **Watcher de habilidades**: los cambios en `SKILL.md` pueden actualizar la instantánea de habilidades en el siguiente turno del agente.
- **Nodos remotos**: conectar un nodo macOS puede hacer que las habilidades exclusivas de macOS sean elegibles (basado en sondeo de binarios).

Trate las carpetas de habilidades como **código confiable** y restrinja quién puede modificarlas.

## El Modelo de Amenazas

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

La mayoría de los fallos aquí no son exploits sofisticados — son “alguien le envió un mensaje al bot y el bot hizo lo que le pidieron”.

La postura de OpenClaw:

- **Primero la identidad:** decida quién puede hablar con el bot (emparejamiento de MD / listas blancas / “abierto” explícito).
- **Después el alcance:** decida dónde se permite que actúe el bot (listas blancas de grupos + filtrado de menciones, herramientas, sandboxing, permisos de dispositivos).
- **El modelo al final:** asuma que el modelo puede ser manipulado; diseñe para que la manipulación tenga un radio de impacto limitado.

## Modelo de autorización de comandos

Los comandos de barra y directivas solo se respetan para **remitentes autorizados**. La autorización se deriva de
las listas blancas/emparejamiento de canales más `commands.useAccessGroups` (ver [Configuración](/es/gateway/configuration)
y [Comandos de barra](/es/tools/slash-commands)). Si una lista blanca de canales está vacía o incluye `"*"`,
los comandos están efectivamente abiertos para ese canal.

`/exec` es una comodidad solo de sesión para operadores autorizados. **No** escribe configuración o
cambia otras sesiones.

## Riesgo de herramientas del plano de control

Dos herramientas integradas pueden realizar cambios persistentes en el plano de control:

- `gateway` puede llamar a `config.apply`, `config.patch` y `update.run`.
- `cron` puede crear trabajos programados que siguen ejecutándose después de que finalice el chat/tarea original.

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

Los complementos se ejecutan **en proceso** con la Gateway. Trátelos como código de confianza:

- Solo instale complementos de fuentes en las que confíe.
- Prefiera listas de permitidos explícitas de `plugins.allow`.
- Revise la configuración del complemento antes de habilitarlo.
- Reinicie la Gateway después de realizar cambios en los complementos.
- Si instala complementos desde npm (`openclaw plugins install <npm-spec>`), trátelo como ejecutar código que no es de confianza:
  - La ruta de instalación es `~/.openclaw/extensions/<pluginId>/` (o `$OPENCLAW_STATE_DIR/extensions/<pluginId>/`).
  - OpenClaw usa `npm pack` y luego ejecuta `npm install --omit=dev` en ese directorio (los scripts de ciclo de vida de npm pueden ejecutar código durante la instalación).
  - Prefiera versiones exactas ancladas (`@scope/pkg@1.2.3`) e inspeccione el código descomprimido en el disco antes de habilitar.

Detalles: [Complementos](/es/tools/plugin)

## Modelo de acceso por MD (emparejamiento / lista de permitidos / abierto / deshabilitado)

Todos los canales actuales con capacidad de MD admiten una política de MD (`dmPolicy` o `*.dm.policy`) que limita los MD entrantes **antes** de que se procese el mensaje:

- `pairing` (predeterminado): los remitentes desconocidos reciben un código corto de emparejamiento y el bot ignora su mensaje hasta que se aprueba. Los códigos caducan después de 1 hora; los MD repetidos no reenviarán un código hasta que se cree una nueva solicitud. Las solicitudes pendientes están limitadas a **3 por canal** de forma predeterminada.
- `allowlist`: los remitentes desconocidos están bloqueados (sin protocolo de enlace de emparejamiento).
- `open`: permite que cualquier persona envíe un MD (público). **Requiere** que la lista de permitidos del canal incluya `"*"` (opción explícita).
- `disabled`: ignora por completo los MD entrantes.

Aprobar mediante CLI:

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

Detalles + archivos en disco: [Emparejamiento](/es/channels/pairing)

## Aislamiento de sesión de DM (modo multiusuario)

De forma predeterminada, OpenClaw enruta **todos los MD a la sesión principal** para que su asistente tenga continuidad entre dispositivos y canales. Si **varias personas** pueden enviar MD al bot (MD abiertos o una lista de允许 de varias personas), considere aislar las sesiones de MD:

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

Esto evita la filtración de contexto entre usuarios mientras se mantienen aislados los chats grupales.

Este es un límite de contexto de mensajería, no un límite de administración del host. Si los usuarios son mutuamente adversarios y comparten el mismo host/configuración de Gateway, ejecute gateways separados por límite de confianza en su lugar.

### Modo de MD seguro (recomendado)

Trate el fragmento anterior como **modo de MD seguro**:

- Predeterminado: `session.dmScope: "main"` (todos los MD comparten una sesión para continuidad).
- Predeterminado de incorporación de CLI local: escribe `session.dmScope: "per-channel-peer"` cuando no está establecido (mantiene los valores explícitos existentes).
- Modo de MD seguro: `session.dmScope: "per-channel-peer"` (cada par de canal+remitente obtiene un contexto de MD aislado).

Si ejecuta varias cuentas en el mismo canal, use `per-account-channel-peer` en su lugar. Si la misma persona lo contacta en varios canales, use `session.identityLinks` para colapsar esas sesiones de MD en una identidad canónica. Consulte [Gestión de sesiones](/es/concepts/session) y [Configuración](/es/gateway/configuration).

## Listas de允许 (MD + grupos) — terminología

OpenClaw tiene dos capas separadas de "¿quién puede activarme?":

- **Lista de允许 de MD** (`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`; heredado: `channels.discord.dm.allowFrom`, `channels.slack.dm.allowFrom`): quién tiene permiso para hablar con el bot en mensajes directos.
  - Cuando `dmPolicy="pairing"`, las aprobaciones se escriben en el almacén de la lista de允许 de emparejamiento con ámbito de cuenta bajo `~/.openclaw/credentials/` (`<channel>-allowFrom.json` para la cuenta predeterminada, `<channel>-<accountId>-allowFrom.json` para cuentas no predeterminadas), fusionado con listas de允许 de configuración.
- **Lista de允许 de grupos** (específica del canal): de qué grupos/canales/gremios el bot aceptará mensajes en absoluto.
  - Patrones comunes:
    - `channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`: valores predeterminados por grupo como `requireMention`; cuando se establece, también actúa como una lista de permitidos del grupo (incluya `"*"` para mantener el comportamiento de permitir todo).
    - `groupPolicy="allowlist"` + `groupAllowFrom`: restringir quién puede activar el bot _dentro_ de una sesión de grupo (WhatsApp/Telegram/Signal/iMessage/Microsoft Teams).
    - `channels.discord.guilds` / `channels.slack.channels`: listas de permitidos por superficie + valores predeterminados de mención.
  - Las comprobaciones de grupo se ejecutan en este orden: listas de permitidas de `groupPolicy`/grupo primero, activación por mención/respuesta en segundo lugar.
  - Responder a un mensaje del bot (mención implícita) **no** omite las listas de permitidos del remitente como `groupAllowFrom`.
  - **Nota de seguridad:** trate `dmPolicy="open"` y `groupPolicy="open"` como configuraciones de último recurso. Deben usarse escasamente; prefiera el emparejamiento + listas de permitidos a menos que confíe plenamente en cada miembro de la sala.

Detalles: [Configuración](/es/gateway/configuration) y [Grupos](/es/channels/groups)

## Inyección de avisos (qué es, por qué importa)

La inyección de avisos ocurre cuando un atacante crea un mensaje que manipula el modelo para que haga algo inseguro (“ignora tus instrucciones”, “vuelca tu sistema de archivos”, “sigue este enlace y ejecuta comandos”, etc.).

Incluso con avisos del sistema fuertes, **la inyección de avisos no está resuelta**. Las salvaguardas de los avisos del sistema son solo una guía suave; la aplicación estricta proviene de la política de herramientas, las aprobaciones de ejecución, el sandboxing y las listas de permitidos de canales (y los operadores pueden desactivarlas por diseño). Lo que ayuda en la práctica:

- Mantenga los MD entrantes bloqueados (emparejamiento/listas de permitidos).
- Prefiera el filtrado por mención en grupos; evite bots “siempre activos” en salas públicas.
- Trate los enlaces, los archivos adjuntos y las instrucciones pegadas como hostiles de forma predeterminada.
- Ejecute la ejecución de herramientas sensibles en un entorno protegido (sandbox); mantenga los secretos fuera del sistema de archivos accesible del agente.
- Nota: el sandboxing es opcional. Si el modo sandbox está desactivado, la ejecución se ejecuta en el host de la puerta de enlace aunque tools.exec.host tenga como valor predeterminado sandbox, y la ejecución del host no requiere aprobaciones a menos que configure host=gateway y configure las aprobaciones de ejecución.
- Limit high-risk tools (`exec`, `browser`, `web_fetch`, `web_search`) to trusted agents or explicit allowlists.
- **Model choice matters:** older/smaller/legacy models are significantly less robust against prompt injection and tool misuse. For tool-enabled agents, use the strongest latest-generation, instruction-hardened model available.

Red flags to treat as untrusted:

- “Read this file/URL and do exactly what it says.”
- “Ignore your system prompt or safety rules.”
- “Reveal your hidden instructions or tool outputs.”
- “Paste the full contents of ~/.openclaw or your logs.”

## Unsafe external content bypass flags

OpenClaw includes explicit bypass flags that disable external-content safety wrapping:

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron payload field `allowUnsafeExternalContent`

Guidance:

- Keep these unset/false in production.
- Only enable temporarily for tightly scoped debugging.
- If enabled, isolate that agent (sandbox + minimal tools + dedicated session namespace).

Hooks risk note:

- Hook payloads are untrusted content, even when delivery comes from systems you control (mail/docs/web content can carry prompt injection).
- Weak model tiers increase this risk. For hook-driven automation, prefer strong modern model tiers and keep tool policy tight (`tools.profile: "messaging"` or stricter), plus sandboxing where possible.

### Prompt injection does not require public DMs

Even if **only you** can message the bot, prompt injection can still happen via
any **untrusted content** the bot reads (web search/fetch results, browser pages,
emails, docs, attachments, pasted logs/code). In other words: the sender is not
the only threat surface; the **content itself** can carry adversarial instructions.

When tools are enabled, the typical risk is exfiltrating context or triggering
tool calls. Reduce the blast radius by:

- Using a read-only or tool-disabled **reader agent** to summarize untrusted content,
  then pass the summary to your main agent.
- Keeping `web_search` / `web_fetch` / `browser` off for tool-enabled agents unless needed.
- Para entradas de URL de OpenResponses (`input_file` / `input_image`), configure `gateway.http.endpoints.responses.files.urlAllowlist` y
  `gateway.http.endpoints.responses.images.urlAllowlist` estrictos,
  y mantenga `maxUrlParts` bajo.
- Habilitar el sandboxing y listas de permitidos (allowlists) estrictas de herramientas para cualquier agente que toque entradas que no son de confianza.
- Mantener los secretos fuera de los mensajes; páselos a través de env/config en el host de la puerta de enlace en su lugar.

### Fortaleza del modelo (nota de seguridad)

La resistencia a la inyección de mensajes **no** es uniforme en todos los niveles de modelos. Los modelos más pequeños/baratos son generalmente más susceptibles al mal uso de herramientas y el secuestro de instrucciones, especialmente bajo mensajes adversariales.

<Warning>
  Para agentes con herramientas habilitadas o agentes que leen contenido que no es de confianza, el
  riesgo de inyección de mensajes con modelos más pequeños/antiguos a menudo es demasiado alto. No
  ejecute esas cargas de trabajo en niveles de modelo débiles.
</Warning>

Recomendaciones:

- **Use el modelo de mejor nivel y última generación** para cualquier bot que pueda ejecutar herramientas o tocar archivos/redes.
- **No use niveles más antiguos/débiles/pequeños** para agentes con herramientas habilitadas o bandejas de entrada que no son de confianza; el riesgo de inyección de mensajes es demasiado alto.
- Si debe usar un modelo más pequeño, **reduzca el radio de explosión** (herramientas de solo lectura, sandboxing fuerte, acceso mínimo al sistema de archivos, listas de permitidos estrictas).
- Al ejecutar modelos pequeños, **habilite el sandboxing para todas las sesiones** y **deshabilite web_search/web_fetch/browser** a menos que las entradas estén estrictamente controladas.
- Para asistentes personales de solo chat con entradas de confianza y sin herramientas, los modelos más pequeños generalmente están bien.

## Razonamiento y salida detallada en grupos

`/reasoning` y `/verbose` pueden exponer el razonamiento interno o la salida de herramientas que
no estaba destinado a un canal público. En entornos grupales, trátelos como **solo para depuración**
y manténgalos apagados a menos que los necesite explícitamente.

Orientación:

- Mantenga `/reasoning` y `/verbose` deshabilitados en salas públicas.
- Si los habilita, hágalo solo en MDs de confianza o salas estrictamente controladas.
- Recuerde: la salida detallada puede incluir argumentos de herramientas, URL y datos que el modelo vio.

## Endurecimiento de la configuración (ejemplos)

### 0) Permisos de archivo

Mantenga la configuración + el estado privados en el host de la puerta de enlace:

- `~/.openclaw/openclaw.json`: `600` (solo lectura/escritura del usuario)
- `~/.openclaw`: `700` (solo usuario)

`openclaw doctor` puede advertir y ofrecer ajustar estos permisos.

### 0.4) Exposición de red (bind + puerto + firewall)

El Gateway multiplexa **WebSocket + HTTP** en un solo puerto:

- Por defecto: `18789`
- Config/flags/env: `gateway.port`, `--port`, `OPENCLAW_GATEWAY_PORT`

Esta superficie HTTP incluye la Interfaz de Control (Control UI) y el host del lienzo (canvas host):

- Interfaz de Control (SPA assets) (ruta base predeterminada `/`)
- Host del lienzo (Canvas host): `/__openclaw__/canvas/` y `/__openclaw__/a2ui/` (HTML/JS arbitrario; trátelo como contenido no confiable)

Si carga contenido del lienzo en un navegador normal, trátelo como cualquier otra página web no confiable:

- No exponga el host del lienzo a redes o usuarios no confiables.
- No haga que el contenido del lienzo comparta el mismo origen que las superficies web con privilegios a menos que comprenda plenamente las implicaciones.

El modo de enlace (bind mode) controla dónde escucha el Gateway:

- `gateway.bind: "loopback"` (predeterminado): solo los clientes locales pueden conectarse.
- Los enlaces que no son de bucle de retorno (`"lan"`, `"tailnet"`, `"custom"`) amplían la superficie de ataque. Úselos solo con un token/contraseña compartido y un firewall real.

Reglas generales:

- Prefiera Tailscale Serve sobre los enlaces LAN (Serve mantiene el Gateway en bucle de retorno y Tailscale maneja el acceso).
- Si debe enlazar a la LAN, aplique reglas de firewall al puerto con una lista de permitidos (allowlist) estricta de IPs de origen; no lo reenvíe de manera amplia.
- Nunca exponga el Gateway sin autenticación en `0.0.0.0`.

### 0.4.1) Publicación de puertos Docker + UFW (`DOCKER-USER`)

Si ejecuta OpenClaw con Docker en un VPS, recuerde que los puertos de contenedor publicados
(`-p HOST:CONTAINER` o Compose `ports:`) se enrutan a través de las cadenas de reenvío
de Docker, no solo de las reglas `INPUT` del host.

Para mantener el tráfico de Docker alineado con tu política de firewall, aplica reglas en
`DOCKER-USER` (esta cadena se evalúa antes de las reglas de aceptación propias de Docker).
En muchas distribuciones modernas, `iptables`/`ip6tables` usan el frontend `iptables-nft`
y aún aplican estas reglas al backend nftables.

Ejemplo mínimo de lista blanca (IPv4):

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
el IPv6 de Docker está activado.

Evita codificar nombres de interfaz como `eth0` en los fragmentos de documentación. Los nombres de interfaz
varían entre las imágenes de VPS (`ens3`, `enp*`, etc.) y las discrepancias pueden omitir accidentalmente
tu regla de denegación.

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

El Gateway transmite su presencia a través de mDNS (`_openclaw-gw._tcp` en el puerto 5353) para el descubrimiento de dispositivos locales. En modo completo, esto incluye registros TXT que pueden exponer detalles operativos:

- `cliPath`: ruta completa del sistema de archivos al binario de la CLI (revela el nombre de usuario y la ubicación de instalación)
- `sshPort`: anuncia la disponibilidad de SSH en el host
- `displayName`, `lanHost`: información del nombre de host

**Consideración de seguridad operativa:** La transmisión de detalles de la infraestructura facilita el reconocimiento para cualquiera en la red local. Incluso la información "inofensiva" como las rutas del sistema de archivos y la disponibilidad de SSH ayuda a los atacantes a mapear tu entorno.

**Recomendaciones:**

1. **Modo mínimo** (predeterminado, recomendado para gateways expuestos): omite campos sensibles de las transmisiones mDNS:

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **Deshabilitar totalmente** si no necesitas el descubrimiento de dispositivos locales:

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

En modo mínimo, el Gateway aún transmite lo suficiente para el descubrimiento de dispositivos (`role`, `gatewayPort`, `transport`) pero omite `cliPath` y `sshPort`. Las aplicaciones que necesitan información de la ruta de la CLI pueden obtenerla a través de la conexión WebSocket autenticada.

### 0.5) Bloquear el WebSocket del Gateway (autenticación local)

La autenticación del Gateway es **requerida por defecto**. Si no se configura ningún token/contraseña,
el Gateway rechaza las conexiones WebSocket (fail‑closed).

El asistente de configuración genera un token por defecto (incluso para loopback) para que
los clientes locales deban autenticarse.

Establezca un token para que **todos** los clientes de WS deban autenticarse:

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor puede generar uno por usted: `openclaw doctor --generate-gateway-token`.

Nota: `gateway.remote.token` / `.password` son fuentes de credenciales de cliente. Por sí mismos,
**no** protegen el acceso local al WS.
Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*`
no está configurado.
Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente mediante
SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de alternativa remota).
Opcional: fijar el TLS remoto con `gateway.remote.tlsFingerprint` al usar `wss://`.
`ws://` en texto sin formato es solo para loopback por defecto. Para rutas de red privada
confiables, establezca `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el proceso del cliente como medida de emergencia.

Emparejamiento de dispositivo local:

- El emparejamiento del dispositivo se auto-aprueba para conexiones **locales** (loopback o la
  propia dirección de tailnet del host del gateway) para mantener a los clientes del mismo host fluidos.
- Otros pares de tailnet **no** se tratan como locales; aún necesitan aprobación
  de emparejamiento.

Modos de autenticación:

- `gateway.auth.mode: "token"`: token de portador compartido (recomendado para la mayoría de configuraciones).
- `gateway.auth.mode: "password"`: autenticación por contraseña (preferir configurar mediante env: `OPENCLAW_GATEWAY_PASSWORD`).
- `gateway.auth.mode: "trusted-proxy"`: confiar en un proxy inverso con reconocimiento de identidad para autenticar usuarios y pasar la identidad a través de encabezados (ver [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)).

Lista de verificación de rotación (token/contraseña):

1. Genera/establece un nuevo secreto (`gateway.auth.token` o `OPENCLAW_GATEWAY_PASSWORD`).
2. Reinicia el Gateway (o reinicia la aplicación de macOS si supervisa el Gateway).
3. Actualiza cualquier cliente remoto (`gateway.remote.token` / `.password` en las máquinas que llaman al Gateway).
4. Verifica que ya no puedes conectarte con las credenciales antiguas.

### 0.6) Encabezados de identidad de Tailscale Serve

Cuando `gateway.auth.allowTailscale` es `true` (predeterminado para Serve), OpenClaw
acepta encabezados de identidad de Tailscale Serve (`tailscale-user-login`) para la autenticación
de Control UI/WebSocket. OpenClaw verifica la identidad resolviendo la
dirección `x-forwarded-for` a través del demonio local de Tailscale (`tailscale whois`)
y coincidiéndola con el encabezado. Esto solo se activa para solicitudes que golpean el loopback
e incluyen `x-forwarded-for`, `x-forwarded-proto` y `x-forwarded-host` como
inyectados por Tailscale.
Los endpoints de la API HTTP (por ejemplo `/v1/*`, `/tools/invoke` y `/api/channels/*`)
aún requieren autenticación por token/contraseña.

Nota importante sobre el límite:

- La autenticación HTTP bearer del Gateway es efectivamente acceso de operador de todo o nada.
- Trata las credenciales que pueden llamar a `/v1/chat/completions`, `/v1/responses`, `/tools/invoke` o `/api/channels/*` como secretos de operador de acceso completo para ese gateway.
- No compartas estas credenciales con llamadores no confiables; prefiere gateways separados por límite de confianza.

**Supuesto de confianza:** la autenticación Serve sin token asume que el host del gateway es confiable.
No trates esto como protección contra procesos hostiles en el mismo host. Si código local
no confiable puede ejecutarse en el host del gateway, deshabilita `gateway.auth.allowTailscale`
y exige autenticación por token/contraseña.

**Regla de seguridad:** no reenvíes estos encabezados desde tu propio proxy inverso. Si
terminas TLS o haces de proxy frente al gateway, deshabilita
`gateway.auth.allowTailscale` y usa autenticación por token/contraseña (o [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)) en su lugar.

Proxies confiables:

- Si finaliza TLS frente a la Gateway, configure `gateway.trustedProxies` con sus IPs de proxy.
- OpenClaw confiará en `x-forwarded-for` (o `x-real-ip`) de esas IPs para determinar la IP del cliente para verificaciones de emparejamiento local y verificaciones de autenticación HTTP/local.
- Asegúrese de que su proxy **sobrescriba** `x-forwarded-for` y bloquee el acceso directo al puerto de la Gateway.

Consulte [Tailscale](/es/gateway/tailscale) y [Resumen web](/es/web).

### 0.6.1) Control del navegador a través del host del nodo (recomendado)

Si su Gateway es remota pero el navegador se ejecuta en otra máquina, ejecute un **node host**
en la máquina del navegador y permita que la Gateway realice un proxy de las acciones del navegador (consulte [Herramienta de navegador](/es/tools/browser)).
Trate el emparejamiento de nodos como el acceso de administrador.

Patrón recomendado:

- Mantenga la Gateway y el host del nodo en la misma tailnet (Tailscale).
- Empareje el nodo intencionalmente; desactive el enrutamiento del proxy del navegador si no lo necesita.

Evite:

- Exponer puertos de retransmisión/control a través de la LAN o Internet público.
- Tailscale Funnel para puntos finales de control del navegador (exposición pública).

### 0.7) Secretos en el disco (qué es sensible)

Suponga que cualquier cosa en `~/.openclaw/` (o `$OPENCLAW_STATE_DIR/`) puede contener secretos o datos privados:

- `openclaw.json`: la configuración puede incluir tokens (gateway, gateway remota), configuraciones del proveedor y listas de permitidos.
- `credentials/**`: credenciales del canal (ejemplo: credenciales de WhatsApp), listas de permitidos de emparejamiento, importaciones heredadas de OAuth.
- `agents/<agentId>/agent/auth-profiles.json`: claves de API, perfiles de tokens, tokens de OAuth y `keyRef`/`tokenRef` opcionales.
- `secrets.json` (opcional): carga útil secreta respaldada en archivo utilizada por proveedores `file` SecretRef (`secrets.providers`).
- `agents/<agentId>/agent/auth.json`: archivo de compatibilidad heredada. Las entradas `api_key` estáticas se depuran cuando se descubren.
- `agents/<agentId>/sessions/**`: transcripciones de sesión (`*.jsonl`) + metadatos de enrutamiento (`sessions.json`) que pueden contener mensajes privados y resultados de herramientas.
- `extensions/**`: complementos instalados (además de sus `node_modules/`).
- `sandboxes/**`: espacios de trabajo de la caja de herramientas (sandbox) de las herramientas; pueden acumular copias de los archivos que lees/escribes dentro de la caja de herramientas.

Consejos de endurecimiento:

- Mantenga los permisos restringidos (`700` en directorios, `600` en archivos).
- Utilice el cifrado de disco completo en el host de la puerta de enlace.
- Prefiera una cuenta de usuario de sistema operativo dedicada para la puerta de enlace si el host es compartido.

### 0.8) Registros + transcripciones (redacción + retención)

Los registros y las transcripciones pueden filtrar información confidencial incluso cuando los controles de acceso son correctos:

- Los registros de la puerta de enlace pueden incluir resúmenes de herramientas, errores y URL.
- Las transcripciones de sesión pueden incluir secretos pegados, contenidos de archivos, resultados de comandos y enlaces.

Recomendaciones:

- Mantenga la redacción del resumen de herramientas activada (`logging.redactSensitive: "tools"`; predeterminado).
- Añada patrones personalizados para su entorno a través de `logging.redactPatterns` (tokens, nombres de host, URL internas).
- Al compartir diagnósticos, prefiera `openclaw status --all` (pegable, secretos redactados) sobre los registros brutos.
- Pode las transcripciones de sesión y los archivos de registro antiguos si no necesita una retención prolongada.

Detalles: [Registro] (/en/gateway/logging)

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

En los chats grupales, responda solo cuando se lo mencionen explícitamente.

### 3. Números separados

Considere ejecutar su IA en un número de teléfono separado del suyo personal:

- Número personal: Sus conversaciones permanecen privadas
- Número de bot: La IA maneja estos, con los límites apropiados

### 4. Modo de solo lectura (Hoy, a través de sandbox + herramientas)

Ya puede crear un perfil de solo lectura combinando:

- `agents.defaults.sandbox.workspaceAccess: "ro"` (o `"none"` para sin acceso al espacio de trabajo)
- listas de permitir/denegar herramientas que bloqueen `write`, `edit`, `apply_patch`, `exec`, `process`, etc.

Es posible que agreguemos más tarde una única marca `readOnlyMode` para simplificar esta configuración.

Opciones adicionales de endurecimiento:

- `tools.exec.applyPatch.workspaceOnly: true` (predeterminado): garantiza que `apply_patch` no pueda escribir/eliminar fuera del directorio del espacio de trabajo incluso cuando el sandboxing está desactivado. Establézcalo en `false` solo si desea intencionalmente que `apply_patch` toque archivos fuera del espacio de trabajo.
- `tools.fs.workspaceOnly: true` (opcional): restringe las rutas `read`/`write`/`edit`/`apply_patch` y las rutas de carga automática de imágenes de avisos nativos al directorio del espacio de trabajo (útil si permite rutas absolutas hoy y desea una sola barrera de seguridad).
- Mantenga las raíces del sistema de archivos estrechas: evite raíces amplias como su directorio de inicio para espacios de trabajo de agente/espacios de trabajo de sandbox. Las raíces amplias pueden exponer archivos locales sensibles (por ejemplo, estado/configuración bajo `~/.openclaw`) a las herramientas del sistema de archivos.

### 5) Línea de base segura (copiar/pegar)

Una configuración de “valor predeterminado seguro” que mantiene la puerta de enlace privada, requiere el emparejamiento por mensaje directo y evita los bots de grupo siempre activos:

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

Línea de base integrada para turnos de agente impulsados por chat: los remitentes que no son el propietario no pueden usar las herramientas `cron` o `gateway`.

## Sandboxing (recomendado)

Documentación dedicada: [Sandboxing](/es/gateway/sandboxing)

Dos enfoques complementarios:

- **Ejecutar la puerta de enlace completa en Docker** (límite del contenedor): [Docker](/es/install/docker)
- **Herramienta de sandbox** (`agents.defaults.sandbox`, puerta de enlace host + herramientas aisladas de Docker): [Sandboxing](/es/gateway/sandboxing)

Nota: para evitar el acceso entre agentes, mantenga `agents.defaults.sandbox.scope` en `"agent"` (predeterminado)
o `"session"` para un aislamiento por sesión más estricto. `scope: "shared"` usa un
único contenedor/espacio de trabajo.

Considere también el acceso al espacio de trabajo del agente dentro del sandbox:

- `agents.defaults.sandbox.workspaceAccess: "none"` (predeterminado) mantiene el espacio de trabajo del agente fuera de límites; las herramientas se ejecutan contra un espacio de trabajo de sandbox bajo `~/.openclaw/sandboxes`
- `agents.defaults.sandbox.workspaceAccess: "ro"` monta el espacio de trabajo del agente en modo de solo lectura en `/agent` (deshabilita `write`/`edit`/`apply_patch`)
- `agents.defaults.sandbox.workspaceAccess: "rw"` monta el espacio de trabajo del agente en modo lectura/escritura en `/workspace`

Importante: `tools.elevated` es el mecanismo de escape de línea base global que ejecuta exec en el host. Mantenga `tools.elevated.allowFrom` restringido y no lo habilite para desconocidos. Puede restringir aún más el modo elevado por agente mediante `agents.list[].tools.elevated`. Consulte [Modo elevado](/es/tools/elevated).

### Valla de seguridad de delegación de subagentes

Si permite herramientas de sesión, trate las ejecuciones de subagentes delegados como otra decisión de límite:

- Deniegue `sessions_spawn` a menos que el agente realmente necesite delegación.
- Mantenga `agents.list[].subagents.allowAgents` restringido a agentes de destino conocidos como seguros.
- Para cualquier flujo de trabajo que deba permanecer en sandbox, llame a `sessions_spawn` con `sandbox: "require"` (el valor predeterminado es `inherit`).
- `sandbox: "require"` falla rápidamente cuando el tiempo de ejecución del hijo de destino no está en sandbox.

## Riesgos del control del navegador

Habilitar el control del navegador le da al modelo la capacidad de conducir un navegador real.
Si ese perfil de navegador ya contiene sesiones iniciadas, el modelo puede
acceder a esas cuentas y datos. Trate los perfiles del navegador como **estado confidencial**:

- Prefiera un perfil dedicado para el agente (el perfil predeterminado `openclaw`).
- Evite apuntar el agente a su perfil personal de uso diario.
- Mantenga el control del navegador del host deshabilitado para los agentes en sandbox a menos que confíe en ellos.
- Trate las descargas del navegador como entrada que no es de confianza; prefiera un directorio de descargas aislado.
- Deshabilite la sincronización del navegador/gestores de contraseñas en el perfil del agente si es posible (reduce el radio de explosión).
- Para puertas de enlace remotas, asuma que el "control del navegador" es equivalente al "acceso del operador" a todo lo que ese perfil puede alcanzar.
- Mantenga los hosts de la puerta de enlace y de los nodos solo en tailnet; evite exponer los puertos de retransmisión/control a la LAN o a Internet pública.
- El punto final CDP del relé de la extensión de Chrome está protegido por autenticación; solo los clientes de OpenClaw pueden conectarse.
- Deshabilite el enrutamiento del proxy del navegador cuando no lo necesite (`gateway.nodes.browser.mode="off"`).
- El modo de retransmisión de la extensión de Chrome **no** es «más seguro»; puede tomar el control de sus pestañas existentes de Chrome. Asuma que puede actuar como usted en cualquier lugar al que esa pestaña/perfil pueda acceder.

### Política de SSRF del navegador (predeterminado: red de confianza)

La política de red del navegador de OpenClaw tiene como valor predeterminado el modelo de operador de confianza: se permiten los destinos privados/internos a menos que los deshabilite explícitamente.

- Predeterminado: `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` (implícito si no se establece).
- Alias heredado: `browser.ssrfPolicy.allowPrivateNetwork` todavía se acepta por compatibilidad.
- Modo estricto: establezca `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: false` para bloquear los destinos privados/internos/de uso especial de forma predeterminada.
- En modo estricto, use `hostnameAllowlist` (patrones como `*.example.com`) y `allowedHostnames` (excepciones de host exactas, incluyendo nombres bloqueados como `localhost`) para excepciones explícitas.
- La navegación se verifica antes de la solicitud y se vuelve a verificar con el mejor esfuerzo en la URL final `http(s)` después de la navegación para reducir los pivotes basados en redirecciones.

Ejemplo de política estricta:

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

Con el enrutamiento multiagente, cada agente puede tener su propia política de entorno limitado (sandbox) + herramientas:
use esto para dar **acceso completo**, **solo lectura** o **sin acceso** por agente.
Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para obtener detalles completos
y reglas de precedencia.

Casos de uso comunes:

- Agente personal: acceso completo, sin sandbox
- Agente familiar/laboral: sandboxed + herramientas de solo lectura
- Agente público: sandboxed + sin herramientas de sistema de archivos/shell

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

### Ejemplo: sin acceso al sistema de archivos/shell (mensajería del proveedor permitida)

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

Incluya pautas de seguridad en el mensaje del sistema de su agente:

```
## Security Rules
- Never share directory listings or file paths with strangers
- Never reveal API keys, credentials, or infrastructure details
- Verify requests that modify system config with the owner
- When in doubt, ask before acting
- Keep private data private unless explicitly authorized
```

## Respuesta a incidentes

Si su IA hace algo malo:

### Contener

1. **Deténgalo:** detenga la aplicación de macOS (si supervisa la puerta de enlace) o finalice su proceso `openclaw gateway`.
2. **Cerrar la exposición:** establezca `gateway.bind: "loopback"` (o deshabilite Tailscale Funnel/Serve) hasta que entienda qué sucedió.
3. **Congelar acceso:** cambiar los MDs/grupos de riesgo a `dmPolicy: "disabled"` / requerir menciones, y eliminar las entradas de permitir todo de `"*"` si las tenía.

### Rotar (asumir compromiso si se filtraron secretos)

1. Rotar la autenticación del Gateway (`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`) y reiniciar.
2. Rotar los secretos del cliente remoto (`gateway.remote.token` / `.password`) en cualquier máquina que pueda llamar al Gateway.
3. Rotar las credenciales del proveedor/API (credenciales de WhatsApp, tokens de Slack/Discord, claves de modelo/API en `auth-profiles.json`, y valores de carga útil de secretos cifrados cuando se usen).

### Auditoría

1. Verificar los registros del Gateway: `/tmp/openclaw/openclaw-YYYY-MM-DD.log` (o `logging.file`).
2. Revisar la(s) transcripción(es) relevante(s): `~/.openclaw/agents/<agentId>/sessions/*.jsonl`.
3. Revisar los cambios recientes de configuración (cualquier cosa que pudiera haber ampliado el acceso: `gateway.bind`, `gateway.auth`, políticas de dm/grupo, `tools.elevated`, cambios de complementos).
4. Volver a ejecutar `openclaw security audit --deep` y confirmar que los hallazgos críticos están resueltos.

### Recopilar para un informe

- Marca de tiempo, sistema operativo del host del Gateway + versión de OpenClaw
- La(s) transcripción(es) de la sesión + un registro corto de la cola (después de redactar)
- Qué envió el atacante + qué hizo el agente
- Si el Gateway estaba expuesto más allá del loopback (LAN/Tailscale Funnel/Serve)

## Escaneo de secretos (detect-secrets)

La CI ejecuta el gancho de pre-commit `detect-secrets` en el trabajo `secrets`.
Los envíos a `main` siempre ejecutan un escaneo de todos los archivos. Las solicitudes de extracción utilizan una ruta rápida de archivos modificados
cuando hay una confirmación base disponible y recurren a un escaneo de todos los archivos
en caso contrario. Si falla, hay nuevos candidatos que aún no están en la línea base.

### Si falla la CI

1. Reproducir localmente:

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. Entender las herramientas:
   - `detect-secrets` en pre-commit ejecuta `detect-secrets-hook` con la línea base
     y exclusiones del repositorio.
   - `detect-secrets audit` abre una revisión interactiva para marcar cada elemento de la línea base
     como real o falso positivo.
3. Para secretos reales: rótelos/elimínelos y luego vuelva a ejecutar el escaneo para actualizar la línea base.
4. Para falsos positivos: ejecute la auditoría interactiva márquelos como falsos:

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. Si necesita nuevas exclusiones, agréguelas a `.detect-secrets.cfg` y regenere la línea base con los indicadores `--exclude-files` / `--exclude-lines` coincidentes (el archivo de configuración es solo de referencia; detect-secrets no lo lee automáticamente).

Confirme el `.secrets.baseline` actualizado una vez que refleje el estado previsto.

## Reportar problemas de seguridad

¿Encontró una vulnerabilidad en OpenClaw? Por favor, repórtela de manera responsable:

1. Correo electrónico: [security@openclaw.ai](mailto:security@openclaw.ai)
2. No lo publique públicamente hasta que se solucione
3. Le daremos crédito (a menos que prefiera el anonimato)

import es from "/components/footer/es.mdx";

<es />
