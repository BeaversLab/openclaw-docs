---
summary: "Utilitaires et modèles de test pour les plugins OpenClaw"
title: "Test de plugin"
sidebarTitle: "Test"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

Référence pour les utilitaires de test, les modèles et l'application des règles de lint pour les plugins OpenClaw.

<Tip>**Vous cherchez des exemples de tests ?** Les guides pratiques incluent des exemples de tests détaillés : [Tests de plugins de canal](/fr/plugins/sdk-channel-plugins#step-6-test) et [Tests de plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-6-test).</Tip>

## Utilitaires de test

**Importation :** `openclaw/plugin-sdk/testing`

Le sous-chemin de testing exporte un ensemble restreint de assistants pour les auteurs de plugins :

```typescript
import { installCommonResolveTargetErrorCases, shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/testing";
```

### Exports disponibles

| Export                                 | Objectif                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `installCommonResolveTargetErrorCases` | Cas de test partagés pour la gestion des erreurs de résolution de cible      |
| `shouldAckReaction`                    | Vérifier si un canal doit ajouter une réaction d'accusé de réception         |
| `removeAckReactionAfterReply`          | Supprimer la réaction d'accusé de réception après la livraison de la réponse |

### Types

Le sous-chemin de testing réexporte également des types utiles dans les fichiers de test :

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext, OpenClawConfig, PluginRuntime, RuntimeEnv, MockFn } from "openclaw/plugin-sdk/testing";
```

## Test de la résolution de cible

Utilisez `installCommonResolveTargetErrorCases` pour ajouter des cas d'erreur standard pour la résolution de cible de canal :

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

## Modèles de test

### Test des contrats d'enregistrement

Les tests unitaires qui passent un mock `api` écrit à la main à `register(api)` n'exercent pas les barrières d'acceptation du chargeur de OpenClaw. Ajoutez au moins un test de fumée (smoke test) soutenu par le chargeur pour chaque surface d'enregistrement dont dépend votre plugin, en particulier les hooks et les capacités exclusives telles que la mémoire.

Le vrai chargeur échoue l'enregistrement du plugin lorsque les métadonnées requises sont manquantes ou qu'un plugin appelle une API de capacité qu'il ne possède pas. Par exemple, `api.registerHook(...)` nécessite un nom de hook, et `api.registerMemoryCapability(...)` nécessite que le manifeste du plugin ou l'entrée exportée déclare `kind: "memory"`.

### Test de l'accès à la configuration d'exécution

Préférez le mock d'exécution de plugin partagé des assistants de test du dépôt lors du test des plugins groupés. Ses mocks obsolètes `runtime.config.loadConfig()` et `runtime.config.writeConfigFile(...)` lancent des exceptions par défaut afin que les tests détectent toute nouvelle utilisation d'API de compatibilité. Ne remplacez ces mocks que lorsque le test couvre explicitement un comportement de compatibilité hérité.

### Test unitaire d'un plugin de canal

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

### Tests unitaires d'un plugin provider

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

### Simuler le runtime du plugin

Pour le code qui utilise `createPluginRuntimeStore`, simulez le runtime dans les tests :

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

### Tests avec des stubs par instance

Préférez les stubs par instance à la mutation du prototype :

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## Tests de contrat (plugins in-repo)

Les plugins groupés disposent de tests de contrat qui vérifient la propriété de l'enregistrement :

```bash
pnpm test -- src/plugins/contracts/
```

Ces tests vérifient :

- Quels plugins enregistrent quels providers
- Quels plugins enregistrent quels providers de synthèse vocale
- Correction de la forme de l'enregistrement
- Conformité au contrat d'exécution

### Exécution de tests délimités

Pour un plugin spécifique :

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

Pour les tests de contrat uniquement :

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Application des règles de linting (plugins in-repo)

Trois règles sont appliquées par `pnpm check` pour les plugins in-repo :

1. **Pas d'imports racine monolithiques** -- le module principal `openclaw/plugin-sdk` est rejeté
2. **Pas d'imports directs `src/`** -- les plugins ne peuvent pas importer `../../src/` directement
3. **Pas d'auto-imports** -- les plugins ne peuvent pas importer leur propre sous-chemin `plugin-sdk/<name>`

Les plugins externes ne sont pas soumis à ces règles de linting, mais il est recommandé de suivre les mêmes modèles.

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

- [Aperçu du SDK](/fr/plugins/sdk-overview) -- conventions d'importation
- [Plugins Channel du SDK](/fr/plugins/sdk-channel-plugins) -- interface du plugin channel
- [Plugins Provider du SDK](/fr/plugins/sdk-provider-plugins) -- hooks du plugin provider
- [Création de plugins](/fr/plugins/building-plugins) -- guide de démarrage
