---
summary: "Guía paso a paso para crear un complemento de canal de mensajería para OpenClaw"
title: "Crear complementos de canal"
sidebarTitle: "Complementos de canal"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

Esta guía explica cómo crear un complemento de canal que conecte OpenClaw con una
plataforma de mensajería. Al final tendrás un canal funcional con seguridad de MD,
emparejamiento, hilos de respuesta y mensajería saliente.

<Info>Si no has creado ningún complemento de OpenClaw antes, lee [Primeros pasos](/es/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

## Cómo funcionan los complementos de canal

Los complementos de canal no necesitan sus propias herramientas de enviar/editar/reaccionar. OpenClaw mantiene una
herramienta compartida `message` en el núcleo. Tu complemento posee:

- **Config** — resolución de cuenta y asistente de configuración
- **Seguridad** — política de MD y listas de permitidos
- **Emparejamiento** — flujo de aprobación de MD
- **Gramática de sesión** — cómo se asignan los IDs de conversación específicos del proveedor a chats base, IDs de hilo y respaldos principales
- **Saliente** — envío de texto, medios y encuestas a la plataforma
- **Hilos** — cómo se agrupan las respuestas
- **Latido de escritura** — señales opcionales de escritura/ocupado para objetivos de entrega de latido

El núcleo es propietario de la herramienta de mensajes compartida, el cableado de avisos (prompt), la forma de la clave de sesión externa,
la contabilidad genérica de `:thread:` y el despacho.

Si tu canal admite indicadores de escritura fuera de las respuestas entrantes, expone
`heartbeat.sendTyping(...)` en el complemento del canal. El núcleo lo llama con el
objetivo de entrega de latido resuelto antes de que comience la ejecución del modelo de latido
y usa el ciclo de vida compartido de mantenimiento/limpieza de escritura. Agrega `heartbeat.clearTyping(...)`
cuando la plataforma necesita una señal de detención explícita.

Si tu canal añade parámetros de herramienta de mensaje que llevan fuentes de medios, expone esos
nombres de parámetros a través de `describeMessageTool(...).mediaSourceParams`. El núcleo usa
esa lista explícita para la normalización de rutas del sandbox y la política de acceso a medios
saliente, por lo que los complementos no necesitan casos especiales en el núcleo compartido para parámetros
de avatar, archivo adjunto o imagen de portada específicos del proveedor.
Se prefiere devolver un mapa con clave de acción como
`{ "set-profile": ["avatarUrl", "avatarPath"] }` para que acciones no relacionadas no
hereden los argumentos de medios de otra acción. Una matriz plana todavía funciona para parámetros que
se comparten intencionalmente en cada acción expuesta.

Si tu plataforma almacena un alcance adicional dentro de los IDs de conversación, mantén ese análisis en el complemento con `messaging.resolveSessionConversation(...)`. Ese es el enlace canónico para mapear `rawId` al ID de conversación base, ID de hilo opcional, `baseConversationId` explícito y cualquier `parentConversationCandidates`. Cuando devuelvas `parentConversationCandidates`, mantenlos ordenados desde el padre más estrecho hasta la conversación más amplia/base.

Los complementos agrupados que necesitan el mismo análisis antes de que se inicie el registro del canal también pueden exponer un archivo `session-key-api.ts` de nivel superior con una exportación `resolveSessionConversation(...)` coincidente. Core utiliza esa superficie segura para el arranque solo cuando el registro del complemento en tiempo de ejecución aún no está disponible.

`messaging.resolveParentConversationCandidates(...)` sigue disponible como mecanismo de respaldo para compatibilidad heredada cuando un complemento solo necesita respaldos principales encima del ID genérico/sin procesar. Si existen ambos enlaces, core usa `resolveSessionConversation(...).parentConversationCandidates` primero y solo recurre a `resolveParentConversationCandidates(...)` cuando el enlace canónico los omite.

## Aprobaciones y capacidades del canal

La mayoría de los complementos de canal no necesitan código específico para aprobaciones.

- Core posee el `/approve` en el mismo chat, las cargas útiles compartidas del botón de aprobación y la entrega de respaldo genérica.
- Prefiere un objeto `approvalCapability` en el complemento de canal cuando el canal necesita un comportamiento específico para aprobaciones.
- `ChannelPlugin.approvals` se ha eliminado. Coloca los datos de entrega/nativo/renderizado/autenticación de aprobaciones en `approvalCapability`.
- `plugin.auth` es solo para inicio de sesión/cierre de sesión; core ya no lee enlaces de autenticación de aprobación de ese objeto.
- `approvalCapability.authorizeActorAction` y `approvalCapability.getActionAvailabilityState` son la costura canónica de autenticación de aprobaciones.
- Usa `approvalCapability.getActionAvailabilityState` para la disponibilidad de autenticación de aprobaciones en el mismo chat.
- Si tu canal expone aprobaciones de ejecución nativas, usa `approvalCapability.getExecInitiatingSurfaceState` para el estado de la superficie de inicio/cliente nativo cuando difiera de la autenticación de aprobación del mismo chat. Core usa ese enlace específico de ejecución para distinguir `enabled` vs `disabled`, decidir si el canal de inicio admite aprobaciones de ejecución nativas e incluir el canal en la guía de contingencia del cliente nativo. `createApproverRestrictedNativeApprovalCapability(...)` rellena esto para el caso común.
- Usa `outbound.shouldSuppressLocalPayloadPrompt` o `outbound.beforeDeliverPayload` para el comportamiento del ciclo de vida de la carga útil específica del canal, como ocultar indicadores de aprobación local duplicados o enviar indicadores de escritura antes de la entrega.
- Usa `approvalCapability.delivery` solo para el enrutamiento de aprobación nativa o la supresión de la contingencia.
- Usa `approvalCapability.nativeRuntime` para los datos de aprobación nativa propiedad del canal. Mantenlo diferido en los puntos de entrada frecuentes del canal con `createLazyChannelApprovalNativeRuntimeAdapter(...)`, que puede importar tu módulo de tiempo de ejecución bajo demanda mientras aún permite a core ensamblar el ciclo de vida de aprobación.
- Usa `approvalCapability.render` solo cuando un canal realmente necesite cargas útiles de aprobación personalizadas en lugar del renderizador compartido.
- Usa `approvalCapability.describeExecApprovalSetup` cuando el canal quiera que la respuesta de ruta deshabilitada explique los ajustes de configuración exactos necesarios para habilitar las aprobaciones de ejecución nativas. El enlace recibe `{ channel, channelLabel, accountId }`; los canales de cuenta con nombre deben renderizar rutas con alcance de cuenta como `channels.<channel>.accounts.<id>.execApprovals.*` en lugar de los valores predeterminados de nivel superior.
- Si un canal puede inferir identidades de MD estables tipo propietario desde la configuración existente, usa `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` para restringir el `/approve` del mismo chat sin agregar lógica central específica de aprobación.
- Si un canal necesita entrega de aprobaciones nativa, mantenga el código del canal enfocado en la normalización de objetivos más los hechos de transporte/presentación. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` y `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Ponga los hechos específicos del canal detrás de `approvalCapability.nativeRuntime`, idealmente a través de `createChannelApprovalNativeRuntimeAdapter(...)` o `createLazyChannelApprovalNativeRuntimeAdapter(...)`, para que el núcleo pueda ensamblar el controlador y asumir el filtrado de solicitudes, enrutamiento, deduplicación, caducidad, suscripción a la puerta de enlace y avisos de enrutado a otro lugar. `nativeRuntime` se divide en varias juntas más pequeñas:
- `availability` — si la cuenta está configurada y si se debe manejar una solicitud
- `presentation` — asignar el modelo de vista de aprobación compartido a cargas útiles nativas pendientes/resueltas/caducadas o acciones finales
- `transport` — preparar objetivos más enviar/actualizar/eliminar mensajes de aprobación nativos
- `interactions` — ganchos opcionales de vinculación/desvinculación/limpieza de acciones para botones o reacciones nativas
- `observe` — ganchos opcionales de diagnóstico de entrega
- Si el canal necesita objetos propiedad del tiempo de ejecución, como un cliente, token, aplicación Bolt o receptor de webhooks, regístrelos a través de `openclaw/plugin-sdk/channel-runtime-context`. El registro genérico de contexto de tiempo de ejecución permite al núcleo arrancar controladores impulsados por capacidades desde el estado de inicio del canal sin agregar pegamento de contenedor específico para aprobaciones.
- Recurra a `createChannelApprovalHandler` o `createChannelNativeApprovalRuntime` de menor nivel solo cuando la junta impulsada por capacidades aún no sea lo suficientemente expresiva.
- Los canales de aprobación nativos deben enrutar tanto `accountId` como `approvalKind` a través de esos ayudantes. `accountId` mantiene la política de aprobación de múltiples cuentas limitada a la cuenta de bot correcta, y `approvalKind` mantiene el comportamiento de aprobación de ejecución frente a complemento disponible para el canal sin ramificaciones codificadas en el núcleo.
- Ahora el núcleo también posee los avisos de redirección de aprobaciones. Los complementos de canal no deben enviar sus propios mensajes de seguimiento de "la aprobación pasó a los MD / otro canal" desde `createChannelNativeApprovalRuntime`; en su lugar, expongan el enrutamiento preciso de origen + MD del aprobador a través de los asistentes de capacidad de aprobación compartidos y permitan que el núcleo agregue las entregas reales antes de publicar cualquier aviso de vuelta al chat iniciador.
- Conservar el tipo de id de aprobación entregado de extremo a extremo. Los clientes nativos no deben
  adivinar ni reescribir el enrutamiento de aprobaciones exec vs. plugin desde el estado local del canal.
- Diferentes tipos de aprobación pueden exponer intencionalmente diferentes superficies nativas.
  Ejemplos incluidos actuales:
  - Slack mantiene disponible el enrutamiento de aprobación nativo tanto para ids exec como de complemento.
  - Matrix mantiene el mismo enrutamiento nativo de MD/canal y la experiencia de usuario de reacciones para las aprobaciones
    exec y de complemento, mientras que aún permite que la autenticación difiera por tipo de aprobación.
- `createApproverRestrictedNativeApprovalAdapter` todavía existe como un contenedor de compatibilidad, pero el código nuevo debería preferir el constructor de capacidades y exponer `approvalCapability` en el complemento.

Para los puntos de entrada de canal activos, prefiera las subrutas de tiempo de ejecución más estrechas cuando solo
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
`openclaw/plugin-sdk/reply-reference`, y
`openclaw/plugin-sdk/reply-chunking` cuando no necesite la superficie general
más amplia.

Específicamente para la configuración:

- `openclaw/plugin-sdk/setup-runtime` cubre los asistentes de configuración seguros en tiempo de ejecución:
  adaptadores de parches de configuración seguros para importar (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries`, y los constructores
  de proxy de configuración delegados
- `openclaw/plugin-sdk/setup-adapter-runtime` es la costura del adaptador
  consciente del entorno estrecho para `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` cubre los constructores de configuración de instalación opcional
  más algunos primitivos seguros para la configuración:
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si su canal admite configuración o autenticación controlada por variables de entorno y los flujos genéricos de inicio/configuración
deben conocer esos nombres de entorno antes de que se cargue el tiempo de ejecución, declárelos en el
manifiesto del complemento con `channelEnvVars`. Mantenga el tiempo de ejecución del canal `envVars` o las constantes
locales solo para el texto orientado al operador.

Si su canal puede aparecer en `status`, `channels list`, `channels status`, o
escaneos SecretRef antes de que se inicie el tiempo de ejecución del complemento, agregue `openclaw.setupEntry` en
`package.json`. Ese punto de entrada debe ser seguro de importar en rutas de comandos
de solo lectura y debe devolver los metadatos del canal, el adaptador de configuración seguro para la configuración, el adaptador de estado
y los metadatos del objetivo secreto del canal necesarios para esos resúmenes. No
inicie clientes, oyentes o tiempos de ejecución de transporte desde la entrada de configuración.

Mantenga también la ruta de importación de entrada del canal principal estrecha. El descubrimiento puede evaluar la
entrada y el módulo del complemento del canal para registrar capacidades sin activar
el canal. Los archivos como `channel-plugin-api.ts` deben exportar el objeto del
complemento del canal sin importar asistentes de configuración, clientes de transporte,
oyentes de sockets, iniciadores de subprocesos o módulos de inicio de servicio. Coloque esas piezas de
tiempo de ejecución en módulos cargados desde `registerFull(...)`, establecedores de tiempo de ejecución o adaptadores
de capacidad diferidos.

`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, y
`splitSetupEntries`

- use la costura `openclaw/plugin-sdk/setup` más amplia solo cuando también necesite los
  asistentes compartidos de configuración/inicio más pesados como
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si su canal solo quiere anunciar "instale este complemento primero" en las superficies de
configuración, prefiera `createOptionalChannelSetupSurface(...)`. El adaptador/asistente
generado falla de forma cerrada en las escrituras y finalización de la configuración, y reutiliza
el mismo mensaje de instalación requerida en la validación, finalización y texto de
enlace a la documentación.

Para otras rutas activas del canal, prefiera los ayudantes estrechos sobre las superficies heredadas más amplias:

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` y
  `openclaw/plugin-sdk/account-helpers` para la configuración multicuenta y
  la reserva a la cuenta predeterminada
- `openclaw/plugin-sdk/inbound-envelope` y
  `openclaw/plugin-sdk/inbound-reply-dispatch` para la ruta/sobre de entrada y
  el cableado de registro y despacho
- `openclaw/plugin-sdk/messaging-targets` para el análisis/emparejamiento de objetivos
- `openclaw/plugin-sdk/outbound-media` y
  `openclaw/plugin-sdk/outbound-runtime` para la carga de medios, además de los delegados de identidad/envío de salida y la planificación de cargas útiles
- `buildThreadAwareOutboundSessionRoute(...)` de
  `openclaw/plugin-sdk/channel-core` cuando una ruta de salida debe preservar un
  `replyToId`/`threadId` explícito o recuperar la sesión actual de `:thread:`
  después de que la clave de sesión base aún coincida. Los complementos del proveedor pueden anular
  la precedencia, el comportamiento del sufijo y la normalización del ID del hilo cuando su plataforma
  tiene semánticas de entrega de hilos nativas.
- `openclaw/plugin-sdk/thread-bindings-runtime` para el ciclo de vida de vinculación de hilos
  y el registro de adaptadores
- `openclaw/plugin-sdk/agent-media-payload` solo cuando todavía se requiere un diseño de campo de carga útil de agente/medias heredado
- `openclaw/plugin-sdk/telegram-command-config` para la normalización de comandos personalizados de Telegram,
  la validación de duplicados/conflictos y un contrato de configuración de comandos con reserva estable

Los canales de solo autenticación generalmente pueden detenerse en la ruta predeterminada: el núcleo maneja las aprobaciones y el complemento solo expone capacidades de autenticación y salida. Los canales de aprobación nativos como Matrix, Slack, Telegram y transportes de chat personalizados deben usar los asistentes nativos compartidos en lugar de crear su propio ciclo de vida de aprobación.

## Política de mención entrante

Mantenga el manejo de menciones entrantes dividido en dos capas:

- recopilación de evidencia propiedad del complemento
- evaluación de políticas compartidas

Use `openclaw/plugin-sdk/channel-mention-gating` para las decisiones de política de mención.
Use `openclaw/plugin-sdk/channel-inbound` solo cuando necesite el barril de ayuda de entrada más amplio.

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
los complementos de canal incluidos que ya dependen de la inyección en tiempo de ejecución:

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Si solo necesita `implicitMentionKindWhen` y
`resolveInboundMentionDecision`, impórtelos de
`openclaw/plugin-sdk/channel-mention-gating` para evitar cargar asistentes de tiempo de ejecución de entrada no relacionados.

Los helpers `resolveMentionGating*` antiguos permanecen en
`openclaw/plugin-sdk/channel-inbound` solo como exportaciones de compatibilidad. El nuevo código
debería usar `resolveInboundMentionDecision({ facts, policy })`.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos estándar del complemento. El campo `channel` en `package.json` es
    lo que convierte a esto en un complemento de canal. Para conocer la superficie completa de metadatos del paquete,
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
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "Bot token",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` valida `plugins.entries.acme-chat.config`. Úselo para
    la configuración propiedad del complemento que no sea la configuración de la cuenta del canal. `channelConfigs`
    valida `channels.acme-chat` y es la fuente de ruta fría utilizada por el esquema de configuración,
    la configuración y las superficies de la interfaz de usuario antes de que se cargue el tiempo de ejecución del complemento.

  </Step>

  <Step title="Compilar el objeto del complemento de canal">
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
      | `security.dm` | Resolvedor de seguridad de DM con alcance desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento de DM basado en texto con intercambio de códigos |
      | `threading` | Resolvedor de modo de respuesta (fijo, con alcance de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador sin procesar en lugar de las opciones declarativas
      si necesita control total.

      Los adaptadores de salida sin procesar pueden definir una función `chunker(text, limit, ctx)`.
      El `ctx.formatting` opcional lleva decisiones de formato en el momento de entrega
      como `maxLinesPerMessage`; aplíquelo antes de enviar para que el hilado de respuestas
      y los límites de los fragmentos se resuelvan una vez mediante la entrega de salida compartida.
      Los contextos de envío también incluyen `replyToIdSource` (`implicit` o `explicit`)
      cuando se resolvió un objetivo de respuesta nativo, por lo que los asistentes de carga útil pueden preservar
      etiquetas de respuesta explícitas sin consumir un espacio de respuesta implícito de un solo uso.
    </Accordion>

  </Step>

  <Step title="Conecte el punto de entrada">
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
    mientras que las cargas completas normales todavía recogen los mismos descriptores para el registro real de
    comandos. Mantenga `registerFull(...)` para el trabajo exclusivo del tiempo de ejecución.
    Si `registerFull(...)` registra métodos RPC de puerta de enlace, use un
    prefijo específico del complemento. Los espacios de nombres de administración principal (`config.*`,
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

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está desactivado
    o sin configurar. Evita cargar código pesado de tiempo de ejecución durante los flujos de configuración.
    Vea [Configuración y ajuste](/es/plugins/sdk-setup#setup-entry) para obtener detalles.

    Los canales del espacio de trabajo empaquetados que dividen las exportaciones seguras para la configuración en módulos
    adjuntos pueden usar `defineBundledChannelSetupEntry(...)` de
    `openclaw/plugin-sdk/channel-entry-contract` cuando también necesitan un
    definidor de tiempo de ejecución explícito para el momento de la configuración.

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
<Step title="Prueba">
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

    Para los asistentes de pruebas compartidos, consulte [Pruebas](/es/plugins/sdk-testing).

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
  <Card title="Resolución de objetivos" icon="crosshair" href="/es/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, STT, media, subagente vía api.runtime
  </Card>
</CardGroup>

<Note>Algunas costuras de asistentes empaquetados todavía existen para el mantenimiento y la compatibilidad de los plugins empaquetados. No son el patrón recomendado para nuevos plugins de canal; se prefiere las subrutas genéricas de channel/setup/reply/runtime de la superficie común del SDK a menos que estés manteniendo directamente esa familia de plugins empaquetados.</Note>

## Próximos pasos

- [Complementos de proveedores](/es/plugins/sdk-provider-plugins) — si su complemento también proporciona modelos
- [Resumen del SDK](/es/plugins/sdk-overview) — referencia de importación completa de subrutas
- [Pruebas del SDK](/es/plugins/sdk-testing) — utilidades de prueba y pruebas de contrato
- [Manifiesto del complemento](/es/plugins/manifest) — esquema completo del manifiesto

## Relacionado

- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Construcción de complementos](/es/plugins/building-plugins)
- [Complementos de arnés de agente](/es/plugins/sdk-agent-harness)
