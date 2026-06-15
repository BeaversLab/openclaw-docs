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

Use el arnés del SDK de Copilot cuando desee que la sesión de Copilot CLI sea dueña del
bucle de agente de bajo nivel: ejecución nativa de herramientas, compactación nativa
(`infiniteSessions`) y estado del hilo administrado por CLI bajo `copilotHome`.
OpenClaw sigue siendo dueño de los canales de chat, archivos de sesión, selección de modelo, herramientas
dinámicas de OpenClaw (puenteadas), aprobaciones, entrega de medios, el espejo de transcripción
visible, `/btw` preguntas secundarias (manejadas por la reserva PI en el árbol — ver
[Side questions (`/btw`)](#side-questions-btw)), y `openclaw doctor`.

Para la división más amplia de modelo/proveedor/runtime, comience con
[Agent runtimes](/es/concepts/agent-runtimes).

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

`openclaw doctor` ejecuta el contrato doctor
[doctor contract](#doctor-and-probes) para la extensión; los fallos allí son
la forma canónica de confirmar que el entorno está listo antes de optar por un agente.

## Instalación del plugin

El tiempo de ejecución de Copilot es un complemento externo, por lo que el paquete principal `openclaw` no incluye la dependencia `@github/copilot-sdk` ni su binario `@github/copilot-<platform>-<arch>` específico de la plataforma CLI. Juntos añaden aproximadamente 260 MB, así que instálelos solo para los agentes que opten por este tiempo de ejecución:

```bash
openclaw plugins install @openclaw/copilot
```

El asistente instala el complemento la primera vez que selecciona un
modelo `github-copilot/*` **y** su configuración opta por el modelo (o su
proveedor) en el runtime del agente Copilot a través de
`agentRuntime: { id: "copilot" }` (ver [Quickstart](#quickstart) a continuación).
Sin la opción, openclaw usa su proveedor integrado de GitHub Copilot
y nunca instala el complemento de runtime.

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

`probeCopilotAuthShape` (ver [Doctor and probes](#doctor-and-probes)) es la
verificación de forma pura que valida cuál de los modos anteriores se utilizará.
No realiza un handshake en vivo del SDK.

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
  es `rejectAllPolicy` como medida de seguridad; en la práctica, el SDK nunca
  invoca ninguno de esos tipos porque cada herramienta OpenClaw puenteada
  se registra con `overridesBuiltInTool: true` y
  `skipPermission: true`, por lo que el 100% de las llamadas a herramientas fluyen a través del
  `execute()` envuelto por OpenClaw. Consulte [Permissions and ask_user](#permissions-and-ask_user).
- `enableSessionTelemetry` — enrutamiento opcional de OpenTelemetry a través de
  `telemetry-bridge.ts`.

Nada en el resto de OpenClaw necesita conocer estos campos. Otros
complementos, canales y código central solo ven la forma estándar
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult`.

## Compactación

Cuando `harness.compact` se ejecuta, el arnés del SDK de Copilot:

1. Reanuda la sesión del SDK rastreada sin continuar con el trabajo pendiente.
2. Llama a la RPC de compactación del historial con ámbito de sesión del SDK.
3. Devuelve el resultado de la compactación del SDK sin escribir archivos de marcador
   de compatibilidad en el espacio de trabajo.

El espejo de transcripciones del lado de OpenClaw (ver abajo) continúa recibiendo los
mensajes posteriores a la compactación, por lo que el historial de chat orientado al usuario se mantiene consistente.

## Espejo de transcripciones

`runCopilotAttempt` realiza escrituras dobles de los mensajes reflejables de cada turno en la
transcripción de auditoría de OpenClaw a través de
`extensions/copilot/src/dual-write-transcripts.ts`. El reflejo tiene
alcance por sesión (`copilot:${sessionId}`) y utiliza una identidad
por mensaje (`${role}:${sha256_16(role,content)}`), por lo que las reemisiones de entradas
de turnos anteriores colisionan con las claves en disco existentes y no se duplican.

El reflejo está envuelto en dos capas de contención de fallos, de modo que un fallo de
escritura en la transcripción no puede fallar el intento: un envoltorio interno de mejor esfuerzo y una
profundidad defensiva `.catch(...)` a nivel de intento. Los fallos se registran pero
no se muestran.

## Preguntas secundarias (`/btw`)

`/btw` **no** es nativo en este arnés. `createCopilotAgentHarness()`
deja deliberadamente `harness.runSideQuestion` sin definir, por lo que el despachador
`/btw` de OpenClaw (`src/agents/btw.ts`) recurre a la misma ruta de
alternativa PI integrada que utiliza para cada entorno de ejecución que no sea Codex: el proveedor
de modelos configurado se llama directamente con un mensaje de pregunta secundaria breve y se
devuelve mediante transmisión a través de `streamSimple` (sin sesión de CLI, sin ranura adicional de agrupación).

Esto mantiene las sesiones de Copilot CLI reservadas para el bucle principal del agente y
mantiene el comportamiento de `/btw` idéntico a otros runtimes respaldados por PI. El contrato se
afirma en
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
bajo `describe("runSideQuestion")`.

## Doctor y sondas

`extensions/copilot/doctor-contract-api.ts` se carga automáticamente mediante
`src/plugins/doctor-contract-registry.ts`. Contribuye:

- Un `legacyConfigRules` vacío (sin campos retirados en el MVP).
- Una operación nula `normalizeCompatibilityConfig` (se mantiene para que futuros retiros de campos
  tengan un hogar estable en el árbol).
- Una entrada `sessionRouteStateOwners` que reclama el proveedor `github-copilot`;
  runtime `copilot`; clave de sesión CLI `copilot`; prefijo de perfil de
  autenticación `github-copilot:`.

`extensions/copilot/src/doctor-probes.ts` exporta tres sondas imperativas
que los hosts (incluyendo `openclaw doctor`) pueden llamar para verificar el entorno:

| Sonda                      | Lo que verifica                                                                  | Razones por las que puede fallar                                                 |
| -------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` sale con 0 con una cadena de versión no vacía                | `non-zero-exit`, `empty-version`, `spawn-failed`, `spawn-error`, `probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + escritura + rm de un archivo marcador                   | `copilothome-not-writable` (con el error fs subyacente en `details.rawError`)    |
| `probeCopilotAuthShape`    | Al menos uno de `useLoggedInUser`, `gitHubToken`, o `profileId`+`profileVersion` | `no-auth-source`                                                                 |

Cada sonda acepta un costura DI (`spawnFn`, `fsApi`) para que las pruebas no generen el
Copilot CLI real ni toquen el fs del host.

## Limitaciones

- El arnés solo reclama el proveedor canónico `github-copilot` en el MVP.
  Proveedores adicionales (BYOK o de otro tipo) deben incluirse en PRs posteriores que
  envíen el adaptador junto con la conexión.
- El harness no proporciona TUI; la TUI de PI no se ve afectada y sigue siendo
  la alternativa para aquellos runtimes que no tienen una superficie (surface) homóloga.
- El estado de sesión de PI no se migra cuando un agente cambia a `copilot`.
  La selección es por intento; las sesiones de PI existentes siguen siendo válidas.
- **Interactive `ask_user` aún no está conectado.** El controlador `onUserInputRequest` del SDK no se registra intencionalmente, lo que, según el contrato del SDK, oculta la herramienta `ask_user` del modelo por completo. Los agentes que se ejecutan con este arnés toman decisiones con el mejor juicio a partir del mensaje inicial en lugar de hacer preguntas de aclaración a mitad del turno. Una actualización posterior portará el patrón de códec en `extensions/codex/src/app-server/user-input-bridge.ts` para enrutar `UserInputRequest`s del SDK a través de la ruta del canal/interfaz de usuario de texto (TUI) de OpenClaw; el andamio inactivo en `extensions/copilot/src/user-input-bridge.ts` es la superficie que esa actualización conectará.

## Permisos y ask_user

La aplicación de permisos para las herramientas de OpenClaw puenteadas ocurre **dentro del contenedor de la herramienta**, no a través de la devolución de llamada `onPermissionRequest` del SDK. El mismo `wrapToolWithBeforeToolCallHook` que usa PI (`src/agents/pi-tools.before-tool-call.ts`) es aplicado por `createOpenClawCodingTools` a cada herramienta de codificación: la detección de bucles, las políticas de complementos de confianza, los ganchos antes de la llamada a la herramienta y las aprobaciones de complementos de dos fases a través de la puerta de enlace (`plugin.approval.request`) se ejecutan con exactamente la misma ruta de código que los intentos nativos de PI.

Para permitir que ese contenedor sea el dueño de la decisión, la herramienta del SDK devuelta por `convertOpenClawToolToSdkTool` está marcada con:

- `overridesBuiltInTool: true` — reemplaza la herramienta integrada del mismo nombre de Copilot CLI (edit, read, write, bash, …) para que cada invocación de herramienta se redirija de vuelta a OpenClaw.
- `skipPermission: true` — indica al SDK que no dispare `onPermissionRequest({kind: "custom-tool"})` antes de invocar la herramienta. El `execute()` envuelto realiza la verificación de política de OpenClaw más rica internamente; un mensaje a nivel del SDK要么 cortocircuitaría la aplicación de OpenClaw (si permitimos todo) o bloquearía cada llamada a la herramienta (si rechazamos todo) — ninguno coincide con la paridad de PI.

El arnés codex integrado utiliza la misma división: las herramientas de OpenClaw puenteadas
se envuelven (`extensions/codex/src/app-server/dynamic-tools.ts`) y
los tipos de aprobación nativos _propios_ del codex-app-server
(`item/commandExecution/requestApproval`,
`item/fileChange/requestApproval`,
`item/permissions/requestApproval`) se enrutan a través de
`plugin.approval.request`
(`extensions/codex/src/app-server/approval-bridge.ts`). El equivalente en el Copilot SDK
— fail-closed `rejectAllPolicy` para cualquier tipo que no sea `custom-tool`
y que alguna vez llegue a `onPermissionRequest` — es la misma red de seguridad,
y no se activa en la práctica porque `overridesBuiltInTool: true`
desplaza a todos los integrados.

Para que la capa de herramienta envuelta tome decisiones de política equivalentes a PI,
el arnés reenvía el contexto completo de intento de herramienta de PI a
`createOpenClawCodingTools` — identidad (`senderIsOwner`,
`memberRoleIds`, `ownerOnlyToolAllowlist`, …), canal/enrutamiento
(`groupId`, `currentChannelId`, `replyToMode`, alternadores de herramienta de mensaje),
autenticación (`authProfileStore`), identidad de ejecución
(`sessionKey`/`runSessionKey` derivada de `sandboxSessionKey`,
`runId`), contexto del modelo (`modelApi`, `modelContextWindowTokens`,
`modelCompat`, `modelHasVision`) y ganchos de ejecución (`onToolOutcome`,
`onYield`). Sin esos campos, las listas de permitidos solo para propietarios se comportan silenciosamente
de forma predeterminada como denegación, las políticas de confianza de complementos no pueden resolver al
alcance correcto y `session_status: "current"` se resuelve en una clave
de sandbox obsoleta. El constructor de puentes está en
`extensions/copilot/src/tool-bridge.ts` y refleja la llamada
autoritativa de PI en
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117`. Dos campos de PI
intencionalmente **no** se reenvían en el MVP y se rastrean como seguimientos:
`sandbox` (el arnés aún no enruta a través de `resolveSandboxContext`)
y la maquinaria de búsqueda de herramientas/modo de código de PI
(`toolSearchCatalogRef`, `includeCoreTools`,
`includeToolSearchControls`, `toolSearchCatalogExecutor`,
`toolConstructionPlan`), que no tiene análogo en el límite del SDK.

### Token de GitHub a nivel de sesión

El contrato del Copilot SDK distingue el token de GitHub de **nivel de cliente** (`CopilotClientOptions.gitHubToken`, utilizado para autenticar el propio proceso de la CLI) del token de **nivel de sesión** (`SessionConfig.gitHubToken`, que determina la exclusión de contenido, el enrutamiento del modelo y la cuota para esa sesión y se respeta tanto en `createSession` como en `resumeSession`). El arnés resuelve la autenticación una vez a través de `resolveCopilotAuth` y establece ambos campos cuando el modo de autenticación es `gitHubToken` (un `auth.gitHubToken` explícito o un `resolvedApiKey` resuelto por contrato a partir de un perfil de autenticación `github-copilot` configurado). Cuando el modo resuelto es `useLoggedInUser`, el campo de nivel de sesión se omite para que el SDK siga derivando la identidad de la identidad iniciada.

`ask_user` se oculta intencionalmente; consulte las Limitaciones anteriores.

## Relacionado

- [Runtimes del agente](/es/concepts/agent-runtimes)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Complementos de arnés de agente (referencia del SDK)](/es/plugins/sdk-agent-harness)
