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

**Importation de mock de l'API de plugin :** API`openclaw/plugin-sdk/plugin-test-api`

**Importation du contrat d'exécution de l'agent :** `openclaw/plugin-sdk/agent-runtime-test-contracts`

**Importation du contrat de canal :** `openclaw/plugin-sdk/channel-contract-testing`

**Importation de l'assistant de test de canal :** `openclaw/plugin-sdk/channel-test-helpers`

**Importation du test de cible de canal :** `openclaw/plugin-sdk/channel-target-testing`

**Importation du contrat de plugin :** `openclaw/plugin-sdk/plugin-test-contracts`

**Importation du test d'exécution de plugin :** `openclaw/plugin-sdk/plugin-test-runtime`

**Importation du contrat de fournisseur :** `openclaw/plugin-sdk/provider-test-contracts`

**Importation de mock HTTP de fournisseur :** `openclaw/plugin-sdk/provider-http-test-mocks`

**Importation du test d'environnement/réseau :** `openclaw/plugin-sdk/test-env`

**Importation de fixture générique :** `openclaw/plugin-sdk/test-fixtures`

**Importation de mock natif Node :** `openclaw/plugin-sdk/test-node-mocks`

Préférez les sous-chemins ciblés ci-dessous pour les nouveaux tests de plugins. Le
module général `openclaw/plugin-sdk/testing` n'est qu'une compatibilité héritée.
Les garde-fous du dépôt rejettent les nouvelles importations réelles de
`plugin-sdk/testing` et `plugin-sdk/test-utils` ; ces noms ne demeurent
que comme surfaces de compatibilité dépréciées pour les plugins externes et les
tests de compatibilité enregistrés.

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

### Exportations disponibles

| Exportation                                          | Objectif                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                | Construire un mock API de plugin minimal pour les tests unitaires d'enregistrement direct. Importer depuis API`plugin-sdk/plugin-test-api`                            |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | Fixture de contrat de profil d'authentification partagée pour les adaptateurs d'exécution d'agent natifs. Importer depuis `plugin-sdk/agent-runtime-test-contracts`   |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | Fixture de contrat de suppression de livraison partagée pour les adaptateurs d'exécution d'agent natifs. Importer depuis `plugin-sdk/agent-runtime-test-contracts`    |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | Fixture de contrat de classification de repli partagée pour les adaptateurs d'exécution d'agent natifs. Importer depuis `plugin-sdk/agent-runtime-test-contracts`     |
| `createParameterFreeTool`                            | Construire des fixtures de schéma d'outil dynamique pour les tests de contrat d'exécution natifs. Importer depuis `plugin-sdk/agent-runtime-test-contracts`           |
| `expectChannelInboundContextContract`                | Assert channel inbound context shape. Import from `plugin-sdk/channel-contract-testing`                                                                               |
| `installChannelOutboundPayloadContractSuite`         | Install channel outbound payload contract cases. Import from `plugin-sdk/channel-contract-testing`                                                                    |
| `createStartAccountContext`                          | Build channel account lifecycle contexts. Import from `plugin-sdk/channel-test-helpers`                                                                               |
| `installChannelActionsContractSuite`                 | Install generic channel message-action contract cases. Import from `plugin-sdk/channel-test-helpers`                                                                  |
| `installChannelSetupContractSuite`                   | Install generic channel setup contract cases. Import from `plugin-sdk/channel-test-helpers`                                                                           |
| `installChannelStatusContractSuite`                  | Install generic channel status contract cases. Import from `plugin-sdk/channel-test-helpers`                                                                          |
| `expectDirectoryIds`                                 | Assert channel directory ids from a directory-list function. Import from `plugin-sdk/channel-test-helpers`                                                            |
| `assertBundledChannelEntries`                        | Assert bundled channel entrypoints expose the expected public contract. Import from `plugin-sdk/channel-test-helpers`                                                 |
| `formatEnvelopeTimestamp`                            | Format deterministic envelope timestamps. Import from `plugin-sdk/channel-test-helpers`                                                                               |
| `expectPairingReplyText`                             | Assert channel pairing reply text and extract its code. Import from `plugin-sdk/channel-test-helpers`                                                                 |
| `describePluginRegistrationContract`                 | Install plugin registration contract checks. Import from `plugin-sdk/plugin-test-contracts`                                                                           |
| `registerSingleProviderPlugin`                       | Register one provider plugin in loader smoke tests. Import from `plugin-sdk/plugin-test-runtime`                                                                      |
| `registerProviderPlugin`                             | Capture all provider kinds from one plugin. Import from `plugin-sdk/plugin-test-runtime`                                                                              |
| `registerProviderPlugins`                            | Capture provider registrations across multiple plugins. Import from `plugin-sdk/plugin-test-runtime`                                                                  |
| `requireRegisteredProvider`                          | Assert that a provider collection contains an id. Import from `plugin-sdk/plugin-test-runtime`                                                                        |
| `createRuntimeEnv`                                   | Build a mocked CLI/plugin runtime environment. Import from `plugin-sdk/plugin-test-runtime`                                                                           |
| `createPluginSetupWizardStatus`                      | Construire des assistants d'état de configuration pour les plugins de channel. Importer depuis `plugin-sdk/plugin-test-runtime`                                       |
| `describeOpenAIProviderRuntimeContract`              | Installer les vérifications de contrat d'exécution pour la famille de providers. Importer depuis `plugin-sdk/provider-test-contracts`                                 |
| `expectPassthroughReplayPolicy`                      | Assert que les stratégies de relecture de provider traversent les outils et métadonnées détenus par le provider. Importer depuis `plugin-sdk/provider-test-contracts` |
| `runRealtimeSttLiveTest`                             | Exécuter un test STT temps réel en direct pour un provider avec des fixtures audio partagées. Importer depuis `plugin-sdk/provider-test-contracts`                    |
| `normalizeTranscriptForMatch`                        | Normaliser la sortie de transcription en direct avant les assertions approximatives. Importer depuis `plugin-sdk/provider-test-contracts`                             |
| `expectExplicitVideoGenerationCapabilities`          | Assert que les providers vidéo déclarent des capacités de mode de génération explicites. Importer depuis `plugin-sdk/provider-test-contracts`                         |
| `expectExplicitMusicGenerationCapabilities`          | Assert que les providers de musique déclarent des capacités de génération/édition explicites. Importer depuis `plugin-sdk/provider-test-contracts`                    |
| `mockSuccessfulDashscopeVideoTask`                   | Installer une réponse de tâche vidéo compatible DashScope réussie. Importer depuis `plugin-sdk/provider-test-contracts`                                               |
| `getProviderHttpMocks`                               | Accéder aux mocks Vitest HTTP/auth de provider optionnels. Importer depuis `plugin-sdk/provider-http-test-mocks`                                                      |
| `installProviderHttpMockCleanup`                     | Réinitialiser les mocks HTTP/auth de provider après chaque test. Importer depuis `plugin-sdk/provider-http-test-mocks`                                                |
| `installCommonResolveTargetErrorCases`               | Cas de test partagés pour la gestion des erreurs de résolution de cible. Importer depuis `plugin-sdk/channel-target-testing`                                          |
| `shouldAckReaction`                                  | Vérifier si un channel doit ajouter une réaction d'accusé de réception. Importer depuis `plugin-sdk/channel-feedback`                                                 |
| `removeAckReactionAfterReply`                        | Supprimer la réaction d'accusé de réception après la livraison de la réponse. Importer depuis `plugin-sdk/channel-feedback`                                           |
| `createTestRegistry`                                 | Construire une fixture de registre de plugins de channel. Importer depuis `plugin-sdk/plugin-test-runtime` ou `plugin-sdk/channel-test-helpers`                       |
| `createEmptyPluginRegistry`                          | Construire une fixture de registre de plugins vide. Importer depuis `plugin-sdk/plugin-test-runtime` ou `plugin-sdk/channel-test-helpers`                             |
| `setActivePluginRegistry`                            | Installer un fixture de registre pour les tests d'exécution de plugins. Importer depuis `plugin-sdk/plugin-test-runtime` ou `plugin-sdk/channel-test-helpers`         |
| `createRequestCaptureJsonFetch`                      | Capturer les requêtes de récupération JSON dans les tests des assistants média. Importer depuis `plugin-sdk/test-env`                                                 |
| `withServer`                                         | Exécuter des tests sur un serveur HTTP local jetable. Importer depuis `plugin-sdk/test-env`                                                                           |
| `createMockIncomingRequest`                          | Construire un objet de requête HTTP entrant minimal. Importer depuis `plugin-sdk/test-env`                                                                            |
| `withFetchPreconnect`                                | Exécuter des tests de récupération avec les crochets de préconnexion installés. Importer depuis `plugin-sdk/test-env`                                                 |
| `withEnv` / `withEnvAsync`                           | Modifier temporairement les variables d'environnement. Importer depuis `plugin-sdk/test-env`                                                                          |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | Créer des fixtures de test de système de fichiers isolés. Importer depuis `plugin-sdk/test-env`                                                                       |
| `createMockServerResponse`                           | Créer un simulacre minimal de réponse de serveur HTTP. Importer depuis `plugin-sdk/test-env`                                                                          |
| `createCliRuntimeCapture`                            | Capturer la sortie d'exécution CLI dans les tests. Importer depuis `plugin-sdk/test-fixtures`                                                                         |
| `importFreshModule`                                  | Importer un module ESM avec un jeton de requête frais pour contourner le cache du module. Importer depuis `plugin-sdk/test-fixtures`                                  |
| `bundledPluginRoot` / `bundledPluginFile`            | Résoudre les chemins de fixtures source ou dist du plugin groupé. Importer depuis `plugin-sdk/test-fixtures`                                                          |
| `mockNodeBuiltinModule`                              | Installer des simulacres étroits Vitest pour les modules intégrés de Node. Importer depuis `plugin-sdk/test-node-mocks`                                               |
| `createSandboxTestContext`                           | Construire des contextes de test bac à sable. Importer depuis `plugin-sdk/test-fixtures`                                                                              |
| `writeSkill`                                         | Écrire des fixtures de compétences. Importer depuis `plugin-sdk/test-fixtures`                                                                                        |
| `makeAgentAssistantMessage`                          | Construire des fixtures de messages de transcription d'agent. Importer depuis `plugin-sdk/test-fixtures`                                                              |
| `peekSystemEvents` / `resetSystemEventsForTest`      | Inspecter et réinitialiser les fixtures d'événements système. Importer depuis `plugin-sdk/test-fixtures`                                                              |
| `sanitizeTerminalText`                               | Nettoyer la sortie du terminal pour les assertions. Importer depuis `plugin-sdk/test-fixtures`                                                                        |
| `countLines` / `hasBalancedFences`                   | Asserte la forme de la sortie de découpage (chunking). Importer depuis `plugin-sdk/test-fixtures`                                                                     |
| `runProviderCatalog`                                 | Exécuter un hook de catalogue de provider avec des dépendances de test                                                                                                |
| `resolveProviderWizardOptions`                       | Résoudre les choix de l'assistant de configuration du provider dans les tests contractuels                                                                            |
| `resolveProviderModelPickerEntries`                  | Résoudre les entrées du sélecteur de model du provider dans les tests contractuels                                                                                    |
| `buildProviderPluginMethodChoice`                    | Construire les IDs de choix de l'assistant du provider pour les assertions                                                                                            |
| `setProviderWizardProvidersResolverForTest`          | Injecter les providers de l'assistant du provider pour des tests isolés                                                                                               |
| `createProviderUsageFetch`                           | Construire des fixtures de récupération d'utilisation du provider                                                                                                     |
| `useFrozenTime` / `useRealTime`                      | Geler et restaurer les minuteurs pour les tests sensibles au temps. Importer depuis `plugin-sdk/test-env`                                                             |
| `createTestWizardPrompter`                           | Créer un inviteur d'assistant de configuration simulé                                                                                                                 |
| `createRuntimeTaskFlow`                              | Créer un état de flux de tâches d'exécution isolé                                                                                                                     |
| `typedCases`                                         | Préserver les types littéraux pour les tests basés sur des tableaux. Importer depuis `plugin-sdk/test-fixtures`                                                       |

Les suites de tests contractuels pour les plugins groupés utilisent également des sous-chemins de test du SDK pour les assistants de registre, de manifeste, d'artefact public et de fixture d'exécution réservés aux tests. Les suites core uniquement qui dépendent de l'inventaire groupé OpenClaw restent sous `src/plugins/contracts`.
Gardez les nouveaux tests d'extension sur un sous-chemin SDK focalisé documenté tel que
`plugin-sdk/plugin-test-api`, `plugin-sdk/channel-contract-testing`,
`plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/channel-test-helpers`,
`plugin-sdk/plugin-test-contracts`, `plugin-sdk/plugin-test-runtime`,
`plugin-sdk/provider-test-contracts`, `plugin-sdk/provider-http-test-mocks`,
`plugin-sdk/test-env`, ou `plugin-sdk/test-fixtures` plutôt que d'importer le
baril de compatibilité `plugin-sdk/testing` large, les fichiers `src/**` du dépôt, ou les
ponts `test/helpers/*` du dépôt directement.

### Types

Les sous-chemins de test focalisés réexportent également des types utiles dans les fichiers de test :

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext } from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-types";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## Test de résolution de cible

Utilisez `installCommonResolveTargetErrorCases` pour ajouter des cas d'erreur standard pour la résolution de cible channel :

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

## Modèles de test

### Tester les contrats d'enregistrement

Les tests unitaires qui passent un mock `api` écrit à la main à `register(api)` n'exercent pas les portes d'acceptation du chargeur d'OpenClaw. Ajoutez au moins un test de fumée (smoke test) soutenu par un chargeur pour chaque surface d'enregistrement dont dépend votre plugin, en particulier les hooks et les capacités exclusives telles que la mémoire.

Le vrai chargeur échoue l'enregistrement du plugin lorsque les métadonnées requises sont manquantes ou lorsqu'un plugin appelle une API de capacité qu'il ne possède pas. Par exemple, `api.registerHook(...)` nécessite un nom de hook, et `api.registerMemoryCapability(...)` exige que le manifeste du plugin ou l'entrée exportée déclare `kind: "memory"`.

### Tester l'accès à la configuration d'exécution

Privilégiez le mock d'exécution de plugin partagé de `openclaw/plugin-sdk/channel-test-helpers` lors des tests des plugins channel groupés. Ses mocks obsolètes `runtime.config.loadConfig()` et `runtime.config.writeConfigFile(...)` lèvent des exceptions par défaut afin que les tests détectent toute nouvelle utilisation des API de compatibilité. Ne remplacez ces mocks que lorsque le test couvre explicitement le comportement de compatibilité hérité.

### Test unitaire d'un plugin channel

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

### Test unitaire d'un plugin provider

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

### Simuler l'exécution du plugin

Pour le code qui utilise `createPluginRuntimeStore`, simulez l'exécution dans les tests :

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

Privilégiez les stubs par instance à la mutation du prototype :

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## Tests de contrat (plugins dans le dépôt)

Les plugins groupés ont des tests de contrat qui vérifient la propriété de l'enregistrement :

```bash
pnpm test -- src/plugins/contracts/
```

Ces tests affirment :

- Quels plugins enregistrent quels providers
- Quels plugins enregistrent quels fournisseurs de synthèse vocale
- Correction de la forme d'enregistrement
- Conformité au contrat d'exécution

### Exécution de tests étendus

Pour un plugin spécifique :

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

Pour les tests de contrat uniquement :

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth-choice.contract.test.ts
pnpm test -- src/plugins/contracts/runtime-seams.contract.test.ts
```

## Application des règles de lint (plugins dans le dépôt)

Trois règles sont appliquées par `pnpm check` pour les plugins dans le dépôt :

1. **Aucune importation racine monolithique** -- le baril racine `openclaw/plugin-sdk` est rejeté
2. **Aucune importation directe de `src/`** -- les plugins ne peuvent pas importer `../../src/` directement
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

Si les exécutions locales provoquent une pression mémoire :

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## Connexes

- [Présentation du SDK](/fr/plugins/sdk-overview) -- conventions d'importation
- [Plugins de canal du SDK](/fr/plugins/sdk-channel-plugins) -- interface des plugins de canal
- [Plugins de fournisseur du SDK](/fr/plugins/sdk-provider-plugins) -- hooks des plugins de fournisseur
- [Création de plugins](/fr/plugins/building-plugins) -- guide de démarrage
