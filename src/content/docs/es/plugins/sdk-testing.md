---
title: "Pruebas de complementos"
sidebarTitle: "Pruebas"
summary: "Utilidades y patrones de pruebas para complementos de OpenClaw"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

# Pruebas de complementos

Referencia de utilidades de prueba, patrones y aplicación de reglas de lint para complementos de OpenClaw.

<Tip>**¿Buscas ejemplos de pruebas?** Las guías prácticas incluyen ejemplos de pruebas detallados: [Pruebas de complementos de canal](/en/plugins/sdk-channel-plugins#step-6-test) y [Pruebas de complementos de proveedor](/en/plugins/sdk-provider-plugins#step-6-test).</Tip>

## Utilidades de prueba

**Importar:** `openclaw/plugin-sdk/testing`

La subruta de pruebas exporta un conjunto limitado de auxiliares para los autores de complementos:

```typescript
import { installCommonResolveTargetErrorCases, shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/testing";
```

### Exportaciones disponibles

| Exportación                            | Propósito                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `installCommonResolveTargetErrorCases` | Casos de prueba compartidos para el manejo de errores de resolución de objetivos |
| `shouldAckReaction`                    | Verificar si un canal debe añadir una reacción de acknowledgment                 |
| `removeAckReactionAfterReply`          | Eliminar la reacción de acknowledgment después de la entrega de la respuesta     |

### Tipos

La subruta de pruebas también reexporta tipos útiles en los archivos de prueba:

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext, OpenClawConfig, PluginRuntime, RuntimeEnv, MockFn } from "openclaw/plugin-sdk/testing";
```

## Prueba de la resolución de objetivos

Usa `installCommonResolveTargetErrorCases` para añadir casos de error estándar para la
resolución de objetivos del canal:

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

## Patrones de pruebas

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

### Prueba unitaria de un complemento de proveedor

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

### Simulación del tiempo de ejecución del complemento

Para el código que usa `createPluginRuntimeStore`, simula el tiempo de ejecución en las pruebas:

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>("test runtime not set");

// In test setup
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... other mocks
  },
  config: {
    loadConfig: vi.fn(),
    writeConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### Pruebas con simulaciones por instancia

Prefiera las simulaciones por instancia sobre la mutación del prototipo:

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## Pruebas de contrato (complementos en el repositorio)

Los complementos integrados tienen pruebas de contrato que verifican la propiedad del registro:

```bash
pnpm test -- src/plugins/contracts/
```

Estas pruebas afirman:

- Qué complementos registran qué proveedores
- Qué complementos registran qué proveedores de voz
- Corrección de la forma del registro
- Cumplimiento del contrato de tiempo de ejecución

### Ejecución de pruebas con ámbito

Para un complemento específico:

```bash
pnpm test -- extensions/my-channel/
```

Solo para pruebas de contrato:

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Aplicación de reglas de lint (complementos en el repositorio)

Tres reglas son aplicadas por `pnpm check` para los complementos en el repositorio:

1. **Sin importaciones raíz monolíticas** -- se rechaza el barril raíz `openclaw/plugin-sdk`
2. **Sin importaciones directas de `src/`** -- los complementos no pueden importar `../../src/` directamente
3. **No hay autoimportaciones** -- los complementos no pueden importar su propia sub-ruta `plugin-sdk/<name>`

Los complementos externos no están sujetos a estas reglas de linting, pero se recomienda seguir los mismos patrones.

## Configuración de pruebas

OpenClaw usa Vitest con umbrales de cobertura de V8. Para las pruebas de complementos:

```bash
# Run all tests
pnpm test

# Run specific plugin tests
pnpm test -- extensions/my-channel/src/channel.test.ts

# Run with a specific test name filter
pnpm test -- extensions/my-channel/ -t "resolves account"

# Run with coverage
pnpm test:coverage
```

Si las ejecuciones locales causan presión de memoria:

```bash
OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test
```

## Relacionado

- [Descripción general del SDK](/en/plugins/sdk-overview) -- convenciones de importación
- [Complementos de canal del SDK](/en/plugins/sdk-channel-plugins) -- interfaz del complemento de canal
- [Complementos de proveedor del SDK](/en/plugins/sdk-provider-plugins) -- enlaces del complemento de proveedor
- [Compilación de complementos](/en/plugins/building-plugins) -- guía de introducción
