---
summary: "Ejecutar turnos de agente integrado de OpenClaw a través del arnés del SDK de GitHub Copilot incluido"
title: "Arnés del SDK de Copilot"
read_when:
  - You want to use the bundled GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

La extensión incluida `copilot` permite que OpenClaw ejecute turnos de agente de suscripción integrados
Copilot a través de la CLI de GitHub Copilot (`@github/copilot-sdk`)
en lugar del arnés PI integrado.

Use el arnés del SDK de Copilot cuando desee que la sesión de la CLI de Copilot sea propietaria del
bucle de agente de bajo nivel: ejecución nativa de herramientas, compactación nativa
(`infiniteSessions`) y estado del hilo administrado por la CLI bajo `copilotHome`.
OpenClaw sigue siendo propietario de los canales de chat, los archivos de sesión, la selección del modelo, las herramientas
dinámicas de OpenClaw (puenteadas), las aprobaciones, la entrega de medios, el espejo de transcripción visible,
`/btw` preguntas secundarias (manejadas por la alternativa PI en el árbol — véase
[Preguntas secundarias (`/btw`)](#side-questions-btw)) y `openclaw doctor`.

Para la división más amplia de modelo/proveedor/runtime, comience con
[Runtimes de agente](/es/concepts/agent-runtimes).

## Requisitos

- OpenClaw con la extensión incluida `copilot` disponible.
- Si su configuración usa `plugins.allow`, incluya `copilot` (el id del manifiesto
  en `extensions/copilot/openclaw.plugin.json`). Una lista de permitidos
  restrictiva que use el nombre del paquete estilo npm `@openclaw/copilot`
  dejará el complemento incluido bloqueado y el runtime no se cargará\incluso con `agentRuntime.id: "copilot"`.
- Una suscripción a GitHub Copilot que pueda controlar la CLI de Copilot (o una
  entrada de entorno / perfil de autenticación `gitHubToken` para ejecuciones sin cabeza / cron).
- Un directorio `copilotHome` escribible. El arnés utiliza por defecto
  `~/.openclaw/agents/<agentId>/copilot` para un aislamiento completo por agente. El
  valor predeterminado de la plataforma (`%APPDATA%\copilot` en Windows, `$XDG_CONFIG_HOME/copilot`
  o `~/.config/copilot` en otros lugares) se usa como alternativa de la sonda de doctor cuando
  no se establece un inicio explícito.

`openclaw doctor` ejecuta el contrato de doctor ([doctor contract](#doctor-and-probes)) incluido para la extensión; los fallos allí son la forma canónica de confirmar que el entorno está listo antes de optar por un agente.

## Instalación del SDK bajo demanda

El tiempo de ejecución del agente Copilot envía su pequeño código TypeScript incluido dentro del archivo tarball de openclaw, pero el paquete subyacente `@github/copilot-sdk` (y su binario CLI `@github/copilot-<platform>-<arch>` específico de la plataforma) **no** se instala de forma predeterminada; juntos añaden ~260 MB a la huella de instalación de openclaw, y la mayoría de los usuarios de openclaw no seleccionan un modelo Copilot.

El asistente ofrece instalar el SDK la primera vez que seleccionas un modelo `github-copilot/*` **y** tu configuración opta por el modelo (o su proveedor) en el tiempo de ejecución del agente Copilot a través de `agentRuntime: { id: "copilot" }` (ver [Inicio rápido](#quickstart) a continuación). Sin la participación, openclaw usa su proveedor integrado de GitHub Copilot y nunca solicita la instalación del SDK:

```
The Copilot agent runtime needs @github/copilot-sdk (~260 MB on first
install, downloads the @github/copilot CLI binary for your platform).
Install now? [Y/n]
```

Si aceptas, el SDK se instala en `~/.openclaw/npm-runtime/copilot/` y se detecta en ejecuciones posteriores. La instalación ejecuta `npm ci` contra un `package-lock.json` verificado enviado con openclaw en `src/commands/copilot-sdk-install-manifest/package-lock.json`, por lo que el grafo transitivo exacto revisado para esta versión aterriza en el disco en cada máquina de usuario.

Si rechazas, el tiempo de ejecución fallará en la primera invocación con un mensaje de instalación accionable; vuelve a ejecutar `openclaw setup` para reintentar la instalación (o copia el manifiesto fijado en `~/.openclaw/npm-runtime/copilot/` y ejecuta `npm ci` tú mismo si necesitas instalar sin conexión).

El tiempo de ejecución resuelve el SDK en este orden:

1. `import("@github/copilot-sdk")` contra la instalación anfitriona de openclaw (cubriendo checkouts de código fuente/desarrollo y cualquier entorno que preinstale el SDK junto con openclaw).
2. El directorio de reserva bien conocido `~/.openclaw/npm-runtime/copilot/` (el destino de instalación del asistente).

Un SDK faltante muestra un solo error con el código `COPILOT_SDK_MISSING` y el comando de instalación manual anterior.

## Inicio rápido

Fija un modelo (o un proveedor) al arnés:

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

Ambas rutas son equivalentes. Use `agentRuntime.id` en una sola entrada de modelo
solo cuando ese modelo debe ser enrutado a través del harness; configure
`agentRuntime.id` en un proveedor cuando cada modelo bajo ese proveedor deba
usarlo.

## Proveedores compatibles

El harness anuncia compatibilidad con el proveedor canónico `github-copilot`
(el mismo id propiedad de `extensions/github-copilot`):

- `github-copilot`

Cualquier cosa fuera de ese conjunto pasa a través de la rama `auto_pi` de `selection.ts`
de vuelta a PI.

## Autenticación

Precedencia por agente, aplicada durante `runCopilotAttempt`:

1. **`useLoggedInUser: true` explícito** en la entrada del intento. Usa el usuario
   iniciado sesión en la CLI de Copilot resuelto bajo `copilotHome` del agente.
2. **`gitHubToken` explícito** en la entrada del intento (con `profileId` +
   `profileVersion`). Útil para invocaciones directas de CLI y pruebas donde
   quien llama quiere omitir la resolución del perfil de autenticación.
3. **`resolvedApiKey` + `authProfileId` resueltos por contrato** desde la
   forma `EmbeddedRunAttemptParams`. Esta es la **ruta principal de producción**:
   core resuelve el perfil de autenticación `github-copilot` configurado del agente
   (vía `src/infra/provider-usage.auth.ts:resolveProviderAuths`) antes de
   invocar el harness, y el harness consume ambos campos directamente.
   Esto hace que un perfil de autenticación `github-copilot:<profile>` funcione de extremo a extremo
   para configuraciones sin cabeza / cron / multi-perfil sin variables de entorno.
4. **Alternativa de variable de entorno** para ejecuciones directas de CLI / dogfood donde no hay
   perfil de autenticación configurado. El tiempo de ejecución verifica las siguientes variables en
   orden de precedencia, reflejando el proveedor `github-copilot` enviado
   (`extensions/github-copilot/auth.ts`) y la configuración documentada del SDK de Copilot:
   1. `OPENCLAW_GITHUB_TOKEN` -- alternativa específica del harness; configure esto
      para fijar un token para el harness de OpenClaw sin alterar
      la configuración de `gh` / CLI de Copilot en todo el sistema.
   2. `COPILOT_GITHUB_TOKEN` -- variable de entorno estándar del SDK / CLI de Copilot.
   3. `GH_TOKEN` -- variable de entorno estándar de la CLI `gh` (coincide con la precedencia
      del proveedor `github-copilot` existente).
   4. `GITHUB_TOKEN` -- alternativa genérica para el token de GitHub.

   Gana el primer valor no vacío; las cadenas vacías se tratan como
   ausentes. El id del perfil de grupo sintetizado es `env:<NAME>` y la
   profileVersion es una huella digital sha256 no reversible del
   token, por lo que rotar el valor de la entorno rompe limpiamente el grupo de clientes.

5. **`useLoggedInUser` predeterminado** cuando no hay ninguna señal de token disponible.

Cada agente obtiene un `copilotHome` dedicado para que los tokens, sesiones y
configuración de la CLI de Copilot no se filtren entre agentes en la misma máquina. El valor predeterminado es
`<agentDir>/copilot` cuando el host entrega al arnés un directorio de agente
(aislando el estado del SDK de `models.json` / `auth-profiles.json` de OpenClaw en
el mismo directorio), o `~/.openclaw/agents/<agentId>/copilot` en caso contrario.
Anule con `copilotHome: <path>` en la entrada del intento cuando necesite una
ubicación personalizada (por ejemplo, un montaje compartido para la migración).

`probeCopilotAuthShape` (ver [Doctor and probes](#doctor-and-probes)) es la
comprobación de forma pura que valida cuál de los modos anteriores se utilizará.
No realiza un handshake en vivo del SDK.

## Superficie de configuración

El arnés lee su configuración desde la entrada por intento
(`runCopilotAttempt({...})`) más un pequeño conjunto de valores predeterminados de entorno dentro
de `extensions/copilot/src/`:

- `copilotHome` — directorio de estado de CLI por agente (valores predeterminados documentados anteriormente).
- `model` — cadena o `{ provider, id, api? }`. Cuando se omite, OpenClaw utiliza
  la selección normal de modelos del agente y el arnés verifica que el proveedor
  resuelto esté en el conjunto admitido.
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`. Mapea desde la
  resolución `ThinkLevel` / `ReasoningLevel` de
  OpenClaw en `auto-reply/thinking.ts`.
- `infiniteSessionConfig` — anulación opcional para el bloque
  `infiniteSessions` del SDK impulsado por `harness.compact`. Es seguro dejar
  los valores predeterminados como están.
- `hooksConfig` — configuración opcional del puente que expone los hooks de OpenClaw
  antes/después de la escritura de mensajes al bucle del SDK.
- `permissionPolicy` — anulación opcional para el controlador
  `onPermissionRequest` del SDK utilizado para los tipos de herramientas integradas del SDK
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`). Por defecto
  es `rejectAllPolicy` como red de seguridad; en la práctica el SDK nunca
  invoca ninguno de esos tipos porque cada herramienta de OpenClaw puenteada
  se registra con `overridesBuiltInTool: true` y
  `skipPermission: true`, por lo que el 100% de las llamadas a herramientas fluyen a través del `execute()` envuelto de OpenClaw.
  Véase [Permissions and ask_user](#permissions-and-ask_user).
- `enableSessionTelemetry` — enrutamiento opcional de OpenTelemetry a través de
  `telemetry-bridge.ts`.

Nada en el resto de OpenClaw necesita conocer estos campos. Otros
complementos, canales y código central solo ven la forma estándar
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult`.

## Compactación

Cuando se ejecuta `harness.compact`, el arnés del Copilot SDK:

1. Activa `infiniteSessions` en la sesión del SDK.
2. Permite que el SDK realice su compactación nativa.
3. Escribe un marcador con formato de OpenClaw en
   `workspacePath/files/openclaw-compaction-<ts>.json` para que los lectores de transcripciones
   existentes de OpenClaw sigan viendo un artefacto familiar.

El espejo de la transcripción del lado de OpenClaw (véase más abajo) sigue recibiendo los
mensajes posteriores a la compactación, por lo que el historial de chat orientado al usuario se mantiene coherente.

## Espejo de transcripción

`runCopilotAttempt` escribe simultáneamente los mensajes reflejables de cada turno en la
transcripción de auditoría de OpenClaw a través de
`extensions/copilot/src/dual-write-transcripts.ts`. El espejo está
limitado por sesión (`copilot:${sessionId}`) y utiliza una identidad
por mensaje (`${role}:${sha256_16(role,content)}`), de modo que las reemisiones de entradas
de turnos anteriores colisionan con las claves en disco existentes y no se duplican.

El espejo está envuelto en dos capas de contención de fallos para que un fallo de escritura en la transcripción no pueda hacer fallar el intento: un contenedor interno de mejor esfuerzo y una defensa en profundidad `.catch(...)` a nivel de intento. Los fallos se registran pero no se muestran.

## Preguntas secundarias (`/btw`)

`/btw` **no** es nativo en este arnés. `createCopilotAgentHarness()`
dej deliberadamente `harness.runSideQuestion` sin definir, por lo que el despachador `/btw`
de OpenClaw (`src/agents/btw.ts`) recurre a la misma ruta de reserva PI integrada que utiliza para cada tiempo de ejecución que no sea Codex: el proveedor de modelos configurado se llama directamente con un mensaje breve de pregunta secundaria y se transmite de vuelta a través de `streamSimple` (sin sesión de CLI, sin ranura de grupo adicional).

Esto mantiene las sesiones de CLI de Copilot reservadas para el bucle de turno principal del agente y mantiene el comportamiento de `/btw` idéntico al de otros tiempos de ejecución respaldados por PI. El contrato se afirma en
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
bajo `describe("runSideQuestion")`.

## Doctor y sondas

`extensions/copilot/doctor-contract-api.ts` se carga automáticamente por
`src/plugins/doctor-contract-registry.ts`. Contribuye:

- Un `legacyConfigRules` vacío (sin campos retirados en MVP).
- Un `normalizeCompatibilityConfig` no operativo (mantenido para que futuros retiros de campos tengan un hogar estable integrado).
- Una entrada `sessionRouteStateOwners` reclamando el proveedor `github-copilot`;
  tiempo de ejecución `copilot`; clave de sesión CLI `copilot`; prefijo de perfil de autenticación `github-copilot:`.

`extensions/copilot/src/doctor-probes.ts` exporta tres sondas imperativas
que los hosts (incluyendo `openclaw doctor`) pueden llamar para verificar el entorno:

| Sonda                      | Lo que verifica                                                                  | Razones por las que puede fallar                                                 |
| -------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` sale con 0 y una cadena de versión no vacía                  | `non-zero-exit`, `empty-version`, `spawn-failed`, `spawn-error`, `probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + write + rm un archivo de marcador                       | `copilothome-not-writable` (con el error fs subyacente en `details.rawError`)    |
| `probeCopilotAuthShape`    | Al menos uno de `useLoggedInUser`, `gitHubToken`, o `profileId`+`profileVersion` | `no-auth-source`                                                                 |

Cada sonda acepta una costura de DI (`spawnFn`, `fsApi`) para que las pruebas no generen el CLI real de Copilot ni toquen el fs del host.

## Limitaciones

- El harness solo reclama el proveedor `github-copilot` canónico en el MVP.
  Los proveedores adicionales (BYOK u otros) deberían incluirse en PRs posteriores que
  envíen el adaptador junto con el cableado.
- El harness no entrega TUI; la TUI de PI no se ve afectada y sigue siendo la
  alternativa para aquellos tiempos de ejecución que no tienen una superficie homóloga.
- El estado de sesión de PI no se migra cuando un agente cambia a `copilot`.
  La selección es por intento; las sesiones de PI existentes siguen siendo válidas.
- **El `ask_user` interactivo aún no está conectado.** El controlador `onUserInputRequest` del SDK
  intencionalmente no está registrado, lo que, según el contrato del SDK, oculta la herramienta `ask_user` del modelo
  por completo. Los agentes que se ejecutan bajo este harness toman decisiones con el mejor criterio
  a partir del aviso inicial en lugar de hacer preguntas de aclaración
  a mitad del turno. Una actualización posterior portará el patrón de código en
  `extensions/codex/src/app-server/user-input-bridge.ts` para enrutar `UserInputRequest`s del SDK
  a través de la ruta del aviso del canal/TUI de OpenClaw; el andamio latente en `extensions/copilot/src/user-input-bridge.ts`
  es la superficie que esa actualización conectará.

## Permisos y ask_user

La aplicación de permisos para las herramientas de OpenClaw puenteadas sucede **dentro del
wrapper de la herramienta**, no a través de la devolución de llamada `onPermissionRequest` del SDK. El mismo `wrapToolWithBeforeToolCallHook` que PI usa
(`src/agents/pi-tools.before-tool-call.ts`) es aplicado por
`createOpenClawCodingTools` a cada herramienta de codificación: detección de bucles,
políticas de plugins de confianza, ganchos antes de la llamada a la herramienta y aprobaciones de plugins en dos fases
a través de la puerta de enlace (`plugin.approval.request`) todo se ejecuta con el
mismo camino de código exacto que los intentos nativos de PI.

Para permitir que ese contenedor sea el dueño de la decisión, la herramienta del SDK devuelta por
`convertOpenClawToolToSdkTool` está marcada con:

- `overridesBuiltInTool: true` — reemplaza la herramienta integrada del Copilot CLI
  del mismo nombre (edit, read, write, bash, …) para que cada invocación de
  herramienta se enrute de vuelta a OpenClaw.
- `skipPermission: true` — le indica al SDK que no active
  `onPermissionRequest({kind: "custom-tool"})` antes de invocar la herramienta.
  El `execute()` envuelto realiza la verificación de política más rica de OpenClaw
  internamente; un aviso a nivel de SDK cortocircuitaría la aplicación de OpenClaw
  (si permitimos todo) o bloquearía cada llamada a herramienta (si
  rechazamos todo) — ninguna coincide con la paridad de PI.

El arnés codex en el árbol usa la misma división: las herramientas OpenClaw puenteadas
están envueltas (`extensions/codex/src/app-server/dynamic-tools.ts`) y
los tipos de aprobación nativos _propios_ del codex-app-server
(`item/commandExecution/requestApproval`,
`item/fileChange/requestApproval`,
`item/permissions/requestApproval`) se enrutan a través de
`plugin.approval.request`
(`extensions/codex/src/app-server/approval-bridge.ts`). El equivalente del Copilot SDK
— falla cerrada `rejectAllPolicy` para cualquier tipo que no sea `custom-tool`
que alguna vez llegue a `onPermissionRequest` — es la misma red de seguridad,
y no se activa en la práctica porque `overridesBuiltInTool: true`
desplaza cada integrado.

Para que la capa de herramienta envuelta tome decisiones de política equivalentes a las de PI,
el arnés reenvía el contexto completo de intento de herramienta de PI a
`createOpenClawCodingTools` — identidad (`senderIsOwner`,
`memberRoleIds`, `ownerOnlyToolAllowlist`, …), canal/enrutamiento
(`groupId`, `currentChannelId`, `replyToMode`, interruptores de mensaje-herramienta),
autenticación (`authProfileStore`), identidad de ejecución
(`sessionKey`/`runSessionKey` derivada de `sandboxSessionKey`,
`runId`), contexto del modelo (`modelApi`, `modelContextWindowTokens`,
`modelCompat`, `modelHasVision`) y ganchos de ejecución (`onToolOutcome`,
`onYield`). Sin esos campos, las listas de permitidos solo para propietarios se comportan silenciosamente
de manera denegar por defecto, las políticas de confianza de complementos no pueden resolverse al
alcance correcto y `session_status: "current"` se resuelve en una clave
de sandbox obsoleta. El generador de puentes está en
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

El contrato del SDK de Copilot distingue el token de GitHub **de nivel de cliente** (`CopilotClientOptions.gitHubToken`, utilizado para autenticar el proceso de la CLI en sí) del token **de nivel de sesión** (`SessionConfig.gitHubToken`, que determina la exclusión de contenido, el enrutamiento del modelo y la cuota para esa sesión y se respeta tanto en `createSession` como en `resumeSession`). El arnés resuelve la autenticación una vez a través de `resolveCopilotAuth` y establece ambos campos cuando el modo de autenticación es `gitHubToken` (un `auth.gitHubToken` explícito o un `resolvedApiKey` resuelto por contrato desde un perfil de autenticación `github-copilot` configurado). Cuando el modo resuelto es `useLoggedInUser`, se omite el campo de nivel de sesión para que el SDK siga derivando la identidad de la identidad conectada.

`ask_user` se oculta intencionalmente; consulte las Limitaciones anteriores.

## Relacionado

- [Runtimes de agentes](/es/concepts/agent-runtimes)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Complementos de arnés de agente (referencia del SDK)](/es/plugins/sdk-agent-harness)
