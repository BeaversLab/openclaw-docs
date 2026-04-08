---
title: "Creación de complementos de canales"
sidebarTitle: "Complementos de canales"
summary: "Guía paso a paso para crear un complemento de canal de mensajería para OpenClaw"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

# Creación de complementos de canales

Esta guía explica cómo crear un complemento de canal que conecte OpenClaw con una
plataforma de mensajería. Al final, tendrá un canal funcional con seguridad de MD,
emparejamiento, hilos de respuesta y mensajería saliente.

<Info>Si no ha construido ningún complemento de OpenClaw antes, lea [Introducción](/en/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

## Cómo funcionan los complementos de canales

Los complementos de canal no necesitan sus propias herramientas de envío/edición/reacción. OpenClaw mantiene una
herramienta `message` compartida en el núcleo. Tu complemento es dueño de:

- **Configuración** — resolución de cuenta y asistente de configuración
- **Seguridad** — política de MD y listas de permitidos
- **Emparejamiento** — flujo de aprobación de MD
- **Gramática de sesión** — cómo se asignan los ids de conversación específicos del proveedor a chats base, ids de hilo y reservas principales
- **Saliente** — envío de texto, medios y encuestas a la plataforma
- **Hilos** — cómo se hilvanan las respuestas

El núcleo es dueño de la herramienta de mensaje compartida, el cableado del prompt, la forma de la clave de sesión externa,
la contabilidad `:thread:` genérica y el despacho.

Si tu plataforma almacena un alcance adicional dentro de los ids de conversación, mantén ese análisis
en el complemento con `messaging.resolveSessionConversation(...)`. Ese es
el enlace canónico para asignar `rawId` al id de conversación base, id de hilo opcional,
`baseConversationId` explícito y cualquier `parentConversationCandidates`.
Cuando devuelvas `parentConversationCandidates`, mantenlos ordenados del
principal más estrecho al más amplio/conversación base.

Los complementos empaquetados que necesitan el mismo análisis antes de que se inicie el registro del canal
también pueden exponer un archivo `session-key-api.ts` de nivel superior con una exportación
`resolveSessionConversation(...)` coincidente. El núcleo usa esa superficie segura para el arranque
solo cuando el registro de complementos en tiempo de ejecución aún no está disponible.

`messaging.resolveParentConversationCandidates(...)` permanece disponible como una
reserva de compatibilidad heredada cuando un complemento solo necesita reservas principales encima
del id genérico/sin procesar. Si existen ambos enlaces, el núcleo usa
`resolveSessionConversation(...).parentConversationCandidates` primero y solo
recurre a `resolveParentConversationCandidates(...)` cuando el enlace canónico
los omite.

## Aprobaciones y capacidades del canal

La mayoría de los complementos de canal no necesitan código específico para aprobaciones.

- El núcleo es propietario de `/approve` en el mismo chat, cargas útiles de botones de aprobación compartidas y entrega de reserva genérica.
- Prefiera un objeto `approvalCapability` en el complemento del canal cuando el canal necesite un comportamiento específico de aprobación.
- `approvalCapability.authorizeActorAction` y `approvalCapability.getActionAvailabilityState` son la costura canónica de autenticación de aprobaciones.
- Si su canal expone aprobaciones de ejecución nativas, implemente `approvalCapability.getActionAvailabilityState` incluso cuando el transporte nativo reside completamente bajo `approvalCapability.native`. Core usa ese gancho de disponibilidad para distinguir entre `enabled` y `disabled`, decidir si el canal iniciador admite aprobaciones nativas e incluir el canal en la guía de respaldo del cliente nativo.
- Use `outbound.shouldSuppressLocalPayloadPrompt` o `outbound.beforeDeliverPayload` para el comportamiento del ciclo de vida de la carga útil específico del canal, como ocultar avisos locales duplicados de aprobación o enviar indicadores de escritura antes de la entrega.
- Use `approvalCapability.delivery` solo para el enrutamiento de aprobaciones nativas o la supresión de respaldo.
- Use `approvalCapability.render` solo cuando un canal realmente necesite cargas útiles de aprobación personalizadas en lugar del renderizador compartido.
- Use `approvalCapability.describeExecApprovalSetup` cuando el canal quiera que la respuesta de ruta deshabilitada explique los perillas de configuración exactas necesarias para habilitar las aprobaciones de ejecución nativas. El gancho recibe `{ channel, channelLabel, accountId }`; los canales de cuenta con nombre deben representar rutas con ámbito de cuenta como `channels.<channel>.accounts.<id>.execApprovals.*` en lugar de valores predeterminados de nivel superior.
- Si un canal puede inferir identidades de MD estables similares a las de un propietario a partir de la configuración existente, use `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` para restringir el `/approve` del mismo chat sin agregar lógica principal específica de aprobación.
- Si un canal necesita entrega de aprobaciones nativas, mantenga el código del canal enfocado en la normalización de objetivos y los ganchos de transporte. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver`, `createApproverRestrictedNativeApprovalCapability` y `createChannelNativeApprovalRuntime` de `openclaw/plugin-sdk/approval-runtime` para que Core sea el propietario del filtrado, enrutamiento, deduplicación, caducidad y suscripción a la puerta de enlace de las solicitudes.
- Los canales de aprobación nativos deben enrutar tanto `accountId` como `approvalKind` a través de esos ayudantes. `accountId` mantiene la política de aprobación de múltiples cuentas limitada a la cuenta de bot correcta, y `approvalKind` mantiene disponible el comportamiento de aprobación de ejecución frente a complemento para el canal sin ramificaciones codificadas en el núcleo.
- Conservar el tipo de id de aprobación entregado de extremo a extremo. Los clientes nativos no deben
  adivinar ni reescribir el enrutamiento de aprobación de ejecución frente a complemento desde el estado local del canal.
- Diferentes tipos de aprobación pueden exponer intencionalmente diferentes superficies nativas.
  Ejemplos incluidos actuales:
  - Slack mantiene disponible el enrutamiento de aprobación nativo tanto para ids de ejecución como de complemento.
  - Matrix mantiene el enrutamiento nativo de DM/canal solo para aprobaciones de ejecución y deja
    las aprobaciones de complemento en la ruta `/approve` del mismo chat compartido.
- `createApproverRestrictedNativeApprovalAdapter` todavía existe como un contenedor de compatibilidad, pero el nuevo código debería preferir el constructor de capacidades y exponer `approvalCapability` en el complemento.

Para los puntos de entrada de canal frecuentes, prefiera las subrutas de tiempo de ejecución más estrechas cuando solo necesite una parte de esa familia:

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`

Asimismo, prefiera `openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/setup-adapter-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference` y
`openclaw/plugin-sdk/reply-chunking` cuando no necesite la superficie general más amplia.

Específicamente para la configuración:

- `openclaw/plugin-sdk/setup-runtime` cubre los ayudantes de configuración seguros en tiempo de ejecución:
  adaptadores de parches de configuración seguros para la importación (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries` y los constructores
  de proxy de configuración delegados
- `openclaw/plugin-sdk/setup-adapter-runtime` es la costura del adaptador
  consciente del entorno estrecho para `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` cubre los constructores de configuración de instalación opcional
  además de algunos primitivos seguros para la configuración:
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,
  `createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
  `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled` y
  `splitSetupEntries`
- use la interfaz `openclaw/plugin-sdk/setup` más amplia solo cuando también necesite los
  ayudantes compartidos de configuración/configuración más pesados como
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si su canal solo quiere anunciar "instale este complemento primero" en las superficies de
configuración, prefiera `createOptionalChannelSetupSurface(...)`. El adaptador/asistente
generado falla cerrado en la escritura y finalización de la configuración, y reutilizan
el mismo mensaje de instalación requerida en la validación, finalización y copia del enlace de documentación.

Para otras rutas activas del canal, prefiera los ayudantes estrechos sobre las superficies heredadas
más amplias:

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` y
  `openclaw/plugin-sdk/account-helpers` para la configuración de varias cuentas
  y el respaldo a la cuenta predeterminada
- `openclaw/plugin-sdk/inbound-envelope` y
  `openclaw/plugin-sdk/inbound-reply-dispatch` para el cableado de ruta/sobre entrante y
  registro y despacho
- `openclaw/plugin-sdk/messaging-targets` para el análisis/coincidencia de objetivos
- `openclaw/plugin-sdk/outbound-media` y
  `openclaw/plugin-sdk/outbound-runtime` para la carga de medios más los delegados de
  identidad/envío saliente
- `openclaw/plugin-sdk/thread-bindings-runtime` para el ciclo de vida de enlace de subprocesos
  y el registro de adaptadores
- `openclaw/plugin-sdk/agent-media-payload` solo cuando aún se requiere un diseño de campo de carga útil
  de agente/medios heredado
- `openclaw/plugin-sdk/telegram-command-config` para la normalización de comandos personalizados de Telegram,
  la validación de duplicados/conflictos y un contrato de configuración de comandos
  de respaldo estable

Los canales de solo autenticación generalmente pueden detenerse en la ruta predeterminada: el núcleo maneja las aprobaciones y el complemento solo expone capacidades de autenticación/salida. Los canales de aprobación nativos como Matrix, Slack, Telegram y transportes de chat personalizados deben usar los ayudantes nativos compartidos en lugar de crear su propio ciclo de vida de aprobación.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos de complementos estándar. El campo `channel` en `package.json` es
    lo que hace que esto sea un complemento de canal. Para obtener la superficie completa de metadatos del paquete,
    consulte [Configuración y complementos](/en/plugins/sdk-setup#openclawchannel):

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

    <Accordion title="Lo que createChatChannelPlugin hace por usted">
      En lugar de implementar interfaces de adaptador de bajo nivel manualmente, usted pasa
      opciones declarativas y el constructor las compone:

      | Opción | Lo que conecta |
      | --- | --- |
      | `security.dm` | Resolvedor de seguridad de MD con alcance desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento de MD basado en texto con intercambio de códigos |
      | `threading` | Resolvedor de modo de respuesta (fijo, con alcance de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador sin procesar en lugar de las opciones declarativas
      si necesita control total.
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
    mientras que las cargas completas normales todavía recogen los mismos descriptores para el registro real de
    comandos. Mantenga `registerFull(...)` para el trabajo solo de tiempo de ejecución.
    Si `registerFull(...)` registra métodos RPC de puerta de enlace, use un
    prefijo específico del complemento. Los espacios de nombres de administración central (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre
    resuelven a `operator.admin`.
    `defineChannelPluginEntry` maneja la división del modo de registro automáticamente. Consulte
    [Entry Points](/en/plugins/sdk-entrypoints#definechannelpluginentry) para todas
    las opciones.

  </Step>

  <Step title="Agregar una entrada de configuración">
    Cree `setup-entry.ts` para una carga ligera durante la incorporación:

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está desactivado
    o sin configurar. Evita extraer código de tiempo de ejecución pesado durante los flujos de configuración.
    Consulte [Setup and Config](/en/plugins/sdk-setup#setup-entry) para obtener detalles.

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
      El manejo de mensajes entrantes es específico del canal. Cada complemento de canal es propietario
      de su propia canalización de entrada. Mire los complementos de canal incluidos
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

    Para obtener asistentes de pruebas compartidos, consulte [Testing](/en/plugins/sdk-testing).

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
    Modos de respuesta fijos, con alcance de cuenta o personalizados
  </Card>
  <Card title="Integración de herramientas de mensajes" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool y descubrimiento de acciones
  </Card>
  <Card title="Resolución de objetivos" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, STT, medios, subagente a través de api.runtime
  </Card>
</CardGroup>

<Note>Algunas costuras de asistente empaquetadas aún existen para el mantenimiento y la compatibilidad de los complementos empaquetados. No son el patrón recomendado para los nuevos complementos de canal; prefiera las subrutas genéricas channel/setup/reply/runtime de la superficie común del SDK, a menos que esté manteniendo directamente esa familia de complementos empaquetados.</Note>

## Pasos siguientes

- [Complementos de proveedor](/en/plugins/sdk-provider-plugins) — si su complemento también proporciona modelos
- [Descripción general del SDK](/en/plugins/sdk-overview) — referencia completa de importaciones de subrutas
- [Pruebas del SDK](/en/plugins/sdk-testing) — utilidades de prueba y pruebas de contrato
- [Manifiesto del complemento](/en/plugins/manifest) — esquema completo del manifiesto
