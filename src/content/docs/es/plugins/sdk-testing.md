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

<Tip>**¿Buscas ejemplos de pruebas?** Las guías prácticas incluyen ejemplos de pruebas completas: [Pruebas de complementos de canal](/es/plugins/sdk-channel-plugins#step-6-test) y [Pruebas de complementos de proveedor](/es/plugins/sdk-provider-plugins#step-6-test).</Tip>

## Utilidades de prueba

**Importar:** `openclaw/plugin-sdk/testing`

La subruta de prueba exporta un conjunto limitado de asistentes para los autores de complementos:

```typescript
import { installCommonResolveTargetErrorCases, shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/testing";
```

### Exportaciones disponibles

| Exportar                               | Propósito                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `installCommonResolveTargetErrorCases` | Casos de prueba compartidos para el manejo de errores de resolución de objetivos |
| `shouldAckReaction`                    | Comprueba si un canal debe añadir una reacción de acuse de recibo                |
| `removeAckReactionAfterReply`          | Eliminar la reacción de acuse de recibo después de la entrega de la respuesta    |

### Tipos

La subruta de prueba también vuelve a exportar tipos útiles en los archivos de prueba:

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext, OpenClawConfig, PluginRuntime, RuntimeEnv, MockFn } from "openclaw/plugin-sdk/testing";
```

## Prueba de resolución de objetivos

Usa `installCommonResolveTargetErrorCases` para añadir casos de error estándar para la resolución de objetivos del canal:

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/testing";

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

Las pruebas unitarias que pasan un simulacro `api` escrito a mano a `register(api)` no ejercitan las puertas de aceptación del cargador de OpenClaw. Añade al menos una prueba de humo respaldada por el cargador para cada superficie de registro de la que dependa tu complemento, especialmente los ganchos y las capacidades exclusivas como la memoria.

El cargador real falla el registro del complemento cuando faltan los metadatos requeridos o un complemento llama a una API de capacidad que no posee. Por ejemplo, `api.registerHook(...)` requiere un nombre de gancho y `api.registerMemoryCapability(...)` requiere que el manifiesto del complemento o la entrada exportada declare `kind: "memory"`.

### Prueba de acceso a la configuración en tiempo de ejecución

Prefiere el simulacro de tiempo de ejecución de complementos compartido de los asistentes de prueba del repositorio al probar complementos integrados. Sus simuladores obsoletos `runtime.config.loadConfig()` y `runtime.config.writeConfigFile(...)` lanzan errores de forma predeterminada para que las pruebas detecten un nuevo uso de las API de compatibilidad. Anula esos simuladores solo cuando la prueba cubra explícitamente el comportamiento de compatibilidad heredado.

### Prueba unitaria de un complemento de canal

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

### Pruebas unitarias de un plugin de proveedor

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

### Simulación del runtime del plugin

Para el código que usa `createPluginRuntimeStore`, simula el runtime en las pruebas:

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

### Pruebas con stubs por instancia

Prefiere los stubs por instancia sobre la mutación del prototipo:

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## Pruebas de contrato (plugins en el repositorio)

Los plugins empaquetados tienen pruebas de contrato que verifican la propiedad del registro:

```bash
pnpm test -- src/plugins/contracts/
```

Estas pruebas afirman:

- Qué plugins registran qué proveedores
- Qué plugins registran qué proveedores de voz
- Corrección de la forma del registro
- Cumplimiento del contrato en tiempo de ejecución

### Ejecutar pruebas con ámbito

Para un plugin específico:

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

Solo para pruebas de contrato:

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Aplicación de reglas Lint (plugins en el repositorio)

Se aplican tres reglas mediante `pnpm check` para los plugins en el repositorio:

1. **Sin importaciones raíz monolíticas** -- se rechaza el barril raíz `openclaw/plugin-sdk`
2. **Sin importaciones directas de `src/`** -- los plugins no pueden importar `../../src/` directamente
3. **Sin autoimportaciones** -- los plugins no pueden importar su propia subruta `plugin-sdk/<name>`

Los plugins externos no están sujetos a estas reglas de lint, pero se recomienda seguir los mismos patrones.

## Configuración de pruebas

OpenClaw utiliza Vitest con umbrales de cobertura V8. Para las pruebas de plugins:

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

- [Descripción general del SDK](/es/plugins/sdk-overview) -- convenciones de importación
- [Plugins de canal del SDK](/es/plugins/sdk-channel-plugins) -- interfaz del plugin de canal
- [Plugins de proveedor del SDK](/es/plugins/sdk-provider-plugins) -- hooks del plugin de proveedor
- [Creación de plugins](/es/plugins/building-plugins) -- guía de inicio
