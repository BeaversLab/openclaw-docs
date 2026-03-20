---
summary: "Refactor clusters with highest LOC reduction potential"
read_when:
  - You want to reduce total LOC without changing behavior
  - You are choosing the next dedupe or extraction pass
title: "Refactor Cluster Backlog"
---

# Refactor Cluster Backlog

Ranked by likely LOC reduction, safety, and breadth.

## 1. Channel plugin config and security scaffolding

Highest-value cluster.

Repeated shapes across many channel plugins:

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

Strong examples:

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

Likely extraction shape:

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

Expected savings:

- ~250-450 LOC

Risk:

- Medium. Each channel has slightly different `isConfigured`, warnings, and normalization.

## 2. Extension runtime singleton boilerplate

Very safe.

Nearly every extension has the same runtime holder:

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

Strong examples:

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

Special-case variants:

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

Likely extraction shape:

- `createPluginRuntimeStore<T>(errorMessage)`

Expected savings:

- ~180-260 LOC

Risk:

- Low

## 3. Setup prompt and config-patch steps

Large surface area.

Many setup files repeat:

- resolve account id
- prompt allowlist entries
- merge allowFrom
- set DM policy
- prompt secrets
- patch top-level vs account-scoped config

Strong examples:

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

Point de raccord pour l'assistant existant :

- `src/channels/plugins/setup-wizard-helpers.ts`

Forme probable de l'extraction :

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

Économies attendues :

- ~300-600 LOC

Risque :

- Moyen. Il est facile de trop généraliser ; gardez les assistants ciblés et composables.

## 4. Fragments de schéma de configuration multi-compte

Fragments de schéma répétés entre les extensions.

Modèles courants :

- `const allowFromEntry = z.union([z.string(), z.number()])`
- schéma de compte plus :
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- champs DM/groupe répétés
- champs de stratégie markdown/tool répétés

Exemples probants :

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

Forme probable de l'extraction :

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

Économies attendues :

- ~120-220 LOC

Risque :

- Faible à moyen. Certains schémas sont simples, d'autres sont spéciaux.

## 5. Démarrage du cycle de vie des webhooks et des moniteurs

Bon cluster de valeur moyenne.

Modèles de configuration `startAccount` / monitor répétés :

- résoudre le compte
- calculer le chemin du webhook
- journaliser le démarrage
- démarrer le moniteur
- attendre l'abandon
- nettoyage
- mises à jour du statut sink

Exemples probants :

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

Point de raccord pour l'assistant existant :

- `src/plugin-sdk/channel-lifecycle.ts`

Forme probable de l'extraction :

- assistant pour le cycle de vie du moniteur de compte
- assistant pour le démarrage de compte avec webhook

Économies attendues :

- ~150-300 LOC

Risque :

- Moyen à élevé. Les détails de transport divergent rapidement.

## 6. Nettoyage des clones exacts mineurs

Corbeille de nettoyage à faible risque.

Exemples :

- détection argv de passerelle en double :
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- rendu des diagnostics de port dupliqués :
  - `src/cli/daemon-cli/restart-health.ts`
- construction de clé de session dupliquée :
  - `src/web/auto-reply/monitor/broadcast.ts`

Économies attendues :

- ~30-60 LOC

Risque :

- Faible

## Clusters de test

### Fixtures d'événements webhook LINE

Exemples marquants :

- `src/line/bot-handlers.test.ts`

Extraction probable :

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

Économies attendues :

- ~120-180 LOC

### Matrice d'authentification des commandes natives Telegram

Exemples marquants :

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

Extraction probable :

- constructeur de contexte de forum
- assistant d'assertion denied-message
- cas d'authentification table-driven

Économies attendues :

- ~80-140 LOC

### Configuration du cycle de vie Zalo

Exemples marquants :

- `extensions/zalo/src/monitor.lifecycle.test.ts`

Extraction probable :

- harnais de configuration de moniteur partagé

Économies attendues :

- ~50-90 LOC

### Tests d'option non prise en charge llm-context Brave

Exemples marquants :

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

Extraction probable :

- matrice `it.each(...)`

Économies attendues :

- ~30-50 LOC

## Ordre suggéré

1. Boilerplate de singleton d'exécution
2. Petit nettoyage de clones exacts
3. Extraction du générateur de configuration et de sécurité
4. Extraction de l'assistant de test
5. Extraction de l'étape Onboarding
6. Extraction de l'assistant de cycle de vie du moniteur

import en from "/components/footer/en.mdx";

<en />
