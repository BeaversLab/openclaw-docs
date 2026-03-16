---
summary: "plugins/extensions OpenClaw : découverte, configuration et sécurité"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
---

# Plugins (Extensions)

## Démarrage rapide (nouveau avec les plugins ?)

Un plugin est soit :

- un **plugin natif OpenClaw** (`openclaw.plugin.json` + module d'exécution), ou
- un **bundle** compatible (`.codex-plugin/plugin.json` ou `.claude-plugin/plugin.json`)

Les deux apparaissent sous `openclaw plugins`, mais seuls les plugins natifs OpenClaw exécutent
du code d'exécution en cours de processus.

La plupart du temps, vous utiliserez des plugins lorsque vous voudrez une fonctionnalité qui n'est pas encore intégrée
au cœur d'OpenClaw (ou si vous souhaitez garder les fonctionnalités optionnelles hors de votre
installation principale).

Accès rapide :

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

Les spécifications nues et `@latest` restent sur la voie stable. Si npm résolve l'un de
ceux-ci vers une préversion, OpenClaw s'arrête et vous demande de vous engager explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte.

3. Redémarrez la Gateway, puis configurez sous `plugins.entries.<id>.config`.

Voir [Appel vocal](/fr/plugins/voice-call) pour un exemple concret de plugin.
Vous cherchez des listings tiers ? Voir [Plugins communautaires](/fr/plugins/community).
Besoin des détails de compatibilité des bundles ? Voir [Bundles de plugins](/fr/plugins/bundles).

Pour les bundles compatibles, installez à partir d'un répertoire local ou d'une archive :

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

## Architecture

Le système de plugins d'OpenClaw a quatre couches :

1. **Manifeste + découverte**
   OpenClaw trouve les plugins candidats à partir des chemins configurés, des racines de l'espace de travail,
   des racines d'extensions globales et des extensions groupées. La découverte lit d'abord les manifestes natifs
   `openclaw.plugin.json` ainsi que les manifestes de bundles pris en charge.
2. **Activation + validation**
   Le cœur décide si un plugin découvert est activé, désactivé, bloqué ou
   sélectionné pour un emplacement exclusif tel que la mémoire.
3. **Chargement à l'exécution**
   Les plugins natifs OpenClaw sont chargés en processus via jiti et enregistrent
   les capacités dans un registre central. Les bundles compatibles sont normalisés en
   enregistrements de registre sans importer de code d'exécution.
4. **Consommation en surface**
   Le reste de OpenClaw lit le registre pour exposer les outils, les canaux, la configuration du fournisseur,
   les hooks, les routes HTTP, les commandes CLI et les services.

La limite de conception importante :

- la découverte + la validation de la configuration doivent fonctionner à partir des **métadonnées de manifeste/schéma**
  sans exécuter le code du plugin
- le comportement d'exécution natif provient du chemin `register(api)` du module du plugin

Cette séparation permet à OpenClaw de valider la configuration, d'expliquer les plugins manquants/désactivés et
de générer des indices d'interface/schéma avant que l'exécution complète ne soit active.

## Bundles compatibles

OpenClaw reconnaît également deux dispositions de bundle externes compatibles :

- Bundles style Codex : `.codex-plugin/plugin.json`
- Bundles style Claude : `.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut
  sans manifeste
- Bundles style Cursor : `.cursor-plugin/plugin.json`

Ils apparaissent dans la liste des plugins comme `format=bundle`, avec un sous-type de
`codex` ou `claude` dans la sortie verbeuse/info.

Consultez [Plugin bundles](/fr/plugins/bundles) pour connaître les règles de détection exactes, le comportement de mappage
et la matrice de support actuelle.

Aujourd'hui, OpenClaw les traite comme des **packs de capacités**, et non comme des plugins d'exécution
natifs :

- pris en charge maintenant : `skills` groupés
- pris en charge maintenant : racines markdown `commands/` Claude, mappées dans le chargeur de compétences normal
  OpenClaw
- pris en charge maintenant : les valeurs par défaut `settings.json` des bundles Claude pour les paramètres de l'agent Pi intégré
  (avec les clés de remplacement shell nettoyées)
- pris en charge maintenant : racines `.cursor/commands/*.md` Cursor, mappées dans le chargeur de compétences normal
  OpenClaw
- pris en charge maintenant : les répertoires de hooks de bundle Codex qui utilisent la disposition de hook-pack
  OpenClaw (`HOOK.md` + `handler.ts`/`handler.js`)
- détectés mais pas encore connectés : autres capacités de bundle déclarées telles que
  agents, automatisation de hooks Claude, règles/hooks/métadonnées MCP Cursor, métadonnées MCP/app/LSP,
  styles de sortie

Cela signifie que l'installation, la découverte, la liste, les informations et l'activation du bundle fonctionnent toutes, et que les compétences du bundle, les commandes Claude, les paramètres par défaut des bundles Claude et les répertoires de hooks Codex compatibles se chargent lorsque le bundle est activé, mais que le code d'exécution du bundle n'est pas exécuté en cours de processus.

La prise en charge des hooks de bundle est limitée au format normal du répertoire de hooks OpenClaw (`HOOK.md` plus `handler.ts`/`handler.js` sous les racines de hooks déclarées). Les runtimes de hooks shell/JSON spécifiques aux fournisseurs, y compris Claude `hooks.json`, sont aujourd'hui seulement détectés et ne sont pas exécutés directement.

## Modèle d'exécution

Les plugins natifs OpenClaw s'exécutent **en cours de processus** avec le Gateway. Ils ne sont pas sandboxed. Un plugin natif chargé a la même limite de confiance au niveau du processus que le code principal.

Implications :

- un plugin natif peut enregistrer des outils, des gestionnaires de réseau, des hooks et des services
- un bogue de plugin natif peut planter ou déstabiliser la passerelle
- un plugin natif malveillant équivaut à une exécution de code arbitraire à l'intérieur du processus OpenClaw

Les bundles compatibles sont plus sûrs par défaut car OpenClaw les traite actuellement comme des packs de métadonnées/contenu. Dans les versions actuelles, cela signifie principalement des compétences groupées.

Utilisez des listes d'autorisation et des chemins d'installation/chargement explicites pour les plugins non groupés. Traitez les plugins de l'espace de travail comme du code de temps de développement, et non comme des valeurs par défaut de production.

Note importante sur la confiance :

- `plugins.allow` fait confiance aux **ids de plugins**, et non à la provenance de la source.
- Un plugin de l'espace de travail avec le même id qu'un plugin groupé remplace intentionnellement la copie groupée lorsque ce plugin de l'espace de travail est activé ou ajouté à la liste d'autorisation.
- Ceci est normal et utile pour le développement local, les tests de correctifs et les correctifs rapides.

## Plugins disponibles (officiels)

- Microsoft Teams est uniquement disponible sous forme de plugin depuis le 15/01/2026 ; installez `@openclaw/msteams` si vous utilisez Teams.
- Mémoire (Core) — plugin de recherche de mémoire groupé (activé par défaut via `plugins.slots.memory`)
- Mémoire (LanceDB) — plugin de mémoire à long terme groupé (rappel/capture automatique ; définir `plugins.slots.memory = "memory-lancedb"`)
- [Appel vocal](/fr/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personnel](/fr/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/fr/channels/matrix) — `@openclaw/matrix`
- [Nostr](/fr/channels/nostr) — `@openclaw/nostr`
- [Zalo](/fr/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/fr/channels/msteams) — `@openclaw/msteams`
- Runtime du provider Anthropic — fourni sous forme de `anthropic` (activé par défaut)
- Catalogue de fournisseurs BytePlus — fourni sous forme de `byteplus` (activé par défaut)
- Catalogue de fournisseurs Cloudflare AI Gateway — fourni sous forme de `cloudflare-ai-gateway` (activé par défaut)
- Recherche web Google + CLI Gemini OAuth — fourni sous forme de `google` (la recherche web le charge automatiquement ; l'authentification du fournisseur reste facultative)
- Runtime du provider GitHub Copilot — fourni sous forme de `github-copilot` (activé par défaut)
- Catalogue de fournisseurs Hugging Face — fourni sous forme de `huggingface` (activé par défaut)
- Runtime du provider Kilo Gateway — fourni sous forme de `kilocode` (activé par défaut)
- Catalogue de fournisseurs Kimi Coding — fourni sous forme de `kimi-coding` (activé par défaut)
- Catalogue + utilisation du fournisseur MiniMax — fourni sous forme de `minimax` (activé par défaut)
- MiniMax OAuth (authentification + catalogue du fournisseur) — fourni sous forme de `minimax-portal-auth` (activé par défaut)
- Capacités du fournisseur Mistral — fournies sous forme de `mistral` (activé par défaut)
- Catalogue de fournisseurs Model Studio — fourni sous forme de `modelstudio` (activé par défaut)
- Runtime du provider Moonshot — fourni sous forme de `moonshot` (activé par défaut)
- Catalogue de fournisseurs NVIDIA — fourni sous forme de `nvidia` (activé par défaut)
- Runtime du provider OpenAI — fourni sous forme de `openai` (activé par défaut ; possède à la fois `openai` et `openai-codex`)
- Capacités du fournisseur OpenCode Go — fournies sous forme de `opencode-go` (activé par défaut)
- Capacités du fournisseur OpenCode Zen — fournies sous forme de `opencode` (activé par défaut)
- Runtime du provider OpenRouter — fourni sous forme de `openrouter` (activé par défaut)
- Catalogue de provider Qianfan — groupé en tant que `qianfan` (activé par défaut)
- Qwen OAuth (auth provider + catalogue) — groupé en tant que `qwen-portal-auth` (activé par défaut)
- Catalogue de provider synthétique — groupé en tant que `synthetic` (activé par défaut)
- Catalogue de provider Together — groupé en tant que `together` (activé par défaut)
- Catalogue de provider Venice — groupé en tant que `venice` (activé par défaut)
- Catalogue de provider AI Vercel Gateway — groupé en tant que `vercel-ai-gateway` (activé par défaut)
- Catalogue de provider Volcengine — groupé en tant que `volcengine` (activé par défaut)
- Catalogue de provider Xiaomi + utilisation — groupé en tant que `xiaomi` (activé par défaut)
- Runtime du provider Z.AI — groupé en tant que `zai` (activé par défaut)
- Copilot Proxy (auth provider) — pont local VS Code Copilot Proxy ; distinct de la connexion appareil intégrée `github-copilot` (groupé, désactivé par défaut)

Les plugins natifs OpenClaw sont des **modules TypeScript** chargés au moment de l'exécution via jiti.
**La validation de la configuration n'exécute pas le code du plugin** ; elle utilise plutôt le manifeste du plugin
et le schéma JSON. Voir [Plugin manifest](/fr/plugins/manifest).

Les plugins natifs OpenClaw peuvent enregistrer :

- Méthodes Gateway RPC
- Routes HTTP Gateway
- Outils d'agent
- Commandes CLI
- Services d'arrière-plan
- Moteurs de contexte
- Flux d'authentification provider et catalogues de modèles
- Hooks de runtime provider pour les identifiants de modèle dynamiques, la normalisation du transport, les métadonnées de capacités, l'enveloppement de flux, la stratégie de TTL du cache, les indices d'auth manquante, la suppression des modèles intégrés, l'augmentation du catalogue, l'échange d'auth au runtime, et la résolution de l'instantané + auth d'utilisation/facturation
- Validation de configuration facultative
- **Skills** (en listant les répertoires `skills` dans le manifeste du plugin)
- **Commandes de réponse automatique** (exécuter sans invoquer l'agent IA)

Les plugins natifs OpenClaw s'exécutent **in‑process** avec le Gateway, traitez-les donc comme du code de confiance.
Guide de rédaction d'outils : [Plugin agent tools](/fr/plugins/agent-tools).

## Hooks de runtime provider

Les plugins provider ont maintenant deux couches :

- hooks de configuration : `catalog` / ancien `discovery`
- runtime hooks : `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw possède toujours la boucle générique de l'agent, le basculement, la gestion des transcriptions et la politique OpenClaw. Ces hooks constituent la jonction pour les comportements spécifiques au fournisseur sans avoir besoin d'un transport d'inférence entièrement personnalisé.

### Ordre des hooks

Pour les plugins de modèle/fournisseur, OpenClaw utilise les hooks dans cet ordre approximatif :

1. `catalog`
   Publier la configuration du fournisseur dans `models.providers` pendant `models.json`
   la génération.
2. recherche de modèle intégré/découvert
   OpenClaw essaie d'abord le chemin normal du registre/catalogue.
3. `resolveDynamicModel`
   Fallback synchrone pour les ids de modèle appartenant au fournisseur qui ne sont pas encore dans le registre local.
4. `prepareDynamicModel`
   Préchauffage asynchrone uniquement sur les chemins de résolution de modèle asynchrones, puis
   `resolveDynamicModel` s'exécute à nouveau.
5. `normalizeResolvedModel`
   Réécriture finale avant que le runner intégré n'utilise le modèle résolu.
6. `capabilities`
   Métadonnées de transcription/outillage appartenant au fournisseur utilisées par la logique principale partagée.
7. `prepareExtraParams`
   Normalisation des paramètres de demande appartenant au fournisseur avant les wrappers d'options de flux génériques.
8. `wrapStreamFn`
   Wrapper de flux appartenant au fournisseur après l'application des wrappers génériques.
9. `isCacheTtlEligible`
   Politique de cache de prompt appartenant au fournisseur pour les fournisseurs de proxy/backhaul.
10. `buildMissingAuthMessage`
    Remplacement appartenant au fournisseur pour le message générique de récupération d'auth manquante.
11. `suppressBuiltInModel`
    Suppression de modèle en amont obsolète appartenant au fournisseur plus un indice d'erreur facultatif orienté utilisateur.
12. `augmentModelCatalog`
    Lignes de catalogue synthétiques/finales appartenant au fournisseur ajoutées après la découverte.
13. `prepareRuntimeAuth`
    Échange une information d'identification configurée contre le jeton/clé d'exécution réel juste
    avant l'inférence.
14. `resolveUsageAuth`
    Résout les identifiants d'utilisation/facturation pour `/usage` et les surfaces de statut associées.
15. `fetchUsageSnapshot`
    Récupère et normalise les instantanés d'utilisation/quota spécifiques au fournisseur une fois l'authentification résolue.

### Quel hook utiliser

- `catalog` : publie la configuration du fournisseur et les catalogues de modèles dans `models.providers`
- `resolveDynamicModel` : gère les identifiants de modèle en transit ou à compatibilité ascendante qui ne sont pas encore dans le registre local
- `prepareDynamicModel` : préchauffage asynchrone avant de réessayer la résolution dynamique (par exemple, rafraîchir le cache des métadonnées du fournisseur)
- `normalizeResolvedModel` : réécrit le transport/l'URL de base/la compatibilité d'un modèle résolu avant l'inférence
- `capabilities` : publie les particularités de la famille de fournisseurs et de la transcription/outillage sans coder en dur les identifiants de fournisseurs dans le cœur
- `prepareExtraParams` : définit les valeurs par défaut du fournisseur ou normalise les paramètres spécifiques au fournisseur par modèle avant l'encapsulage de flux générique
- `wrapStreamFn` : ajoute des en-têtes/charges utiles/correctifs de compatibilité de modèle spécifiques au fournisseur tout en utilisant le chemin d'exécution normal `pi-ai`
- `isCacheTtlEligible` : décide si les paires fournisseur/modèle doivent utiliser les métadonnées TTL du cache
- `buildMissingAuthMessage` : remplace l'erreur générique du magasin d'authentification par un conseil de récupération spécifique au fournisseur
- `suppressBuiltInModel` : masque les lignes en amont obsolètes et renvoie facultativement une erreur détenue par le fournisseur pour les échecs de résolution directe
- `augmentModelCatalog` : ajoute des lignes de catalogue synthétiques/finales après la découverte et la fusion de la configuration
- `prepareRuntimeAuth` : échange une identifiants configuré contre le jeton/clé d'exécution réel à court terme utilisé pour les requêtes
- `resolveUsageAuth` : résout les identifiants détenus par le fournisseur pour les points de terminaison d'utilisation/facturation sans coder en dur l'analyse des jetons dans le cœur
- `fetchUsageSnapshot` : gère la récupération/analyse du point de terminaison d'utilisation spécifique au fournisseur tandis que le cœur conserve la diffusion et le formatage du résumé

Règle empirique :

- le fournisseur possède un catalogue ou des valeurs par défaut d'URL de base : utilisez `catalog`
- le fournisseur accepte des identifiants de modèle en amont arbitraires : utilisez `resolveDynamicModel`
- le fournisseur a besoin des métadonnées réseau avant de résoudre les identifiants inconnus : ajoutez `prepareDynamicModel`
- le fournisseur a besoin de réécritures de transport mais utilise toujours un transport principal : utilisez `normalizeResolvedModel`
- le fournisseur a besoin de particularités de transcription/famille de fournisseurs : utilisez `capabilities`
- le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par fournisseur : utilisez `prepareExtraParams`
- le fournisseur a besoin de wrappers d'en-têtes/de corps de requête/de compatibilité de modèle sans transport personnalisé : utilisez `wrapStreamFn`
- le fournisseur a besoin d'une limitation de TTL du cache spécifique au proxy : utilisez `isCacheTtlEligible`
- le fournisseur a besoin d'une indication de récupération d'authentification manquante spécifique au fournisseur : utilisez `buildMissingAuthMessage`
- le fournisseur a besoin de masquer les lignes en amont obsolètes ou de les remplacer par une indication de fournisseur : utilisez `suppressBuiltInModel`
- le fournisseur a besoin de lignes de compatibilité ascendante synthétiques dans `models list` et les sélecteurs : utilisez `augmentModelCatalog`
- le fournisseur a besoin d'un échange de jetons ou d'une identifiant de requête à courte durée de vie : utilisez `prepareRuntimeAuth`
- le fournisseur a besoin d'une analyse personnalisée des jetons d'utilisation/quota ou d'un identifiant d'utilisation différent : utilisez `resolveUsageAuth`
- le fournisseur a besoin d'un point de terminaison d'utilisation ou d'un analyseur de charge utile spécifique au fournisseur : utilisez `fetchUsageSnapshot`

Si le fournisseur a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont pour le comportement du fournisseur
qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

### Exemple de fournisseur

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

- Anthropic utilise `resolveDynamicModel`, `capabilities`, `resolveUsageAuth`,
  `fetchUsageSnapshot` et `isCacheTtlEligible` car il possède la compatibilité ascendante Claude 4.6,
  les indications de famille de fournisseurs, l'intégration du point de terminaison d'utilisation et
  l'éligibilité au cache de prompt.
- OpenAI utilise `resolveDynamicModel`, `normalizeResolvedModel` et
  `capabilities` plus `buildMissingAuthMessage`, `suppressBuiltInModel` et
  `augmentModelCatalog` car il possède la compatibilité ascendante GPT-5.4, la normalisation
  OpenAI `openai-completions` -> `openai-responses` directe, les indices d'authentiation
  compatibles Codex, la suppression Spark et les lignes de liste OpenAI synthétiques.
- OpenRouter utilise `catalog` plus `resolveDynamicModel` et
  `prepareDynamicModel` car le fournisseur est un passe-through et peut exposer de nouveaux
  identifiants de modèle avant les mises à jour du catalogue statique d'OpenClaw.
- GitHub Copilot utilise `catalog`, `resolveDynamicModel` et
  `capabilities` plus `prepareRuntimeAuth` et `fetchUsageSnapshot` car il
  a besoin du comportement de repli du modèle, des particularités des transcripts Claude, d'un échange de
  jetons GitHub -> Copilot et d'un point de terminisation d'utilisation appartenant au fournisseur.
- OpenAI Codex utilise `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel` et `augmentModelCatalog` plus
  `prepareExtraParams`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  fonctionne toujours sur les transports de base d'OpenAI mais possède sa propre normalisation transport/
  URL de base, le choix du transport par défaut, les lignes de catalogue Codex synthétiques et l'intégration
  du point de terminaison d'utilisation ChatGPT.
- Gemini CLI OAuth utilise `resolveDynamicModel`, `resolveUsageAuth` et
  `fetchUsageSnapshot` car il possède le repli de compatibilité ascendante Gemini 3.1 ainsi
  que l'analyse syntaxique des jetons et le câblage du point de terminaison de quota nécessaires pour `/usage`.
- OpenRouter utilise `capabilities`, `wrapStreamFn` et `isCacheTtlEligible`
  pour garder les en-têtes de requête spécifiques au fournisseur, les métadonnées de routage, les correctifs
  de raisonnement et la politique de cache de prompt en dehors du cœur.
- Moonshot utilise `catalog` plus `wrapStreamFn` car il utilise toujours le transport
  OpenAI partagé mais a besoin d'une normalisation de la charge utile de réflexion appartenant au fournisseur.
- Kilocode utilise `catalog`, `capabilities`, `wrapStreamFn` et
  `isCacheTtlEligible` car il a besoin d'en-têtes de requête appartenant au provider,
  de la normalisation de la charge utile de raisonnement, des indices de transcription Gemini et du contrôle du cache-TTL Anthropic.
- Z.AI utilise `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `resolveUsageAuth` et `fetchUsageSnapshot` car il
  gère le repli GLM-5, les valeurs par défaut `tool_stream` et à la fois l'authentification d'utilisation + la récupération des quotas.
- Mistral, OpenCode Zen et OpenCode Go n'utilisent que `capabilities` pour garder
  les particularités de transcription/outillage hors du cœur.
- Les providers groupés uniquement dans le catalogue tels que `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `minimax-portal`, `modelstudio`, `nvidia`,
  `qianfan`, `qwen-portal`, `synthetic`, `together`, `venice`,
  `vercel-ai-gateway` et `volcengine` n'utilisent que `catalog`.
- MiniMax et Xiaomi utilisent `catalog` ainsi que des hooks d'utilisation car leur comportement `/usage`
  est géré par le plugin bien que l'inférence s'exécute toujours via les
  transports partagés.

## Pipeline de chargement

Au démarrage, OpenClaw fait grosso modo ceci :

1. découvrir les racines candidates de plugins
2. lire les manifests de bundle natifs ou compatibles et les métadonnées de package
3. rejeter les candidats non sécurisés
4. normaliser la config du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés via jiti
7. appeler les hooks natifs `register(api)` et collecter les enregistrements dans le registre de plugins
8. exposer le registre aux surfaces de commandes/runtime

Les barrières de sécurité se produisent **avant** l'exécution du runtime. Les candidats sont bloqués lorsque l'élément échappe à la racine du plugin, que le chemin est accessible en écriture pour tous, ou que la propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement basé sur le manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration ou capacités de bundle déclarés
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface de contrôle
- afficher les métadonnées du catalogue/d'installation

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre le comportement réel tel que les hooks, les outils, les commandes ou les flux de provider.

### Ce que le chargeur met en cache

OpenClaw conserve des caches internes de courte durée pour :

- les résultats de découverte
- les données du registre de manifestes
- les registres de plugins chargés

Ces caches réduisent la charge de démarrage en rafale et la surcharge des commandes répétées. Il est prudent de les considérer comme des caches de performance à courte durée de vie, et non comme de la persistance.

## Assistances d'exécution

Les plugins peuvent accéder à certaines assistances principales via `api.runtime`. Pour la téléphonie TTS :

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

- Utilise la configuration audio de compréhension des médias principale (`tools.media.audio`) et l'ordre de repli des providers.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).

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

- `path` : chemin de route sous le serveur HTTP de la passerelle.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale de la passerelle, ou `"plugin"` pour l'authentification/vérification de webhook gérée par le plugin.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a géré la demande.

Remarques :

- `api.registerHttpHandler(...)` est obsolète. Utilisez `api.registerHttpRoute(...)`.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux `auth` sont rejetées. Gardez les chaînes de basculement `exact`/`prefix` uniquement sur le même niveau d'authentification.

## Chemins d'importation du SDK de plugin

Utilisez les sous-chemins du SDK au lieu de l'importation monolithique `openclaw/plugin-sdk` lors de la création de plugins :

- `openclaw/plugin-sdk/core` pour les API génériques de plugins, les types d'authentification de provider et les assistants partagés.
- `openclaw/plugin-sdk/compat` pour le code de plugin groupé/internal nécessitant des assistants d'exécution partagés plus larges que `core`.
- `openclaw/plugin-sdk/telegram` pour les plugins de canal Telegram.
- `openclaw/plugin-sdk/discord` pour les plugins de canal Discord.
- `openclaw/plugin-sdk/slack` pour les plugins de canal Slack.
- `openclaw/plugin-sdk/signal` pour les plugins de canal Signal.
- `openclaw/plugin-sdk/imessage` pour les plugins de canal iMessage.
- `openclaw/plugin-sdk/whatsapp` pour les plugins de canal WhatsApp.
- `openclaw/plugin-sdk/line` pour les plugins de canal LINE.
- `openclaw/plugin-sdk/msteams` pour la surface du plugin groupé Microsoft Teams.
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

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de fournisseur
- `{ providers }` pour plusieurs entrées de fournisseur

Utilisez `catalog` lorsque le plugin possède des IDs de modèle spécifiques au fournisseur, des valeurs par défaut d'URL de base
ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux fournisseurs implicites intégrés de OpenClaw :

- `simple` : fournisseurs basés sur une clé API simple ou sur des variables d'environnement
- `profile` : fournisseurs qui apparaissent lorsque des profils d'authentification existent
- `paired` : fournisseurs qui synthétisent plusieurs entrées de fournisseur connexes
- `late` : dernière passe, après les autres fournisseurs implicites

Les fournisseurs ultérieurs prévalent en cas de collision de clé, les plugins peuvent donc remplacer intentionnellement une
entrée de fournisseur intégrée avec le même ID de fournisseur.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

Note de compatibilité :

- `openclaw/plugin-sdk` reste pris en charge pour les plugins externes existants.
- Les nouveaux plugins groupés et ceux qui ont été migrés doivent utiliser des sous-chemins spécifiques au canal ou à l'extension ;
  utilisez `core` pour les surfaces génériques et `compat` uniquement lorsque des assistants partagés plus larges sont requis.

## Inspection en lecture seule du canal

Si votre plugin enregistre un canal, privilégiez l'implémentation de
`plugin.config.inspectAccount(cfg, accountId)` ainsi que `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est supposé que les informations d'identification
  sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation du médecin/de la configuration
  ne devraient pas avoir besoin de matérialiser les informations d'identification d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyez que l'état descriptif du compte.
- Préservez `enabled` et `configured`.
- Incluez les champs de source/statut des informations d'identification lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité en lecture seule.
  Renvoyer `tokenStatus: "available"` (et le champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande »
au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

Note de performance :

- La découverte de plugins et les métadonnées du manifeste utilisent des caches en processus de courte durée pour réduire le travail de démarrage/rechargement par rafales.
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

De nombreux plugins de fournisseur groupés sont activés par défaut afin que les catalogues de modèles/hooks d'exécution restent disponibles sans configuration supplémentaire. D'autres nécessitent toujours une activation explicite via `plugins.entries.<id>.enabled` ou `openclaw plugins enable <id>`.

Exemples de plugins groupés activés par défaut :

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax-portal-auth`
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
- plugin d'emplacement de mémoire actif (emplacement par défaut : `memory-core`)

Les plugins installés sont activés par défaut, mais peuvent être désactivés de la même manière.

Les plugins de l'espace de travail sont **désactivés par défaut**, sauf si vous les activez explicitement
ou les ajoutez à la liste d'autorisation. C'est intentionnel : un dépôt extrait ne doit pas silencieusement
devenir du code de passerelle de production.

Notes de durcissement :

- Si `plugins.allow` est vide et que des plugins non groupés sont découvrables, OpenClaw enregistre un avertissement de démarrage avec les identifiants et les sources des plugins.
- Les chemins candidats sont vérifiés pour leur sécurité avant l'admission à la découverte. OpenClaw bloque les candidats lorsque :
  - l'entrée de l'extension résout en dehors de la racine du plugin (y compris les échappements de lien symbolique/traversée de chemin),
  - le chemin racine/source du plugin est accessible en écriture par tous,
  - la propriété du chemin est suspecte pour les plugins non groupés (le propriétaire POSIX n'est ni l'uid actuel ni root).
- Les plugins non groupés chargés sans provenance d'installation/chemin de chargement émettent un avertissement pour que vous puissiez épingler la confiance (`plugins.allow`) ou le suivi d'installation (`plugins.installs`).

Chaque plugin natif OpenClaw doit inclure un fichier `openclaw.plugin.json` dans sa
racine. Si un chemin pointe vers un fichier, la racine du plugin est le répertoire du fichier et
doit contenir le manifeste.

Les groupements compatibles peuvent plutôt fournir l'un des éléments suivants :

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

Les répertoires de groupements sont découverts à partir des mêmes racines que les plugins natifs.

Si plusieurs plugins résolvent vers le même identifiant, la première correspondance dans l'ordre ci-dessus
l'emporte et les copies de priorité inférieure sont ignorées.

Cela signifie :

- les plugins de l'espace de travail masquent intentionnellement les plugins groupés avec le même identifiant
- `plugins.allow: ["foo"]` autorise le plugin `foo` actif par identifiant, même lorsque
  la copie active provient de l'espace de travail au lieu de la racine de l'extension groupée
- si vous avez besoin d'un contrôle de provenance plus strict, utilisez des chemins d'installation/chargement explicites et
  inspectez la source du plugin résolu avant de l'activer

### Règles d'activation

L'activation est résolue après la découverte :

- `plugins.enabled: false` désactive tous les plugins
- `plugins.deny` l'emporte toujours
- `plugins.entries.<id>.enabled: false` désactive ce plugin
- les plugins d'origine de l'espace de travail sont désactivés par défaut
- les listes d'autorisation restreignent l'ensemble actif lorsque `plugins.allow` est non vide
- les listes d'autorisation sont **basées sur l'identifiant**, et non basées sur la source
- les plugins groupés sont désactivés par défaut, sauf si :
  - l'identifiant groupé fait partie de l'ensemble activé par défaut intégré, ou
  - vous l'activez explicitement, ou
  - la configuration du channel active implicitement le plugin de channel groupé
- les slots exclusifs peuvent forcer l'activation du plugin sélectionné pour ce slot

Dans le cœur actuel, les identifiants groupés activés par défaut incluent les assistants locaux/provider
ci-dessus ainsi que le plugin de slot de mémoire actif.

### Packs de paquets

Un répertoire de plugin peut inclure un `package.json` avec `openclaw.extensions` :

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

Si votre plugin importe des deps npm, installez-les dans ce répertoire afin que
`node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du
plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont
rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec
`npm install --ignore-scripts` (pas de scripts de cycle de vie). Maintenez les arbres de dépendances des plugins
"pur JS/TS" et évitez les paquets qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement.
Lorsque OpenClaw a besoin de surfaces d'onboarding/configuration pour un plugin de channel désactivé, il
charge `setupEntry` au lieu de l'entrée complète du plugin. Cela allège le démarrage et
l'onboarding lorsque votre entrée principale de plugin câble également des outils, des hooks ou
d'autres codes exclusifs à l'exécution.

### Métadonnées du catalogue de channels

Les plugins de channel peuvent annoncer des métadonnées d'onboarding via `openclaw.channel` et
des indices d'installation via `openclaw.install`. Cela maintient le cœur du catalogue exempt de données.

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

OpenClaw peut également fusionner des **catalogues de channels externes** (par exemple, un export
de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Identifiants de plugin

IDs de plugin par défaut :

- Paquets de paquets : `package.json` `name`
- Fichier autonome : nom de base du fichier (`~/.../voice-call.ts` → `voice-call`)

Si un plugin exporte `id`, OpenClaw l'utilise mais avertit lorsqu'il ne correspond pas à l'ID configuré.

## Modèle de registre

Les plugins chargés ne modifient pas directement les variables globales du cœur. Ils s'inscrivent dans un registre central de plugins.

Le registre assure le suivi :

- des enregistrements de plugins (identité, source, origine, statut, diagnostics)
- des outils
- des hooks hérités et des hooks typés
- des canaux
- des fournisseurs
- des gestionnaires RPC de passerelle
- des routes HTTP
- des enregistreurs CLI
- des services d'arrière-plan
- des commandes propriétaires de plugins

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugins. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement dans le registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces du principal n'ont besoin que d'un point d'intégration : « lire le registre », et non « créer des cas particuliers pour chaque module de plugin ».

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
- `allow` : liste d'autorisation (facultatif)
- `deny` : liste de refus (facultatif ; le refus l'emporte)
- `load.paths` : fichiers/répertoires de plugins supplémentaires
- `slots` : sélecteurs de créneaux exclusifs tels que `memory` et `contextEngine`
- `entries.<id>` : interrupteurs + configuration par plugin

Les modifications de la configuration **nécessitent un redémarrage de la passerelle**.

Règles de validation (strictes) :

- Les ID de plugin inconnus dans `entries`, `allow`, `deny` ou `slots` sont des **erreurs**.
- Les clés `channels.<id>` inconnues sont des **erreurs**, sauf si le manifeste d'un plugin déclare l'ID du canal.
- La configuration native du plugin est validée à l'aide du schéma JSON intégré dans `openclaw.plugin.json` (`configSchema`).
- Les bundles compatibles n'exposent actuellement pas de schémas de configuration natifs OpenClaw.
- Si un plugin est désactivé, sa configuration est conservée et un **avertissement** est émis.

### Désactivé, manquant ou invalide

Ces états sont intentionnellement différents :

- **désactivé** : le plugin existe, mais les règles d'activation l'ont éteint
- **manquant** : la configuration référence un ID de plugin que la découverte n'a pas trouvé
- **invalide** : le plugin existe, mais sa configuration ne correspond pas au schéma déclaré

OpenClaw préserve la configuration des plugins désactivés, ainsi leur réactivation n'est pas destructrice.

## Emplacements de plugin (catégories exclusives)

Certaines catégories de plugins sont **exclusives** (une seule active à la fois). Utilisez `plugins.slots` pour sélectionner quel plugin possède l'emplacement :

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

Emplacements exclusifs pris en charge :

- `memory` : plugin de mémoire actif (`"none"` désactive les plugins de mémoire)
- `contextEngine` : plugin de moteur de contexte actif (`"legacy"` est la valeur par défaut intégrée)

Si plusieurs plugins déclarent `kind: "memory"` ou `kind: "context-engine"`, seul le plugin sélectionné se charge pour cet emplacement. Les autres sont désactivés avec des diagnostics.

### Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage et la compactage. Enregistrez-les depuis votre plugin avec `api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec `plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut plutôt que d'ajouter simplement une recherche mémoire ou des hooks.

## Interface de contrôle (schéma + étiquettes)

L'interface de contrôle utilise `config.schema` (JSON Schema + `uiHints`) pour afficher de meilleurs formulaires.

OpenClaw augmente `uiHints` au moment de l'exécution en fonction des plugins découverts :

- Ajoute des étiquettes par plugin pour `plugins.entries.<id>` / `.enabled` / `.config`
- Fusionne les indications de champ de configuration optionnelles fournies par le plugin sous :
  `plugins.entries.<id>.config.<field>`

Si vous souhaitez que les champs de configuration de votre plugin affichent de bonnes étiquettes/espaces réservés (et marquer les secrets comme sensibles), fournissez `uiHints` ainsi que votre JSON Schema dans le manifeste du plugin.

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

`openclaw plugins list` affiche le format de niveau supérieur sous la forme `openclaw` ou `bundle`.
La sortie de liste/info détaillée affiche également le sous-type de bundle (`codex` ou `claude`) ainsi que
les capacités détectées du bundle.

`plugins update` fonctionne uniquement pour les installations npm suivies sous `plugins.installs`.
Si les métadonnées d'intégrité stockées changent entre les mises à jour, OpenClaw avertit et demande une confirmation (utilisez le `--yes` global pour contourner les invites).

Les plugins peuvent également enregistrer leurs propres commandes de niveau supérieur (exemple : `openclaw voicecall`).

## API du plugin (aperçu)

Les plugins exportent soit :

- Une fonction : `(api) => { ... }`
- Un objet : `{ id, name, configSchema, register(api) { ... } }`

`register(api)` est l'endroit où les plugins attachent des comportements. Les enregistrements courants incluent :

- `registerTool`
- `registerHook`
- `on(...)` pour les hooks de cycle de vie typés
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Les plugins de moteur de contexte peuvent également enregistrer un gestionnaire de contexte appartenant au runtime :

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

## Hooks de plugin

Les plugins peuvent enregistrer des hooks au runtime. Cela permet à un plugin de regrouper une automatisation
dirigée par les événements sans installer séparément un pack de hooks.

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

Notes :

- Enregistrez explicitement les hooks via `api.registerHook(...)`.
- Les règles d'éligibilité des hooks s'appliquent toujours (exigences OS/bins/env/config).
- Les hooks gérés par le plugin apparaissent dans `openclaw hooks list` avec `plugin:<id>`.
- Vous ne pouvez pas activer/désactiver les hooks gérés par le plugin via `openclaw hooks` ; activez/désactivez plutôt le plugin.

### Hooks de cycle de vie de l'agent (`api.on`)

Pour les hooks de cycle de vie runtime typés, utilisez `api.on(...)` :

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

Hooks importants pour la construction de prompt :

- `before_model_resolve` : s'exécute avant le chargement de la session (`messages` ne sont pas disponibles). Utilisez ceci pour remplacer de manière déterministe `modelOverride` ou `providerOverride`.
- `before_prompt_build` : s'exécute après le chargement de la session (`messages` sont disponibles). Utilisez ceci pour façonner l'entrée du prompt.
- `before_agent_start` : hook de compatité héritée. Préférez les deux hooks explicites ci-dessus.

Stratégie de hook appliquée par le cœur :

- Les opérateurs peuvent désactiver les hooks de mutation de prompt par plugin via `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Lorsqu'il est désactivé, OpenClaw bloque `before_prompt_build` et ignore les champs de mutation de prompt renvoyés par l'hérité `before_agent_start` tout en préservant l'hérité `modelOverride` et `providerOverride`.

Champs de résultat `before_prompt_build` :

- `prependContext` : ajoute du texte avant le prompt utilisateur pour cette exécution. Idéal pour le contenu spécifique au tour ou dynamique.
- `systemPrompt` : remplacement complet du prompt système.
- `prependSystemContext` : ajoute du texte avant le prompt système actuel.
- `appendSystemContext` : ajoute du texte après le prompt système actuel.

Ordre de construction du prompt dans l'environnement d'exécution intégré :

1. Appliquer `prependContext` au prompt utilisateur.
2. Appliquer le remplacement `systemPrompt` lorsqu'il est fourni.
3. Appliquer `prependSystemContext + current system prompt + appendSystemContext`.

Notes de fusion et de priorité :

- Les gestionnaires de hooks s'exécutent par priorité (le plus élevé en premier).
- Pour les champs de contexte fusionnés, les valeurs sont concaténées dans l'ordre d'exécution.
- Les valeurs `before_prompt_build` sont appliquées avant les valeurs de repli héritées `before_agent_start`.

Conseils de migration :

- Déplacez les directives statiques de `prependContext` vers `prependSystemContext` (ou `appendSystemContext`) afin que les fournisseurs puissent mettre en cache le contenu stable du préfixe système.
- Conservez `prependContext` pour le contexte dynamique par tour qui doit rester lié au message utilisateur.

## Plugins de fournisseur (authentification de modèle)

Les plugins peuvent enregistrer des **fournisseurs de modèles** afin que les utilisateurs puissent effectuer la configuration OAuth ou par clé d'API dans OAuth, afficher la configuration du fournisseur dans l'onboarding/sélecteurs de modèles, et contribuer à la découverte implicite de fournisseurs.

Les plugins de fournisseurs constituent la jonction d'extension modulaire pour la configuration des fournisseurs de modèles. Ils ne sont plus de simples "assistants OAuth".

### Cycle de vie du plugin de fournisseur

Un plugin de fournisseur peut participer à cinq phases distinctes :

1. **Auth**
   `auth[].run(ctx)` effectue OAuth, la capture de clé API, le code d'appareil, ou une configuration personnalisée et renvoie des profils d'authentification ainsi que des correctifs de configuration optionnels.
2. **Configuration non interactive**
   `auth[].runNonInteractive(ctx)` gère `openclaw onboard --non-interactive` sans invite. Utilisez ceci lorsque le fournisseur a besoin d'une configuration personnalisée sans interface au-delà des chemins de clé API simples intégrés.
3. **Intégration de l'assistant**
   `wizard.onboarding` ajoute une entrée à `openclaw onboard`.
   `wizard.modelPicker` ajoute une entrée de configuration au sélecteur de modèle.
4. **Découverte implicite**
   `discovery.run(ctx)` peut contribuer automatiquement à la configuration du fournisseur lors de la résolution/du listage des modèles.
5. **Suivi après sélection**
   `onModelSelected(ctx)` s'exécute après qu'un modèle a été choisi. Utilisez ceci pour des tâches spécifiques au fournisseur, telles que le téléchargement d'un modèle local.

C'est la division recommandée car ces phases ont des exigences de cycle de vie différentes :

- l'auth est interactive et écrit les identifiants/configurations
- la configuration non interactive est pilotée par des drapeaux/variables d'environnement et ne doit pas inviter
- les métadonnées de l'assistant sont statiques et orientées interface
- la découverte doit être sûre, rapide et tolérante aux pannes
- les hooks post-sélection sont des effets secondaires liés au modèle choisi

### Contrat d'authentification du fournisseur

`auth[].run(ctx)` renvoie :

- `profiles` : profils d'authentification à écrire
- `configPatch` : modifications `openclaw.json` optionnelles
- `defaultModel` : ref `provider/model` optionnelle
- `notes` : notes optionnelles destinées à l'utilisateur

Le Core ensuite :

1. écrit les profils d'authentification renvoyés
2. applique le câblage de configuration du profil d'authentification
3. fusionne le correctif de configuration
4. applique éventuellement le modèle par défaut
5. exécute le hook `onModelSelected` du fournisseur lorsque cela est approprié

Cela signifie qu'un plugin de provider possède la logique de configuration spécifique au provider, tandis que le cœur possède le chemin de persistance générique et de fusion de configuration.

### Contrat non-interactif du provider

`auth[].runNonInteractive(ctx)` est facultatif. Implémentez-le lorsque le provider a besoin d'une configuration sans tête qui ne peut pas être exprimée par les flux génériques intégrés de clés API.

Le contexte non-interactif comprend :

- la configuration actuelle et de base
- les options d'intégration CLI analysées
- les assistants de journalisation/d'erreur d'exécution
- les répertoires agent/espace de travail
- `resolveApiKey(...)` pour lire les clés du provider à partir des indicateurs, des variables d'environnement ou des profils d'authentification existants tout en respectant `--secret-input-mode`
- `toApiKeyCredential(...)` pour convertir une clé résolue en informations d'identification de profil d'authentification avec le bon stockage en texte brut par rapport à la référence secrète

Utilisez cette surface pour les providers tels que :

- les runtimes auto-hébergés compatibles OpenAI qui nécessitent `--custom-base-url` + `--custom-model-id`
- la vérification ou la synthèse de configuration non-interactive spécifique au provider

N'invitez pas à partir de `runNonInteractive`. Rejetez les entrées manquantes avec des erreurs exploitables à la place.

### Métadonnées de l'assistant du provider

`wizard.onboarding` contrôle l'apparence du provider dans l'intégration groupée :

- `choiceId` : valeur de choix d'auth
- `choiceLabel` : libellé de l'option
- `choiceHint` : indice court
- `groupId` : identifiant du groupe
- `groupLabel` : libellé du groupe
- `groupHint` : indice du groupe
- `methodId` : méthode d'authentification à exécuter

`wizard.modelPicker` contrôle l'apparence d'un provider en tant qu'entrée "configurez-le maintenant" dans la sélection du modèle :

- `label`
- `hint`
- `methodId`

Lorsqu'un provider a plusieurs méthodes d'authentification, l'assistant peut soit pointer vers une méthode explicite soit laisser OpenClaw synthétiser des choix par méthode.

OpenClaw valide les métadonnées de l'assistant du provider lors de l'enregistrement du plugin :

- les identifiants de méthode d'authentification en double ou vides sont rejetés
- les métadonnées de l'assistant sont ignorées lorsque le provider n'a pas de méthodes d'authentification
- les liaisons `methodId` non valides sont rétrogradées en avertissements et reviennent aux
  méthodes d'authentification restantes du provider

### Contrat de Discovery des providers

`discovery.run(ctx)` renvoie l'un des éléments suivants :

- `{ provider }`
- `{ providers }`
- `null`

Utilisez `{ provider }` pour le cas courant où le plugin possède un id de provider.
Utilisez `{ providers }` lorsqu'un plugin découvre plusieurs entrées de provider.

Le contexte de Discovery inclut :

- la configuration actuelle
- répertoires agent/workspace
- env du processus
- un helper pour résoudre la clé de API du provider et une valeur de clé API sûre pour la découverte

La découverte doit être :

- rapide
- au mieux
- sûre à ignorer en cas d'échec
- prudente concernant les effets secondaires

Elle ne doit pas dépendre de prompts ou d'une configuration de longue durée.

### Ordre de découverte

La découverte des providers s'exécute en phases ordonnées :

- `simple`
- `profile`
- `paired`
- `late`

Utilisez :

- `simple` pour une découverte peu coûteuse uniquement basée sur l'environnement
- `profile` lorsque la découverte dépend des profils d'authentification
- `paired` pour les providers qui doivent se coordonner avec une autre étape de découverte
- `late` pour une sonde coûteuse ou sur le réseau local

La plupart des providers auto-hébergés devraient utiliser `late`.

### Bonnes limites entre plugin et provider

Bon choix pour les plugins de provider :

- providers locaux/auto-hébergés avec des flux de configuration personnalisés
- connexion par OAuth/code d'appareil spécifique au provider
- découverte implicite des serveurs de modèles locaux
- effets secondaires après sélection, tels que les récupérations de modèles

Moins pertinent :

- providers triviaux avec clé API uniquement qui ne diffèrent que par la variable d'env, l'URL de base et un
  modèle par défaut

Ceux-ci peuvent toujours devenir des plugins, mais le principal bénéfice de la modularité vient de
l'extraction préalable des providers riches en comportement.

Enregistrez un provider via `api.registerProvider(...)`. Chaque provider expose une
ou plusieurs méthodes d'authentification (OAuth, clé API, code d'appareil, etc.). Ces méthodes peuvent
alimenter :

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entrées de configuration « custom provider » du sélecteur de modèle
- découverte implicite de provider lors de la résolution/liste des modèles

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
    onboarding: {
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

- `run` reçoit un `ProviderAuthContext` avec les aides `prompter`, `runtime`,
  `openUrl` et `oauth.createVpsAwareHandlers`.
- `runNonInteractive` reçoit un `ProviderAuthMethodNonInteractiveContext`
  avec les aides `opts`, `resolveApiKey` et `toApiKeyCredential` pour
  l'intégration (onboarding) sans interface.
- Retournez `configPatch` lorsque vous devez ajouter des modèles par défaut ou une configuration de provider.
- Retournez `defaultModel` afin que `--set-default` puisse mettre à jour les valeurs par défaut de l'agent.
- `wizard.onboarding` ajoute un choix de provider à `openclaw onboard`.
- `wizard.modelPicker` ajoute une entrée « configurer ce provider » au sélecteur de modèle.
- `discovery.run` retourne soit `{ provider }` pour l'ID de provider du plugin lui-même
  soit `{ providers }` pour la découverte multi-provider.
- `discovery.order` contrôle quand le provider s'exécute par rapport aux phases de
  découvertes intégrées : `simple`, `profile`, `paired` ou `late`.
- `onModelSelected` est le hook post-sélection pour les tâches de suivi spécifiques au provider
  telles que le téléchargement d'un modèle local.

### Enregistrer un channel de messagerie

Les plugins peuvent enregistrer des **plugins de channel** qui se comportent comme les canaux intégrés
(WhatsApp, Telegram, etc.). La configuration du canal réside sous `channels.<id>` et est
validée par le code de votre plugin de canal.

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

- Placez la configuration sous `channels.<id>` (et non `plugins.entries`).
- `meta.label` est utilisé pour les étiquettes dans les listes CLI/UI.
- `meta.aliases` ajoute des IDs alternatifs pour la normalisation et les entrées CLI.
- `meta.preferOver` liste les IDs de canaux à éviter l'activation automatique lorsque les deux sont configurés.
- `meta.detailLabel` et `meta.systemImage` permettent aux interfaces d'afficher des étiquettes/icônes de canal plus riches.

### Hooks de configuration de canal

Répartition préférée de la configuration :

- `plugin.setup` est propriétaire de la normalisation, de la validation et de l'écriture de la configuration du compte-id.
- `plugin.setupWizard` permet à l'hôte d'exécuter le flux commun de l'assistant alors que le channel ne fournit que des descripteurs d'état, d'informations d'identification, de liste d'autorisation DM et d'accès au channel.

`plugin.setupWizard` est le mieux adapté aux channels qui correspondent au modèle partagé :

- un sélecteur de compte piloté par `plugin.config.listAccountIds`
- étape optionnelle de pré-vérification/préparation avant l'invite (par exemple, travail d'installation/amorçage)
- invite d' raccourci d'env optionnelle pour les ensembles d'informations d'identification groupés (par exemple, jetons de bot/application appariés)
- une ou plusieurs invites d'informations d'identification, chaque étape écrivant soit via `plugin.setup.applyAccountConfig` soit via un correctif partiel détenu par le channel
- invites de texte non secret optionnelles (par exemple, chemins CLI, URL de base, identifiants de compte)
- invites optionnelles de liste d'autorisation d'accès au channel/groupe résolues par l'hôte
- résolution optionnelle de la liste d'autorisation DM (par exemple `@username` -> identifiant numérique)
- note de fin optionnelle après la fin de la configuration

### Écrire un nouveau channel de messagerie (étape par étape)

Utilisez ceci lorsque vous souhaitez une **nouvelle surface de chat** (un « channel de messagerie »), et non un fournisseur de modèle.
La documentation du fournisseur de modèle se trouve sous `/providers/*`.

1. Choisir un identifiant + une forme de configuration

- Toute la configuration du channel se trouve sous `channels.<id>`.
- Préférez `channels.<id>.accounts.<accountId>` pour les configurations multi-comptes.

2. Définir les métadonnées du channel

- `meta.label`, `meta.selectionLabel`, `meta.docsPath` et `meta.blurb` contrôlent les listes CLI/UI.
- `meta.docsPath` doit pointer vers une page de documentation comme `/channels/<id>`.
- `meta.preferOver` permet à un plugin de remplacer un autre channel (l'activation automatique le privilégie).
- `meta.detailLabel` et `meta.systemImage` sont utilisés par les UI pour le texte détaillé/les icônes.

3. Implémenter les adaptateurs requis

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (types de chat, médias, fils de discussion, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (pour l'envoi de base)

4. Ajouter des adaptateurs optionnels si nécessaire

- `setup` (validation + config writes), `setupWizard` (host-owned wizard), `security` (DM policy), `status` (health/diagnostics)
- `gateway` (start/stop/login), `mentions`, `threading`, `streaming`
- `actions` (message actions), `commands` (native command behavior)

5. Register the channel in your plugin

- `api.registerChannel({ plugin })`

Minimal config example:

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

Minimal channel plugin (outbound‑only):

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

Load the plugin (extensions dir or `plugins.load.paths`), restart the gateway,
then configure `channels.<id>` in your config.

### Agent tools

See the dedicated guide: [Plugin agent tools](/fr/plugins/agent-tools).

### Register a gateway RPC method

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Register CLI commands

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

### Register auto-reply commands

Plugins can register custom slash commands that execute **without invoking the
AI agent**. This is useful for toggle commands, status checks, or quick actions
that don't need LLM processing.

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

Command handler context:

- `senderId`: The sender's ID (if available)
- `channel`: The channel where the command was sent
- `isAuthorizedSender`: Whether the sender is an authorized user
- `args`: Arguments passed after the command (if `acceptsArgs: true`)
- `commandBody`: The full command text
- `config`: The current OpenClaw config

Command options:

- `name`: Command name (without the leading `/`)
- `nativeNames`: Optional native-command aliases for slash/menu surfaces. Use `default` for all native providers, or provider-specific keys like `discord`
- `description`: Help text shown in command lists
- `acceptsArgs` : Si la commande accepte des arguments (par défaut : false). Si false et que des arguments sont fournis, la commande ne correspondra pas et le message sera transmis aux autres gestionnaires
- `requireAuth` : S'il faut exiger un expéditeur autorisé (par défaut : true)
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

Notes :

- Les commandes des plugins sont traitées **avant** les commandes intégrées et l'agent IA
- Les commandes sont enregistrées globalement et fonctionnent sur tous les canaux
- Les noms de commandes ne sont pas sensibles à la casse (`/MyStatus` correspond à `/mystatus`)
- Les noms de commandes doivent commencer par une lettre et contenir uniquement des lettres, des chiffres, des traits d'union et des tirets du bas
- Les noms de commandes réservés (tels que `help`, `status`, `reset`, etc.) ne peuvent pas être remplacés par des plugins
- L'enregistrement de commandes en double entre les plugins échouera avec une erreur de diagnostic

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

## Conventions de dénomination

- Méthodes du Gateway : `pluginId.action` (exemple : `voicecall.status`)
- Outils : `snake_case` (exemple : `voice_call`)
- Commandes CLI : kebab ou camel, mais évitez les conflits avec les commandes principales

## Compétences

Les plugins peuvent inclure une compétence dans le dépôt (`skills/<name>/SKILL.md`).
Activez-la avec `plugins.entries.<id>.enabled` (ou d'autres portes de configuration) et assurez-vous
qu'elle est présente dans vos emplacements de compétences gérées/de l'espace de travail.

## Distribution (npm)

Empaquetage recommandé :

- Package principal : `openclaw` (ce dépôt)
- Plugins : packages npm séparés sous `@openclaw/*` (exemple : `@openclaw/voice-call`)

Contrat de publication :

- Le plugin `package.json` doit inclure `openclaw.extensions` avec un ou plusieurs fichiers d'entrée.
- Optionnel : `openclaw.setupEntry` peut pointer vers une entrée de configuration légère pour la configuration/l'intégration du canal désactivé.
- Les fichiers d'entrée peuvent être `.js` ou `.ts` (jiti charge TS à l'exécution).
- `openclaw plugins install <npm-spec>` utilise `npm pack`, extrait dans `~/.openclaw/extensions/<id>/` et l'active dans la configuration.
- Stabilité des clés de configuration : les packages scoped sont normalisés vers l'identifiant **non scopé** pour `plugins.entries.*`.

## Exemple de plugin : Appel vocal

Ce dépôt inclut un plugin d'appel vocal (Twilio ou repli sur journal) :

- Source : `extensions/voice-call`
- Compétence : `skills/voice-call`
- CLI : `openclaw voicecall start|status`
- Outil : `voice_call`
- RPC : `voicecall.start`, `voicecall.status`
- Config (twilio) : `provider: "twilio"` + `twilio.accountSid/authToken/from` (facultatif `statusCallbackUrl`, `twimlUrl`)
- Config (dev) : `provider: "log"` (pas de réseau)

Voir [Appel vocal](/fr/plugins/voice-call) et `extensions/voice-call/README.md` pour la configuration et l'utilisation.

## Notes de sécurité

Les plugins s'exécutent en processus avec le Gateway. Traitez-les comme du code de confiance :

- N'installez que les plugins en lesquels vous avez confiance.
- Préférez les listes d'autorisation `plugins.allow`.
- Rappelez-vous que `plugins.allow` est basé sur l'identifiant, donc un plugin d'espace de travail activé peut
  intentionnellement masquer un plugin groupé avec le même identifiant.
- Redémarrez le Gateway après les modifications.

## Test des plugins

Les plugins peuvent (et doivent) inclure des tests :

- Les plugins dans le dépôt peuvent conserver des tests Vitest sous `src/**` (exemple : `src/plugins/voice-call.plugin.test.ts`).
- Les plugins publiés séparément doivent exécuter leur propre CI (lint/build/test) et valider que `openclaw.extensions` pointe vers le point d'entrée construit (`dist/index.js`).

import fr from "/components/footer/fr.mdx";

<fr />
