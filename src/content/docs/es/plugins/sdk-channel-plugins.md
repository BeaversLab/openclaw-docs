---
title: "Construcción de complementos de canal"
sidebarTitle: "Complementos de canal"
summary: "Guía paso a paso para construir un complemento de canal de mensajería para OpenClaw"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

# Creación de complementos de canales

Esta guía explica cómo crear un complemento de canal que conecte OpenClaw con una
plataforma de mensajería. Al final, tendrá un canal funcional con seguridad de MD,
emparejamiento, hilos de respuesta y mensajería saliente.

<Info>Si no has construido ningún plugin de OpenClaw antes, lee [Introducción](/es/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

## Cómo funcionan los complementos de canales

Los complementos de canal no necesitan sus propias herramientas de envío/edición/reacción. OpenClaw mantiene una
herramienta `message` compartida en el núcleo. Su complemento posee:

- **Configuración** — resolución de cuenta y asistente de configuración
- **Seguridad** — política de MD y listas de permitidos
- **Emparejamiento** — flujo de aprobación de MD
- **Gramática de sesión** — cómo se asignan los ids de conversación específicos del proveedor a chats base, ids de hilo y reservas principales
- **Saliente** — envío de texto, medios y encuestas a la plataforma
- **Hilos** — cómo se hilvanan las respuestas
- **Heartbeat typing** — señales opcionales de escritura/ocupado para los objetivos de entrega de latidos.

Core posee la herramienta de mensajes compartida, el cableado de prompts, la forma de la clave de sesión externa,
la contabilidad genérica de `:thread:` y el despacho.

Si tu canal admite indicadores de escritura fuera de las respuestas entrantes, expón
`heartbeat.sendTyping(...)` en el plugin del canal. Core lo llama con el
objetivo de entrega de latidos resuelto antes de que se inicie la ejecución del modelo de latidos
y utiliza el ciclo de vida compartido de mantenimiento/limpieza de escritura. Añade `heartbeat.clearTyping(...)`
cuando la plataforma necesite una señal de detención explícita.

Si tu canal añade parámetros a la herramienta de mensajes que transportan fuentes multimedia, expone esos
nombres de parámetros a través de `describeMessageTool(...).mediaSourceParams`. Core utiliza
esa lista explícita para la normalización de rutas de sandbox y la política de acceso
multimedia de salida, por lo que los plugins no necesitan casos especiales en el núcleo compartido para parámetros
de avatar, archivo adjunto o imagen de portada específicos del proveedor.
Se prefiere devolver un mapa con clave de acción como
`{ "set-profile": ["avatarUrl", "avatarPath"] }` para que las acciones no relacionadas no
hereden los argumentos multimedia de otra acción. Una matriz plana sigue funcionando para parámetros que
se comparten intencionadamente en todas las acciones expuestas.

Si tu plataforma almacena un alcance adicional dentro de los IDs de conversación, mantén ese análisis
en el plugin con `messaging.resolveSessionConversation(...)`. Ese es el
enlace canónico para mapear `rawId` al ID de conversación base, el ID de hilo opcional,
el `baseConversationId` explícito y cualquier `parentConversationCandidates`.
Cuando devuelvas `parentConversationCandidates`, manténlos ordenados del
padre más estrecho al más amplio/conversación base.

Los plugins empaquetados que necesitan el mismo análisis antes de que se inicie el registro del canal
también pueden exponer un archivo `session-key-api.ts` de nivel superior con una exportación
`resolveSessionConversation(...)` coincidente. Core utiliza esa superficie segura para el arranque
solo cuando el registro de plugins en tiempo de ejecución aún no está disponible.

`messaging.resolveParentConversationCandidates(...)` permanece disponible como
un mecanismo de compatibilidad heredado cuando un complemento solo necesita respaldos parentales encima
del id genérico/sin procesar. Si existen ambos ganchos, el núcleo usa
`resolveSessionConversation(...).parentConversationCandidates` primero y solo
retrocede a `resolveParentConversationCandidates(...)` cuando el gancho canónico
los omite.

## Aprobaciones y capacidades del canal

La mayoría de los complementos de canal no necesitan código específico para aprobaciones.

- El núcleo gestiona el mismo chat `/approve`, las cargas útiles compartidas del botón de aprobación y la entrega de respaldo genérica.
- Prefiera un objeto `approvalCapability` en el complemento del canal cuando el canal necesita comportamiento específico de aprobación.
- `ChannelPlugin.approvals` se eliminó. Coloque los datos de entrega/nativo/renderizado/autenticación de aprobación en `approvalCapability`.
- `plugin.auth` es solo para iniciar sesión/cerrar sesión; el núcleo ya no lee los ganchos de autenticación de aprobación de ese objeto.
- `approvalCapability.authorizeActorAction` y `approvalCapability.getActionAvailabilityState` son la interfaz canónica de autenticación de aprobaciones.
- Use `approvalCapability.getActionAvailabilityState` para la disponibilidad de autenticación de aprobación del mismo chat.
- Si su canal expone aprobaciones de ejecución nativas, use `approvalCapability.getExecInitiatingSurfaceState` para el estado de la superficie iniciadora/cliente nativo cuando difiera de la autenticación de aprobación del mismo chat. El núcleo usa ese gancho específico de ejecución para distinguir `enabled` vs `disabled`, decidir si el canal iniciador admite aprobaciones de ejecución nativas e incluir el canal en la guía de respaldo del cliente nativo. `createApproverRestrictedNativeApprovalCapability(...)` completa esto para el caso común.
- Use `outbound.shouldSuppressLocalPayloadPrompt` o `outbound.beforeDeliverPayload` para el comportamiento del ciclo de vida de la carga útil específico del canal, como ocultar avisos de aprobación local duplicados o enviar indicadores de escritura antes de la entrega.
- Use `approvalCapability.delivery` solo para el enrutamiento de aprobaciones nativas o la supresión de respaldo.
- Use `approvalCapability.nativeRuntime` para los datos de aprobación nativa propiedad del canal. Manténgalo diferido en los puntos de entrada frecuentes del canal con `createLazyChannelApprovalNativeRuntimeAdapter(...)`, que puede importar su módulo de tiempo de ejecución bajo demanda mientras permite que el núcleo ensamble el ciclo de vida de la aprobación.
- Use `approvalCapability.render` solo cuando un canal realmente necesita cargas útiles de aprobación personalizadas en lugar del renderizador compartido.
- Use `approvalCapability.describeExecApprovalSetup` cuando el canal desea que la respuesta de ruta deshabilitada explique los ajustes de configuración exactos necesarios para habilitar las aprobaciones de ejecución nativas. El hook recibe `{ channel, channelLabel, accountId }`; los canales de cuentas con nombre deben mostrar rutas con alcance de cuenta como `channels.<channel>.accounts.<id>.execApprovals.*` en lugar de los valores predeterminados de nivel superior.
- Si un canal puede inferir identidades de DM estables tipo propietario desde la configuración existente, use `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` para restringir `/approve` del mismo chat sin agregar lógica central específica para aprobaciones.
- Si un canal necesita entrega de aprobaciones nativas, mantenga el código del canal enfocado en la normalización de objetivos más los hechos de transporte/presentación. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` y `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Coloque los hechos específicos del canal detrás de `approvalCapability.nativeRuntime`, idealmente a través de `createChannelApprovalNativeRuntimeAdapter(...)` o `createLazyChannelApprovalNativeRuntimeAdapter(...)`, para que el núcleo pueda ensamblar el controlador y ser responsable del filtrado de solicitudes, enrutamiento, deduplicación, caducidad, suscripción a la puerta de enlace y avisos de enrutado a otro lugar. `nativeRuntime` se divide en algunos puntos de conexión más pequeños:
- `availability` — si la cuenta está configurada y si se debe manejar una solicitud
- `presentation` — asigne el modelo de vista de aprobación compartido en cargas útiles nativas pendientes/resueltas/caducadas o acciones finales
- `transport` — prepare los objetivos más envíe/actualice/elimine mensajes de aprobación nativos
- `interactions` — ganchos opcionales de vincular/desvincular/limpiar-acción para botones nativos o reacciones
- `observe` — ganchos opcionales de diagnóstico de entrega
- Si el canal necesita objetos propiedad del tiempo de ejecución como un cliente, token, aplicación Bolt o receptor de webhooks, regístrelos a través de `openclaw/plugin-sdk/channel-runtime-context`. El registro genérico de contexto de tiempo de ejecución permite al núcleo inicializar controladores impulsados por capacidades desde el estado de inicio del canal sin agregar pegamento de contenedor específico para aprobaciones.
- Recurra a `createChannelApprovalHandler` o `createChannelNativeApprovalRuntime` de menor nivel solo cuando la costura basada en capacidades aún no sea lo suficientemente expresiva.
- Los canales de aprobación nativos deben enrutar tanto `accountId` como `approvalKind` a través de esos ayudantes. `accountId` mantiene la política de aprobación de múltiples cuentas limitada a la cuenta de bot correcta, y `approvalKind` mantiene disponible el comportamiento de aprobación de ejecución frente a complemento para el canal sin ramificaciones codificadas en el núcleo.
- El núcleo ahora también posee los avisos de reruteo de aprobación. Los complementos del canal no deben enviar sus propios mensajes de seguimiento de "la aprobación pasó a los MD / otro canal" desde `createChannelNativeApprovalRuntime`; en su lugar, exponga el enrutamiento preciso de origen + MD del aprobador a través de los ayudantes de capacidad de aprobación compartidos y deje que el núcleo agregue las entregas reales antes de publicar cualquier aviso de vuelta al chat iniciador.
- Conservar el tipo de id de aprobación entregado de extremo a extremo. Los clientes nativos no deben
  adivinar ni reescribir el enrutamiento de aprobación de ejecución frente a complemento desde el estado local del canal.
- Diferentes tipos de aprobación pueden exponer intencionalmente diferentes superficies nativas.
  Ejemplos empaquetados actuales:
  - Slack mantiene disponible el enrutamiento de aprobación nativo tanto para ids de ejecución como de complemento.
  - Matrix mantiene el mismo enrutamiento nativo de MD/canal y la experiencia de usuario de reacción para aprobaciones
    de ejecución y de complementos, al tiempo que todavía permite que la autenticación difiera según el tipo de aprobación.
- `createApproverRestrictedNativeApprovalAdapter` todavía existe como un contenedor de compatibilidad, pero el código nuevo debería preferir el constructor de capacidades y exponer `approvalCapability` en el complemento.

Para los puntos de entrada del canal activos, prefiera las subrutas de tiempo de ejecución más estrechas cuando solo
necesite una parte de esa familia:

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

De manera similar, prefiera `openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/setup-adapter-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference` y
`openclaw/plugin-sdk/reply-chunking` cuando no necesite la superficie general
paraguas.

Específicamente para la configuración:

- `openclaw/plugin-sdk/setup-runtime` cubre los auxiliares de configuración seguros en tiempo de ejecución:
  adaptadores de parches de configuración seguros de importación (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries` y los constructores
  delegados de proxy de configuración
- `openclaw/plugin-sdk/setup-adapter-runtime` es la costura del adaptador limitada y consciente del entorno
  para `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` cubre los constructores de configuración de instalación opcional
  además de algunos primitivos seguros para la configuración:
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si su canal admite configuración o autenticación impulsada por el entorno y los flujos genéricos de inicio/configuración
deben conocer esos nombres de entorno antes de que se cargue el tiempo de ejecución, declárelos en el
manifiesto del complemento con `channelEnvVars`. Mantenga el tiempo de ejecución del canal `envVars` o constantes
locales solo para el texto dirigido al operador.

Si su canal puede aparecer en `status`, `channels list`, `channels status` o
escaneos SecretRef antes de que se inicie el tiempo de ejecución del complemento, agregue `openclaw.setupEntry` en
`package.json`. Ese punto de entrada debe ser seguro de importar en rutas de comandos
de solo lectura y debe devolver los metadatos del canal, el adaptador de configuración seguro para la configuración, el adaptador
de estado y los metadatos del objetivo secreto del canal necesarios para esos resúmenes. No
inicie clientes, oyentes o tiempos de ejecución de transporte desde la entrada de configuración.

`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled` y
`splitSetupEntries`

- use la costura más amplia `openclaw/plugin-sdk/setup` solo cuando también necesite los
  auxiliares compartidos de configuración/configuración más pesados, como
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si su canal solo desea anunciar "instale este complemento primero" en las superficies de configuración, prefiera `createOptionalChannelSetupSurface(...)`. El adaptador/asistente generado falla cerrado en la escritura y finalización de la configuración, y reutilizan el mismo mensaje de instalación requerida en la validación, finalización y copia del enlace a la documentación.

Para otras rutas activas del canal, prefiera los ayudantes estrechos sobre las superficies heredadas más amplias:

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` y
  `openclaw/plugin-sdk/account-helpers` para la configuración multicuenta y
  la reserva de cuenta predeterminada
- `openclaw/plugin-sdk/inbound-envelope` y
  `openclaw/plugin-sdk/inbound-reply-dispatch` para el enrutamiento/sobre entrante y
  el cableado de registro y envío
- `openclaw/plugin-sdk/messaging-targets` para el análisis/coincidencia de objetivos
- `openclaw/plugin-sdk/outbound-media` y
  `openclaw/plugin-sdk/outbound-runtime` para la carga de medios más los delegados
  de identidad/envío saliente y la planificación de carga útil
- `buildThreadAwareOutboundSessionRoute(...)` de
  `openclaw/plugin-sdk/channel-core` cuando una ruta saliente debe preservar un
  `replyToId`/`threadId` explícito o recuperar la sesión `:thread:` actual
  después de que la clave de sesión base todavía coincida. Los complementos del proveedor pueden anular la precedencia, el comportamiento del sufijo y la normalización del ID del hilo cuando su plataforma tiene semánticas de entrega de hilos nativas.
- `openclaw/plugin-sdk/thread-bindings-runtime` para el ciclo de vida de vinculación de hilos
  y el registro del adaptador
- `openclaw/plugin-sdk/agent-media-payload` solo cuando todavía se requiere un diseño de campo de carga útil de agente/medios heredado
- `openclaw/plugin-sdk/telegram-command-config` para la normalización de comandos personalizados de Telegram,
  la validación de duplicados/conflictos y un contrato de configuración de comando estable de reserva

Los canales de solo autenticación generalmente pueden detenerse en la ruta predeterminada: el núcleo maneja las aprobaciones y el complemento solo expone capacidades de autenticación y salida. Los canales de aprobación nativos como Matrix, Slack, Telegram y transportes de chat personalizados deben usar los asistentes nativos compartidos en lugar de crear su propio ciclo de vida de aprobación.

## Política de mención entrante

Mantenga el manejo de menciones entrantes dividido en dos capas:

- recopilación de evidencia propiedad del complemento
- evaluación de políticas compartidas

Use `openclaw/plugin-sdk/channel-mention-gating` para las decisiones de política de menciones.
Use `openclaw/plugin-sdk/channel-inbound` solo cuando necesite el asistente de entrada
barril más amplio.

Adecuado para la lógica local del complemento:

- detección de respuesta al bot
- detección de bot citado
- verificaciones de participación en hilos
- exclusiones de mensajes de servicio/sistema
- cachés nativos de la plataforma necesarios para probar la participación del bot

Adecuado para el asistente compartido:

- `requireMention`
- resultado de mención explícita
- lista de permitidos de mención implícita
- omisión de comandos
- decisión final de omisión

Flujo preferido:

1. Calcule los datos locales de mención.
2. Pase esos datos a `resolveInboundMentionDecision({ facts, policy })`.
3. Use `decision.effectiveWasMentioned`, `decision.shouldBypassMention` y `decision.shouldSkip` en su puerta de entrada.

```typescript
import { implicitMentionKindWhen, matchesMentionWithExplicit, resolveInboundMentionDecision } from "openclaw/plugin-sdk/channel-inbound";

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [...implicitMentionKindWhen("reply_to_bot", isReplyToBot), ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot)],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` expone los mismos asistentes de mención compartidos para
los complementos de canal empaquetados que ya dependen de la inyección en tiempo de ejecución:

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Si solo necesita `implicitMentionKindWhen` y
`resolveInboundMentionDecision`, importe desde
`openclaw/plugin-sdk/channel-mention-gating` para evitar cargar asistentes de tiempo de ejecución
de entrada no relacionados.

Los antiguos asistentes `resolveMentionGating*` permanecen en
`openclaw/plugin-sdk/channel-inbound` solo como exportaciones de compatibilidad. El código nuevo
debería usar `resolveInboundMentionDecision({ facts, policy })`.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos estándar del complemento. El campo `channel` en `package.json` es
    lo que hace que este sea un complemento de canal. Para obtener la superficie completa de metadatos del paquete,
    consulte [Configuración y configuración de complementos](/es/plugins/sdk-setup#openclaw-channel):

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "acme-chat": {
            "type": "object",
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

  </Step>

  <Step title="Construir el objeto del complemento de canal">
    La interfaz `ChannelPlugin` tiene muchas superficies de adaptador opcionales. Comience con
    lo mínimo — `id` y `setup` — y agregue adaptadores según los necesite.

    Cree `src/channel.ts`:

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    <Accordion title="Lo que hace createChatChannelPlugin por usted">
      En lugar de implementar manualmente interfaces de adaptador de bajo nivel, usted pasa
      opciones declarativas y el constructor las compone:

      | Opción | Lo que conecta |
      | --- | --- |
      | `security.dm` | Solucionador de seguridad de DM con ámbito desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento de DM basado en texto con intercambio de códigos |
      | `threading` | Solucionador de modo de respuesta (fijo, con ámbito de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador sin procesar en lugar de las opciones
      declarativas si necesita un control total.
    </Accordion>

  </Step>

  <Step title="Conectar el punto de entrada">
    Cree `index.ts`:

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    Coloque los descriptores de CLI propiedad del canal en `registerCliMetadata(...)` para que OpenClaw
    pueda mostrarlos en la ayuda raíz sin activar el tiempo de ejecución completo del canal,
    mientras que las cargas completas normales aún recogen los mismos descriptores para el registro real de
    comandos. Mantenga `registerFull(...)` para el trabajo exclusivo del tiempo de ejecución.
    Si `registerFull(...)` registra métodos RPC de puerta de enlace, use un
    prefijo específico del complemento. Los espacios de nombres de administración principales (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre
    resuelven a `operator.admin`.
    `defineChannelPluginEntry` maneja la división del modo de registro automáticamente. Vea
    [Puntos de entrada](/es/plugins/sdk-entrypoints#definechannelpluginentry) para todas
    las opciones.

  </Step>

  <Step title="Añada una entrada de configuración">
    Cree `setup-entry.ts` para una carga ligera durante la incorporación:

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está deshabilitado
    o sin configurar. Evita引入 código de ejecución pesado durante los flujos de configuración.
    Consulte [Configuración y ajustes](/es/plugins/sdk-setup#setup-entry) para obtener más detalles.

    Los canales del espacio de trabajo empaquetados que dividen las exportaciones seguras para la configuración en módulos auxiliares
    pueden usar `defineBundledChannelSetupEntry(...)` de
    `openclaw/plugin-sdk/channel-entry-contract` cuando también necesitan un
    definidor explícito de tiempo de ejecución en la configuración.

  </Step>

  <Step title="Gestionar los mensajes entrantes">
    Su complemento necesita recibir mensajes de la plataforma y reenviarlos a
    OpenClaw. El patrón típico es un webhook que verifica la solicitud y
    la despacha a través del controlador de entrada de su canal:

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK —
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      El manejo de mensajes entrantes es específico del canal. Cada complemento de canal posee
      su propia canalización de entrada. Mire los complementos de canal empaquetados
      (por ejemplo, el paquete del complemento de Microsoft Teams o Google Chat) para ver patrones reales.
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Probar">
Escriba pruebas colocadas en `src/channel.test.ts`:

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    Para obtener asistentes de pruebas compartidos, consulte [Pruebas](/es/plugins/sdk-testing).

  </Step>
</Steps>

## Estructura de archivos

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## Temas avanzados

<CardGroup cols={2}>
  <Card title="Opciones de hilos" icon="git-branch" href="/es/plugins/sdk-entrypoints#registration-mode">
    Modos de respuesta fijos, con alcance de cuenta o personalizados
  </Card>
  <Card title="Integración de herramientas de mensajes" icon="puzzle" href="/es/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool y descubrimiento de acciones
  </Card>
  <Card title="Resolución de objetivos" icon="crosshair" href="/es/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, STT, media, subagente vía api.runtime
  </Card>
</CardGroup>

<Note>Algunas costuras de asistentes empaquetados todavía existen para el mantenimiento y la compatibilidad de los plugins empaquetados. No son el patrón recomendado para nuevos plugins de canal; se prefiere las subrutas genéricas de channel/setup/reply/runtime de la superficie común del SDK a menos que estés manteniendo directamente esa familia de plugins empaquetados.</Note>

## Próximos pasos

- [Plugins de proveedores](/es/plugins/sdk-provider-plugins) — si tu plugin también proporciona modelos
- [Resumen del SDK](/es/plugins/sdk-overview) — referencia completa de importación de subrutas
- [Pruebas del SDK](/es/plugins/sdk-testing) — utilidades de pruebas y pruebas de contrato
- [Manifiesto del Plugin](/es/plugins/manifest) — esquema completo del manifiesto
