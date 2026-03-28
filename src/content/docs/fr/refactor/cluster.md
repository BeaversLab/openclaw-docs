---
summary: "Refactor clusters with highest LOC reduction potential"
read_when:
  - You want to reduce total LOC without changing behavior
  - You are choosing the next dedupe or extraction pass
title: "Refactor Cluster Backlog"
---

# Refactor Cluster Backlog

Classé par la réduction probable de LOC, la sécurité et l'étendue.

## 1. Configuration du plugin de canal et échafaudage de sécurité

Cluster à plus forte valeur.

Formes répétées dans de nombreux plugins de canal :

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

Exemples forts :

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

Forme d'extraction probable :

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

Économies attendues :

- ~250-450 LOC

Risque :

- Moyen. Chaque canal a un `isConfigured` légèrement différent, des avertissements et une normalisation.

## 2. Boilerplate singleton d'exécution d'extension

Très sûr.

Presque chaque extension possède le même détenteur d'exécution :

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

Exemples forts :

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

Variantes de cas particuliers :

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

Forme d'extraction probable :

- `createPluginRuntimeStore<T>(errorMessage)`

Économies attendues :

- ~180-260 LOC

Risque :

- Faible

## 3. Configuration des invites (prompt) et des étapes de correctifs de configuration (config-patch)

Grande surface.

De nombreux fichiers de configuration se répètent :

- résoudre l'ID de compte
- demander les entrées de la liste d'autorisation
- fusionner allowFrom
- définir la politique DM
- demander les secrets
- patch de configuration de premier niveau vs portée compte

Exemples forts :

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

Helper seam existant :

- `src/channels/plugins/setup-wizard-helpers.ts`

Forme d'extraction probable :

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

Économies attendues :

- ~300-600 LOC

Risque :

- Moyen. Facile de trop généraliser ; gardez les helpers étroits et composables.

## 4. Fragments de schéma de configuration multi-compte

Fragments de schéma répétés à travers les extensions.

Motifs courants :

- `const allowFromEntry = z.union([z.string(), z.number()])`
- schéma de compte plus :
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- champs DM/groupe répétés
- champs de stratégie markdown/tool répétés

Exemples forts :

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

Forme d'extraction probable :

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

Économies attendues :

- ~120-220 LOC

Risque :

- Faible à moyen. Certains schémas sont simples, d'autres sont spéciaux.

## 5. Démarrage du cycle de vie webhook et moniteur

Bon cluster de valeur moyenne.

Motifs de configuration `startAccount` / moniteur répétés :

- résoudre le compte
- calculer le chemin du webhook
- journaliser le démarrage
- démarrer le moniteur
- attendre l'annulation
- nettoyage
- mises à jour du statut sink

Exemples forts :

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

Helper seam existant :

- `src/plugin-sdk/channel-lifecycle.ts`

Forme d'extraction probable :

- helper pour le cycle de vie du moniteur de compte
- helper pour le démarrage de compte avec webhook

Économies attendues :

- ~150-300 LOC

Risque :

- Moyen à élevé. Les détails de transport divergent rapidement.

## 6. Nettoyage des petits clones exacts

Catégorie de nettoyage à faible risque.

Exemples :

- détection dupliquée de l'argv de passerelle :
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- rendu dupliqué des diagnostics de port :
  - `src/cli/daemon-cli/restart-health.ts`
- construction dupliquée de clé de session :
  - `src/web/auto-reply/monitor/broadcast.ts`

Gain estimé :

- ~30-60 LOC

Risque :

- Faible

## Clusters de test

### Fixtures d'événements webhook LINE

Exemples probants :

- `src/line/bot-handlers.test.ts`

Extraction probable :

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

Gain estimé :

- ~120-180 LOC

### Telegram matrice d'auth de commande native

Exemples probants :

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

Extraction probable :

- constructeur de contexte de forum
- assistant d'assertion de message refusé
- cas d'auth en tableau (table-driven)

Gain estimé :

- ~80-140 LOC

### configuration du cycle de vie Zalo

Exemples probants :

- `extensions/zalo/src/monitor.lifecycle.test.ts`

Extraction probable :

- harnais de configuration de moniteur partagé

Gain estimé :

- ~50-90 LOC

### tests d'option non prise en charge llm-context Brave

Exemples probants :

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

Extraction probable :

- matrice `it.each(...)`

Gain estimé :

- ~30-50 LOC

## Ordre suggéré

1. Boilerplate singleton d'exécution
2. Nettoyage des clones exacts mineurs
3. Extraction du constructeur de configuration et de sécurité
4. Extraction d'assistants de test
5. Extraction des étapes d'intégration
6. Extraction de l'assistant du cycle de vie du moniteur
