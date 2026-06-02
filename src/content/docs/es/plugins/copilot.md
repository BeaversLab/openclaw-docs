---
summary: "Ejecutar turnos del agente integrado de OpenClaw a través del arnés externo del SDK de GitHub Copilot"
title: "Arnés del SDK de Copilot"
read_when:
  - You want to use the GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

El plugin externo `@openclaw/copilot` permite a OpenClaw ejecutar turnos del agente de suscripción integrado
Copilot a través de la CLI de GitHub Copilot (`@github/copilot-sdk`)
en lugar del arnés PI integrado.

Use el arnés del SDK de Copilot cuando desee que la sesión de la CLI de Copilot sea propietaria del
bucle de bajo nivel del agente: ejecución nativa de herramientas, compactación nativa
(`infiniteSessions`) y estado del hilo administrado por la CLI bajo `copilotHome`.
OpenClaw sigue siendo propietario de los canales de chat, archivos de sesión, selección de modelo, herramientas
dinámicas de OpenClaw (puenteadas), aprobaciones, entrega de medios, el espejo visible de
la transcripción, `/btw` preguntas secundarias (manejadas por la alternativa PI integrada — ver
[Preguntas secundarias (`/btw`)](#side-questions-btw)) y `openclaw doctor`.

Para la división más amplia de modelo/proveedor/runtime, comience con
[Tiempos de ejecución de agentes](/es/concepts/agent-runtimes).

## Requisitos

- OpenClaw con el plugin `@openclaw/copilot` instalado.
- Si su configuración usa `plugins.allow`, incluya `copilot` (el id de manifiesto
  declarado por el plugin). Una lista de permitidos
  restrictiva que use el nombre del paquete estilo npm `@openclaw/copilot`
  dejará el plugin bloqueado y el tiempo de ejecución no se cargará
  e incluso con `agentRuntime.id: "copilot"`.
- Una suscripción a GitHub Copilot que pueda ejecutar la CLI de Copilot (o una
  entrada de entorno/perfil de autenticación `gitHubToken` para ejecuciones sin cabeza/cron).
- Un directorio `copilotHome` con permisos de escritura. El arnés utiliza por defecto
  `~/.openclaw/agents/<agentId>/copilot` para un aislamiento completo por agente. El
  valor predeterminado de la plataforma (`%APPDATA%\copilot` en Windows, `$XDG_CONFIG_HOME/copilot`
  o `~/.config/copilot` en otros lugares) se usa como alternativa de la sonda del médico cuando
  no se establece un directorio principal explícito.

`openclaw doctor` ejecuta el contrato de
[doctor](#doctor-and-probes) para la extensión; los fallos allí son
la forma canónica de confirmar que el entorno está listo antes de optar
por un agente.

## Instalación del plugin

El tiempo de ejecución de Copilot es un complemento externo, por lo que el paquete principal `openclaw` no incluye la dependencia `@github/copilot-sdk` ni su binario `@github/copilot-<platform>-<arch>` específico de la plataforma CLI. Juntos añaden aproximadamente 260 MB, así que instálelos solo para los agentes que opten por este tiempo de ejecución:

```bash
openclaw plugins install @openclaw/copilot
```

El asistente instala el complemento la primera vez que selecciona un modelo `github-copilot/*` **y** su configuración opta por el modelo (o su proveedor) para el tiempo de ejecución del agente Copilot a través de `agentRuntime: { id: "copilot" }` (ver [Inicio rápido](#quickstart) a continuación). Sin la opción de participación, openclaw usa su proveedor integrado de GitHub Copilot y nunca instala el complemento de tiempo de ejecución.

El tiempo de ejecución resuelve el SDK en este orden:

1. `import("@github/copilot-sdk")` desde el paquete `@openclaw/copilot` instalado.
2. El directorio de reserva conocido `~/.openclaw/npm-runtime/copilot/` (el objetivo de instalación bajo demanda heredado).

Un SDK faltante muestra un solo error con el código `COPILOT_SDK_MISSING` y el comando de reinstalación del complemento anterior.

## Inicio rápido

Fije un modelo (o un proveedor) al arnés:

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

Ambas rutas son equivalentes. Use `agentRuntime.id` en una sola entrada de modelo cuando solo ese modelo deba enrutararse a través del arnés; establezca `agentRuntime.id` en un proveedor cuando cada modelo bajo ese proveedor deba usarlo.

## Proveedores compatibles

El arnés anuncia compatibilidad con el proveedor canónico `github-copilot` (el mismo id propiedad de `extensions/github-copilot`):

- `github-copilot`

Cualquier cosa fuera de ese conjunto pasa a través de la rama `auto_pi` de `selection.ts` de vuelta a PI.

## Autenticación

Precedencia por agente, aplicada durante `runCopilotAttempt`:

1. **`useLoggedInUser: true` explícito** en la entrada del intento. Usa el usuario iniciado en la CLI de Copilot resuelto bajo `copilotHome` del agente.
2. **`gitHubToken` explícito** en la entrada del intento (con `profileId` + `profileVersion`). Útil para invocaciones directas de CLI y pruebas donde el interlocutor desea omitir la resolución del perfil de autenticación.
3. **`resolvedApiKey` y `authProfileId` resueltos por contrato** desde la forma `EmbeddedRunAttemptParams`. Este es el **camino principal de producción**: el núcleo resuelve el perfil de autenticación `github-copilot` configurado del agente (vía `src/infra/provider-usage.auth.ts:resolveProviderAuths`) antes de invocar el arnés, y el arnés consume ambos campos directamente. Esto hace que un perfil de autenticación `github-copilot:<profile>` funcione de extremo a extremo para configuraciones sin interfaz / cron / multi-perfil sin variables de entorno.
4. **Alternativa de variable de entorno** para ejecuciones directas de CLI / pruebas internas donde no se configura ningún perfil de autenticación. El tiempo de ejecución verifica las siguientes variables en orden de precedencia, reflejando el proveedor `github-copilot` enviado (`extensions/github-copilot/auth.ts`) y la configuración documentada del Copilot SDK:
   1. `OPENCLAW_GITHUB_TOKEN` -- anulación específica del arnés; configure esto para fijar un token para el arnés de OpenClaw sin perturbar la configuración `gh` / Copilot CLI de todo el sistema.
   2. `COPILOT_GITHUB_TOKEN` -- variable de entorno estándar del Copilot SDK / CLI.
   3. `GH_TOKEN` -- variable de entorno estándar de la CLI `gh` (coincide con la precedencia del proveedor `github-copilot` existente).
   4. `GITHUB_TOKEN` -- alternativa genérica de token de GitHub.

   Gana el primer valor no vacío; las cadenas vacías se tratan como ausentes. El id del perfil de grupo sintetizado es `env:<NAME>` y el profileVersion es una huella digital sha256 no reversible del token, por lo que rotar el valor de la variable de entorno rompe limpiamente el grupo de clientes.

5. **`useLoggedInUser` predeterminado** cuando no hay ninguna señal de token disponible.

Cada agente obtiene un `copilotHome` dedicado para que los tokens, sesiones y configuraciones de Copilot CLI no se filtren entre agentes en la misma máquina. El valor predeterminado es `<agentDir>/copilot` cuando el host entrega al arnés un directorio de agente (aislando el estado del SDK del `models.json` / `auth-profiles.json` de OpenClaw en el mismo directorio), o `~/.openclaw/agents/<agentId>/copilot` de lo contrario. Anule con `copilotHome: <path>` en la entrada de intento cuando necesite una ubicación personalizada (por ejemplo, un montaje compartido para la migración).

`probeCopilotAuthShape` (consulte [Doctor and probes](#doctor-and-probes)) es la
comprobación de forma pura que valida cuál de los modos anteriores se utilizará.
No realiza un protocolo de enlace (handshake) en vivo del SDK.

## Superficie de configuración

El arnés lee su configuración desde la entrada por intento
(`runCopilotAttempt({...})`) además de un pequeño conjunto de valores predeterminados de entorno dentro
de `extensions/copilot/src/`:

- `copilotHome` — directorio de estado de CLI por agente (valores predeterminados documentados anteriormente).
- `model` — cadena o `{ provider, id, api? }`. Cuando se omite, OpenClaw utiliza
  la selección normal de modelos del agente y el arnés verifica que el proveedor
  resuelto esté en el conjunto compatible.
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`. Mapea desde
  la resolución `ThinkLevel` / `ReasoningLevel` de
  OpenClaw en `auto-reply/thinking.ts`.
- `infiniteSessionConfig` — anulación opcional para el bloque
  `infiniteSessions` del SDK impulsado por `harness.compact`. Es seguro dejar
  los valores predeterminados tal como están.
- `hooksConfig` — configuración de puente opcional que expone los enlaces (hooks) de
  escritura antes/después de mensaje de OpenClaw al bucle del SDK.
- `permissionPolicy` — anulación opcional para el controlador
  `onPermissionRequest` del SDK utilizado para tipos de herramientas integradas del SDK
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`). Por defecto
  es `rejectAllPolicy` como red de seguridad; en la práctica, el SDK nunca
  invoca ninguno de esos tipos porque cada herramienta de OpenClaw puenteada se
  registra con `overridesBuiltInTool: true` y
  `skipPermission: true`, por lo que el 100 % de las llamadas a herramientas fluyen a través de la
  `execute()` envuelta de OpenClaw. Consulte [Permissions and ask_user](#permissions-and-ask_user).
- `enableSessionTelemetry` — enrutamiento opcional de OpenTelemetry a través de
  `telemetry-bridge.ts`.

Nada en el resto de OpenClaw necesita conocer estos campos. Otros
complementos, canales y código central solo ven la forma estándar
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult`.

## Compactación

Cuando `harness.compact` se ejecuta, el arnés del SDK de Copilot:

1. Activa `infiniteSessions` en la sesión del SDK.
2. Permite que el SDK realice su compactación nativa.
3. Escribe un marcador con forma de OpenClaw en
   `workspacePath/files/openclaw-compaction-<ts>.json` para que los lectores de
   transcripciones de OpenClaw existentes todavía vean un artefacto familiar.

El espejo de transcripciones del lado de OpenClaw (ver abajo) continúa recibiendo los
mensajes posteriores a la compactación, por lo que el historial de chat orientado al usuario se mantiene consistente.

## Espejo de transcripciones

`runCopilotAttempt` realiza una doble escritura de los mensajes reflejables de cada turno en la
transcripción de auditoría de OpenClaw a través de
`extensions/copilot/src/dual-write-transcripts.ts`. El espejo está
catalogado por sesión (`copilot:${sessionId}`) y usa una identidad
por mensaje (`${role}:${sha256_16(role,content)}`) de modo que las reemisiones de entradas
de turnos anteriores colisionan con las claves existentes en disco y no se duplican.

El espejo está envuelto en dos capas de contención de fallos para que un fallo de
escritura en la transcripción no pueda hacer fallar el intento: un envoltorio interno de mejor esfuerzo y una
defensa en profundidad `.catch(...)` a nivel de intento. Los fallos se registran pero
no se muestran.

## Preguntas laterales (`/btw`)

`/btw` **no** es nativo en este arnés. `createCopilotAgentHarness()`
dejada deliberadamente `harness.runSideQuestion` sin definir, por lo que el despachador
`/btw` de OpenClaw (`src/agents/btw.ts`) recurre a la misma ruta de
reserva PI en árbol que usa para cada tiempo de ejecución que no sea Codex: el proveedor del modelo configurado se
llama directamente con un mensaje breve de pregunta lateral y se transmite de vuelta a través de
`streamSimple` (sin sesión CLI, sin ranura de grupo adicional).

Esto mantiene las sesiones de Copilot CLI reservadas para el bucle de turno principal del agente y
mantiene el comportamiento de `/btw` idéntico a otros tiempos de ejecución respaldados por PI. El contrato se
afirma en
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
bajo `describe("runSideQuestion")`.

## Doctor y sondas

`extensions/copilot/doctor-contract-api.ts` se carga automáticamente mediante
`src/plugins/doctor-contract-registry.ts`. Contribuye con:

- Un `legacyConfigRules` vacío (sin campos retirados en el MVP).
- Una operación nula `normalizeCompatibilityConfig` (se mantiene para que futuros retiros de campos
  tengan un lugar estable dentro del árbol).
- Una entrada `sessionRouteStateOwners` que reclama el proveedor `github-copilot`;
  runtime `copilot`; clave de sesión CLI `copilot`; prefijo de perfil
  de autenticación `github-copilot:`.

`extensions/copilot/src/doctor-probes.ts` exporta tres sondas imperativas
que los hosts (incluyendo `openclaw doctor`) pueden llamar para verificar el entorno:

| Sonda                      | Lo que verifica                                                                  | Razones por las que puede fallar                                                 |
| -------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` sale con 0 con una cadena de versión no vacía                | `non-zero-exit`, `empty-version`, `spawn-failed`, `spawn-error`, `probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + escritura + eliminación (rm) de un archivo marcador     | `copilothome-not-writable` (con el error fs subyacente en `details.rawError`)    |
| `probeCopilotAuthShape`    | Al menos uno de `useLoggedInUser`, `gitHubToken`, o `profileId`+`profileVersion` | `no-auth-source`                                                                 |

Cada sonda acepta un punto de inyección de dependencias (DI seam) (`spawnFn`, `fsApi`) para que las pruebas no generen el
Copilot CLI real ni toquen el fs del host.

## Limitaciones

- El harness solo reclama el proveedor canónico `github-copilot` en el MVP.
  Proveedores adicionales (BYOK u otros) deben incluirse en PRs posteriores que
  envíen el adaptador junto con la conexión.
- El harness no proporciona TUI; la TUI de PI no se ve afectada y sigue siendo
  la alternativa para aquellos runtimes que no tienen una superficie (surface) homóloga.
- El estado de la sesión de PI no se migra cuando un agente cambia a `copilot`.
  La selección es por intento; las sesiones PI existentes siguen siendo válidas.
- **Interactive `ask_user` aún no está conectado.** El controlador `onUserInputRequest` del SDK no se registra intencionalmente, lo que, según el contrato del SDK, oculta la herramienta `ask_user` del modelo por completo. Los agentes que se ejecutan bajo este arnés toman decisiones basadas en su mejor juicio a partir del mensaje inicial, en lugar de hacer preguntas de aclaración a mitad del turno. Una actualización posterior portará el patrón de códec en `extensions/codex/src/app-server/user-input-bridge.ts` para enrutar `UserInputRequest` del SDK a través de la ruta del mensaje del canal/TUI de OpenClaw; el andamio latente en `extensions/copilot/src/user-input-bridge.ts` es la superficie que dicha actualización conectará.

## Permisos y ask_user

La aplicación de permisos para las herramientas de OpenClaw puenteadas ocurre **dentro del contenedor de la herramienta**, no a través de la devolución de llamada `onPermissionRequest` del SDK. El mismo `wrapToolWithBeforeToolCallHook` que usa PI (`src/agents/pi-tools.before-tool-call.ts`) lo aplica `createOpenClawCodingTools` a cada herramienta de codificación: detección de bucles, políticas de complementos de confianza, enlaces previos a la llamada de la herramienta y aprobaciones de complementos en dos fases a través de la puerta de enlace (`plugin.approval.request`) todo se ejecuta con la misma ruta de código exacta que los intentos nativos de PI.

Para permitir que ese contenedor sea dueño de la decisión, la herramienta del SDK devuelta por `convertOpenClawToolToSdkTool` se marca con:

- `overridesBuiltInTool: true` — reemplaza la herramienta integrada del Copilot CLI del mismo nombre (edit, read, write, bash, …) para que cada invocación de herramienta se redirija de nuevo a OpenClaw.
- `skipPermission: true` — le indica al SDK que no dispare `onPermissionRequest({kind: "custom-tool"})` antes de invocar la herramienta. El `execute()` envuelto realiza la comprobación de política de OpenClaw más rica internamente; un mensaje a nivel del SDK cortocircuitaría la aplicación de OpenClaw (si permitimos todo) o bloquearía cada llamada a la herramienta (si rechazamos todo); ninguna de las dos coincide con la paridad de PI.

El arnés codex en árbol usa la misma división: las herramientas de OpenClaw puenteadas
están envueltas (`extensions/codex/src/app-server/dynamic-tools.ts`) y
los tipos de aprobación nativos _propios_ de codex-app-server
(`item/commandExecution/requestApproval`,
`item/fileChange/requestApproval`,
`item/permissions/requestApproval`) se enrutan a través de
`plugin.approval.request`
(`extensions/codex/src/app-server/approval-bridge.ts`). El equivalente del Copilot SDK
— `rejectAllPolicy` de cierre fallido para cualquier tipo que no sea `custom-tool`
que alguna vez llegue a `onPermissionRequest` — es la misma red de seguridad,
y no se activa en la práctica porque `overridesBuiltInTool: true`
desplaza cada función integrada.

Para que la capa de herramienta envuelta tome decisiones de política equivalentes a PI,
el arnés reenvía el contexto completo de intento de herramienta de PI a
`createOpenClawCodingTools` — identidad (`senderIsOwner`,
`memberRoleIds`, `ownerOnlyToolAllowlist`, …), canal/enrutamiento
(`groupId`, `currentChannelId`, `replyToMode`, alternancias de mensaje-herramienta),
autenticación (`authProfileStore`), identidad de ejecución
(`sessionKey`/`runSessionKey` derivada de `sandboxSessionKey`,
`runId`), contexto del modelo (`modelApi`, `modelContextWindowTokens`,
`modelCompat`, `modelHasVision`) y ganchos de ejecución (`onToolOutcome`,
`onYield`). Sin esos campos, las listas de permisos solo para propietarios se comportan silenciosamente
denegando por defecto, las políticas de confianza de complementos no pueden resolver al
alcance correcto y `session_status: "current"` se resuelve en una clave
de sandbox obsoleta. El constructor de puentes está en
`extensions/copilot/src/tool-bridge.ts` y refleja la llamada
autoritativa de PI en
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117`. Dos campos de PI
intencionalmente **no** se reenvían en el MVP y se rastrean como seguimientos:
`sandbox` (el arnés aún no enruta a través de `resolveSandboxContext`)
y la maquinaria de búsqueda de herramientas/código de modo PI
(`toolSearchCatalogRef`, `includeCoreTools`,
`includeToolSearchControls`, `toolSearchCatalogExecutor`,
`toolConstructionPlan`), que no tiene análogo en el límite del SDK.

### Token de GitHub a nivel de sesión

El contrato del SDK de Copilot distingue el token de GitHub de **nivel de cliente** (`CopilotClientOptions.gitHubToken`, utilizado para autenticar el proceso del CLI en sí) del token de **nivel de sesión** (`SessionConfig.gitHubToken`, que determina la exclusión de contenido, el enrutamiento del modelo y la cuota para esa sesión y se respeta tanto en `createSession` como en `resumeSession`). El harness resuelve la autenticación una vez a través de `resolveCopilotAuth` y establece ambos campos cuando el modo de autenticación es `gitHubToken` (un `auth.gitHubToken` explícito o un `resolvedApiKey` resuelto por el contrato desde un perfil de autenticación `github-copilot` configurado). Cuando el modo resuelto es `useLoggedInUser`, se omite el campo de nivel de sesión para que el SDK siga derivando la identidad de la identidad registrada.

`ask_user` se oculta intencionalmente; consulte las Limitaciones anteriores.

## Relacionado

- [Entornos de ejecución de agentes](/es/concepts/agent-runtimes)
- [Harness de Codex](/es/plugins/codex-harness)
- [Plugins de harness de agentes (referencia del SDK)](/es/plugins/sdk-agent-harness)
