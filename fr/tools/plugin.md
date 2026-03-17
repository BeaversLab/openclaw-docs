---
summary: "Plugins/extensions OpenClaw : découverte, configuration et sécurité"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
---

# Plugins (Extensions)

## Quick start (nouveau avec les plugins ?)

Un plugin est soit :

- un plugin natif **OpenClaw** (`openclaw.plugin.json` + module d'exécution), ou
- un **bundle** compatible (`.codex-plugin/plugin.json` ou `.claude-plugin/plugin.json`)

Les deux apparaissent sous `openclaw plugins`, mais seuls les plugins natifs OpenClaw exécutent
du code d'exécution en cours de processus.

La plupart du temps, vous utiliserez des plugins lorsque vous souhaiterez une fonctionnalité qui n'est pas encore intégrée
dans le cœur d'OpenClaw (ou si vous souhaitez garder les fonctionnalités optionnelles en dehors de votre installation
principale).

Chemin rapide :

1. Voir ce qui est déjà chargé :

```bash
openclaw plugins list
```

2. Installer un plugin officiel (exemple : Appel vocal) :

```bash
openclaw plugins install @openclaw/voice-call
```

Les spécifications npm sont **uniquement pour le registre** (nom du package + **version exacte** optionnelle ou
**dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées.

Les spécifications nues et `@latest` restent sur la voie stable. Si npm résout l'une de
ceux-ci vers une préversion, OpenClaw s'arrête et vous demande d'opter explicitement avec une
tiquette de préversion telle que `@beta`/`@rc` ou une version de préversion exacte.

3. Redémarrez la Gateway, puis configurez sous `plugins.entries.<id>.config`.

Voir [Appel vocal](/fr/plugins/voice-call) pour un exemple concret de plugin.
Vous cherchez des listes de tiers ? Voir [Plugins communautaires](/fr/plugins/community).
Besoin des détails de compatibilité des bundles ? Voir [Bundles de plugins](/fr/plugins/bundles).

Pour les bundles compatibles, installez à partir d'un répertoire local ou d'une archive :

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

Pour les installations depuis la marketplace Claude, listez d'abord la marketplace, puis installez par
nom d'entrée de marketplace :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw résout les noms connus de la marketplace Claude à partir de
`~/.claude/plugins/known_marketplaces.json`. Vous pouvez également passer une source
explicite de marketplace avec `--marketplace`.

## Architecture

Le système de plugins d'OpenClaw comporte quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extension globales et des extensions groupées. La découverte lit les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge en premier.
2. **Activation + validation**
   Core décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement à l'exécution**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer de code d'exécution.
4. **Consommation en surface**
   Le reste de OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du provider,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module de plugin

Cette division permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et de
générer des indices d'interface/schéma avant l'activation complète de l'exécution.

## Bundles compatibles

OpenClaw reconnaît également deux dispositions de bundles externes compatibles :

- Bundles style Codex : `.codex-plugin/plugin.json`
- Bundles style Claude : `.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut
  sans manifeste
- Bundles style Cursor : `.cursor-plugin/plugin.json`

Les entrées du marketplace Claude peuvent pointer vers l'un de ces bundles compatibles, ou vers
des sources de plugins natifs OpenClaw. OpenClaw résout d'abord l'entrée du marketplace,
puis exécute le chemin d'installation normal pour la source résolue.

Ils sont affichés dans la liste des plugins comme `format=bundle`, avec un sous-type de
`codex` ou `claude` dans la sortie verbose/info.

Voir [Plugin bundles](/fr/plugins/bundles) pour les règles de détection exactes, le comportement
de mappage et la matrice de support actuelle.

Aujourd'hui, OpenClaw traite ceux-ci comme des **packs de capacités**, et non comme des plugins d'exécution
natifs :

- supportés maintenant : `skills` regroupés
- supportés maintenant : racines markdown Claude `commands/`, mappées dans le chargeur de compétences
  normal OpenClaw
- supportés maintenant : les valeurs par défaut `settings.json` du bundle Claude pour les paramètres de l'agent Pi intégré
  (avec les clés de substitution shell nettoyées)
- supportés maintenant : racines Cursor `.cursor/commands/*.md`, mappées dans le chargeur de compétences
  normal OpenClaw
- pris en charge maintenant : les répertoires de hook de bundle Codex qui utilisent la disposition du hook-pack OpenClaw (`HOOK.md` + `handler.ts`/`handler.js`)
- détecté mais pas encore connecté : d'autres capacités de bundle déclarées telles que les agents, l'automatisation des hooks Claude, les règles/hooks/métadonnées MCP de Cursor, les métadonnées MCP/app/LSP, les styles de sortie

Cela signifie que l'installation, la découverte, la liste, les informations et l'activation des bundles fonctionnent toutes, et que les compétences du bundle, les commandes-compétences Claude, les paramètres par défaut du bundle Claude et les répertoires de hooks Codex compatibles se chargent lorsque le bundle est activé, mais que le code d'exécution du bundle n'est pas exécuté in-process.

La prise en charge des hooks de bundle est limitée au format normal de répertoire de hooks OpenClaw (`HOOK.md` plus `handler.ts`/`handler.js` sous les racines de hook déclarées). Les runtimes de hook shell/JSON spécifiques aux fournisseurs, y compris Claude `hooks.json`, ne sont aujourd'hui que détectés et ne sont pas exécutés directement.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **in-process** avec le Gateway. Ils ne sont pas sandboxed. Un plugin natif chargé a la même limite de confiance au niveau du processus que le code principal.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires de réseau, des hooks et des services
- un bug dans un plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences groupées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail comme du code de temps de développement, et non comme des valeurs par défaut de production.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **ids de plugin**, et non à la provenance de la source.
- Un plugin de l'espace de travail avec le même id qu'un plugin groupé remplace intentionnellement la copie groupée lorsque ce plugin de l'espace de travail est activé/autorisé.
- C'est normal et utile pour le développement local, les tests de correctifs et les correctifs rapides.

## Plugins disponibles (officiels)

- Microsoft Teams est uniquement disponible en plugin depuis le 15.01.2026 ; installez `@openclaw/msteams` si vous utilisez Teams.
- Memory (Core) — plugin de recherche de mémoire groupé (activé par défaut via `plugins.slots.memory`)
- Memory (LanceDB) — plugin de mémoire à long terme groupé (rappel automatique/capture ; définir `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/fr/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/fr/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/fr/channels/matrix) — `@openclaw/matrix`
- [Nostr](/fr/channels/nostr) — `@openclaw/nostr`
- [Zalo](/fr/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/fr/channels/msteams) — `@openclaw/msteams`
- Runtime du provider Anthropic — groupé sous `anthropic` (activé par défaut)
- Catalogue de provider BytePlus — groupé sous `byteplus` (activé par défaut)
- Catalogue de provider Cloudflare AI Gateway — groupé sous `cloudflare-ai-gateway` (activé par défaut)
- Recherche Web Google + Gemini CLI OAuth — groupé sous `google` (la recherche Web le charge automatiquement ; l'authentification du provider reste optionnelle)
- Runtime du provider GitHub Copilot — groupé sous `github-copilot` (activé par défaut)
- Catalogue de provider Hugging Face — groupé sous `huggingface` (activé par défaut)
- Runtime du provider Kilo Gateway — groupé sous `kilocode` (activé par défaut)
- Catalogue de provider Kimi Coding — groupé sous `kimi-coding` (activé par défaut)
- Catalogue de provider MiniMax + utilisation + OAuth — groupé sous `minimax` (activé par défaut ; possède `minimax` et `minimax-portal`)
- Capacités du provider Mistral — groupées sous `mistral` (activé par défaut)
- Catalogue de provider Model Studio — groupé sous `modelstudio` (activé par défaut)
- Runtime du provider Moonshot — groupé sous `moonshot` (activé par défaut)
- Catalogue de provider NVIDIA — groupé sous `nvidia` (activé par défaut)
- Runtime du fournisseur OpenAI — groupé sous `openai` (activé par défaut ; possède à la fois `openai` et `openai-codex`)
- Capacités du fournisseur OpenCode Go — groupées sous `opencode-go` (activé par défaut)
- Capacités du fournisseur OpenCode Zen — groupées sous `opencode` (activé par défaut)
- Runtime du fournisseur OpenRouter — groupé sous `openrouter` (activé par défaut)
- Catalogue du fournisseur Qianfan — groupé sous `qianfan` (activé par défaut)
- OAuth Qwen (auth fournisseur + catalogue) — groupé sous `qwen-portal-auth` (activé par défaut)
- Catalogue du fournisseur Synthetic — groupé sous `synthetic` (activé par défaut)
- Catalogue du fournisseur Together — groupé sous `together` (activé par défaut)
- Catalogue du fournisseur Venice — groupé sous `venice` (activé par défaut)
- Catalogue du fournisseur Vercel AI Gateway — groupé sous `vercel-ai-gateway` (activé par défaut)
- Catalogue du fournisseur Volcengine — groupé sous `volcengine` (activé par défaut)
- Catalogue du fournisseur Xiaomi + utilisation — groupé sous `xiaomi` (activé par défaut)
- Runtime du fournisseur Z.AI — groupé sous `zai` (activé par défaut)
- Proxy Copilot (auth fournisseur) — pont local du Proxy Copilot VS Code ; distinct de la connexion appareil intégrée `github-copilot` (groupé, désactivé par défaut)

Les plugins natifs OpenClaw sont des **modules TypeScript** chargés lors de l'exécution via jiti.
**La validation de la configuration n'exécute pas le code du plugin** ; elle utilise à la place le manifeste du plugin
et le schéma JSON. Voir [Manifeste du plugin](/fr/plugins/manifest).

Les plugins natifs OpenClaw peuvent enregistrer :

- Méthodes RPC du Gateway
- Routes HTTP du Gateway
- Outils d'agent
- Commandes CLI
- Services d'arrière-plan
- Moteurs de contexte
- Flux d'authentification du fournisseur et catalogues de modèles
- Hooks d'exécution du fournisseur pour les IDs de modèles dynamiques, la normalisation du transport, les métadonnées de capacité, l'encapsulation du flux, la politique de TTL du cache, les indications d'auth manquante, la suppression des modèles intégrés, l'augmentation du catalogue, l'échange d'auth à l'exécution, et l'auth d'utilisation/facturation + résolution de l'instantané
- Validation de configuration facultative
- **Skills** (en listant les répertoires `skills` dans le manifeste du plugin)
- **Commandes de réponse automatique** (exécuter sans invoquer l'agent IA)

Les plugins natifs OpenClaw s'exécutent **in‑process** avec le Gateway, considérez-les donc comme du code de confiance.
Guide de création d'outils : [Outils d'agent de plugin](/fr/plugins/agent-tools).

## Hooks d'exécution du provider

Les plugins provider ont maintenant deux couches :

- métadonnées du manifeste : `providerAuthEnvVars` pour une recherche d'auth-env peu coûteuse avant
  le chargement à l'exécution, plus `providerAuthChoices` pour les étiquettes d'onboarding/choix d'auth
  et les métadonnées de drapeau CLI avant le chargement à l'exécution
- hooks au moment de la configuration : `catalog` / ancien `discovery`
- hooks d'exécution : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw possède toujours la boucle d'agent générique, le basculement, la gestion des transcriptions et
la stratégie d'outils. Ces hooks constituent la couture pour les comportements spécifiques au provider sans
avoir besoin d'un transport d'inférence personnalisé complet.

Utilisez le `providerAuthEnvVars` du manifeste lorsque le provider dispose d'identifiants basés sur l'environnement
que les chemins d'auth/statique/sélection de model génériques doivent voir sans charger le runtime
du plugin. Utilisez le `providerAuthChoices` du manifeste lorsque les surfaces CLI d'onboarding/choix d'auth
doivent connaître l'identifiant de choix, les étiquettes de groupe et le câblage d'auth simple à un drapeau
sans charger le runtime du provider. Conservez le `envVars` du runtime du provider
pour les indices destinés aux opérateurs, tels que les étiquettes d'onboarding ou les variables de configuration
client-id/client-secret OAuth.

### Ordre des hooks

Pour les plugins de model/provider, OpenClaw utilise les hooks dans cet ordre approximatif :

1. `catalog`
   Publier la configuration du fournisseur dans `models.providers` pendant `models.json`
   la génération.
2. recherche de modèle intégré/découvert
   OpenClaw essaie d'abord le chemin normal du registre/catalogue.
3. `resolveDynamicModel`
   Synchronisation de repli pour les ID de modèle appartenant au fournisseur qui ne sont pas encore dans le registre
   local.
4. `prepareDynamicModel`
   Préchauffage asynchrone uniquement sur les chemins de résolution de modèle asynchrones, puis
   `resolveDynamicModel` s'exécute à nouveau.
5. `normalizeResolvedModel`
   Réécriture finale avant que le runner intégré n'utilise le modèle résolu.
6. `capabilities`
   Métadonnées de transcription/outillage appartenant au fournisseur utilisées par la logique principale partagée.
7. `prepareExtraParams`
   Normalisation des paramètres de requête appartenant au fournisseur avant les wrappers génériques d'options de flux.
8. `wrapStreamFn`
   Wrapper de flux appartenant au fournisseur après l'application des wrappers génériques.
9. `formatApiKey`
   Formateur de profil d'authentification appartenant au fournisseur utilisé lorsqu'un profil d'authentification stocké doit
   devenir la chaîne `apiKey` d'exécution.
10. `refreshOAuth`
    Remplacement du rafraîchissement OAuth appartenant au fournisseur pour les points de terminaison de rafraîchissement personnalisés ou
    la stratégie d'échec de rafraîchissement.
11. `buildAuthDoctorHint`
    Indice de réparation appartenant au fournisseur ajouté lorsque le rafraîchissement OAuth échoue.
12. `isCacheTtlEligible`
    Stratégie de cache de prompt appartenant au fournisseur pour les fournisseurs de proxy/backhaul.
13. `buildMissingAuthMessage`
    Remplacement appartenant au fournisseur pour le message générique de récupération d'authentification manquante.
14. `suppressBuiltInModel`
    Suppression de modèle amont obsolète appartenant au fournisseur plus optionnel
    indice d'erreur pour l'utilisateur.
15. `augmentModelCatalog`
    Lignes de catalogue synthétiques/finales appartenant au fournisseur ajoutées après la découverte.
16. `isBinaryThinking`
    Interrupteur de raisonnement on/off appartenant au fournisseur pour les fournisseurs à pensée binaire.
17. `supportsXHighThinking`
    Support de raisonnement `xhigh` appartenant au fournisseur pour les modèles sélectionnés.
18. `resolveDefaultThinkingLevel`
    Niveau `/think` par défaut appartenant au fournisseur pour une famille de modèles spécifique.
19. `isModernModelRef`
    Matcher de modèle moderne détenu par le fournisseur, utilisé par les filtres de profil en direct et la sélection de smoke.
20. `prepareRuntimeAuth`
    Échange une information d'identification configurée contre le jeton/clé d'exécution réel juste avant l'inférence.
21. `resolveUsageAuth`
    Résout les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées.
22. `fetchUsageSnapshot`
    Récupère et normalise les instantanés d'utilisation/quota spécifiques au fournisseur après la résolution de l'authentification.

### Quel hook utiliser

- `catalog` : publier la configuration du fournisseur et les catalogues de modèles dans `models.providers`
- `resolveDynamicModel` : gérer les IDs de modèle en transit (pass-through) ou en compatibilité ascendante qui ne sont pas encore dans le registre local
- `prepareDynamicModel` : préchauffage asynchrone avant de réessayer la résolution dynamique (par exemple, rafraîchir le cache des métadonnées du fournisseur)
- `normalizeResolvedModel` : réécrire le transport/l'URL de base/la compatibilité d'un modèle résolu avant l'inférence
- `capabilities` : publier les particularités de la famille de fournisseurs et de la transcription/outillage sans coder en dur les IDs de fournisseurs dans le cœur
- `prepareExtraParams` : définir les valeurs par défaut du fournisseur ou normaliser les paramètres par modèle spécifiques au fournisseur avant l'encapsulage de flux générique
- `wrapStreamFn` : ajouter des en-têtes/payloads/patches de compatibilité de modèle spécifiques au fournisseur tout en utilisant le chemin d'exécution normal `pi-ai`
- `formatApiKey` : transformer un profil d'authentification stocké en chaîne `apiKey` d'exécution sans coder en dur les blobs de jetons de fournisseurs dans le cœur
- `refreshOAuth` : gérer le rafraîchissement OAuth pour les fournisseurs qui ne correspondent pas aux rafraîchisseurs partagés `pi-ai`
- `buildAuthDoctorHint` : ajouter des directives de réparation d'authentification détenues par le fournisseur lorsque le rafraîchissement échoue
- `isCacheTtlEligible` : décider si les paires fournisseur/modèle doivent utiliser les métadonnées TTL du cache
- `buildMissingAuthMessage` : remplacer l'erreur générique du magasin d'authentification par une indication de récupération spécifique au fournisseur
- `suppressBuiltInModel` : masquer les lignes en amont obsolètes et optionnellement renvoyer une erreur détenue par le fournisseur pour les échecs de résolution directe
- `augmentModelCatalog` : ajouter des lignes de catalogue synthétiques/finales après la découverte et la fusion de la configuration
- `isBinaryThinking` : exposer une UX de raisonnement binaire activé/désactivé sans coder en dur les identifiants de fournisseur dans `/think`
- `supportsXHighThinking` : activer des modèles spécifiques pour le niveau de raisonnement `xhigh`
- `resolveDefaultThinkingLevel` : garder la stratégie de raisonnement par défaut du fournisseur/du modèle hors du cœur
- `isModernModelRef` : garder les règles d'inclusion de famille de modèles live/smoke avec le fournisseur
- `prepareRuntimeAuth` : échanger une informations d'identification configurée contre le jeton/clé d'exécution réel à courte durée de vie utilisé pour les requêtes
- `resolveUsageAuth` : résoudre les informations d'identification appartenant au fournisseur pour les points de terminaison d'utilisation/facturation sans coder en dur l'analyse des jetons dans le cœur
- `fetchUsageSnapshot` : gérer la récupération/analyse du point de terminaison d'utilisation spécifique au fournisseur pendant que le cœur conserve la diffusion et le formatage du résumé

Règle générale :

- le fournisseur possède un catalogue ou des URL de base par défaut : utiliser `catalog`
- le fournisseur accepte des identifiants de modèle en amont arbitraires : utiliser `resolveDynamicModel`
- le fournisseur a besoin de métadonnées réseau avant de résoudre les identifiants inconnus : ajouter `prepareDynamicModel`
- le fournisseur a besoin de réécritures de transport mais utilise toujours un transport central : utiliser `normalizeResolvedModel`
- le fournisseur a besoin de particularités de transcription/de famille de fournisseurs : utiliser `capabilities`
- le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par fournisseur : utiliser `prepareExtraParams`
- le fournisseur a besoin d'en-têtes/corps de requête/wrappers de compatibilité de modèle sans transport personnalisé : utiliser `wrapStreamFn`
- le fournisseur stocke des métadonnées supplémentaires dans les profils d'authentification et a besoin d'une forme de jeton d'exécution personnalisée : utiliser `formatApiKey`
- le fournisseur a besoin d'un point de terminaison de rafraîchissement OAuth personnalisé ou d'une stratégie d'échec de rafraîchissement : utiliser `refreshOAuth`
- le fournisseur a besoin de conseils de réparation d'authentification appartenant au fournisseur après un échec de rafraîchissement : utiliser `buildAuthDoctorHint`
- le fournisseur a besoin d'un contrôle TTL de cache spécifique au proxy : utiliser `isCacheTtlEligible`
- le fournisseur a besoin d'une indication de récupération d'absence d'authentification spécifique au fournisseur : utiliser `buildMissingAuthMessage`
- le provider doit masquer les lignes en amont obsolètes ou les remplacer par une indication de fournisseur : utilisez `suppressBuiltInModel`
- le provider a besoin de lignes de compatibilité future synthétiques dans `models list` et les sélecteurs : utilisez `augmentModelCatalog`
- le provider expose uniquement la réflexion (thinking) binaire activée/désactivée : utilisez `isBinaryThinking`
- le provider souhaite `xhigh` uniquement sur un sous-ensemble de modèles : utilisez `supportsXHighThinking`
- le provider possède la stratégie par défaut `/think` pour une famille de modèles : utilisez `resolveDefaultThinkingLevel`
- le provider gère la correspondance de modèle préféré en direct/test (live/smoke) : utilisez `isModernModelRef`
- le provider a besoin d'un échange de jetons ou d'informations d'identification de demande à courte durée de vie : utilisez `prepareRuntimeAuth`
- le provider a besoin d'une analyse personnalisée de jetons d'utilisation/quota ou d'informations d'identification d'utilisation différentes : utilisez `resolveUsageAuth`
- le provider a besoin d'un point de terminaison d'utilisation spécifique au provider ou d'un analyseur de payload : utilisez `fetchUsageSnapshot`

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de demande personnalisé,
c'est une classe d'extension différente. Ces hooks sont destinés au comportement du provider
qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

### Exemple de Provider

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### Exemples intégrés

- Anthropic utilise `resolveDynamicModel`, `capabilities`, `buildAuthDoctorHint`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `isCacheTtlEligible`,
  `resolveDefaultThinkingLevel` et `isModernModelRef` car il possède la compatibilité future de Claude
  4.6, les indications de famille de provider, les conseils de réparation d'authentification, l'intégration
  du point de terminaison d'utilisation, l'éligibilité du cache de prompt, et la stratégie de réflexion (thinking)
  par défaut/adaptive de Claude.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` plus `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` et `isModernModelRef`
  car il possède la compatibilité future GPT-5.4, la normalisation directe OpenAI
  `openai-completions` -> `openai-responses`, les indices d'authentiation conscients de Codex,
  la suppression Spark, les lignes de liste synthétiques OpenAI, et la politique de réflexion GPT-5 /
  de modèle en direct.
- OpenRouter utilise `catalog` plus `resolveDynamicModel` et
  `prepareDynamicModel` car le provider est de type transparent (pass-through) et peut exposer de nouveaux
  identifiants de modèle avant les mises à jour du catalogue statique d'OpenClaw.
- GitHub Copilot utilise `catalog`, `auth`, `resolveDynamicModel` et
  `capabilities` plus `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin d'une connexion appareil détenue par le provider, d'un comportement de repli de modèle, des bizarreries de transcription
  Claude, d'un échange de jeton GitHub -> jeton Copilot, et d'un point de terminaison d'utilisation
  détenu par le provider.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` et `augmentModelCatalog` plus
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports de base OpenAI mais possède sa propre normalisation de transport/URL de base,
  la politique de repli de rafraîchissement OAuth, le choix de transport par défaut,
  les lignes de catalogue synthétiques Codex, et l'intégration du point de terminaison d'utilisation ChatGPT.
- Google AI Studio et l'OAuth Gemini CLI utilisent `resolveDynamicModel` et
  `isModernModelRef` car ils possèdent le repli de compatibilité future Gemini 3.1 et
  la correspondance des modèles modernes ; l'OAuth Gemini CLI utilise également `formatApiKey`,
  `resolveUsageAuth` et `fetchUsageSnapshot` pour le formatage des jetons, l'analyse
  des jetons et le câblage du point de terminaison de quota.
- OpenRouter utilise `capabilities`, `wrapStreamFn` et `isCacheTtlEligible`
  pour garder les en-têtes de requête spécifiques au fournisseur, les métadonnées de routage, les correctifs de raisonnement
  et la stratégie de cache de prompt hors du cœur.
- Moonshot utilise `catalog` plus `wrapStreamFn` car il utilise toujours le transport
  OpenAI partagé mais a besoin d'une normalisation de la charge utile de réflexion propriétaire du fournisseur.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête propriétaires du fournisseur,
  d'une normalisation de la charge utile de raisonnement, d'indices de transcription Gemini et d'une limitation
  du TTL de cache Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` et `fetchUsageSnapshot` car il possède le secours GLM-5,
  les valeurs par défaut `tool_stream`, l'UX de réflexion binaire, la correspondance des modèles modernes et à la fois
  l'authentification d'utilisation et la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go utilisent uniquement `capabilities` pour garder
  les particularités de transcription/outillage hors du cœur.
- Les fournisseurs groupés uniquement pour le catalogue tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` utilisent
  uniquement `catalog`.
- Le portail Qwen utilise `catalog`, `auth` et `refreshOAuth`.
- MiniMax et Xiaomi utilisent `catalog` plus des hooks d'utilisation car leur comportement `/usage`
  est propriétaire au plugin bien que l'inférence s'exécute toujours via les
  transports partagés.

## Pipeline de chargement

Au démarrage, OpenClaw fait approximativement ceci :

1. découvrir les racines candidates des plugins
2. lire les manifests de bundles natifs ou compatibles et les métadonnées des packages
3. rejeter les candidats non sécurisés
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/runtime

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués
lorsque le point d'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la
propriété du chemin semble suspecte pour les plugins non regroupés.

### Comportement basé sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration ou les capacités de bundle déclarés
- valider `plugins.entries.<id>.config`
- augmenter les libellés/espaces réservés de l'interface de contrôle
- afficher les métadonnées d'installation/catalogue

Pour les plugins natifs, le module runtime est la partie du plan de données. Il enregistre
le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches en processus de courte durée pour :

- résultats de la découverte
- données du registre de manifestes
- registres de plugins chargés

Ces caches réduisent les démarrages en rafale et la surcharge des commandes répétées. Il est sûr de
les considérer comme des caches de performance à court terme, et non comme de la persistance.

## Assistances Runtime

Les plugins peuvent accéder aux assistances principales sélectionnées via `api.runtime`. Pour la téléphonie TTS :

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notes :

- Utilise la configuration principale `messages.tts` (OpenAI ou ElevenLabs).
- Renvoie le tampon audio PCM + le taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- Edge TTS n'est pas pris en charge pour la téléphonie.

Pour la STT/transcription, les plugins peuvent appeler :

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- Utilise la configuration audio principale de compréhension des médias (`tools.media.audio`) et l'ordre de repli du provider.
- Renvoie `{ text: undefined }` lorsqu aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).

## Routes HTTP Gateway

Les plugins peuvent exposer des points de terminaison HTTP avec `api.registerHttpRoute(...)`.

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

Champs de route :

- `path` : chemin de routage sous le serveur HTTP de la passerelle.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale de la passerelle, ou `"plugin"` pour l'authentification gérée par le plugin/la vérification du webhook.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a traité la requête.

Notes :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes se chevauchant avec différents niveaux de `auth` sont rejetées. Gardez les chaînes de passage `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'importation monolithique `openclaw/plugin-sdk` lors de
la création de plugins :

- `openclaw/plugin-sdk/core` pour les API de plugin génériques, les types d'authentification de fournisseur, et les utilitaires partagés tels que les utilitaires de routage/session et les runtimes avec journalisation.
- `openclaw/plugin-sdk/compat` pour le code de plugin groupé interne nécessitant des helpers d'exécution partagés plus larges que `core`.
- `openclaw/plugin-sdk/telegram` pour les types de plugins de canal Telegram et les helpers orientés canal partagés. Les détails d'implémentation internes Telegram restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/discord` pour les types de plugins de canal Discord et les helpers orientés canal partagés. Les détails d'implémentation internes Discord restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/slack` pour les types de plugins de canal Slack et les helpers orientés canal partagés. Les détails d'implémentation internes Slack restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/signal` pour les types de plugins de canal Signal et les assistants partagés orientés canal. Les internes de l'implémentation Signal intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/imessage` pour les types de plugins de canal iMessage et les assistants partagés orientés canal. Les internes de l'implémentation iMessage intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/whatsapp` pour les types de plugins de canal WhatsApp et les assistants partagés orientés canal. Les internes de l'implémentation WhatsApp intégrée restent privés pour l'extension groupée.
- `openclaw/plugin-sdk/line` pour les plugins de canal LINE.
- `openclaw/plugin-sdk/msteams` pour la surface du plugin Microsoft Teams groupé.
- Les sous-chemins spécifiques aux extensions groupées sont également disponibles :
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/llm-task`,
  `openclaw/plugin-sdk/lobster`, `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/memory-lancedb`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/open-prose`, `openclaw/plugin-sdk/phone-control`,
  `openclaw/plugin-sdk/qwen-portal-auth`, `openclaw/plugin-sdk/synology-chat`,
  `openclaw/plugin-sdk/talk-voice`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/thread-ownership`, `openclaw/plugin-sdk/tlon`,
  `openclaw/plugin-sdk/twitch`, `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo` et `openclaw/plugin-sdk/zalouser`.

## Catalogues de fournisseurs

Les plugins de fournisseur peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que celle qu'OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de fournisseur
- `{ providers }` pour plusieurs entrées de fournisseur

Utilisez `catalog` lorsque le plugin possède des identifiants de modèle spécifiques au fournisseur, des valeurs par défaut d'URL de base ou des métadonnées de modèle sécurisées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux fournisseurs implicites intégrés de OpenClaw :

- `simple` : fournisseurs avec clé API simple ou pilotés par l'environnement
- `profile` : fournisseurs qui apparaissent lorsque des profils d'authentification existent
- `paired` : fournisseurs qui synthétisent plusieurs entrées de fournisseurs connexes
- `late` : dernière passe, après les autres fournisseurs implicites

En cas de collision de clés, les fournisseurs ultérieurs l'emportent, donc les plugins peuvent intentionnellement remplacer une entrée de fournisseur intégrée avec le même identifiant de fournisseur.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

Note de compatibilité :

- `openclaw/plugin-sdk` reste pris en charge pour les plugins externes existants.
- Les nouveaux plugins groupés et ceux qui ont été migrés doivent utiliser des sous-chemins spécifiques au canal ou à l'extension ; utilisez `core` pour les surfaces génériques et `compat` uniquement lorsque des assistants partagés plus larges sont nécessaires.

## Inspection en lecture seule du canal

Si votre plugin enregistre un canal, privilégiez l'implémentation de `plugin.config.inspectAccount(cfg, accountId)` avec `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est supposé que les informations d'identification sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve` et les flux de réparation du docteur/de la configuration ne devraient pas avoir besoin de matérialiser les informations d'identification d'exécution juste pour décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyez que l'état descriptif du compte.
- Préservez `enabled` et `configured`.
- Incluez les champs de source/statut des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une identité est configurée via SecretRef mais indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande » au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

Note de performance :

- La découverte de plugins et les métadonnées du manifeste utilisent des caches en processus courts pour réduire le travail de démarrage/rechargement par rafales.
- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Découverte et priorité

OpenClaw analyse, dans l'ordre :

1. Chemins de configuration

- `plugins.load.paths` (fichier ou répertoire)

2. Extensions de l'espace de travail

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensions globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensions groupées (livrées avec OpenClaw ; mixte activé par défaut/désactivé par défaut)

- `<openclaw>/extensions/*`

De nombreux plugins provider groupés sont activés par défaut pour que les catalogues de modèles/hooks d'exécution restent disponibles sans configuration supplémentaire. D'autres nécessitent toujours une activation explicite via `plugins.entries.<id>.enabled` ou `openclaw plugins enable <id>`.

Exemples de plugins groupés activés par défaut :

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- active memory slot plugin (default slot: `memory-core`)

Installed plugins are enabled by default, but can be disabled the same way.

Workspace plugins are **disabled by default** unless you explicitly enable them
or allowlist them. This is intentional: a checked-out repo should not silently
become production gateway code.

Hardening notes:

- If `plugins.allow` is empty and non-bundled plugins are discoverable, OpenClaw logs a startup warning with plugin ids and sources.
- Candidate paths are safety-checked before discovery admission. OpenClaw blocks candidates when:
  - extension entry resolves outside plugin root (including symlink/path traversal escapes),
  - plugin root/source path is world-writable,
  - path ownership is suspicious for non-bundled plugins (POSIX owner is neither current uid nor root).
- Loaded non-bundled plugins without install/load-path provenance emit a warning so you can pin trust (`plugins.allow`) or install tracking (`plugins.installs`).

Each native OpenClaw plugin must include a `openclaw.plugin.json` file in its
root. If a path points at a file, the plugin root is the file's directory and
must contain the manifest.

Compatible bundles may instead provide one of:

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

Bundle directories are discovered from the same roots as native plugins.

If multiple plugins resolve to the same id, the first match in the order above
wins and lower-precedence copies are ignored.

That means:

- workspace plugins intentionally shadow bundled plugins with the same id
- `plugins.allow: ["foo"]` authorizes the active `foo` plugin by id, even when
  the active copy comes from the workspace instead of the bundled extension root
- si vous avez besoin d'un contrôle plus strict de la provenance, utilisez des chemins d'installation/chargement explicites et
  inspectez la source du plugin résolu avant de l'activer

### Règles d'activation

L'activation est résolue après la découverte :

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` l'emporte toujours
- `plugins.entries.<id>.enabled: false` désactive ce plugin
- les plugins d'origine workspace sont désactivés par défaut
- les listes blanches restreignent l'ensemble actif lorsque `plugins.allow` n'est pas vide
- les listes blanches sont basées sur l'**identifiant**, pas sur la source
- les plugins groupés sont désactivés par défaut sauf si :
  - l'identifiant groupé fait partie de l'ensemble activé par défaut intégré, ou
  - vous l'activez explicitement, ou
  - la configuration du channel active implicitement le plugin de channel groupé
- les emplacements exclusifs peuvent forcer l'activation du plugin sélectionné pour cet emplacement

Dans le cœur actuel, les identifiants groupés activés par défaut incluent les assistants local/fournisseur
ci-dessus ainsi que le plugin d'emplacement de mémoire actif.

### Packs de paquets

Un répertoire de plugins peut inclure un `package.json` avec `openclaw.extensions` :

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin
devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que
`node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin
après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont
rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances des plugins avec
`npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins "en JS/TS pur" et évitez les paquets qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement.
Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de channel désactivé, ou
lorsqu'un plugin de channel est activé mais toujours non configuré, il charge `setupEntry`
au lieu de l'entrée complète du plugin. Cela rend le démarrage et la configuration plus légers
lorsque votre entrée principale de plugin connecte également des outils, des crochets ou d'autres codes
d'exécution uniquement.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
peut faire opter un plugin de canal pour le même chemin `setupEntry` pendant la phase de
démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

Utilisez ceci uniquement lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister
avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration
doit enregistrer chaque fonctionnalité appartenant au canal dont dépend le démarrage, telle que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister pendant cette même fenêtre

Si votre entrée complète possède toujours une fonctionnalité de démarrage requise, n'activez
pas cet indicateur. Conservez le plugin sur le comportement par défaut et laissez OpenClaw charger l'
entrée complète lors du démarrage.

Exemple :

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### Métadonnées du catalogue de canaux

Les plugins de canal peuvent annoncer des métadonnées de configuration/découverte via `openclaw.channel` et
des indices d'installation via `openclaw.install`. Cela maintient le catalogue principal exempt de données.

Exemple :

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, une exportation
de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules/points-virgules/`PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Identifiants de plugin

Identifiants de plugin par défaut :

- Paquets de packages : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit lorsqu'il ne correspond pas à
l'identifiant configuré.

## Modèle de registre

Les plugins chargés ne modifient pas directement des variables globales principales aléatoires. Ils s'inscrivent dans un
registre central de plugins.

Le registre suit :

- les enregistrements de plugins (identité, source, origine, statut, diagnostics)
- les outils
- les hooks hérités et les hooks typés
- les canaux
- les fournisseurs
- gestionnaires RPC de passerelle
- les routes HTTP
- les registraires CLI
- les services d'arrière-plan
- les commandes appartenant au plugin

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugins. Cela maintient le chargement à sens unique :

- module de plugin -> enregistrement dans le registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont besoin que d'un point d'intégration : « lire le registre », et non « cas particulier pour chaque module de plugin ».

## Configuration

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Champs :

- `enabled` : interrupteur principal (par défaut : true)
- `allow` : liste autorisée (optionnel)
- `deny` : liste refusée (optionnel ; la liste refusée l'emporte)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `slots` : sélecteurs de créneaux exclusifs tels que `memory` et `contextEngine`
- `entries.<id>` : interrupteurs + configuration par plugin

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**.

Règles de validation (strictes) :

- Les IDs de plugin inconnus dans `entries`, `allow`, `deny` ou `slots` sont des **erreurs**.
- Les clés inconnues de `channels.<id>` sont des **erreurs**, sauf si un manifeste de plugin déclare l'ID de channel.
- La configuration native du plugin est validée à l'aide du schéma JSON intégré dans `openclaw.plugin.json` (`configSchema`).
- Les bundles compatibles n'exposent actuellement pas les schémas de configuration natifs OpenClaw.
- Si un plugin est désactivé, sa configuration est préservée et un **avertissement** est émis.

### Désactivé vs manquant vs invalide

Ces états sont intentionnellement différents :

- **désactivé** : le plugin existe, mais les règles d'activation l'ont désactivé
- **manquant** : la configuration fait référence à un ID de plugin que la découverte n'a pas trouvé
- **invalide** : le plugin existe, mais sa configuration ne correspond pas au schéma déclaré

OpenClaw préserve la configuration des plugins désactivés afin que leur réactivation ne soit pas destructrice.

## Créneaux de plugins (catégories exclusives)

Certaines catégories de plugins sont **exclusives** (une seule active à la fois). Utilisez `plugins.slots` pour sélectionner quel plugin possède le créneau :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Créneaux exclusifs pris en charge :

- `memory` : plugin de mémoire actif (`"none"` désactive les plugins de mémoire)
- `contextEngine` : plugin de moteur de contexte actif (`"legacy"` est celui par défaut intégré)

Si plusieurs plugins déclarent `kind: "memory"` ou `kind: "context-engine"`, seul
le plugin sélectionné se charge pour cet emplacement. Les autres sont désactivés avec des diagnostics.

### Plugins de moteur de contexte

Les plugins de moteur de contexte gèrent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que de simplement ajouter une recherche de mémoire ou des crochets (hooks).

## Interface de contrôle (schéma + étiquettes)

L'interface de contrôle utilise `config.schema` (JSON Schema + `uiHints`) pour afficher de meilleurs formulaires.

OpenClaw augmente `uiHints` lors de l'exécution en fonction des plugins découverts :

- Ajoute des étiquettes par plugin pour `plugins.entries.<id>` / `.enabled` / `.config`
- Fusionne les indices de champs de configuration optionnels fournis par le plugin sous :
  `plugins.entries.<id>.config.<field>`

Si vous souhaitez que vos champs de configuration de plugin affichent de bonnes étiquettes/espaces réservés (et marquer les secrets comme sensibles),
fournissez `uiHints` aux côtés de votre JSON Schema dans le manifeste du plugin.

Exemple :

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`openclaw plugins list` affiche le format de niveau supérieur comme `openclaw` ou `bundle`.
La sortie de liste/info détaillée affiche également le sous-type de bundle (`codex` ou `claude`) ainsi
que les capacités de bundle détectées.

`plugins update` fonctionne uniquement pour les installations npm suivies sous `plugins.installs`.
Si les métadonnées d'intégrité stockées changent entre les mises à jour, OpenClaw avertit et demande une confirmation (utilisez le global `--yes` pour contourner les invites).

Les plugins peuvent également enregistrer leurs propres commandes de niveau supérieur (exemple : `openclaw voicecall`).

## API de plugin (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

`register(api)` est l'endroit où les plugins attachent des comportements. Les enregistrements courants incluent :

- `registerTool`
- `registerHook`
- `on(...)` pour les crochets de cycle de vie typés
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Les plugins de moteur de contexte peuvent également enregistrer un gestionnaire de contexte possédé par le runtime :

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Activez-le ensuite dans la configuration :

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## Crochets de plugin (hooks)

Les plugins peuvent enregistrer des crochets au moment de l'exécution. Cela permet à un plugin d'inclure une automatisation basée sur les événements sans avoir à installer un pack de crochets séparé.

### Exemple

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

Remarques :

- Enregistrez les crochets explicitement via `api.registerHook(...)`.
- Les règles d'éligibilité des crochets s'appliquent toujours (exigences relatives au système d'exploitation, aux binaires, à l'environnement et à la configuration).
- Les crochets gérés par des plugins apparaissent dans `openclaw hooks list` avec `plugin:<id>`.
- Vous ne pouvez pas activer/désactiver les crochets gérés par des plugins via `openclaw hooks` ; activez/désactivez plutôt le plugin.

### Crochets du cycle de vie de l'agent (`api.on`)

Pour les crochets de cycle de vie d'exécution typés, utilisez `api.on(...)` :

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

Crochets importants pour la construction de l'invite (prompt) :

- `before_model_resolve` : s'exécute avant le chargement de la session (`messages` ne sont pas disponibles). Utilisez ceci pour remplacer de manière déterministe `modelOverride` ou `providerOverride`.
- `before_prompt_build` : s'exécute après le chargement de la session (`messages` sont disponibles). Utilisez ceci pour façonner l'entrée de l'invite.
- `before_agent_start` : crochet de compatibilité hérité. Préférez les deux crochets explicites ci-dessus.

Politique de crochet imposée par le cœur (Core) :

- Les opérateurs peuvent désactiver les crochets de mutation d'invite par plugin via `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Lorsqu'ils sont désactivés, OpenClaw bloque `before_prompt_build` et ignore les champs de mutation d'invite renvoyés par l'ancien `before_agent_start` tout en préservant l'ancien `modelOverride` et `providerOverride`.

Champs de résultat `before_prompt_build` :

- `prependContext` : ajoute du texte au début du prompt utilisateur pour cette exécution. Idéal pour le contenu spécifique à un tour ou dynamique.
- `systemPrompt` : remplacement complet du prompt système.
- `prependSystemContext` : ajoute du texte au début du prompt système actuel.
- `appendSystemContext` : ajoute du texte à la fin du prompt système actuel.

Ordre de construction du prompt dans le runtime intégré :

1. Appliquer `prependContext` au prompt utilisateur.
2. Appliquer le remplacement `systemPrompt` lorsqu'il est fourni.
3. Appliquer `prependSystemContext + current system prompt + appendSystemContext`.

Notes de fusion et de priorité :

- Les gestionnaires de hooks s'exécutent par priorité (les plus élevés d'abord).
- Pour les champs de contexte fusionnés, les valeurs sont concaténées dans l'ordre d'exécution.
- Les valeurs `before_prompt_build` sont appliquées avant les valeurs de secours héritées `before_agent_start`.

Conseils de migration :

- Déplacez les directives statiques de `prependContext` vers `prependSystemContext` (ou `appendSystemContext`) afin que les fournisseurs puissent mettre en cache le contenu stable du préfixe système.
- Conservez `prependContext` pour le contexte dynamique par tour qui doit rester lié au message utilisateur.

## Plugins de fournisseur (auth de modèle)

Les plugins peuvent enregistrer des **fournisseurs de modèles** afin que les utilisateurs puissent effectuer une configuration OAuth ou de clé API
dans OpenClaw, afficher la configuration du fournisseur dans l'onboarding/model-pickers, et
contribuer à la découverte implicite de fournisseurs.

Les plugins de fournisseur constituent la jointure d'extension modulaire pour la configuration des fournisseurs de modèles. Ils
ne sont plus simplement des « assistants OAuth ».

### Cycle de vie du plugin de fournisseur

Un plugin de fournisseur peut participer à cinq phases distinctes :

1. **Auth**
   `auth[].run(ctx)` effectue une authentification OAuth, la capture de clé API, le code de périphérique, ou une
   configuration personnalisée et retourne des profils d'authentification ainsi que des correctifs de configuration facultatifs.
2. **Configuration non interactive**
   `auth[].runNonInteractive(ctx)` gère `openclaw onboard --non-interactive`
   sans invite. Utilisez ceci lorsque le fournisseur a besoin d'une configuration personnalisée sans interface graphique
   au-delà des chemins simples intégrés de clé API.
3. **Intégration de l'assistant**
   `wizard.setup` ajoute une entrée à `openclaw onboard`.
   `wizard.modelPicker` ajoute une entrée de configuration au sélecteur de modèle.
4. **Découverte implicite**
   `discovery.run(ctx)` peut contribuer à la configuration du provider automatiquement lors de
   la résolution/liste des models.
5. **Suivi post-sélection**
   `onModelSelected(ctx)` s'exécute après qu'un model est choisi. Utilisez ceci pour des tâches
   spécifiques au provider telles que le téléchargement d'un model local.

C'est la répartition recommandée car ces phases ont des exigences de cycle de vie
différentes :

- l'auth est interactive et écrit les informations d'identification/configuration
- la configuration non interactive est pilotée par des indicateurs/env et ne doit pas inviter
- les métadonnées de l'assistant sont statiques et orientées interface utilisateur
- la découverte doit être sûre, rapide et tolérante aux pannes
- les crochets (hooks) post-sélection sont des effets secondaires liés au model choisi

### Contrat d'authentification du provider

`auth[].run(ctx)` renvoie :

- `profiles` : profils d'auth à écrire
- `configPatch` : modifications `openclaw.json` facultatives
- `defaultModel` : ref `provider/model` facultative
- `notes` : notes utilisateur facultatives

Le Core ensuite :

1. écrit les profils d'auth renvoyés
2. applique le câblage de la configuration du profil d'auth
3. fusionne le correctif de configuration
4. applique facultativement le model par défaut
5. exécute le hook `onModelSelected` du provider si approprié

Cela signifie qu'un plugin de provider possède la logique de configuration spécifique au provider, tandis que le Core
possède le chemin générique de persistance et de fusion de configuration.

### Contrat non interactif du provider

`auth[].runNonInteractive(ctx)` est facultatif. Implémentez-le lorsque le provider
a besoin d'une configuration sans interface utilisateur (headless) qui ne peut pas être exprimée via les flux génériques intégrés
de clés API.

Le contexte non interactif inclut :

- la configuration actuelle et de base
- options d'CLI d'intégration analysées
- assistants de journalisation/erreur d'exécution
- répertoires agent/workspace afin que le provider puisse persister l'auth dans le même magasin
  délimité utilisé par le reste de l'intégration
- `resolveApiKey(...)` pour lire les clés du provider à partir des indicateurs, des variables d'environnement ou des profils d'auth
  existants tout en respectant `--secret-input-mode`
- `toApiKeyCredential(...)` pour convertir une clé résolue en information d'identification de profil d'auth
  avec le bon stockage en texte brut vs référence secrète

Utilisez cette surface pour les providers tels que :

- runtimes auto-hébergés compatibles OpenAI qui nécessitent `--custom-base-url` +
  `--custom-model-id`
- vérification non interactive spécifique au fournisseur ou synthèse de configuration

Ne demandez pas d'invite depuis `runNonInteractive`. Rejetez les entrées manquantes avec des erreurs
exploitables à la place.

### Métadonnées de l'assistant fournisseur

Les métadonnées d'authentification/onboarding du fournisseur peuvent résider dans deux couches :

- manifeste `providerAuthChoices` : étiquettes légères, regroupement, ids `--auth-choice`
  et métadonnées simples d'indicateur CLI disponibles avant le chargement du runtime
- runtime `wizard.setup` / `auth[].wizard` : comportement plus riche qui dépend du
  code fournisseur chargé

Utilisez les métadonnées de manifeste pour les étiquettes/indicateurs statiques. Utilisez les métadonnées de l'assistant de runtime lorsque
la configuration dépend de méthodes d'authentification dynamiques, de méthode de repli, ou de validation au runtime.

`wizard.setup` contrôle l'apparence du fournisseur dans l'onboarding groupé :

- `choiceId` : valeur de choix d'authentification
- `choiceLabel` : étiquette de l'option
- `choiceHint` : indice court
- `groupId` : id du groupe
- `groupLabel` : étiquette du groupe
- `groupHint` : indice du groupe
- `methodId` : méthode d'authentification à exécuter
- `modelAllowlist` : politique de liste d'autorisation post-authentification optionnelle (`allowedKeys`, `initialSelections`, `message`)

`wizard.modelPicker` contrôle l'apparence d'un fournisseur en tant qu'entrée
"configurer maintenant" dans la sélection de modèle :

- `label`
- `hint`
- `methodId`

Lorsqu'un fournisseur a plusieurs méthodes d'authentification, l'assistant peut soit pointer vers une
méthode explicite soit laisser OpenClaw synthétiser des choix par méthode.

OpenClaw valide les métadonnées de l'assistant fournisseur lors de l'enregistrement du plugin :

- les ids de méthode d'authentification en double ou vides sont rejetés
- les métadonnées de l'assistant sont ignorées lorsque le fournisseur n'a pas de méthodes d'authentification
- les liaisons `methodId` non valides sont rétrogradées en avertissements et reviennent aux
  méthodes d'authentification restantes du fournisseur

### Contrat de découverte de fournisseur

`discovery.run(ctx)` renvoie l'un des éléments suivants :

- `{ provider }`
- `{ providers }`
- `null`

Utilisez `{ provider }` pour le cas courant où le plugin possède un id de fournisseur.
Utilisez `{ providers }` lorsqu'un plugin découvre plusieurs entrées de fournisseur.

Le contexte de découverte inclut :

- la configuration actuelle
- répertoires agent/workspace
- env du processus
- un assistant pour résoudre la clé API du fournisseur et une valeur de clé API sécurisée pour la découverte

La découverte doit être :

- rapide
- au mieux
- sûre à ignorer en cas d'échec
- prudente concernant les effets secondaires

Elle ne doit pas dépendre de invites ou de configurations de longue durée.

### Ordre de découverte

La découverte de fournisseur s'exécute en phases ordonnées :

- `simple`
- `profile`
- `paired`
- `late`

Utilisez :

- `simple` pour une découverte peu coûteuse basée uniquement sur l'environnement
- `profile` lorsque la découverte dépend des profils d'authentification
- `paired` pour les fournisseurs qui doivent se coordonner avec une autre étape de découverte
- `late` pour des sondages coûteux ou sur le réseau local

La plupart des fournisseurs auto-hébergés devraient utiliser `late`.

### Bonnes limites plugin-fournisseur

Bon cas d'usage pour les plugins de fournisseur :

- fournisseurs locaux/auto-hébergés avec des flux de configuration personnalisés
- connexion OAuth/code-appareil spécifique au fournisseur
- découverte implicite des serveurs de modèle locaux
- effets secondaires post-sélection tels que les tirages de modèle

Moins pertinent :

- fournisseurs triviaux avec uniquement clé API qui diffèrent uniquement par la variable d'environnement, l'URL de base et un
  modèle par défaut

Ceux-ci peuvent toujours devenir des plugins, mais le principal bénéfice de la modularité vient de
l'extraction préalable des fournisseurs riches en comportements.

Enregistrez un fournisseur via `api.registerProvider(...)`. Chaque fournisseur expose une
ou plusieurs méthodes d'authentification (OAuth, clé API, code d'appareil, etc.). Ces méthodes peuvent
alimenter :

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entrées de configuration « fournisseur personnalisé » du sélecteur de modèle
- découverte implicite de fournisseur lors de la résolution/liste des modèles

Exemple :

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

Notes :

- `run` reçoit un `ProviderAuthContext` avec `prompter`, `runtime`,
  `openUrl`, `oauth.createVpsAwareHandlers`, `secretInputMode` et
  `allowSecretRefPrompt` helpers/state. Les flux onboarding/configure peuvent utiliser
  ceux-ci pour honorer `--secret-input-mode` ou offrir une capture de secret-ref env/file/exec,
  tandis que `openclaw models auth` maintient une surface de prompt plus stricte.
- `runNonInteractive` reçoit un `ProviderAuthMethodNonInteractiveContext`
  avec `opts`, `agentDir`, `resolveApiKey` et `toApiKeyCredential` helpers
  pour l'onboarding sans interface (headless).
- Retournez `configPatch` lorsque vous devez ajouter des modèles par défaut ou une configuration de provider.
- Retournez `defaultModel` afin que `--set-default` puisse mettre à jour les valeurs par défaut de l'agent.
- `wizard.setup` ajoute un choix de provider aux surfaces d'onboarding telles que
  `openclaw onboard` / `openclaw setup --wizard`.
- `wizard.setup.modelAllowlist` permet au provider de restreindre le prompt de la liste d'autorisation (allowlist) des modèles suivants lors de l'onboarding/configure.
- `wizard.modelPicker` ajoute une entrée « configurer ce provider » au sélecteur de modèles.
- `deprecatedProfileIds` permet au provider de gérer le nettoyage `openclaw doctor` pour
  les ids de profil d'authentification retirés.
- `discovery.run` retourne soit `{ provider }` pour l'id de provider propre du plugin
  soit `{ providers }` pour la découverte multi-provider.
- `discovery.order` contrôle le moment où le provider s'exécute par rapport aux phases de découverte intégrées : `simple`, `profile`, `paired`, ou `late`.
- `onModelSelected` est le hook post-sélection pour les travaux de suivi spécifiques au provider,
  tels que le tirage d'un modèle local.

### Enregistrer un canal de messagerie

Les plugins peuvent enregistrer des **plugins de canal** qui se comportent comme des canaux intégrés (WhatsApp, Telegram, etc.). La configuration du canal se trouve sous `channels.<id>` et est validée par votre code de plugin de canal.

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

Notes :

- Mettez la configuration sous `channels.<id>` (et non `plugins.entries`).
- `meta.label` est utilisé pour les étiquettes dans les listes CLI/UI.
- `meta.aliases` ajoute des identifiants alternatifs pour la normalisation et les entrées CLI.
- `meta.preferOver` répertorie les identifiants de canal à ignorer pour l'activation automatique lorsque les deux sont configurés.
- `meta.detailLabel` et `meta.systemImage` permettent aux interfaces utilisateur d'afficher des étiquettes/icônes de canal plus riches.

### Hooks de configuration de canal

Répartition de configuration préférée :

- `plugin.setup` gère la normalisation, la validation et l'écriture de la configuration de l'identifiant de compte.
- `plugin.setupWizard` permet à l'hôte d'exécuter le flux commun de l'assistant tandis que le canal fournit uniquement des descripteurs d'état, d'identifiants, de liste d'autorisation DM et d'accès au canal.

`plugin.setupWizard` est idéal pour les canaux qui correspondent au modèle partagé :

- un sélecteur de compte piloté par `plugin.config.listAccountIds`
- étape facultative de pré-vol/préparation avant l'invite (par exemple, travail d'installateur/d'amorçage)
- invite facultative de raccourci d'environnement pour les ensembles d'identifiants groupés (par exemple, jetons de bot/application appariés)
- une ou plusieurs invites d'identifiants, chaque étape écrivant soit via `plugin.setup.applyAccountConfig` soit via un correctif partiel propriétaire du canal
- invites de texte non secret facultatives (par exemple, chemins CLI, URL de base, identifiants de compte)
- invites facultatives de liste d'autorisation d'accès au canal/groupe résolues par l'hôte
- résolution facultative de la liste d'autorisation DM (par exemple, `@username` -> identifiant numérique)
- note de fin facultative après la fin de la configuration

### Écrire un nouveau canal de messagerie (étape par étape)

Utilisez ceci lorsque vous souhaitez une **nouvelle surface de chat** (un « canal de messagerie »), et non un fournisseur de modèle. La documentation du fournisseur de modèle se trouve sous `/providers/*`.

1. Choisissez un identifiant + une forme de configuration

- Toute la configuration du canal se trouve sous `channels.<id>`.
- Préférez `channels.<id>.accounts.<accountId>` pour les configurations multi-comptes.

2. Définir les métadonnées du canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` contrôlent les listes CLI/UI.
- `meta.docsPath` doit pointer vers une page de documentation comme `/channels/<id>`.
- `meta.preferOver` permet à un plugin de remplacer un autre canal (l'activation automatique le privilégie).
- `meta.detailLabel` et `meta.systemImage` sont utilisés par les UI pour le texte détaillé/les icônes.

3. Implémenter les adaptateurs requis

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (types de chat, médias, fils de discussion, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (pour l'envoi basique)

4. Ajouter des adaptateurs facultatifs selon les besoins

- `setup` (validation + écritures de configuration), `setupWizard` (assistant propriété de l'hôte), `security` (politique DM), `status` (santé/diagnostic)
- `gateway` (démarrage/arrêt/connexion), `mentions`, `threading`, `streaming`
- `actions` (actions de message), `commands` (comportement des commandes natives)

5. Enregistrer le canal dans votre plugin

- `api.registerChannel({ plugin })`

Exemple de configuration minimale :

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

Plugin de canal minimal (sortant uniquement) :

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Chargez le plugin (répertoire des extensions ou `plugins.load.paths`), redémarrez la passerelle,
puis configurez `channels.<id>` dans votre configuration.

### Outils d'agent

Voir le guide dédié : [Plugin agent tools](/fr/plugins/agent-tools).

### Enregistrer une méthode RPC de passerelle

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Enregistrer les commandes CLI

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### Enregistrer les commandes de réponse automatique

Les plugins peuvent enregistrer des commandes slash personnalisées qui s'exécutent **sans invoquer l'
agent IA**. Cela est utile pour les commandes de basculement, les vérifications de statut ou les actions rapides
qui ne nécessitent pas de traitement LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

Contexte du gestionnaire de commande :

- `senderId` : L'ID de l'expéditeur (si disponible)
- `channel` : Le canal où la commande a été envoyée
- `isAuthorizedSender` : Si l'expéditeur est un utilisateur autorisé
- `args` : Arguments passés après la commande (si `acceptsArgs: true`)
- `commandBody` : Le texte complet de la commande
- `config` : La configuration OpenClaw actuelle

Options de commande :

- `name` : Nom de la commande (sans le `/` au début)
- `nativeNames` : Alias de commande native facultatifs pour les surfaces slash/menu. Utilisez `default` pour tous les providers natifs, ou des clés spécifiques au provider comme `discord`
- `description` : Texte d'aide affiché dans les listes de commandes
- `acceptsArgs` : Indique si la commande accepte des arguments (par défaut : false). Si false et que des arguments sont fournis, la commande ne correspondra pas et le message sera transmis aux autres gestionnaires
- `requireAuth` : Indique s'il faut exiger un expéditeur autorisé (par défaut : true)
- `handler` : Fonction qui renvoie `{ text: string }` (peut être asynchrone)

Exemple avec autorisation et arguments :

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

Remarques :

- Les commandes des plugins sont traitées **avant** les commandes intégrées et l'agent IA
- Les commandes sont enregistrées globalement et fonctionnent sur tous les canaux
- Les noms de commandes ne sont pas sensibles à la casse (`/MyStatus` correspond à `/mystatus`)
- Les noms de commandes doivent commencer par une lettre et contenir uniquement des lettres, des chiffres, des tirets et des traits de soulignement
- Les noms de commandes réservés (comme `help`, `status`, `reset`, etc.) ne peuvent pas être remplacés par des plugins
- L'enregistrement de commandes en double entre plusieurs plugins échouera avec une erreur de diagnostic

### Enregistrer les services d'arrière-plan

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## Conventions de nommage

- Méthodes du Gateway : `pluginId.action` (exemple : `voicecall.status`)
- Outils : `snake_case` (exemple : `voice_call`)
- Commandes CLI : kebab ou camel, mais évitez les conflits avec les commandes principales

## Skills

Les plugins peuvent inclure un skill dans le dépôt (`skills/<name>/SKILL.md`).
Activez-le avec `plugins.entries.<id>.enabled` (ou autres portes de configuration) et assurez-vous
qu'il est présent dans vos emplacements de skills gérés/workspace.

## Distribution (npm)

Packaging recommandé :

- Paquet principal : `openclaw` (ce dépôt)
- Plugins : paquets npm distincts sous `@openclaw/*` (exemple : `@openclaw/voice-call`)

Contrat de publication :

- Le `package.json` du plugin doit inclure `openclaw.extensions` avec un ou plusieurs fichiers d'entrée.
- Optionnel : `openclaw.setupEntry` peut pointer vers une entrée de configuration uniquement légère pour la configuration de canal désactivée ou non encore configurée.
- Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut permettre à un plugin de canal d'utiliser `setupEntry` lors du démarrage de la passerelle avant écoute, mais seulement lorsque cette entrée de configuration couvre entièrement la surface critique au démarrage du plugin.
- Les fichiers d'entrée peuvent être `.js` ou `.ts` (jiti charge TS à l'exécution).
- `openclaw plugins install <npm-spec>` utilise `npm pack`, l'extrait dans `~/.openclaw/extensions/<id>/` et l'active dans la configuration.
- Stabilité de la clé de configuration : les paquets portés sont normalisés vers l'identifiant **non porté** pour `plugins.entries.*`.

## Exemple de plugin : Appel vocal

Ce dépôt comprend un plugin d'appel vocal (Twilio ou repli sur journal) :

- Source : `extensions/voice-call`
- Compétence : `skills/voice-call`
- CLI : `openclaw voicecall start|status`
- Outil : `voice_call`
- RPC : `voicecall.start`, `voicecall.status`
- Configuration (twilio) : `provider: "twilio"` + `twilio.accountSid/authToken/from` (optionnel `statusCallbackUrl`, `twimlUrl`)
- Configuration (dev) : `provider: "log"` (pas de réseau)

Consultez [Appel vocal](/fr/plugins/voice-call) et `extensions/voice-call/README.md` pour la configuration et l'utilisation.

## Notes de sécurité

Les plugins s'exécutent dans le même processus que la Gateway. Traitez-les comme du code de confiance :

- N'installez que les plugins en lesquels vous avez confiance.
- Préférez les listes d'autorisation `plugins.allow`.
- Rappelez-vous que `plugins.allow` est basé sur l'identifiant, donc un plugin d'espace de travail activé peut
  intentionnellement masquer un plugin groupé avec le même identifiant.
- Redémarrez la Gateway après les modifications.

## Tester les plugins

Les plugins peuvent (et devraient) inclure des tests :

- Les plugins dans le dépôt peuvent conserver les tests Vitest sous `src/**` (exemple : `src/plugins/voice-call.plugin.test.ts`).
- Les plugins publiés séparément doivent exécuter leur propre CI (lint/build/test) et vérifier que `openclaw.extensions` pointe vers le point d'entrée construit (`dist/index.js`).

import fr from "/components/footer/fr.mdx";

<fr />
