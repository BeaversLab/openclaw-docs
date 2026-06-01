---
summary: "Utilidades y patrones de prueba para complementos de OpenClaw"
title: "Prueba de complementos"
sidebarTitle: "Pruebas"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

Referencia de utilidades de prueba, patrones y aplicación de reglas de lint para complementos de OpenClaw.

<Tip>**¿Buscas ejemplos de pruebas?** Las guías prácticas incluyen ejemplos de pruebas resueltos: [Pruebas de complementos de canal](/es/plugins/sdk-channel-plugins#step-6-test) y [Pruebas de complementos de proveedor](/es/plugins/sdk-provider-plugins#step-6-test).</Tip>

## Utilidades de prueba

Estas subrutas de asistentes de pruebas son puntos de entrada de código fuente locales del repositorio para las propias pruebas de complementos incluidos en OpenClaw. No son exportaciones del paquete para complementos de terceros, y pueden importar Vitest u otras dependencias de prueba exclusivas del repositorio.

**Importación simulada de la API del complemento:** `openclaw/plugin-sdk/plugin-test-api`

**Importación del contrato de tiempo de ejecución del agente:** `openclaw/plugin-sdk/agent-runtime-test-contracts`

**Importación del contrato del canal:** `openclaw/plugin-sdk/channel-contract-testing`

**Importación del asistente de prueba del canal:** `openclaw/plugin-sdk/channel-test-helpers`

**Importación de prueba de destino del canal:** `openclaw/plugin-sdk/channel-target-testing`

**Importación del contrato del complemento:** `openclaw/plugin-sdk/plugin-test-contracts`

**Importación de prueba de tiempo de ejecución del complemento:** `openclaw/plugin-sdk/plugin-test-runtime`

**Importación del contrato del proveedor:** `openclaw/plugin-sdk/provider-test-contracts`

**Importación simulada de HTTP del proveedor:** `openclaw/plugin-sdk/provider-http-test-mocks`

**Importación de prueba de entorno/red:** `openclaw/plugin-sdk/test-env`

**Importación de accesorio genérico:** `openclaw/plugin-sdk/test-fixtures`

**Importación simulada de módulos integrados de Node:** `openclaw/plugin-sdk/test-node-mocks`

Dentro del repositorio de OpenClaw, prefiera las subrutas específicas a continuación para las nuevas pruebas de complementos incluidos. El barril amplio `openclaw/plugin-sdk/testing` es solo por compatibilidad heredada. Las protecciones del repositorio rechazan nuevas importaciones reales de `plugin-sdk/testing` y `plugin-sdk/test-utils`; esos nombres permanecen solo como superficies de compatibilidad obsoletas para pruebas de registro de compatibilidad.

```typescript
import { shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/channel-feedback";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";
import { AUTH_PROFILE_RUNTIME_CONTRACT } from "openclaw/plugin-sdk/agent-runtime-test-contracts";
import { createTestPluginApi } from "openclaw/plugin-sdk/plugin-test-api";
import { expectChannelInboundContextContract } from "openclaw/plugin-sdk/channel-contract-testing";
import { createStartAccountContext } from "openclaw/plugin-sdk/channel-test-helpers";
import { describePluginRegistrationContract } from "openclaw/plugin-sdk/plugin-test-contracts";
import { registerSingleProviderPlugin } from "openclaw/plugin-sdk/plugin-test-runtime";
import { describeOpenAIProviderRuntimeContract } from "openclaw/plugin-sdk/provider-test-contracts";
import { getProviderHttpMocks } from "openclaw/plugin-sdk/provider-http-test-mocks";
import { withEnv, withFetchPreconnect, withServer } from "openclaw/plugin-sdk/test-env";
import { bundledPluginRoot, createCliRuntimeCapture, typedCases } from "openclaw/plugin-sdk/test-fixtures";
import { mockNodeBuiltinModule } from "openclaw/plugin-sdk/test-node-mocks";
```

### Exportaciones disponibles

| Exportación                                          | Propósito                                                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                | Construye un simulacro mínimo de la API del complemento para pruebas unitarias de registro directo. Importar desde `plugin-sdk/plugin-test-api`                                     |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | Accesorio de contrato de perfil de autenticación compartido para adaptadores de tiempo de ejecución de agente nativo. Importar desde `plugin-sdk/agent-runtime-test-contracts`      |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | Accesorio de contrato de supresión de entrega compartido para adaptadores de tiempo de ejecución de agente nativo. Importar desde `plugin-sdk/agent-runtime-test-contracts`         |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | Accesorio de contrato de clasificación de reserva compartido para adaptadores de tiempo de ejecución de agente nativo. Importar desde `plugin-sdk/agent-runtime-test-contracts`     |
| `createParameterFreeTool`                            | Construye accesorios de esquema de herramientas dinámicas para pruebas de contrato de tiempo de ejecución nativo. Importar desde `plugin-sdk/agent-runtime-test-contracts`          |
| `expectChannelInboundContextContract`                | Afirma la forma del contexto de entrada del canal. Importar desde `plugin-sdk/channel-contract-testing`                                                                             |
| `installChannelOutboundPayloadContractSuite`         | Instalar casos de contrato de carga útil saliente del canal. Importar desde `plugin-sdk/channel-contract-testing`                                                                   |
| `createStartAccountContext`                          | Construir contextos del ciclo de vida de la cuenta del canal. Importar desde `plugin-sdk/channel-test-helpers`                                                                      |
| `installChannelActionsContractSuite`                 | Instalar casos de contrato de acción de mensaje de canal genéricos. Importar desde `plugin-sdk/channel-test-helpers`                                                                |
| `installChannelSetupContractSuite`                   | Instalar casos de contrato de configuración de canal genéricos. Importar desde `plugin-sdk/channel-test-helpers`                                                                    |
| `installChannelStatusContractSuite`                  | Instalar casos de contrato de estado de canal genéricos. Importar desde `plugin-sdk/channel-test-helpers`                                                                           |
| `expectDirectoryIds`                                 | Afirmar ids de directorio de canal desde una función de lista de directorios. Importar desde `plugin-sdk/channel-test-helpers`                                                      |
| `assertBundledChannelEntries`                        | Afirmar que los puntos de entrada del canal empaquetado exponen el contrato público esperado. Importar desde `plugin-sdk/channel-test-helpers`                                      |
| `formatEnvelopeTimestamp`                            | Dar formato a marcas de tiempo de sobres deterministas. Importar desde `plugin-sdk/channel-test-helpers`                                                                            |
| `expectPairingReplyText`                             | Afirmar el texto de respuesta de emparejamiento del canal y extraer su código. Importar desde `plugin-sdk/channel-test-helpers`                                                     |
| `describePluginRegistrationContract`                 | Instalar comprobaciones de contrato de registro de complementos. Importar desde `plugin-sdk/plugin-test-contracts`                                                                  |
| `registerSingleProviderPlugin`                       | Registrar un complemento de proveedor en pruebas de humo del cargador. Importar desde `plugin-sdk/plugin-test-runtime`                                                              |
| `registerProviderPlugin`                             | Capturar todos los tipos de proveedor de un complemento. Importar desde `plugin-sdk/plugin-test-runtime`                                                                            |
| `registerProviderPlugins`                            | Capturar registros de proveedor en múltiples complementos. Importar desde `plugin-sdk/plugin-test-runtime`                                                                          |
| `requireRegisteredProvider`                          | Afirmar que una colección de proveedores contiene un id. Importar desde `plugin-sdk/plugin-test-runtime`                                                                            |
| `createRuntimeEnv`                                   | Construir un entorno de ejecución de CLI/complemento simulado. Importar desde `plugin-sdk/plugin-test-runtime`                                                                      |
| `createPluginSetupWizardStatus`                      | Construir ayudantes de estado de configuración para complementos de canal. Importar desde `plugin-sdk/plugin-test-runtime`                                                          |
| `describeOpenAIProviderRuntimeContract`              | Instale las comprobaciones de contratos de tiempo de ejecución de la familia de proveedores. Importar desde `plugin-sdk/provider-test-contracts`                                    |
| `expectPassthroughReplayPolicy`                      | Afirmar que las políticas de reproducción del proveedor pasen a través de las herramientas y metadatos propiedad del proveedor. Importar desde `plugin-sdk/provider-test-contracts` |
| `runRealtimeSttLiveTest`                             | Ejecute una prueba en tiempo real de STT con accesorios de audio compartidos. Importar desde `plugin-sdk/provider-test-contracts`                                                   |
| `normalizeTranscriptForMatch`                        | Normalice la salida de la transcripción en vivo antes de las afirmaciones difusas. Importar desde `plugin-sdk/provider-test-contracts`                                              |
| `expectExplicitVideoGenerationCapabilities`          | Afirmar que los proveedores de video declaren capacidades explícitas de modo de generación. Importar desde `plugin-sdk/provider-test-contracts`                                     |
| `expectExplicitMusicGenerationCapabilities`          | Afirmar que los proveedores de música declaren capacidades explícitas de generación/edición. Importar desde `plugin-sdk/provider-test-contracts`                                    |
| `mockSuccessfulDashscopeVideoTask`                   | Instale una respuesta de tarea de video exitosa compatible con DashScope. Importar desde `plugin-sdk/provider-test-contracts`                                                       |
| `getProviderHttpMocks`                               | Acceda a los mocks HTTP/auth de Vitest opcionales del proveedor. Importar desde `plugin-sdk/provider-http-test-mocks`                                                               |
| `installProviderHttpMockCleanup`                     | Restablezca los mocks HTTP/auth del proveedor después de cada prueba. Importar desde `plugin-sdk/provider-http-test-mocks`                                                          |
| `installCommonResolveTargetErrorCases`               | Casos de prueba compartidos para el manejo de errores de resolución de objetivos. Importar desde `plugin-sdk/channel-target-testing`                                                |
| `shouldAckReaction`                                  | Compruebe si un canal debe agregar una reacción de reconocimiento. Importar desde `plugin-sdk/channel-feedback`                                                                     |
| `removeAckReactionAfterReply`                        | Elimine la reacción de reconocimiento después de la entrega de la respuesta. Importar desde `plugin-sdk/channel-feedback`                                                           |
| `createTestRegistry`                                 | Construya un accesorio de registro de complementos de canal. Importar desde `plugin-sdk/plugin-test-runtime` o `plugin-sdk/channel-test-helpers`                                    |
| `createEmptyPluginRegistry`                          | Construya un accesorio de registro de complementos vacío. Importar desde `plugin-sdk/plugin-test-runtime` o `plugin-sdk/channel-test-helpers`                                       |
| `setActivePluginRegistry`                            | Instale un accesorio de registro para pruebas de tiempo de ejecución de complementos. Importar desde `plugin-sdk/plugin-test-runtime` o `plugin-sdk/channel-test-helpers`           |
| `createRequestCaptureJsonFetch`                      | Captura las solicitudes de obtención JSON en las pruebas del asistente de medios. Importa desde `plugin-sdk/test-env`                                                               |
| `withServer`                                         | Ejecuta pruebas contra un servidor HTTP local desechable. Importa desde `plugin-sdk/test-env`                                                                                       |
| `createMockIncomingRequest`                          | Construye un objeto de solicitud HTTP entrante mínimo. Importa desde `plugin-sdk/test-env`                                                                                          |
| `withFetchPreconnect`                                | Ejecuta pruebas de obtención con ganchos de preconexión instalados. Importa desde `plugin-sdk/test-env`                                                                             |
| `withEnv` / `withEnvAsync`                           | Parchea temporalmente las variables de entorno. Importa desde `plugin-sdk/test-env`                                                                                                 |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | Crea accesorios de prueba del sistema de archivos aislados. Importa desde `plugin-sdk/test-env`                                                                                     |
| `createMockServerResponse`                           | Crea una simulación de respuesta de servidor HTTP mínima. Importa desde `plugin-sdk/test-env`                                                                                       |
| `createCliRuntimeCapture`                            | Captura la salida de tiempo de ejecución de la CLI en las pruebas. Importa desde `plugin-sdk/test-fixtures`                                                                         |
| `importFreshModule`                                  | Importa un módulo ESM con un token de consulta nuevo para omitir el caché del módulo. Importa desde `plugin-sdk/test-fixtures`                                                      |
| `bundledPluginRoot` / `bundledPluginFile`            | Resuelve rutas de origen o de distribución de complementos agrupados. Importa desde `plugin-sdk/test-fixtures`                                                                      |
| `mockNodeBuiltinModule`                              | Instala simulaciones Vitest integradas de Node estrechas. Importa desde `plugin-sdk/test-node-mocks`                                                                                |
| `createSandboxTestContext`                           | Construye contextos de prueba de sandbox. Importa desde `plugin-sdk/test-fixtures`                                                                                                  |
| `writeSkill`                                         | Escribe accesorios de habilidades. Importa desde `plugin-sdk/test-fixtures`                                                                                                         |
| `makeAgentAssistantMessage`                          | Construye accesorios de mensajes de transcripción de agentes. Importa desde `plugin-sdk/test-fixtures`                                                                              |
| `peekSystemEvents` / `resetSystemEventsForTest`      | Inspecciona y restablece accesorios de eventos del sistema. Importa desde `plugin-sdk/test-fixtures`                                                                                |
| `sanitizeTerminalText`                               | Limpia la salida de la terminal para aserciones. Importa desde `plugin-sdk/test-fixtures`                                                                                           |
| `countLines` / `hasBalancedFences`                   | Afirmar la forma de la salida del chunking. Importar desde `plugin-sdk/test-fixtures`                                                                                               |
| `runProviderCatalog`                                 | Ejecutar un hook de catálogo de proveedor con dependencias de prueba                                                                                                                |
| `resolveProviderWizardOptions`                       | Resolver las elecciones del asistente de configuración del proveedor en las pruebas de contrato                                                                                     |
| `resolveProviderModelPickerEntries`                  | Resolver las entradas del selector de modelos del proveedor en las pruebas de contrato                                                                                              |
| `buildProviderPluginMethodChoice`                    | Construir ids de elección del asistente del proveedor para afirmaciones                                                                                                             |
| `setProviderWizardProvidersResolverForTest`          | Inyectar proveedores del asistente del proveedor para pruebas aisladas                                                                                                              |
| `createProviderUsageFetch`                           | Construir fixtures de obtención de uso del proveedor                                                                                                                                |
| `useFrozenTime` / `useRealTime`                      | Congelar y restaurar temporizadores para pruebas sensibles al tiempo. Importar desde `plugin-sdk/test-env`                                                                          |
| `createTestWizardPrompter`                           | Construir un solicitante simulado del asistente de configuración                                                                                                                    |
| `createRuntimeTaskFlow`                              | Crear estado aislado del flujo de tareas en tiempo de ejecución                                                                                                                     |
| `typedCases`                                         | Preservar tipos literales para pruebas dirigidas por tablas. Importar desde `plugin-sdk/test-fixtures`                                                                              |

Las suites de contratos de complementos incluidos también usan subrutas de prueba del SDK para ayudantes de registro, manifiesto, artefacto público y fixtures de tiempo de ejecución solo para pruebas. Las suites solo para el núcleo que dependen del inventario incluido de OpenClaw se mantienen bajo `src/plugins/contracts`.
Mantenga las nuevas pruebas de extensión en una subruta del SDK enfocada y documentada, como
`plugin-sdk/plugin-test-api`, `plugin-sdk/channel-contract-testing`,
`plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/channel-test-helpers`,
`plugin-sdk/plugin-test-contracts`, `plugin-sdk/plugin-test-runtime`,
`plugin-sdk/provider-test-contracts`, `plugin-sdk/provider-http-test-mocks`,
`plugin-sdk/test-env` o `plugin-sdk/test-fixtures` en lugar de importar el barril de compatibilidad amplio `plugin-sdk/testing`, archivos `src/**` del repositorio o puentes `test/helpers/*` del repositorio directamente.

### Tipos

Las subrutas de prueba enfocadas también reexportan tipos útiles en los archivos de prueba:

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext } from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## Resolución de objetivos de prueba

Use `installCommonResolveTargetErrorCases` para agregar casos de error estándar para la
resolución de objetivos de canal:

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";

describe("my-channel target resolution", () => {
  installCommonResolveTargetErrorCases({
    resolveTarget: ({ to, mode, allowFrom }) => {
      // Your channel's target resolution logic
      return myChannelResolveTarget({ to, mode, allowFrom });
    },
    implicitAllowFrom: ["user1", "user2"],
  });

  // Add channel-specific test cases
  it("should resolve @username targets", () => {
    // ...
  });
});
```

## Patrones de prueba

### Prueba de contratos de registro

Las pruebas unitarias que pasan un `api` simulado escrito a mano a `register(api)` no ejercitan
los portones de aceptación del cargador de OpenClaw. Agregue al menos una prueba de humo respaldada por el cargador
para cada superficie de registro de la que depende su complemento, especialmente los ganchos y
las capacidades exclusivas como la memoria.

El cargador real falla el registro del complemento cuando falta los metadatos requeridos o un
complemento llama a una API de capacidad que no posee. Por ejemplo,
`api.registerHook(...)` requiere un nombre de gancho, y
`api.registerMemoryCapability(...)` requiere que el manifiesto del complemento o la entrada
exportada declare `kind: "memory"`.

### Probar el acceso a la configuración de tiempo de ejecución

Prefiera el simulacro compartido del tiempo de ejecución del complemento de `openclaw/plugin-sdk/channel-test-helpers`
cuando pruebe complementos de canal agrupados. Sus simuladores obsoletos `runtime.config.loadConfig()` y
`runtime.config.writeConfigFile(...)` lanzan errores de forma predeterminada para que las pruebas detecten un nuevo
uso de las API de compatibilidad. Anule esos simuladores solo cuando la prueba esté
cubriendo explícitamente el comportamiento de compatibilidad heredado.

### Pruebas unitarias de un complemento de canal

```typescript
import { describe, it, expect, vi } from "vitest";

describe("my-channel plugin", () => {
  it("should resolve account from config", () => {
    const cfg = {
      channels: {
        "my-channel": {
          token: "test-token",
          allowFrom: ["user1"],
        },
      },
    };

    const account = myPlugin.setup.resolveAccount(cfg, undefined);
    expect(account.token).toBe("test-token");
  });

  it("should inspect account without materializing secrets", () => {
    const cfg = {
      channels: {
        "my-channel": { token: "test-token" },
      },
    };

    const inspection = myPlugin.setup.inspectAccount(cfg, undefined);
    expect(inspection.configured).toBe(true);
    expect(inspection.tokenStatus).toBe("available");
    // No token value exposed
    expect(inspection).not.toHaveProperty("token");
  });
});
```

### Pruebas unitarias de un complemento de proveedor

```typescript
import { describe, it, expect } from "vitest";

describe("my-provider plugin", () => {
  it("should resolve dynamic models", () => {
    const model = myProvider.resolveDynamicModel({
      modelId: "custom-model-v2",
      // ... context
    });

    expect(model.id).toBe("custom-model-v2");
    expect(model.provider).toBe("my-provider");
    expect(model.api).toBe("openai-completions");
  });

  it("should return catalog when API key is available", async () => {
    const result = await myProvider.catalog.run({
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
      // ... context
    });

    expect(result?.provider?.models).toHaveLength(2);
  });
});
```

### Simular el tiempo de ejecución del complemento

Para el código que usa `createPluginRuntimeStore`, simule el tiempo de ejecución en las pruebas:

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "test-plugin",
  errorMessage: "test runtime not set",
});

// In test setup
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... other mocks
  },
  config: {
    current: vi.fn(() => ({}) as const),
    mutateConfigFile: vi.fn(),
    replaceConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### Probar con stubs por instancia

Prefiera stubs por instancia sobre la mutación del prototipo:

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## Pruebas de contrato (complementos en el repositorio)

Los complementos agrupados tienen pruebas de contrato que verifican la propiedad del registro:

```bash
pnpm test -- src/plugins/contracts/
```

Estas pruebas afirman:

- Qué complementos registran qué proveedores
- Qué complementos registran qué proveedores de voz
- Corrección de la forma del registro
- Cumplimiento del contrato en tiempo de ejecución

### Ejecutar pruebas con ámbito

Para un complemento específico:

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

Solo para pruebas de contrato:

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth-choice.contract.test.ts
pnpm test -- src/plugins/contracts/runtime-seams.contract.test.ts
```

## Aplicación de reglas Lint (complementos en el repositorio)

Tres reglas son aplicadas por `pnpm check` para los complementos en el repositorio:

1. **Sin importaciones raíz monolíticas** -- se rechaza el barril raíz `openclaw/plugin-sdk`
2. **Sin importaciones directas de `src/`** -- los complementos no pueden importar `../../src/` directamente
3. **Sin autoimportaciones** -- los complementos no pueden importar su propia subruta `plugin-sdk/<name>`

Los complementos externos no están sujetos a estas reglas de lint, pero se recomienda seguir los mismos
patrones.

## Configuración de pruebas

OpenClaw usa Vitest con umbrales de cobertura de V8. Para pruebas de complementos:

```bash
# Run all tests
pnpm test

# Run specific plugin tests
pnpm test -- <bundled-plugin-root>/my-channel/src/channel.test.ts

# Run with a specific test name filter
pnpm test -- <bundled-plugin-root>/my-channel/ -t "resolves account"

# Run with coverage
pnpm test:coverage
```

Si las ejecuciones locales causan presión de memoria:

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## Relacionado

- [Resumen del SDK](/es/plugins/sdk-overview) -- convenciones de importación
- [Complementos de canal del SDK](/es/plugins/sdk-channel-plugins) -- interfaz del complemento de canal
- [Complementos de proveedor del SDK](/es/plugins/sdk-provider-plugins) -- ganchos del complemento de proveedor
- [Creación de complementos](/es/plugins/building-plugins) -- guía de introducción
