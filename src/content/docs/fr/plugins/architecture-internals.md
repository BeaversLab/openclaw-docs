---
summary: "Internes de l'architecture des plugins : pipeline de chargement, registre, hooks d'exécution, routes HTTP et tables de référence"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "Internes de l'architecture des plugins"
---

Pour le modèle de capacité publique, les formes de plugins et les contrats de propriété/exécution, voir [Architecture des plugins](/fr/plugins/architecture). Cette page est la référence pour la mécanique interne : pipeline de chargement, registre, hooks d'exécution, routes HTTP du Gateway, chemins d'importation et tables de schéma.

## Pipeline de chargement

Au démarrage, OpenClaw fait approximativement ceci :

1. découvrir les racines candidates des plugins
2. lire les manifestes de bundle natifs ou compatibles et les métadonnées des packages
3. rejeter les candidats non sécurisés
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés : les modules groupés construits utilisent un chargeur natif ;
   les plugins natifs non construits utilisent jiti
7. appeler les hooks natifs `register(api)` et collecter les inscriptions dans le registre des plugins
8. exposer le registre aux commandes/surfaces d'exécution

<Note>`activate` est un alias hérité pour `register` — le chargeur résout celui qui est présent (`def.register ?? def.activate`) et l'appelle au même moment. Tous les plugins groupés utilisent `register` ; privilégiez `register` pour les nouveaux plugins.</Note>

Les verrous de sécurité se produisent **avant** l'exécution. Les candidats sont bloqués
lorsque le point d'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la
propriété du chemin semble suspecte pour les plugins non groupés.

### Comportement prioritaire au manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités du bundle
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface de contrôle
- afficher les métadonnées d'installation/de catalogue
- préserver les descripteurs d'activation et de configuration peu coûteux sans charger l'exécution du plugin

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre le comportement réel tel que les hooks, les outils, les commandes ou les flux du provider.

Les blocs de manifeste facultatifs `activation` et `setup` restent sur le plan de contrôle. Ce sont des descripteurs de métadonnées uniquement pour la planification de l'activation et la découverte de la configuration ; ils ne remplacent pas l'enregistrement d'exécution, `register(...)`, ou `setupEntry`. Les premiers consommateurs d'activation en direct utilisent désormais les indices de commande, de canal et de provider du manifeste pour réduire le chargement des plugins avant la matérialisation plus large du registre :

- Le chargement CLI se limite aux plugins qui possèdent la commande principale demandée
- la configuration du canal/résolution du plugin se limite aux plugins qui possèdent l'identifiant de canal demandé
- la configuration explicite du provider/résolution d'exécution se limite aux plugins qui possèdent l'identifiant de provider demandé

Le planificateur d'activation expose à la fois une API d'identifiants uniquement pour les appelants existants et une API de plan pour les nouveaux diagnostics. Les entrées du plan indiquent pourquoi un plugin a été sélectionné, en séparant les indices explicites du planificateur `activation.*` de la secours de propriété du manifeste telle que `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools`, et les hooks. Cette séparation de raisons est la limite de compatibilité : les métadonnées des plugins existants continuent de fonctionner, tandis que le nouveau code peut détecter des indices larges ou un comportement de secours sans modifier la sémantique de chargement d'exécution.

La découverte de la configuration préfère désormais les identifiants détenus par le descripteur, tels que `setup.providers` et `setup.cliBackends`, pour restreindre les plugins candidats avant de revenir à `setup-api` pour les plugins qui nécessitent encore des hooks d'exécution au moment de la configuration. Les listes de configuration du fournisseur utilisent le `providerAuthChoices` du manifeste, les choix de configuration dérivés du descripteur et les métadonnées du catalogue d'installation sans charger l'exécution du fournisseur. `setup.requiresRuntime: false` explicite est une coupure exclusive au descripteur ; `requiresRuntime` omis conserve le repli de l'ancien setup-api pour la compatibilité. Si plusieurs plugins découverts revendiquent le même identifiant normalisé de fournisseur de configuration ou de backend CLI, la recherche de configuration refuse le propriétaire ambigu au lieu de s'appuyer sur l'ordre de découverte. Lorsque l'exécution de la configuration s'effectue, les diagnostics du registre signalent la dérive entre `setup.providers` / `setup.cliBackends` et les fournisseurs ou les backends CLI enregistrés par setup-api sans bloquer les plugins hérités.

### Ce que le chargeur met en cache

OpenClaw conserve des caches de processus courts pour :

- les résultats de la découverte
- les données du registre de manifeste
- les registres de plugins chargés

Ces caches réduisent les surcharges de démarrage en rafale et de commandes répétées. Il est prudent de les considérer comme des caches de performance à court terme, et non comme de la persistance.

Les chemins critiques de démarrage du Gateway devraient préférer le `PluginMetadataSnapshot` actuel, le `PluginLookUpTable` dérivé, ou un registre de manifeste explicite passé à travers la chaîne d'appels. La validation de la configuration, l'activation automatique au démarrage et l'amorçage des plugins utilisent le même instantané lorsqu'il est disponible. Pour les appelants qui reconstruisent encore les métadonnées du manifeste à partir de l'index persistant des plugins installés, OpenClaw conserve également un petit cache de repli limité, indexé par l'index installé, la forme de la requête, la stratégie de configuration, les racines d'exécution et les signatures des fichiers manifeste/package. Ce cache n'est qu'un repli pour la reconstruction répétée de l'index installé ; ce n'est pas un registre de plugins d'exécution mutable.

Note de performance :

- Définissez `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` ou `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` pour désactiver ces caches.
- Définissez `OPENCLAW_DISABLE_INSTALLED_PLUGIN_MANIFEST_REGISTRY_CACHE=1` pour désactiver uniquement le cache de repli du registre de manifeste de l'index installé.
- Ajustez les fenêtres de cache avec `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` et `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modèle de registre

Les plugins chargés ne modifient pas directement les variables globales du cœur aléatoires. Ils s'inscrivent dans un registre central de plugins.

Le registre assure le suivi de :

- enregistrements de plugins (identité, source, origine, statut, diagnostics)
- outils
- hooks hérités et hooks typés
- canaux
- fournisseurs
- gestionnaires RPC de passerelle
- routes HTTP
- registrars CLI
- services d'arrière-plan
- commandes appartenant au plugin

Les fonctionnalités du cœur lisent ensuite ce registre au lieu de communiquer directement avec les modules des plugins. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement dans le registre
- runtime du cœur -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces du cœur n'ont besoin que d'un seul point d'intégration : "lire le registre", et non "gérer chaque module de plugin comme un cas particulier".

## Rappels de liaison de conversation

Les plugins qui lient une conversation peuvent réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un rappel après qu'une demande de liaison a été approuvée ou refusée :

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

Champs de la charge utile du rappel :

- `status` : `"approved"` ou `"denied"`
- `decision` : `"allow-once"`, `"allow-always"` ou `"deny"`
- `binding` : la liaison résolue pour les demandes approuvées
- `request` : le résumé de la demande originale, l'indice de détachement, l'identifiant de l'expéditeur et les métadonnées de la conversation

Ce rappel est uniquement destiné à la notification. Il ne modifie pas qui est autorisé à lier une conversation et s'exécute après la fin du traitement de l'approbation par le cœur.

## Hooks de runtime du fournisseur

Les plugins de fournisseur ont trois couches :

- **Métadonnées de manifeste** pour une recherche pré-runtime peu coûteuse :
  `setup.providers[].envVars`, compatibilité dépréciée `providerAuthEnvVars`,
  `providerAuthAliases`, `providerAuthChoices` et `channelEnvVars`.
- **Hooks de configuration** : `catalog` (hérité `discovery`) plus
  `applyConfigDefaults`.
- **Hooks de runtime** : plus de 40 hooks optionnels couvrant l'authentification, la résolution de modèle,
  l'enveloppement de flux, les niveaux de réflexion, la stratégie de relecture et les points de terminaison d'utilisation. Consultez
  la liste complète sous [Hook order and usage](#hook-order-and-usage).

OpenClaw possède toujours la boucle d'agent générique, le basculement, la gestion des transcriptions et la stratégie d'outil. Ces hooks sont la surface d'extension pour les comportements spécifiques au fournisseur sans avoir besoin d'un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `setup.providers[].envVars` lorsque le fournisseur dispose d'informations d'identification basées sur l'environnement que les chemins d'authentification, de statut et de sélecteur de modèle génériques doivent voir sans charger le runtime du plugin. Le `providerAuthEnvVars` obsolète est toujours lu par l'adaptateur de compatibilité pendant la période d'obsolescence, et les plugins non groupés qui l'utilisent reçoivent un diagnostic de manifeste. Utilisez le manifeste `providerAuthAliases` lorsqu'un identifiant de fournisseur doit réutiliser les variables d'environnement, les profils d'authentification, l'authentification sauvegardée par la configuration et le choix d'intégration de clé API d'un autre identifiant de fournisseur. Utilisez le manifeste `providerAuthChoices` lorsque les surfaces CLI d'intégration/choix d'authentification doivent connaître l'identifiant de choix, les étiquettes de groupe et le câblage d'authentification à un seul indicateur simple du fournisseur sans charger le runtime du fournisseur. Conservez le `envVars` du runtime du fournisseur pour les indications destinées aux opérateurs, telles que les étiquettes d'intégration ou les variables de configuration de l'identifiant client/secret client OAuth.

Utilisez le manifeste `channelEnvVars` lorsqu'un canal dispose d'une authentification ou d'une configuration pilotée par l'environnement que le repli générique d'environnement de shell, les vérifications de configuration/état ou les invites de configuration doivent voir sans charger le runtime du canal.

### Ordre et utilisation des hooks

Pour les plugins de modèle/fournisseur, OpenClaw appelle les hooks dans cet ordre approximatif. La colonne « Quand l'utiliser » est le guide de décision rapide.

| #   | Hook                              | Ce qu'il fait                                                                                                                                                                       | Quand l'utiliser                                                                                                                                                                                                                       |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publier la configuration du fournisseur dans `models.providers` lors de la génération `models.json`                                                                                 | Le fournisseur possède un catalogue ou des URL de base par défaut                                                                                                                                                                      |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de configuration globale possédées par le fournisseur lors de la matérialisation de la configuration                                               | Les valeurs par défaut dépendent du mode d'authentification, de l'environnement ou de la sémantique de la famille de modèles du fournisseur                                                                                            |
| --  | _(recherche de modèle intégrée)_  | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                                                      | _(pas un hook de plugin)_                                                                                                                                                                                                              |
| 3   | `normalizeModelId`                | Normaliser les alias d'identifiant de modèle hérités ou d'aperçu avant la recherche                                                                                                 | Le fournisseur possède le nettoyage des alias avant la résolution du modèle canonique                                                                                                                                                  |
| 4   | `normalizeTransport`              | Normaliser la famille de provider `api` / `baseUrl` avant l'assemblage du modèle générique                                                                                          | Le provider gère le nettoyage du transport pour les identifiants de provider personnalisés dans la même famille de transport                                                                                                           |
| 5   | `normalizeConfig`                 | Normaliser `models.providers.<id>` avant la résolution runtime/provider                                                                                                             | Le provider a besoin d'un nettoyage de la configuration qui doit résider avec le plugin ; les assistants groupés de la famille Google servent également de filet de sécurité pour les entrées de configuration Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation du flux natif aux providers de configuration                                                                               | Le provider a besoin de corrections de métadonnées d'utilisation du flux natif pilotées par le point de terminaison                                                                                                                    |
| 7   | `resolveConfigApiKey`             | Résoudre l'authentification par marqueur d'environnement pour les providers de configuration avant le chargement de l'authentification runtime                                      | Le provider possède une résolution de clé API par marqueur d'environnement ; `amazon-bedrock` possède également ici un résolveur de marqueur d'environnement AWS intégré                                                               |
| 8   | `resolveSyntheticAuth`            | Exposer l'authentification locale/auto-hébergée ou basée sur la configuration sans persister de texte en clair                                                                      | Le provider peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                                                       |
| 9   | `resolveExternalAuthProfiles`     | Superposer les profils d'authentification externe détenus par le provider ; le `persistence` par défaut est `runtime-only` pour les identifiants appartenant à la CLI/l'application | Le provider réutilise les identifiants d'authentification externe sans persister les jetons d'actualisation copiés ; déclarer `contracts.externalAuthProviders` dans le manifeste                                                      |
| 10  | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétique stockés derrière l'authentification basée sur l'environnement/la configuration                                                  | Le provider stocke des profils d'espace réservé synthétiques qui ne doivent pas prévaloir                                                                                                                                              |
| 11  | `resolveDynamicModel`             | Repli de synchronisation pour les identifiants de modèle détenus par le provider qui ne sont pas encore dans le registre local                                                      | Le provider accepte les identifiants de modèle en amont arbitraires                                                                                                                                                                    |
| 12  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                                                             | Le provider a besoin de métadonnées réseau avant de résoudre les identifiants inconnus                                                                                                                                                 |
| 13  | `normalizeResolvedModel`          | Réécriture finale avant que le runner intégré n'utilise le modèle résolu                                                                                                            | Le provider a besoin de réécritures de transport mais utilise toujours un transport principal                                                                                                                                          |
| 14  | `contributeResolvedModelCompat`   | Contribuer aux indicateurs de compatibilité pour les modèles de fournisseur derrière un autre transport compatible                                                                  | Provider reconnaît ses propres modèles sur les transports proxy sans prendre le contrôle du provider                                                                                                                                   |
| 15  | `capabilities`                    | Métadonnées de transcript/outillage possédées par le provider utilisées par la logique centrale partagée                                                                            | Le provider a besoin de particularités du transcript/de la famille de providers                                                                                                                                                        |
| 16  | `normalizeToolSchemas`            | Normaliser les schémas de tool avant que le runner intégré ne les voie                                                                                                              | Le provider a besoin d'un nettoyage de schéma de la famille de transport                                                                                                                                                               |
| 17  | `inspectToolSchemas`              | Présenter les diagnostics de schéma possédés par le provider après normalisation                                                                                                    | Le provider souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au provider au cœur                                                                                                                          |
| 18  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou balisé                                                                                                                   | Le provider a besoin d'une sortie de raisonnement/finale balisée au lieu des champs natifs                                                                                                                                             |
| 19  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les wrappers génériques d'options de flux                                                                                             | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par fournisseur                                                                                                                            |
| 20  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                                                        | Le fournisseur a besoin d'un protocole filaire personnalisé, et pas seulement d'un wrapper                                                                                                                                             |
| 21  | `wrapStreamFn`                    | Wrapper de flux après l'application des wrappers génériques                                                                                                                         | Le fournisseur a besoin de wrappers de compatibilité pour les en-têtes/corps/modèles de requête sans transport personnalisé                                                                                                            |
| 22  | `resolveTransportTurnState`       | Attacher les en-têtes ou métadonnées de transport natifs par tour                                                                                                                   | Le fournisseur souhaite que les transports génériques envoient l'identité de tour native du fournisseur                                                                                                                                |
| 23  | `resolveWebSocketSessionPolicy`   | Attacher les en-têtes WebSocket natifs ou la politique de refroidissement de session                                                                                                | Le fournisseur souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de repli                                                                                                                     |
| 24  | `formatApiKey`                    | Formateur de profil d'authentification : le profil stocké devient la chaîne `apiKey` d'exécution                                                                                    | Le provider stocke des métadonnées d'auth supplémentaires et a besoin d'une forme personnalisée de jeton d'exécution                                                                                                                   |
| 25  | `refreshOAuth`                    | Surcharge de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la stratégie d'échec de rafraîchissement                                    | Le provider ne correspond pas aux rafraîchisseurs partagés `pi-ai`                                                                                                                                                                     |
| 26  | `buildAuthDoctorHint`             | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                                                | Le provider a besoin de directives de réparation d'auth appartenant au provider après un échec de rafraîchissement                                                                                                                     |
| 27  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre de contexte appartenant au provider                                                                                                        | Le provider a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                                                           |
| 28  | `classifyFailoverReason`          | Classification des raisons de basculement appartenant au provider                                                                                                                   | Le provider peut mapper les erreurs brutes API/transport aux limites de taux/surcharges/etc.                                                                                                                                           |
| 29  | `isCacheTtlEligible`              | Stratégie de cache de prompt pour les providers proxy/backhaul                                                                                                                      | Le provider a besoin d'une limitation de TTL de cache spécifique au proxy                                                                                                                                                              |
| 30  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'auth manquante                                                                                                                  | Le fournisseur a besoin d'une indication de récupération d'auth manquante spécifique au fournisseur                                                                                                                                    |
| 31  | `suppressBuiltInModel`            | Suppression de modèle en amont obsolète plus indication d'erreur facultative pour l'utilisateur                                                                                     | Le fournisseur doit masquer les lignes en amont obsolètes ou les remplacer par une indication du fournisseur                                                                                                                           |
| 32  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                                                               | Le fournisseur a besoin de lignes de rétrocompatibilité synthétiques dans `models list` et les sélecteurs                                                                                                                              |
| 33  | `resolveThinkingProfile`          | Définition de niveau `/think` spécifique au modèle, étiquettes d'affichage et valeur par défaut                                                                                     | Le fournisseur expose une échelle de réflexion personnalisée ou une étiquette binaire pour certains modèles                                                                                                                            |
| 34  | `isBinaryThinking`                | Hook de compatibilité pour le basculement du raisonnement on/off                                                                                                                    | Le fournisseur expose uniquement une réflexion binaire on/off                                                                                                                                                                          |
| 35  | `supportsXHighThinking`           | `xhigh` hook de compatibilité du support du raisonnement                                                                                                                            | Le fournisseur souhaite `xhigh` uniquement sur un sous-ensemble de models                                                                                                                                                              |
| 36  | `resolveDefaultThinkingLevel`     | Hook de compatibilité au niveau `/think` par défaut                                                                                                                                 | Le fournisseur possède la stratégie `/think` par défaut pour une famille de models                                                                                                                                                     |
| 37  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de smoke                                                                                      | Le fournisseur possède la correspondance de modèle préférée en direct/smoke                                                                                                                                                            |
| 38  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                                                    | Le fournisseur a besoin d'un échange de jeton ou d'une information d'identification de demande à courte durée de vie                                                                                                                   |
| 39  | `resolveUsageAuth`                | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces de état associées                                                                | Le fournisseur a besoin d'une analyse personnalisée des jetons d'utilisation/quota ou d'informations d'identification d'utilisation différentes                                                                                        |
| 40  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au fournisseur après résolution de l'authentification                                                       | Le fournisseur a besoin d'un point de terminaison d'utilisation ou d'un analyseur de charge utile spécifique au fournisseur                                                                                                            |
| 41  | `createEmbeddingProvider`         | Construire un adaptateur d'intégration appartenant au fournisseur pour la mémoire/recherche                                                                                         | Le comportement d'intégration de la mémoire appartient au plugin du fournisseur                                                                                                                                                        |
| 42  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant la gestion des transcriptions pour le fournisseur                                                                                    | Le fournisseur a besoin d'une stratégie de transcription personnalisée (par exemple, suppression des blocs de réflexion)                                                                                                               |
| 43  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique de la transcription                                                                                                 | Le fournisseur a besoin de réécritures de relecture spécifiques au fournisseur au-delà des assistants de compactage partagés                                                                                                           |
| 44  | `validateReplayTurns`             | Validation finale ou restructuration du tour de relecture avant le runner intégré                                                                                                   | Le transport du provider a besoin d'une validation de tour plus stricte après la désinfection générique                                                                                                                                |
| 45  | `onModelSelected`                 | Exécuter les effets secondaires post-sélection appartenant au provider                                                                                                              | Le provider a besoin de télémétrie ou d'un état appartenant au provider lorsqu'un modèle devient actif                                                                                                                                 |

`normalizeModelId`, `normalizeTransport` et `normalizeConfig` vérifient d'abord le plugin provider correspondant, puis passent aux autres plugins provider capables de hooks jusqu'à ce que l'un d'eux modifie réellement l'id du modèle ou le transport/config. Cela permet de maintenir le fonctionnement des shims de provider alias/compat sans obliger l'appelant à savoir quel plugin groupé possède la réécriture. Si aucun hook de provider ne réécrit une entrée de configuration de la famille Google prise en charge, le normaliseur de configuration Google groupé applique toujours ce nettoyage de compatibilité.

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requêtes personnalisé, il s'agit d'une classe d'extension différente. Ces hooks sont destinés au comportement du provider qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

### Exemple de provider

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

Les plugins de provider regroupés combinent les hooks ci-dessus pour répondre aux besoins de catalogue, d'authentification, de réflexion, de relecture et d'utilisation de chaque fournisseur. L'ensemble de hooks faisant autorité réside avec chaque plugin sous `extensions/` ; cette page illustre les formes plutôt que de refléter la liste.

<AccordionGroup>
  <Accordion title="Fournisseurs de catalogue avec passage direct">OpenRouter, Kilocode, Z.AI, xAI enregistrent `catalog` plus `resolveDynamicModel` / `prepareDynamicModel` afin qu'ils puissent afficher les identifiants de modèle amont en avant du catalogue statique de OpenClaw.</Accordion>
  <Accordion title="Fournisseurs d'endpoint OAuth et d'utilisation">OAuth Copilot, Gemini GitHub, ChatGPT Codex, CLI, MiniMax, z.ai associent `prepareRuntimeAuth` ou `formatApiKey` avec `resolveUsageAuth` + `fetchUsageSnapshot` pour gérer l'échange de jetons et l'intégration `/usage`.</Accordion>
  <Accordion title="Familles de relecture et de nettoyage de transcriptions">Des familles nommées partagées (`google-gemini`, `passthrough-gemini`, `anthropic-by-model`, `hybrid-anthropic-openai`) permettent aux fournisseurs d'opter pour la politique de transcription via `buildReplayPolicy` au lieu que chaque plugin ne réimplémente le nettoyage.</Accordion>
  <Accordion title="Fournisseurs de catalogue uniquement">`byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` n'enregistrent que `catalog` et utilisent la boucle d'inférence partagée.</Accordion>
  <Accordion title="Assistants de flux spécifiques à Anthropic">Les en-têtes bêta, `/fast` / `serviceTier` et `context1m` se trouvent dans la jonction publique `api.ts` / `contract-api.ts` du plugin Anthropic (`wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`) plutôt que dans le SDK générique.</Accordion>
</AccordionGroup>

## Assistants d'exécution

Les plugins peuvent accéder à certains assistants principaux via `api.runtime`. Pour le TTS :

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

Notes :

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichier ou de note vocale.
- Utilise la configuration `messages.tts` principale et la sélection du provider.
- Returns PCM audio buffer + sample rate. Plugins must resample/encode for providers.
- `listVoices` is optional per provider. Use it for vendor-owned voice pickers or setup flows.
- Voice listings can include richer metadata such as locale, gender, and personality tags for provider-aware pickers.
- OpenAI and ElevenLabs support telephony today. Microsoft does not.

Plugins can also register speech providers via `api.registerSpeechProvider(...)`.

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

Notes:

- Keep TTS policy, fallback, and reply delivery in core.
- Use speech providers for vendor-owned synthesis behavior.
- Legacy Microsoft `edge` input is normalized to the `microsoft` provider id.
- The preferred ownership model is company-oriented: one vendor plugin can own
  text, speech, image, and future media providers as OpenClaw adds those
  capability contracts.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un provider de compréhension de média typé au lieu d'un sac générique de paires clé/valeur :

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

Notes :

- Garder l'orchestration, le secours (fallback), la configuration et le câblage des canaux dans le cœur (core).
- Garder le comportement du fournisseur dans le plugin du provider.
- L'expansion additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de résultat optionnels, nouvelles capacités optionnelles.
- La génération vidéo suit déjà le même modèle :
  - le cœur (core) possède le contrat de capacité et l'assistant d'exécution (runtime helper)
  - les plugins fournisseur enregistrent `api.registerVideoGenerationProvider(...)`
  - les plugins de fonctionnalité/canal (feature/channel) consomment `api.runtime.videoGeneration.*`

Pour les assistants d'exécution de compréhension de média, les plugins peuvent appeler :

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

Pour la transcription audio, les plugins peuvent utiliser soit l'exécution de compréhension de média, soit l'alias STT plus ancien :

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notes :

- `api.runtime.mediaUnderstanding.*` est l'interface partagée préférée pour
  la compréhension d'image/audio/vidéo.
- Utilise la configuration audio principale de compréhension des médias (`tools.media.audio`) et l'ordre de repli du provider.
- Retourne `{ text: undefined }` lorsqu aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité.

Les plugins peuvent également lancer des exécutions de sous-agents en arrière-plan via `api.runtime.subagent` :

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

Notes :

- `provider` et `model` sont des substitutions optionnelles par exécution, et non des modifications persistantes de session.
- OpenClaw honore ces champs de substitution uniquement pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent accepter explicitement avec `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agents de plugins non fiables fonctionnent toujours, mais les demandes de remplacement sont rejetées au lieu de revenir silencieusement à une valeur par défaut.
- Les sessions de sous-agents créées par des plugins sont étiquetées avec l'identifiant du plugin créateur. Le `api.runtime.subagent.deleteSession(...)` par défaut ne peut supprimer que ces sessions appartenées ; la suppression arbitraire de session nécessite toujours une requête Gateway avec une portée d'administrateur.

Pour la recherche web, les plugins peuvent utiliser le helper d'exécution partagé au lieu
d'accéder au câblage de l'outil de l'agent :

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

Les plugins peuvent également enregistrer des providers de recherche web via
`api.registerWebSearchProvider(...)`.

Notes :

- Gardez la sélection du provider, la résolution des identifiants et la sémantique des requêtes partagées dans le cœur.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est l'interface partagée préférée pour les plugins de fonctionnalité/canal qui ont besoin d'un comportement de recherche sans dépendre du wrapper d'outil de l'agent.

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)` : générer une image en utilisant la chaîne de provider de génération d'images configurée.
- `listProviders(...)` : lister les providers de génération d'images disponibles et leurs capacités.

## Routes HTTP du Gateway

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

- `path` : chemin de route sous le serveur HTTP du Gateway.
- `auth` : obligatoire. Utilisez `"gateway"` pour exiger l'authentification normale du Gateway, ou `"plugin"` pour l'authentification/vérification de webhook gérée par le plugin.
- `match` : facultatif. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a géré la demande.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez plutôt `api.registerHttpRoute(...)`.
- Les routes des plugins doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec différents niveaux `auth` sont rejetées. Gardez les chaînes de secours `exact`/`prefix` uniquement sur le même niveau d'auth.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les scopes d'exécution de l'opérateur. Elles sont destinées aux webhooks gérés par le plugin/vérification de signature, et non aux appels d'assistance privilégiés du Gateway.
- Les routes `auth: "gateway"` s'exécutent dans un scope d'exécution de requête Gateway, mais ce scope est intentionnellement conservateur :
  - l'authentification porteur par secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les scopes d'exécution des routes du plugin épinglés à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP porteurs d'identité approuvés (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur une entrée privée) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent sur ces demandes de route de plugin porteuses d'identité, la portée d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'une route de plugin d'authentification de passerelle est une surface administrative implicite. Si votre route nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification porteur d'identité et documentez le contrat d'en-tête explicite `x-openclaw-scopes`.

## Chemins d'importation du SDK de plugin

Utilisez des sous-chemins SDK étroits plutôt que le baril monolithique `openclaw/plugin-sdk` racine lors de la création de nouveaux plugins. Sous-chemins principaux :

| Sous-chemin                         | Objectif                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | Primitives d'enregistrement de plugin                |
| `openclaw/plugin-sdk/channel-core`  | Assistants d'entrée/de construction de canal         |
| `openclaw/plugin-sdk/core`          | Assistants partagés génériques et contrat parapluie  |
| `openclaw/plugin-sdk/config-schema` | Schéma Zod `openclaw.json` racine (`OpenClawSchema`) |

Les plugins de canal choisissent parmi une famille de coutures étroites — `channel-setup`,
`setup-runtime`, `setup-adapter-runtime`, `setup-tools`, `channel-pairing`,
`channel-contract`, `channel-feedback`, `channel-inbound`, `channel-lifecycle`,
`channel-reply-pipeline`, `command-auth`, `secret-input`, `webhook-ingress`,
`channel-targets` et `channel-actions`. Le comportement d'approbation doit se consolider
sur un seul contrat `approvalCapability` plutôt que de mélanger des champs de
plugin sans rapport. Voir [Plugins de canal](/fr/plugins/sdk-channel-plugins).

Les assistants d'exécution et de configuration résident sous des sous-chemins `*-runtime` correspondants
(`approval-runtime`, `config-runtime`, `infra-runtime`, `agent-runtime`,
`lazy-runtime`, `directory-runtime`, `text-runtime`, `runtime-store`, etc.).

<Info>`openclaw/plugin-sdk/channel-runtime` est obsolète — un shim de compatibilité pour les plugins plus anciens. Le nouveau code devrait plutôt importer des primitives génériques plus étroites.</Info>

Points d'entrée internes au dépôt (par racine de package de plugin groupé) :

- `index.js` — point d'entrée du plugin groupé
- `api.js` — barrel d'aides/types
- `runtime-api.js` — barrel exclusif au runtime
- `setup-entry.js` — point d'entrée du plugin de configuration

Les plugins externes ne doivent importer que les sous-chemins `openclaw/plugin-sdk/*`. N'importez
jamais le `src/*` d'un autre package de plugin depuis le cœur ou depuis un autre plugin.
Les points d'entrée chargés par façade privilégient l'instantané actif de la configuration du runtime lorsqu'il
existe, puis reviennent au fichier de configuration résolu sur le disque.

Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding`,
et `speech` existent car les plugins groupés les utilisent aujourd'hui. Ils ne sont pas
automatiquement des contrats externes gelés à long terme — vérifiez la page de référence SDK appropriée
lorsque vous vous y fiez.

## Schémas d'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au canal
pour les primitives non-messages telles que les réactions, les lectures et les sondages.
La présentation d'envoi partagée doit utiliser le contrat générique `MessagePresentation`
au lieu des champs de bouton, composant, bloc ou carte natifs du provider.
Voir [Message Presentation](/fr/plugins/message-presentation) pour le contrat,
les règles de repli, le mappage du provider et la liste de contrôle pour l'auteur de plugin.

Les plugins capables d'envoi déclarent ce qu'ils peuvent restituer via les capacités de message :

- `presentation` pour les blocs de présentation sémantique (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` pour les demandes de livraison épinglée

Le cœur décide s'il faut restituer la présentation nativement ou la dégrader en texte.
N'exposez pas de portes de sortie d'interface utilisateur natives du provider depuis l'outil de message générique.
Les aides SDK obsolètes pour les schémas natifs hérités restent exportées pour les plugins tiers
existants, mais les nouveaux plugins ne doivent pas les utiliser.

## Résolution de la cible du channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée doit être traitée comme `direct`, `group`, ou `channel` avant la recherche dans le répertoire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au noyau si une entrée doit passer directement à une résolution de type identifiant au lieu d'une recherche dans le répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque le noyau a besoin d'une résolution finale appartenant au provider après la normalisation ou après un échec du répertoire.
- `messaging.resolveOutboundSessionRoute(...)` est responsable de la construction de la route de session spécifique au provider une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications "traiter ceci comme un identifiant de cible explicite/natif".
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au provider, et non pour une recherche large dans le répertoire.
- Conservez les identifiants natifs du provider tels que les identifiants de chat, les identifiants de fil de discussion, les JIDs, les handles et les identifiants de salle dans les valeurs `target` ou les paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le plugin et réutiliser les assistants partagés de `openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un channel a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs de DM basés sur une liste d'autorisation (allowlist)
- cartes de channel/groupe configurées
- replis de répertoire statique délimités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application des limites
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au channel et la normalisation des identifiants doivent rester dans l'implémentation du plugin.

## Catalogues de provider

Les plugins de provider peuvent définir des catalogues de modèles pour l'inférence avec `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans `models.providers` :

- `{ provider }` pour une entrée de provider
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des ids de model spécifiques au provider, des valeurs par défaut d'URL de base ou des métadonnées de model protégées par authentification.

`catalog.order` contrôle quand le catalogue d'un plugin fusionne par rapport aux providers implicites intégrés d'OpenClaw :

- `simple` : providers basés sur une clé API simple ou sur l'environnement
- `profile` : providers qui apparaissent lorsque des profils d'authentification existent
- `paired` : providers qui synthétisent plusieurs entrées de provider connexes
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs prévalent en cas de collision de clé, donc les plugins peuvent volontairement remplacer une entrée de provider intégrée avec le même id de provider.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`

## Inspection en lecture seule du channel

Si votre plugin enregistre un channel, préférez implémenter `plugin.config.inspectAccount(cfg, accountId)` parallèlement à `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les informations d'identification sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation docteur/config
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
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler une disponibilité en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'une information d'identification est configurée via SecretRef mais indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler « configuré mais indisponible dans ce chemin de commande » au lieu de planter ou de rapporter incorrectement que le compte n'est pas configuré.

## Paquets de modules (Package packs)

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

Chaque entrée devient un plugin. Si le pack liste plusieurs extensions, l'identifiant du plugin devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que `node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec un `npm install --omit=dev --ignore-scripts` local au projet (pas de scripts de cycle de vie, pas de dépendances de développement à l'exécution), en ignorant les paramètres d'installation globale npm hérités. Gardez les arbres de dépendances des plugins « pur JS/TS » et évitez les packages qui nécessitent des builds `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger de configuration uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais encore non configuré, il charge `setupEntry` au lieu de l'entrée complète du plugin. Cela allège le démarrage et la configuration lorsque votre entrée principale de plugin connecte également des outils, des hooks ou d'autres codes exclusifs à l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
peut permettre à un plugin de canal d'opter pour le même chemin `setupEntry` pendant la phase de démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister
avant que la passerine ne commence à écouter. En pratique, cela signifie que l'entrée de configuration
doit enregistrer chaque capacité détenue par le channel dont le démarrage dépend, par exemple :

- l'enregistrement du channel lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerine ne commence à écouter
- toutes les méthodes, outils ou services de passerine qui doivent exister durant cette même fenêtre

Si votre entrée complète possède toujours des capacités de démarrage requises, n'activez
pas cet indicateur. Conservez le comportement par défaut du plugin et laissez OpenClaw charger l'entrée
complète pendant le démarrage.

Les channels groupés peuvent également publier des assistants de surface de contrat uniquement pour la configuration que le cœur
peut consulter avant le chargement complet de l'exécution du channel. La surface actuelle de promotion
de configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Le cœur utilise cette surface lorsqu'il doit promouvoir une configuration de channel à compte unique héritée
en `channels.<id>.accounts.*` sans charger l'entrée complète du plugin.
Matrix est l'exemple groupé actuel : il ne déplace que les clés d'authentification/amorçage dans un
compte promu nommé lorsque des comptes nommés existent déjà, et il peut préserver
une clé de compte par défaut configurée non canonique au lieu de toujours créer
`accounts.default`.

Ces adaptateurs de correctif de configuration maintiennent la découverte de la surface de contrat groupée paresseuse. Le temps
d'importation reste léger ; la surface de promotion est chargée uniquement à la première utilisation au lieu de
réentrer dans le démarrage du channel groupé lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes RPC de passerine, gardez-les sur un
préfixe spécifique au plugin. Les espaces de noms d'administration du cœur (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours
vers `operator.admin`, même si un plugin demande une portée plus restreinte.

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

### Métadonnées du catalogue de channels

Les plugins de channels peuvent annoncer des métadonnées de configuration/découverte via `openclaw.channel` et
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
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

Champs `openclaw.channel` utiles au-delà de l'exemple minimal :

- `detailLabel` : étiquette secondaire pour les surfaces de catalogue/statut plus riches
- `docsLabel` : remplacer le texte du lien pour le lien de documentation
- `preferOver` : identifiants de plugin/channel de priorité inférieure que cette entrée de catalogue devrait dépasser
- `selectionDocsPrefix` , `selectionDocsOmitLabel` , `selectionExtras` : contrôles de copie de la surface de sélection
- `markdownCapable` : marque le channel comme compatible markdown pour les décisions de formatage sortant
- `exposure.configured` : masquer le channel des surfaces de listing des channels configurés lorsqu'il est défini sur `false`
- `exposure.setup` : masquer le channel des sélecteurs de configuration/installation interactifs lorsqu'il est défini sur `false`
- `exposure.docs` : marque le channel comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : alias hérités toujours acceptés pour la compatibilité ; préférez `exposure`
- `quickstartAllowFrom` : opter pour le channel dans le flux de démarrage rapide standard `allowFrom`
- `forceAccountBinding` : exiger une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : préférer la recherche de session lors de la résolution des cibles d'annonce

OpenClaw peut également fusionner des **catalogues de channels externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules/points-virgules/`PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. L'analyseur accepte également `"packages"` ou `"plugins"` comme alias hérités pour la clé `"entries"`.

Les entrées de catalogue de channel générées et les entrées de catalogue d'installation de provider exposent des faits normalisés sur la source d'installation à côté du bloc `openclaw.install` brut. Les faits normalisés identifient si la spécification npm est une version exacte ou un sélecteur flottant, si les métadonnées d'intégrité attendues sont présentes et si un chemin source local est également disponible. Lorsque l'identité catalogue/package est connue, les faits normalisés avertissent si le nom du package npm analysé dérive de cette identité. Ils avertissent également lorsque `defaultChoice` est invalide ou pointe vers une source non disponible, et lorsque des métadonnées d'intégrité npm sont présentes sans une source npm valide. Les consommateurs doivent traiter `installSource` comme un champ optionnel additif afin que les entrées construites à la main et les shims de catalogue n'aient pas à le synthétiser. Cela permet à l'onboarding et aux diagnostics d'expliquer l'état du plan source sans importer le runtime du plugin.

Les entrées npm externes officielles devraient préférer un `npmSpec` exact plus `expectedIntegrity`. Les noms de packages nus et les dist-tags fonctionnent toujours pour la compatibilité, mais ils font apparaître des avertissements du plan source afin que le catalogue puisse passer à des installations épinglées et vérifiées en intégrité sans casser les plugins existants. Lors de l'onboarding des installations à partir d'un chemin de catalogue local, il enregistre une entrée d'index de plugin gérée avec `source: "path"` et un `sourcePath` relatif à l'espace de travail lorsque cela est possible. Le chemin de chargement opérationnel absolu reste dans `plugins.load.paths` ; l'enregistrement d'installation évite de dupliquer les chemins de station de travail locaux dans la configuration longue durée. Cela maintient les installations de développement locales visibles pour les diagnostics du plan source sans ajouter une deuxième surface de divulgation de chemin de système de fichiers brut. L'index de plugin `plugins/installs.json` persisté est la source de vérité de l'installation et peut être actualisé sans charger les modules de runtime du plugin. Sa carte `installRecords` est durable même lorsqu'un manifeste de plugin est manquant ou invalide ; son tableau `plugins` est une vue manifeste/cache reconstruisible.

## Plugins du moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage et la compaction. Enregistrez-les depuis votre plugin avec `api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec `plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut plutôt que d'ajouter simplement une recherche de mémoire ou des crochets (hooks).

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Si votre moteur ne possède **pas** l'algorithme de compaction, gardez `compact()` implémenté et déléguez-le explicitement :

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## Ajouter une nouvelle capacité

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à l'API actuel, ne contournez pas le système de plugins par un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le cœur doit posséder : politique, secours, fusion de configuration, cycle de vie, sémantique orientée channel, et forme de l'aide d'exécution.
2. ajouter des surfaces d'enregistrement/exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface de capacité typée utile.
3. connecter le cœur + les consommateurs channel/fonctionnalité
   Les plugins de channel et de fonctionnalité doivent consommer la nouvelle capacité via le cœur, et non en important directement une implémentation fournisseur.
4. enregistrer les implémentations fournisseur
   Les plugins fournisseur enregistrent ensuite leurs backends contre la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opiniâtre sans devenir codé en dur pour la vision du monde d'un provider. Voir le [Capability Cookbook](/fr/tools/capability-cookbook) pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces ensemble :

- types de contrat principal dans `src/<capability>/types.ts`
- aide d'exécution/runner principal dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API de plugin dans `src/plugins/types.ts`
- câblage du registre de plugin dans `src/plugins/registry.ts`
- exposition de l'exécution du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/channel
  doivent la consommer
- aides de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, c'est généralement un signe que la fonctionnalité n'est pas encore entièrement intégrée.

### Modèle de fonctionnalité

Modèle minimal :

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

Modèle de test de contrat :

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

Cela permet de garder la règle simple :

- le cœur possède le contrat de fonctionnalité + l'orchestration
- les plugins fournisseur possèdent les implémentations fournisseur
- les plugins de fonctionnalité/channel consomment les assistants d'exécution
- les tests de contrat gardent la propriété explicite

## Connexes

- [Architecture des plugins](/fr/plugins/architecture) — modèle de fonctionnalité publique et formes
- [Sous-chemins du SDK de plugin](/fr/plugins/sdk-subpaths)
- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Création de plugins](/fr/plugins/building-plugins)
