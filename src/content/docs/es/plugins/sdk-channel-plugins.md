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

<Info>Si no ha construido ningún plugin de OpenClaw antes, lea [Getting Started](/en/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

## Cómo funcionan los complementos de canales

Los complementos de canal no necesitan sus propias herramientas de envío/edición/reacción. OpenClaw mantiene una
herramienta `message` compartida en el núcleo. Su complemento posee:

- **Configuración** — resolución de cuenta y asistente de configuración
- **Seguridad** — política de MD y listas de permitidos
- **Emparejamiento** — flujo de aprobación de MD
- **Gramática de sesión** — cómo se asignan los ids de conversación específicos del proveedor a chats base, ids de hilo y reservas principales
- **Saliente** — envío de texto, medios y encuestas a la plataforma
- **Hilos** — cómo se hilvanan las respuestas

El núcleo es propietario de la herramienta de mensajes compartida, el cableado de avisos (prompt), la forma de la clave de sesión externa,
la contabilidad genérica de `:thread:` y el despacho.

Si su canal añade parámetros de herramienta de mensaje que transportan fuentes de medios, exponga esos
nombres de parámetros a través de `describeMessageTool(...).mediaSourceParams`. Core usa
esa lista explícita para la normalización de rutas de sandbox y la política de acceso a medios saliente,
por lo que los plugins no necesitan casos especiales en el núcleo compartido para parámetros de
avatar, archivo adjunto o imagen de portada específicos del proveedor.
Se prefiere devolver un mapa con clave de acción tal como
`{ "set-profile": ["avatarUrl", "avatarPath"] }` para que las acciones no relacionadas no
hereden los argumentos de medios de otra acción. Una matriz plana todavía funciona para los parámetros que
se comparten intencionalmente en cada acción expuesta.

Si su plataforma almacena un ámbito adicional dentro de los ids de conversación, mantenga ese análisis
en el plugin con `messaging.resolveSessionConversation(...)`. Ese es el
gancho canónico para mapear `rawId` al id de conversación base, el id de hilo opcional,
el `baseConversationId` explícito y cualquier `parentConversationCandidates`.
Cuando devuelva `parentConversationCandidates`, manténgalos ordenados del
padre más estrecho a la conversación más amplia/base.

Los plugins empaquetados que necesitan el mismo análisis antes de que se inicie el registro del canal
también pueden exponer un archivo `session-key-api.ts` de nivel superior con una exportación
`resolveSessionConversation(...)` coincidente. Core usa esa superficie segura para el arranque
solo cuando el registro de plugins en tiempo de ejecución aún no está disponible.

`messaging.resolveParentConversationCandidates(...)` sigue disponible como un
recurso de compatibilidad heredada cuando un plugin solo necesita respaldos principales encima
del id genérico/crudo. Si existen ambos ganchos, core usa
`resolveSessionConversation(...).parentConversationCandidates` primero y solo
retrocede a `resolveParentConversationCandidates(...)` cuando el gancho canónico
los omite.

## Aprobaciones y capacidades del canal

La mayoría de los plugins de canal no necesitan código específico para aprobaciones.

- Core es propietario del `/approve` del mismo chat, las cargas útiles compartidas del botón de aprobación y la entrega de respaldo genérica.
- Se prefiere un objeto `approvalCapability` en el plugin del canal cuando el canal necesita un comportamiento específico para aprobaciones.
- `ChannelPlugin.approvals` se elimina. Coloque los datos de aprobación delivery/native/render/auth en `approvalCapability`.
- `plugin.auth` es solo login/logout; el núcleo ya no lee los hooks de autenticación de aprobación de ese objeto.
- `approvalCapability.authorizeActorAction` y `approvalCapability.getActionAvailabilityState` son la interfaz canónica de autenticación de aprobaciones.
- Use `approvalCapability.getActionAvailabilityState` para la disponibilidad de autenticación de aprobaciones en el mismo chat.
- Si su canal expone aprobaciones de ejecución nativas, use `approvalCapability.getExecInitiatingSurfaceState` para el estado de la superficie de inicio/cliente nativo cuando difiera de la autenticación de aprobación en el mismo chat. El núcleo usa ese hook específico de ejecución para distinguir entre `enabled` y `disabled`, decidir si el canal de inicio admite aprobaciones de ejecución nativas e incluir el canal en la guía de contingencia del cliente nativo. `createApproverRestrictedNativeApprovalCapability(...)` rellena esto para el caso común.
- Use `outbound.shouldSuppressLocalPayloadPrompt` o `outbound.beforeDeliverPayload` para el comportamiento del ciclo de vida de la carga útil específico del canal, como ocultar avisos de aprobación local duplicados o enviar indicadores de escritura antes de la entrega.
- Use `approvalCapability.delivery` solo para el enrutamiento de aprobaciones nativas o la supresión de la contingencia.
- Use `approvalCapability.nativeRuntime` para los datos de aprobación nativa propiedad del canal. Manténgalo diferido en los puntos de entrada frecuentes del canal con `createLazyChannelApprovalNativeRuntimeAdapter(...)`, que puede importar su módulo de ejecución bajo demanda mientras aún permite que el núcleo ensamble el ciclo de vida de la aprobación.
- Use `approvalCapability.render` solo cuando un canal realmente necesita cargas útiles de aprobación personalizadas en lugar del renderizador compartido.
- Use `approvalCapability.describeExecApprovalSetup` cuando el canal desea que la respuesta de ruta deshabilitada explique las perillas de configuración exactas necesarias para habilitar las aprobaciones de ejecución nativas. El hook recibe `{ channel, channelLabel, accountId }`; los canales de cuenta con nombre deben renderizar rutas con ámbito de cuenta como `channels.<channel>.accounts.<id>.execApprovals.*` en lugar de los valores predeterminados de nivel superior.
- Si un canal puede inferir identidades de MD estables similares a las del propietario a partir de la configuración existente, use `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` para restringir `/approve` en el mismo chat sin agregar lógica central específica para las aprobaciones.
- Si un canal necesita entrega nativa de aprobaciones, mantenga el código del canal enfocado en la normalización de objetivos y los hechos de transporte/presentación. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` y `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Coloque los hechos específicos del canal detrás de `approvalCapability.nativeRuntime`, idealmente a través de `createChannelApprovalNativeRuntimeAdapter(...)` o `createLazyChannelApprovalNativeRuntimeAdapter(...)`, para que el núcleo pueda ensamblar el controlador y gestionar el filtrado de solicitudes, enrutamiento, deduplicación, caducidad, suscripción a la puerta de enlace y avisos de enrutamiento a otro lugar. `nativeRuntime` se divide en algunos puntos de conexión más pequeños:
- `availability` — si la cuenta está configurada y si se debe manejar una solicitud
- `presentation` — asignar el modelo de vista de aprobación compartido a cargas útiles nativas pendientes/resueltas/caducadas o acciones finales
- `transport` — preparar objetivos además de enviar/actualizar/eliminar mensajes de aprobación nativos
- `interactions` — enlaces opcionales de vincular/desvincular/limpiar-acción para botones o reacciones nativas
- `observe` — enlaces opcionales de diagnóstico de entrega
- Si el canal necesita objetos propiedad del tiempo de ejecución, como un cliente, token, aplicación Bolt o receptor de webhooks, regístrelos a través de `openclaw/plugin-sdk/channel-runtime-context`. El registro genérico de contexto de tiempo de ejecución permite al núcleo inicializar controladores impulsados por capacidades desde el estado de inicio del canal sin agregar pegamento de contenedor específico para aprobaciones.
- Recurre al `createChannelApprovalHandler` o `createChannelNativeApprovalRuntime` de nivel inferior solo cuando el punto de conexión impulsado por capacidades aún no sea lo suficientemente expresivo.
- Los canales de aprobación nativos deben enrutar tanto `accountId` como `approvalKind` a través de esos ayudantes. `accountId` mantiene la política de aprobación de múltiples cuentas enfocada en la cuenta de bot correcta, y `approvalKind` mantiene el comportamiento de aprobación exec vs. plugin disponible para el canal sin ramificaciones codificadas en el núcleo.
- Ahora Core también gestiona los avisos de reenvío de aprobaciones. Los complementos de canal no deben enviar sus propios mensajes de seguimiento de "la aprobación fue a MDs / otro canal" desde `createChannelNativeApprovalRuntime`; en su lugar, expongan el enrutamiento preciso de origen + DM del aprobador a través de los asistentes de capacidad de aprobación compartidos y dejen que Core agregue las entregas reales antes de publicar cualquier aviso de vuelta al chat iniciador.
- Conservar el tipo de id de aprobación entregado de extremo a extremo. Los clientes nativos no deben
  adivinar ni reescribir el enrutamiento de aprobaciones exec vs. plugin desde el estado local del canal.
- Diferentes tipos de aprobación pueden exponer intencionalmente diferentes superficies nativas.
  Ejemplos incluidos actuales:
  - Slack mantiene disponible el enrutamiento de aprobaciones nativas tanto para ids exec como de plugin.
  - Matrix mantiene el mismo enrutamiento nativo de DM/canal y la UX de reacciones para aprobaciones
    exec y de plugin, al tiempo que aún permite que la autenticación difiera según el tipo de aprobación.
- `createApproverRestrictedNativeApprovalAdapter` todavía existe como un contenedor de compatibilidad, pero el código nuevo debería preferir el constructor de capacidades y exponer `approvalCapability` en el complemento.

Para los puntos de entrada de canal frecuentes, prefiera las subrutas de tiempo de ejecución más estrechas cuando solo necesite
una parte de esa familia:

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
`openclaw/plugin-sdk/reply-chunking` cuando no necesite la superficie general más amplia.

Específicamente para la configuración:

- `openclaw/plugin-sdk/setup-runtime` cubre los asistentes de configuración seguros en tiempo de ejecución:
  adaptadores de parches de configuración seguros para importar (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), salida de notas de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries`, y los constructores
  de proxy de configuración delegados
- `openclaw/plugin-sdk/setup-adapter-runtime` es la costura del adaptador
  estrecha y consciente del entorno para `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` cubre los constructores de configuración de instalación opcional
  además de algunos primitivos seguros para la configuración:
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si tu canal admite configuración o autenticación impulsada por variables de entorno y los flujos genéricos de inicio/configuración deben conocer esos nombres de variables de entorno antes de que se cargue el tiempo de ejecución, decláralos en el
manifiesto del complemento con `channelEnvVars`. Mantén el tiempo de ejecución del canal `envVars` o constantes
locales solo para el texto dirigido al operador.
`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled` y
`splitSetupEntries`

- usa la costura `openclaw/plugin-sdk/setup` más amplia solo cuando también necesites los
  asistentes de configuración/configuración compartida más pesados, como
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si tu canal solo quiere anunciar "instala este complemento primero" en las superficies de
configuración, prefiere `createOptionalChannelSetupSurface(...)`. El adaptador/asistente
generado falla cerrado en las escrituras y finalización de la configuración, y reutilizan
el mismo mensaje de instalación requerida en la validación, finalización y texto del enlace de
documentación.

Para otras rutas críticas del canal, prefiere los asistentes estrechos sobre las superficies heredadas
más amplias:

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` y
  `openclaw/plugin-sdk/account-helpers` para la configuración multicuenta
  y la reserva de cuenta predeterminada
- `openclaw/plugin-sdk/inbound-envelope` y
  `openclaw/plugin-sdk/inbound-reply-dispatch` para la ruta/sobre entrante y
  el cableado de registro y despacho
- `openclaw/plugin-sdk/messaging-targets` para el análisis/ coincidencia de objetivos
- `openclaw/plugin-sdk/outbound-media` y
  `openclaw/plugin-sdk/outbound-runtime` para la carga de medios además de los
  delegados de identidad/envío salientes
- `openclaw/plugin-sdk/thread-bindings-runtime` para el ciclo de vida de enlace de subprocesos
  y el registro del adaptador
- `openclaw/plugin-sdk/agent-media-payload` solo cuando aún se requiere un diseño de campo de carga útil
  de agente/medios heredado
- `openclaw/plugin-sdk/telegram-command-config` para la normalización de comandos personalizados de
  Telegram, validación de duplicados/conflictos y un contrato de configuración de comandos
  estable de reserva

Los canales de solo autenticación generalmente pueden detenerse en la ruta predeterminada: el núcleo maneja las aprobaciones y el complemento solo expone capacidades de salida/autenticación. Los canales de aprobación nativos como Matrix, Slack, Telegram y transportes de chat personalizados deben usar los asistentes nativos compartidos en lugar de crear su propio ciclo de vida de aprobación.

## Política de mención entrante

Mantenga el manejo de menciones entrantes dividido en dos capas:

- recopilación de pruebas propiedad del complemento
- evaluación de política compartida

Use `openclaw/plugin-sdk/channel-inbound` para la capa compartida.

Adecuado para la lógica local del complemento:

- detección de respuesta al bot
- detección de bot citado
- verificaciones de participación en hilos
- exclusiones de mensajes del servicio/sistema
- cachés nativos de la plataforma necesarios para probar la participación del bot

Adecuado para el asistente compartido:

- `requireMention`
- resultado de mención explícita
- lista de permitidos de mención implícita
- omisión de comando
- decisión final de omisión

Flujo preferido:

1. Calcule los datos de mención local.
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

Los asistentes más antiguos `resolveMentionGating*` permanecen en
`openclaw/plugin-sdk/channel-inbound` solo como exportaciones de compatibilidad. El código nuevo
debe usar `resolveInboundMentionDecision({ facts, policy })`.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos estándar del complemento. El campo `channel` en `package.json` es
    lo que convierte a esto en un complemento de canal. Para obtener la superficie completa de metadatos del paquete,
    consulte [Configuración y configuración de complementos](/en/plugins/sdk-setup#openclaw-channel):

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
    lo mínimo — `id` y `setup` — y añada adaptadores según los necesite.

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
      | `security.dm` | Resolvedor de seguridad de MD con ámbito desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento de MD basado en texto con intercambio de códigos |
      | `threading` | Resolvedor de modo de respuesta (fijo, con ámbito de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador sin procesar en lugar de las opciones declarativas
      si necesita un control total.
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

    Coloque descriptores de CLI propiedad del canal en `registerCliMetadata(...)` para que OpenClaw
    pueda mostrarlos en la ayuda raíz sin activar el tiempo de ejecución completo del canal,
    mientras que las cargas completas normales aún recogen los mismos descriptores para el registro real de
    comandos. Mantenga `registerFull(...)` para el trabajo exclusivo del tiempo de ejecución.
    Si `registerFull(...)` registra métodos RPC de puerta de enlace, use un
    prefijo específico del complemento. Los espacios de nombres de administración principal (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre
    resuelven a `operator.admin`.
    `defineChannelPluginEntry` maneja la división del modo de registro automáticamente. Vea
    [Puntos de entrada](/en/plugins/sdk-entrypoints#definechannelpluginentry) para todas
    las opciones.

  </Step>

  <Step title="Añadir una entrada de configuración">
    Cree `setup-entry.ts` para una carga ligera durante la incorporación:

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está desactivado
    o sin configurar. Evita cargar código de tiempo de ejecución pesado durante los flujos de configuración.
    Consulte [Configuración y ajuste](/en/plugins/sdk-setup#setup-entry) para obtener más detalles.

    Los canales de espacio de trabajo agrupados que dividen las exportaciones seguras para la configuración en módulos

de acompañamiento pueden usar `defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` cuando también necesitan un
definidor explícito de tiempo de ejecución en la configuración.

  </Step>

  <Step title="Manejar mensajes entrantes">
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
      su propia canalización de entrada. Mire los complementos de canal agrupados
      (por ejemplo, el paquete del complemento de Microsoft Teams o Google Chat) para ver patrones reales.
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Probar">
Escriba pruebas ubicadas en `src/channel.test.ts`:

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

    Para asistentes de pruebas compartidas, consulte [Pruebas](/en/plugins/sdk-testing).

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
  <Card title="Opciones de hilos" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    Modos de respuesta fijos, con ámbito de cuenta o personalizados
  </Card>
  <Card title="Integración de herramienta de mensaje" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool y descubrimiento de acciones
  </Card>
  <Card title="Resolución de objetivos" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Ayudantes de tiempo de ejecución" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, STT, media, subagent vía api.runtime
  </Card>
</CardGroup>

<Note>Algunas costuras de ayudantes integrados todavía existen para el mantenimiento y la compatibilidad de los complementos integrados. No son el patrón recomendado para nuevos complementos de canal; prefiera las subrutas genéricas channel/setup/reply/runtime de la superficie SDK común a menos que esté manteniendo directamente esa familia de complementos integrados.</Note>

## Próximos pasos

- [Complementos de proveedores](/en/plugins/sdk-provider-plugins) — si su complemento también proporciona modelos
- [Descripción general del SDK](/en/plugins/sdk-overview) — referencia completa de importación de subrutas
- [Pruebas del SDK](/en/plugins/sdk-testing) — utilidades de prueba y pruebas de contrato
- [Manifiesto del complemento](/en/plugins/manifest) — esquema completo del manifiesto
