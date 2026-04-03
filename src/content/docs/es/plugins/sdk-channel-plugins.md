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

<Info>Si no has construido ningún complemento de OpenClaw antes, lee [Getting Started](/en/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

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
- Usa `auth.authorizeActorAction` o `auth.getActionAvailabilityState` solo cuando la autenticación de aprobación difiera de la autenticación de chat normal.
- Use `outbound.shouldSuppressLocalPayloadPrompt` o `outbound.beforeDeliverPayload` para el comportamiento del ciclo de vida de la carga útil específico del canal, como ocultar avisos de aprobación local duplicados o enviar indicadores de escritura antes de la entrega.
- Use `approvals.delivery` solo para el enrutamiento nativo de aprobaciones o la supresión de retorno (fallback).
- Use `approvals.render` solo cuando un canal realmente necesite cargas útiles de aprobación personalizadas en lugar del procesador compartido.
- Si un canal puede inferir identidades de MD estables tipo propietario desde la configuración existente, use `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` para restringir el `/approve` del mismo chat sin añadir lógica central específica para aprobaciones.

Para Slack, Matrix, Microsoft Teams y canales de chat similares, la ruta predeterminada suele ser suficiente: el núcleo maneja las aprobaciones y el complemento solo expone capacidades normales de salida y autenticación.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos de complemento estándar. El campo `channel` en `package.json` es
    lo que convierte a esto en un complemento de canal:

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
    lo mínimo — `id` y `setup` — y agregue adaptadores a medida que los necesite.

    Cree `src/channel.ts`:

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
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
      En lugar de implementar interfaces de adaptador de bajo nivel manualmente, usted pasa
      opciones declarativas y el constructor las compone:

      | Opción | Lo que conecta |
      | --- | --- |
      | `security.dm` | Solucionador de seguridad DM con alcance desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento DM basado en texto con intercambio de código |
      | `threading` | Solucionador de modo de respuesta (fijo, con alcance de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador brutos en lugar de las opciones declarativas
      si necesita control total.
    </Accordion>

  </Step>

  <Step title="Conectar el punto de entrada">
    Cree `index.ts`:

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
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
    comandos. Mantenga `registerFull(...)` para el trabajo solo de tiempo de ejecución.
    `defineChannelPluginEntry` maneja la división del modo de registro automáticamente. Vea
    [Puntos de entrada](/en/plugins/sdk-entrypoints#definechannelpluginentry) para todas
    las opciones.

  </Step>

  <Step title="Agregar una entrada de configuración">
    Cree `setup-entry.ts` para una carga ligera durante la incorporación:

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está deshabilitado
    o sin configurar. Esto evita introducir código pesado de tiempo de ejecución durante los flujos de configuración.
    Vea [Configuración y Config](/en/plugins/sdk-setup#setup-entry) para obtener detalles.

  </Step>

  <Step title="Manejar mensajes entrantes">
    Tu complemento necesita recibir mensajes de la plataforma y reenviarlos a
    OpenClaw. El patrón típico es un webhook que verifica la solicitud y
    la despacha a través del controlador de entrada de tu canal:

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
      su propia canalización de entrada. Observa los complementos de canal incluidos
      (por ejemplo, el paquete del complemento de Microsoft Teams o Google Chat) para ver patrones reales.
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Prueba">
Escribe pruebas ubicadas en `src/channel.test.ts`:

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

    Para ver los asistentes de pruebas compartidos, consulta [Testing](/en/plugins/sdk-testing).

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
    Modos de respuesta fijos, de ámbito de cuenta o personalizados
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

## Siguientes pasos

- [Complementos de proveedor](/en/plugins/sdk-provider-plugins) — si tu complemento también proporciona modelos
- [Descripción general del SDK](/en/plugins/sdk-overview) — referencia completa de importaciones de subrutas
- [Pruebas del SDK](/en/plugins/sdk-testing) — utilidades de prueba y pruebas de contrato
- [Manifiesto del complemento](/en/plugins/manifest) — esquema completo del manifiesto
