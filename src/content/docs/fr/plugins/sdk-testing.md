---
title: "Plugin Testing"
sidebarTitle: "Testing"
summary: "Testing utilities and patterns for OpenClaw plugins"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

# Plugin Testing

Reference for test utilities, patterns, and lint enforcement for OpenClaw
plugins.

<Tip>**Vous cherchez des exemples de tests ?** Les guides pratiques incluent des exemples de tests détaillés : [Tests de plugins de canal](/en/plugins/sdk-channel-plugins#step-6-test) et [Tests de plugins de fournisseur](/en/plugins/sdk-provider-plugins#step-6-test).</Tip>

## Test utilities

**Import:** `openclaw/plugin-sdk/testing`

The testing subpath exports a narrow set of helpers for plugin authors:

```typescript
import { installCommonResolveTargetErrorCases, shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/testing";
```

### Available exports

| Export                                 | Purpose                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `installCommonResolveTargetErrorCases` | Shared test cases for target resolution error handling |
| `shouldAckReaction`                    | Check whether a channel should add an ack reaction     |
| `removeAckReactionAfterReply`          | Remove ack reaction after reply delivery               |

### Types

The testing subpath also re-exports types useful in test files:

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext, OpenClawConfig, PluginRuntime, RuntimeEnv, MockFn } from "openclaw/plugin-sdk/testing";
```

## Testing target resolution

Use `installCommonResolveTargetErrorCases` to add standard error cases for
channel target resolution:

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

## Testing patterns

### Unit testing a channel plugin

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

### Unit testing a provider plugin

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

### Mocking the plugin runtime

For code that uses `createPluginRuntimeStore`, mock the runtime in tests:

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
    loadConfig: vi.fn(),
    writeConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### Testing with per-instance stubs

Prefer per-instance stubs over prototype mutation:

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## Contract tests (in-repo plugins)

Bundled plugins have contract tests that verify registration ownership:

```bash
pnpm test -- src/plugins/contracts/
```

These tests assert:

- Which plugins register which providers
- Which plugins register which speech providers
- Registration shape correctness
- Runtime contract compliance

### Running scoped tests

For a specific plugin:

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

For contract tests only:

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Lint enforcement (in-repo plugins)

Three rules are enforced by `pnpm check` for in-repo plugins:

1. **No monolithic root imports** -- `openclaw/plugin-sdk` root barrel is rejected
2. **No direct `src/` imports** -- plugins cannot import `../../src/` directly
3. **Pas d'auto-imports** -- les plugins ne peuvent pas importer leur propre sous-chemin `plugin-sdk/<name>`

Les plugins externes ne sont pas soumis à ces règles de lint, mais il est recommandé de suivre les mêmes modèles.

## Configuration des tests

OpenClaw utilise Vitest avec des seuils de couverture V8. Pour les tests de plugins :

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

Si les exécutions locales provoquent une pression sur la mémoire :

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## Connexes

- [Présentation du SDK](/en/plugins/sdk-overview) -- conventions d'importation
- [SDK Channel Plugins](/en/plugins/sdk-channel-plugins) -- interface de plugin channel
- [SDK Provider Plugins](/en/plugins/sdk-provider-plugins) -- provider plugin hooks
- [Création de plugins](/en/plugins/building-plugins) -- guide de démarrage
