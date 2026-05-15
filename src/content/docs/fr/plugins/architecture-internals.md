---
summary: "Internes de l'architecture des plugins : pipeline de chargement, registre, hooks d'exécution, routes HTTP et tables de référence"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "Internes de l'architecture des plugins"
---

Pour le modèle de capacité publique, les formes de plugins et les contrats de propriété/exécution, voir [Architecture des plugins](/fr/plugins/architectureGateway). Cette page est la référence pour la mécanique interne : pipeline de chargement, registre, crochets d'exécution, routes HTTP du Gateway, chemins d'importation et tables de schéma.

## Pipeline de chargement

Au démarrage, OpenClaw fait approximativement ceci :

1. découvrir les racines candidates des plugins
2. lire les manifestes de bundle natifs ou compatibles et les métadonnées des packages
3. rejeter les candidats non sécurisés
4. normaliser la configuration du plugin (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. décider de l'activation pour chaque candidat
6. charger les modules natifs activés : les modules groupés intégrés utilisent un chargeur natif ; le code source TypeScript tiers local utilise le recours de secours Jiti
7. appeler les hooks natifs `register(api)` et collecter les inscriptions dans le registre des plugins
8. exposer le registre aux commandes/surfaces d'exécution

<Note>`activate` est un alias hérité pour `register` — le chargeur résout celui qui est présent (`def.register ?? def.activate`) et l'appelle au même moment. Tous les plugins groupés utilisent `register` ; privilégiez `register` pour les nouveaux plugins.</Note>

Les verrous de sécurité se produisent **avant** l'exécution. Les candidats sont bloqués
lorsque le point d'entrée sort de la racine du plugin, que le chemin est accessible en écriture par tous, ou que la
propriété du chemin semble suspecte pour les plugins non groupés.

Les candidats bloqués restent liés à leur identifiant de plugin pour le diagnostic. Si la configuration référence toujours cet identifiant, la validation signale le plugin comme présent mais bloqué et renvoie à l'avertissement de sécurité du chemin au lieu de traiter l'entrée de configuration comme obsolète.

### Comportement prioritaire au manifeste

Le manifeste est la source de vérité du plan de contrôle. OpenClaw l'utilise pour :

- identifier le plugin
- découvrir les canaux/compétences/schémas de configuration déclarés ou les capacités groupées
- valider `plugins.entries.<id>.config`
- augmenter les étiquettes/espaces réservés de l'interface utilisateur de contrôle
- afficher les métadonnées d'installation/de catalogue
- préserver les descripteurs d'activation et de configuration peu coûteux sans charger le runtime du plugin

Pour les plugins natifs, le module d'exécution est la partie du plan de données. Il enregistre le comportement réel tel que les crochets, les outils, les commandes ou les flux du fournisseur.

Les blocs `activation` et `setup` facultatifs du manifeste restent sur le plan de contrôle. Ce sont des descripteurs de métadonnées uniquement pour la planification de l'activation et la découverte de la configuration ; ils ne remplacent pas l'enregistrement du runtime, `register(...)` ou `setupEntry`. Les premiers consommateurs d'activation en direct utilisent désormais les indices de commande, de canal et de fournisseur du manifeste pour restreindre le chargement des plugins avant une matérialisation plus large du registre :

- Le chargement de la CLI se restreint aux plugins qui possèdent la commande principale demandée
- la configuration du canal/la résolution du plugin se restreint aux plugins qui possèdent l'identifiant de canal demandé
- la configuration explicite du fournisseur/la résolution du runtime se restreint aux plugins qui possèdent l'identifiant de fournisseur demandé
- La planification du démarrage du Gateway utilise Gateway`activation.onStartup` pour les importations de démarrage explicites et les refus de démarrage ; les plugins sans métadonnées de démarrage ne sont chargés que par des déclencheurs d'activation plus restreints

Les préchargements d'exécution au moment de la requête qui demandent l'étendue `all`OpenClaw large dérivent toujours un
ensemble explicite d'ID de plugin effectifs à partir de la configuration, de la planification du démarrage, des canaux configurés,
emplacements et règles d'activation automatique. Si cet ensemble dérivé est vide, OpenClaw
charge un registre d'exécution vide au lieu d'élargir à chaque plugin détectable.

Le planificateur d'activation expose à la fois une API d'ID uniquement pour les appelants existants et une
API de plan pour les nouveaux diagnostics. Les entrées de plan signalent pourquoi un plugin a été sélectionné,
séparant les indices explicites APIAPI`activation.*` du planificateur du repli de propriété du manifeste
tel que `providers`, `channels`, `commandAliases`, `setup.providers`,
`contracts.tools` et les hooks. Cette séparation des raisons est la limite de compatibilité :
les métadonnées de plugin existantes continuent de fonctionner, tandis que le nouveau code peut détecter des indices larges
ou un comportement de repli sans modifier la sémantique de chargement de l'exécution.

La découverte de la configuration préfère désormais les ID détenus par le descripteur tels que `setup.providers` et
`setup.cliBackends` pour réduire les plugins candidats avant de revenir à
`setup-api` pour les plugins qui ont encore besoin de hooks d'exécution au moment de la configuration. Les listes de configuration du fournisseur
utilisent le `providerAuthChoices` du manifeste, les choix de configuration dérivés du descripteur
et les métadonnées du catalogue d'installation sans charger le runtime du fournisseur. Le `setup.requiresRuntime: false` explicite
est une coupure déscripteur uniquement ; l'`requiresRuntime` omis conserve le repli de l'API de configuration héritée pour la compatibilité. Si plus d'un plugin découvert
revendique le même ID de fournisseur de configuration normalisé ou d'interface backend CLI,
la recherche de configuration refuse le propriétaire ambigu au lieu de s'appuyer sur l'ordre de découverte. Lorsque le runtime de configuration s'exécute,
les diagnostics du registre signalent une dérive entre `setup.providers` / `setup.cliBackends` et les fournisseurs ou les interfaces backend CLI
enregistrés par l'API de configuration sans bloquer les plugins hérités.

### Limite du cache de plugins

OpenClaw ne met pas en cache les résultats de découverte de plugins ni les données directes du registre de manifestes derrière des fenêtres d'horloge. Les installations, les modifications de manifestes et les changements de chemin de chargement doivent devenir visibles lors de la prochaine lecture explicite des métadonnées ou de la reconstruction de l'instantané. L'analyseur de fichiers de manifeste peut conserver un cache de signatures de fichiers limité, indexé par le chemin du manifeste ouvert, l'inode, la taille et les horodatages ; ce cache évite uniquement de ré-analyser les octets non modifiés et ne doit pas mettre en cache les réponses de découverte, de registre, de propriétaire ou de stratégie.

Le chemin rapide sécurisé pour les métadonnées est la propriété explicite des objets, et non un cache caché. Les chemins critiques de démarrage du Gateway doivent transmettre le `PluginMetadataSnapshot` actuel, le `PluginLookUpTable` dérivé ou un registre de manifestes explicite via la chaîne d'appels. La validation de la configuration, l'activation automatique au démarrage, l'amorçage des plugins et la sélection du provider peuvent réutiliser ces objets tant qu'ils représentent la configuration actuelle et l'inventaire des plugins. La recherche de configuration reconstruit toujours les métadonnées du manifeste à la demande, sauf si le chemin de configuration spécifique reçoit un registre de manifestes explicite ; gardez cela comme solution de repli à chemin froid plutôt que d'ajouter des caches de recherche cachés. Lorsque l'entrée change, reconstruisez et remplacez l'instantané au lieu de le modifier ou de conserver des copies historiques.
Les vues sur le registre de plugins actif et les assistants d'amorçage de channel regroupés doivent être recalculées à partir du registre/racine actuel. Les cartes à courte durée de vie sont acceptables dans un seul appel pour dédupliquer le travail ou protéger contre la réentrée ; elles ne doivent pas devenir des caches de métadonnées de processus.

Pour le chargement des plugins, la couche de cache persistante est le chargement d'exécution. Elle peut réutiliser l'état du chargeur lorsque le code ou les artefacts installés sont réellement chargés, tels que :

- `PluginLoaderCacheState` et les registres d'exécution actifs compatibles
- les caches jiti/module et les caches de chargeur de surface publique utilisés pour éviter d'importer
  répétitivement la même surface d'exécution
- les caches de système de fichiers pour les artefacts de plugins installés
- les cartes par appel à courte durée de vie pour la normalisation des chemins ou la résolution des doublons

Ces caches sont des détails d'implémentation du plan de données. Ils ne doivent pas répondre
aux questions du plan de contrôle telles que « quel plugin possède ce provider ? » à moins que
l'appelant n'ait délibérément demandé le chargement d'exécution.

N'ajoutez pas de caches persistants ou d'horloge pour :

- les résultats de découverte
- les registres de manifestes directs
- registres de manifestes reconstruits à partir de l'index des plugins installés
- recherche du propriétaire du provider, suppression du modèle, stratégie du provider, ou métadonnées d'artefact public
- toute autre réponse dérivée du manifeste où un manifeste modifié, un index installé ou un chemin de chargement doit être visible lors de la prochaine lecture des métadonnées

Les appelants qui reconstruisent les métadonnées de manifeste à partir de l'index persistant des plugins installés reconstruisent ce registre à la demande. L'index installé est un état durable du plan source ; ce n'est pas un cache de métadonnées caché dans le processus.

## Modèle de registre

Les plugins chargés ne modifient pas directement les globales principales aléatoires. Ils s'enregistrent dans un registre central de plugins.

Le registre suit :

- enregistrements de plugins (identité, source, origine, statut, diagnostics)
- outils
- hooks hérités et hooks typés
- canaux
- providers
- gestionnaires RPC de passerelle
- routes HTTP
- registrars CLI
- services d'arrière-plan
- commandes détenues par le plugin

Les fonctionnalités principales lisent ensuite ce registre au lieu de communiquer directement avec les modules de plugins. Cela maintient le chargement unidirectionnel :

- module de plugin -> enregistrement du registre
- runtime principal -> consommation du registre

Cette séparation est importante pour la maintenabilité. Cela signifie que la plupart des surfaces principales n'ont besoin que d'un point d'intégration : "lire le registre", et non "cas particulier pour chaque module de plugin".

## Rappels de liaison de conversation

Les plugins qui lient une conversation peuvent réagir lorsqu'une approbation est résolue.

Utilisez `api.onConversationBindingResolved(...)` pour recevoir un rappel après qu'une demande de liaison est approuvée ou refusée :

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
- `request` : le résumé de la demande d'origine, l'indice de détachement, l'identifiant de l'expéditeur et les métadonnées de la conversation

Ce rappel est uniquement une notification. Il ne modifie pas qui est autorisé à lier une conversation et s'exécute après la fin du traitement de l'approbation principale.

## Hooks du runtime du provider

Les plugins de provider comportent trois couches :

- **Métadonnées de manifeste** pour une recherche pré-exécution économique :
  `setup.providers[].envVars`, compatibilité obsolète `providerAuthEnvVars`,
  `providerAuthAliases`, `providerAuthChoices` et `channelEnvVars`.
- **Hooks de configuration** : `catalog` (`discovery` hérité) plus
  `applyConfigDefaults`.
- **Hooks d'exécution** : plus de 40 hooks optionnels couvrant l'authentification, la résolution de modèle,
  l'encapsulation de flux, les niveaux de réflexion, la stratégie de relecture et les points de terminaison d'utilisation. Voir
  la liste complète sous [Hook order and usage](#hook-order-and-usage).

OpenClaw conserve toujours la boucle d'agent générique, le basculement (failover), la gestion des transcriptions et la
stratégie d'outil. Ces hooks constituent la surface d'extension pour les comportements
spécifiques au fournisseur sans nécessiter un transport d'inférence entièrement personnalisé.

Utilisez le manifeste `setup.providers[].envVars` lorsque le fournisseur dispose d'informations d'identification basées sur des variables d'environnement que les chemins d'authentification/génération d'état/sélection de modèle génériques devraient voir sans
charger le runtime du plugin. L'élément obsolète `providerAuthEnvVars` est toujours lu par l'adaptateur
de compatibilité pendant la fenêtre de dépréciation, et les plugins non regroupés
qui l'utilisent reçoivent un diagnostic de manifeste. Utilisez le manifeste `providerAuthAliases`
lorsqu'un identifiant de fournisseur doit réutiliser les variables d'environnement, les profils d'authentification,
l'authentification basée sur la configuration et le choix d'intégration de clé API d'un autre identifiant de fournisseur. Utilisez le manifeste
`providerAuthChoices` lorsque les surfaces CLI d'intégration/de choix d'authentification doivent connaître l'identifiant
de choix du fournisseur, les étiquettes de groupe et le câblage d'authentification simple à un seul indicateur sans
charger le runtime du fournisseur. Gardez le `envVars` du runtime du fournisseur
pour les indications destinées aux opérateurs, telles que les étiquettes d'intégration ou les variables de configuration
client-id/client-secret OAuth.

Utilisez le manifeste `channelEnvVars` lorsqu'un canal dispose d'une authentification ou d'une configuration pilotée par l'environnement que
le repli générique d'environnement de shell, les vérifications de configuration/d'état ou les invites de configuration devraient voir
sans charger le runtime du canal.

### Hook order and usage

Pour les plugins de modèle/fournisseur, OpenClaw appelle les hooks dans cet ordre approximatif.
La colonne "Quand utiliser" sert de guide de décision rapide.
Les champs de fournisseur uniquement pour la compatibilité que OpenClaw n'appelle plus, tels que
`ProviderPlugin.capabilities` et `suppressBuiltInModel`%, ne sont pas
intentionnellement listés ici.

| #   | Hook                              | Ce qu'il fait                                                                                                                                                                              | Quand utiliser                                                                                                                                                                                         |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `catalog`                         | Publier la config du fournisseur dans `models.providers` lors de la génération `models.json`                                                                                               | Le fournisseur possède un catalogue ou des valeurs par défaut d'URL de base                                                                                                                            |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de config globales possédées par le fournisseur lors de la matérialisation de la config                                                                   | Les valeurs par défaut dépendent du mode d'auth, de l'env, ou de la sémantique de la famille de modèles du fournisseur                                                                                 |
| --  | _(recherche de modèle intégrée)_  | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                                                             | _(pas un hook de plugin)_                                                                                                                                                                              |
| 3   | `normalizeModelId`                | Normaliser les alias d'ID de modèle hérités ou preview avant la recherche                                                                                                                  | Le fournisseur possède le nettoyage des alias avant la résolution du modèle canonique                                                                                                                  |
| 4   | `normalizeTransport`              | Normaliser `api` / `baseUrl` de la famille du fournisseur avant l'assemblage du modèle générique                                                                                           | Le fournisseur possède le nettoyage du transport pour les IDs de fournisseur personnalisés dans la même famille de transport                                                                           |
| 5   | `normalizeConfig`                 | Normaliser `models.providers.<id>` avant la résolution runtime/fournisseur                                                                                                                 | Le fournisseur a besoin d'un nettoyage de config qui doit résider avec le plugin ; les aides Google groupées servent également de filet de sécurité pour les entrées de config Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation du streaming natif aux fournisseurs de config                                                                                     | Le fournisseur a besoin de correctifs de métadonnées d'utilisation du streaming natif pilotés par le point de terminaison                                                                              |
| 7   | `resolveConfigApiKey`             | Résoudre l'auth par marqueur d'env pour les fournisseurs de config avant le chargement de l'auth runtime                                                                                   | Le fournisseur a une résolution de clé API par marqueur d'env possédée par le fournisseur ; `amazon-bedrock` dispose également ici d'un résolveur AWS par marqueur d'env intégré                       |
| 8   | `resolveSyntheticAuth`            | Exposer l'auth locale/auto-hébergée ou basée sur la config sans persister le texte en clair                                                                                                | Le fournisseur peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                    |
| 9   | `resolveExternalAuthProfiles`     | Superposer les profils d'authentification externe appartenant au provider ; la valeur par défaut `persistence` est `runtime-only` pour les identifiants appartenant à la CLI/l'application | Le provider réutilise les identifiants d'authentification externe sans conserver les jetons d'actualisation copiés ; déclarer `contracts.externalAuthProviders` dans le manifeste                      |
| 10  | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétiques stockés derrière une authentification soutenue par env/config                                                                         | Le provider stocke des profils synthétiques espaces réservés qui ne doivent pas primer                                                                                                                 |
| 11  | `resolveDynamicModel`             | Synchronisation de secours pour les ids de modèle appartenant au provider qui ne sont pas encore dans le registre local                                                                    | Le provider accepte des ids de modèle en amont arbitraires                                                                                                                                             |
| 12  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                                                                    | Le provider a besoin de métadonnées réseau avant de résoudre les ids inconnus                                                                                                                          |
| 13  | `normalizeResolvedModel`          | Réécriture finale avant que l'exécuteur intégré n'utilise le modèle résolu                                                                                                                 | Le provider a besoin de réécritures de transport mais utilise toujours un transport principal                                                                                                          |
| 14  | `contributeResolvedModelCompat`   | Contribuer aux indicateurs de compatibilité pour les modèles de fournisseur derrière un autre transport compatible                                                                         | Le provider reconnaît ses propres modèles sur les transports proxy sans prendre le pas sur le provider                                                                                                 |
| 15  | `normalizeToolSchemas`            | Normaliser les schémas d'outils avant que l'exécuteur intégré ne les voie                                                                                                                  | Le provider a besoin d'un nettoyage de schéma de famille de transport                                                                                                                                  |
| 16  | `inspectToolSchemas`              | Afficher les diagnostics de schéma appartenant au provider après normalisation                                                                                                             | Le provider souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au provider principal                                                                                        |
| 17  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou étiqueté                                                                                                                        | Le provider a besoin d'une sortie de raisonnement/finale étiquetée au lieu de champs natifs                                                                                                            |
| 18  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les enveloppes d'options de flux génériques                                                                                                  | Le provider a besoin de paramètres de requête par défaut ou d'un nettoyage des paramètres par provider                                                                                                 |
| 19  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                                                               | Le provider a besoin d'un protocole filaire personnalisé, pas seulement d'un enveloppeur                                                                                                               |
| 20  | `wrapStreamFn`                    | Enveloppeur de flux après l'application des enveloppeurs génériques                                                                                                                        | Le provider a besoin d'enveloppeurs de compatibilité pour les en-têtes/corps/modèles de requête sans transport personnalisé                                                                            |
| 21  | `resolveTransportTurnState`       | Attacher des en-têtes ou métadonnées de transport natifs par tour                                                                                                                          | Le provider souhaite que les transports génériques envoient l'identité de tour native du provider                                                                                                      |
| 22  | `resolveWebSocketSessionPolicy`   | Attacher des en-têtes WebSocket natifs ou une politique de refroidissement de session                                                                                                      | Le provider souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de repli                                                                                        |
| 23  | `formatApiKey`                    | Formateur de profil d'auth : le profil stocké devient la chaîne `apiKey` d'exécution                                                                                                       | Le provider stocke des métadonnées d'auth supplémentaires et a besoin d'une forme de token d'exécution personnalisée                                                                                   |
| 24  | `refreshOAuth`                    | Remplacement du rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la politique d'échec de rafraîchissement                                        | Le provider ne correspond pas aux rafraîchisseurs `pi-ai` partagés                                                                                                                                     |
| 25  | `buildAuthDoctorHint`             | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                                                       | Le provider a besoin de conseils de réparation d'auth appartenant au provider après un échec de rafraîchissement                                                                                       |
| 26  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre de contexte appartenant au provider                                                                                                               | Le provider a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                           |
| 27  | `classifyFailoverReason`          | Classification des motifs de basculement appartenant au provider                                                                                                                           | Le provider peut mapper les erreurs brutes API/transport aux limites de taux/surcharges/etc                                                                                                            |
| 28  | `isCacheTtlEligible`              | Politique de cache de prompt pour les providers de proxy/backhaul                                                                                                                          | Le provider a besoin d'une porte de TTL de cache spécifique au proxy                                                                                                                                   |
| 29  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'auth manquante                                                                                                                         | Le provider a besoin d'un indice de récupération d'auth manquante spécifique au provider                                                                                                               |
| 30  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                                                                      | Le provider a besoin de lignes synthétiques de compatibilité ascendante dans `models list` et les sélecteurs                                                                                           |
| 31  | `resolveThinkingProfile`          | Définition de niveau `/think` spécifique au modèle, étiquettes d'affichage et valeur par défaut                                                                                            | Le fournisseur expose une échelle de réflexion personnalisée ou une étiquette binaire pour certains modèles                                                                                            |
| 32  | `isBinaryThinking`                | Hook de compatibilité pour le basculement du raisonnement on/off                                                                                                                           | Le fournisseur expose uniquement une réflexion binaire on/off                                                                                                                                          |
| 33  | `supportsXHighThinking`           | Hook de compatibilité du support de raisonnement `xhigh`                                                                                                                                   | Le provider souhaite `xhigh` uniquement sur un sous-ensemble de modèles                                                                                                                                |
| 34  | `resolveDefaultThinkingLevel`     | Hook de compatibilité du niveau `/think` par défaut                                                                                                                                        | Le fournisseur possède la stratégie par défaut `/think` pour une famille de modèles                                                                                                                    |
| 35  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection de smoke                                                                                             | Le fournisseur possède la correspondance de modèle préférée en direct/smoke                                                                                                                            |
| 36  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                                                           | Le fournisseur a besoin d'un échange de jeton ou d'une information d'identification de demande à courte durée de vie                                                                                   |
| 37  | `resolveUsageAuth`                | Résoudre les identifiants d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                                                                         | Le fournisseur a besoin d'une analyse personnalisée des jetons d'utilisation/quota ou d'informations d'identification d'utilisation différentes                                                        |
| 38  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au fournisseur après résolution de l'authentification                                                              | Le fournisseur a besoin d'un point de terminaison d'utilisation ou d'un analyseur de charge utile spécifique au fournisseur                                                                            |
| 39  | `createEmbeddingProvider`         | Construire un adaptateur d'intégration appartenant au fournisseur pour la mémoire/recherche                                                                                                | Le comportement d'intégration de la mémoire appartient au plugin du fournisseur                                                                                                                        |
| 40  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant la gestion des transcriptions pour le fournisseur                                                                                           | Le fournisseur a besoin d'une stratégie de transcription personnalisée (par exemple, suppression des blocs de réflexion)                                                                               |
| 41  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique de la transcription                                                                                                        | Le fournisseur a besoin de réécritures de relecture spécifiques au fournisseur au-delà des assistants de compactage partagés                                                                           |
| 42  | `validateReplayTurns`             | Validation finale ou restructuration du tour de relecture avant le runner intégré                                                                                                          | Le transport du provider a besoin d'une validation de tour plus stricte après la désinfection générique                                                                                                |
| 43  | `onModelSelected`                 | Exécuter les effets secondaires post-sélection appartenant au provider                                                                                                                     | Le provider a besoin de télémétrie ou d'un état appartenant au provider lorsqu'un modèle devient actif                                                                                                 |

`normalizeModelId`, `normalizeTransport`, et `normalizeConfig` vérifient d'abord le
plugin fournisseur correspondant, puis passent aux autres plugins fournisseurs capables d'accroches
jusqu'à ce que l'un modifie réellement l'identifiant du modèle ou le transport/la configuration. Cela permet
de maintenir le fonctionnement des shims d'alias/compatibilité des fournisseurs sans que l'appelant ait besoin de savoir quel
plugin groupé possède la réécriture. Si aucune accroche de fournisseur ne réécrit une entrée de configuration
prise en charge de la famille Google, le normaliseur de configuration groupé Google applique toujours
ce nettoyage de compatibilité.

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

Les plugins fournisseurs groupés combinent les accroches ci-dessus pour répondre aux besoins de catalogue,
d'authentification, de réflexion, de relecture et d'utilisation de chaque fournisseur. L'ensemble autorisé d'accroches se trouve
avec chaque plugin sous `extensions/`; cette page illustre les formes plutôt que
de refléter la liste.

<AccordionGroup>
  <Accordion title="Fournisseurs de catalogue en mode passe-through" OpenRouter>
    OpenRouter, Kilocode, Z.AI, xAI enregistrent `catalog` plus `resolveDynamicModel` / `prepareDynamicModel`OpenClaw afin qu'ils puissent afficher les identifiants de modèles en amont avant le catalogue statique d'OpenClaw.
  </Accordion>
  <Accordion title="OAuthFournisseurs de points de terminaison OAuth et d'utilisation" GitHub>
    GitHub Copilot, Gemini CLI, ChatGPT Codex, MiniMax, Xiaomi, z.ai pair `prepareRuntimeAuth` ou `formatApiKey` avec `resolveUsageAuth` + `fetchUsageSnapshot` pour posséder l'échange de jetons et l'intégration `/usage`.
  </Accordion>
  <Accordion title="Familles de relecture et de nettoyage de transcriptions">Des familles nommées partagées (`google-gemini`, `passthrough-gemini`, `anthropic-by-model`, `hybrid-anthropic-openai`) permettent aux fournisseurs d'opter pour une stratégie de transcription via `buildReplayPolicy` au lieu que chaque plugin réimplémente le nettoyage.</Accordion>
  <Accordion title="Fournisseurs de catalogue uniquement">`byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` n'enregistrent que `catalog` et utilisent la boucle d'inférence partagée.</Accordion>
  <Accordion title="Assistants de flux spécifiques à Anthropic">Les en-têtes bêta, `/fast` / `serviceTier` et `context1m` se trouvent dans la jointure publique `api.ts` / `contract-api.ts` du plugin Anthropic (`wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`) plutôt que dans le SDK générique.</Accordion>
</AccordionGroup>

## Assistants d'exécution

Les plugins peuvent accéder à des assistants principaux sélectionnés via `api.runtime`. Pour le TTS :

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

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichier/note vocale.
- Utilise la configuration `messages.tts` principale et la sélection du provider.
- Returns PCM audio buffer + sample rate. Plugins must resample/encode for providers.
- `listVoices` est optionnel par provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration détenus par le fournisseur.
- Voice listings can include richer metadata such as locale, gender, and personality tags for provider-aware pickers.
- OpenAI and ElevenLabs support telephony today. Microsoft does not.

Les plugins peuvent également enregistrer des providers de synthèse vocale via `api.registerSpeechProvider(...)`.

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
- L'entrée `edge` Microsoft héritée est normalisée vers l'identifiant de provider `microsoft`.
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
  - les plugins de fonctionnalité/channel consomment `api.runtime.videoGeneration.*`

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

- `api.runtime.mediaUnderstanding.*` est la surface partagée préférée pour
  la compréhension d'image/audio/vidéo.
- Utilise la configuration audio principale de compréhension des médias (`tools.media.audio`) et l'ordre de secours des providers.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste en tant qu'alias de compatibilité.

Les plugins peuvent également lancer des exécutions de sous-agent en arrière-plan via `api.runtime.subagent` :

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

- `provider` et `model` sont des substitutions facultatives par exécution, et non des modifications persistantes de session.
- OpenClaw honore ces champs de substitution uniquement pour les appelants de confiance.
- Pour les exécutions de secours détenues par le plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des cibles `provider/model` canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agents de plugins non fiables fonctionnent toujours, mais les demandes de remplacement sont rejetées au lieu de revenir silencieusement à une valeur par défaut.
- Les sessions de sous-agent créées par plugin sont étiquetées avec l'identifiant du plugin créateur. Le secours `api.runtime.subagent.deleteSession(...)` ne peut supprimer que ces sessions détenues ; la suppression arbitraire de sessions nécessite toujours une requête Gateway avec portée d'administrateur.

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

Les plugins peuvent également enregistrer des providers de recherche Web via
`api.registerWebSearchProvider(...)`.

Notes :

- Gardez la sélection du provider, la résolution des identifiants et la sémantique des requêtes partagées dans le cœur.
- Utilisez les providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalité/channel qui ont besoin d'un comportement de recherche sans dépendre du wrapper d'outil de l'agent.

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

- `generate(...)` : générer une image en utilisant la chaîne de providers de génération d'images configurée.
- `listProviders(...)` : lister les fournisseurs de génération d'images disponibles et leurs capacités.

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

- `path` : chemin de routage sous le serveur HTTP Gateway.
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification Gateway normale, ou `"plugin"` pour l'authentification/vérification de webhook gérée par le plugin.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : optionnel. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a traité la requête.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez `api.registerHttpRoute(...)` à la place.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec des niveaux `auth` différents sont rejetées. Maintenez les chaînes de traitement `exact`/`prefix` uniquement sur le même niveau d'authentification.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les portées d'exécution de l'opérateur. Elles sont destinées aux webhooks/vérifications de signature gérés par le plugin, et non aux appels d'assistance Gateway privilégiés.
- Les routes `auth: "gateway"` s'exécutent dans une portée d'exécution de requête Gateway, mais cette portée est intentionnellement conservatrice :
  - l'authentification Bearer par secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les portées d'exécution des routes de plugin ancrées à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP transportant une identité de confiance (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur un ingress privé) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent sur ces demandes de route de plugin portant une identité, la portée d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'une route de plugin d'authentification passerelle est une surface administrative implicite. Si votre route nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification portant une identité et documentez le contrat d'en-tête explicite `x-openclaw-scopes`.

## Chemins d'importation du SDK de plugin

Utilisez des sous-chemins SDK étroits au lieu du fichier racine monolithique `openclaw/plugin-sdk` lors de la création de nouveaux plugins. Sous-chemins principaux :

| Sous-chemin                         | Objectif                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | Primitives d'enregistrement de plugin                |
| `openclaw/plugin-sdk/channel-core`  | Assistants d'entrée/de construction de canal         |
| `openclaw/plugin-sdk/core`          | Assistants partagés génériques et contrat parapluie  |
| `openclaw/plugin-sdk/config-schema` | Schéma Zod racine `openclaw.json` (`OpenClawSchema`) |

Les plugins de canal choisissent parmi une famille de jonctions étroites — `channel-setup`,
`setup-runtime`, `setup-adapter-runtime`, `setup-tools`, `channel-pairing`,
`channel-contract`, `channel-feedback`, `channel-inbound`, `channel-lifecycle`,
`channel-reply-pipeline`, `command-auth`, `secret-input`, `webhook-ingress`,
`channel-targets` et `channel-actions`. Le comportement d'approbation doit se consolider
sur un seul contrat `approvalCapability` plutôt que de se mélanger entre des champs de
plugin non liés. Voir [Plugins de canal](/fr/plugins/sdk-channel-plugins).

Les assistants d'exécution et de configuration résident sous des sous-chemins ciblés `*-runtime` correspondants
(`approval-runtime`, `agent-runtime`, `lazy-runtime`, `directory-runtime`,
`text-runtime`, `runtime-store`, `system-event-runtime`, `heartbeat-runtime`,
`channel-activity-runtime`, etc.). Privilégiez `config-types`,
`plugin-config-runtime`, `runtime-config-snapshot` et `config-mutation`
plutôt que le fichier de compatibilité large `config-runtime`.

<Info>`openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/config-runtime`, et `openclaw/plugin-sdk/infra-runtime` sont des couches de compatibilité dépréciées pour les anciens plugins. Le nouveau code devrait plutôt importer des primitives génériques plus ciblées.</Info>

Points d'entrée internes au dépôt (par racine de package de plugin groupé) :

- `index.js` — point d'entrée du plugin groupé
- `api.js` — baril d'aide/types
- `runtime-api.js` — baril d'exécution uniquement
- `setup-entry.js` — point d'entrée du plugin de configuration

Les plugins externes ne doivent importer que les sous-chemins `openclaw/plugin-sdk/*`. N'importez
jamais `src/*` d'un autre package de plugin depuis le cœur ou depuis un autre plugin.
Les points d'entrée chargés par la façade privilégient l'instantané actif de la configuration d'exécution lorsqu'il
existe, puis reviennent au fichier de configuration résolu sur le disque.

Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding`,
et `speech` existent car les plugins groupés les utilisent aujourd'hui. Ils ne sont pas
automatiquement des contrats externes figés à long terme — consultez la page de référence pertinente du
SDK lorsque vous vous y fiez.

## Schémas d'outil de message

Les plugins doivent posséder les contributions de schéma `describeMessageTool(...)` spécifiques au channel
pour les primitives non-messages telles que les réactions, les lectures et les sondages.
La présentation d'envoi partagée devrait utiliser le contrat générique `MessagePresentation`
au lieu des champs de bouton, de composant, de bloc ou de carte natifs du provider.
Voir [Message Presentation](/fr/plugins/message-presentation) pour le contrat,
les règles de repli, le mapping du provider et la liste de contrôle pour l'auteur du plugin.

Les plugins capables d'envoi déclarent ce qu'ils peuvent restituer via les capacités de message :

- `presentation` pour les blocs de présentation sémantique (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` pour les requêtes de livraison épinglée

Le cœur décide s'il faut restituer la présentation nativement ou la dégrader en texte.
N'exposez pas de portes de sortie d'interface utilisateur natives du provider depuis l'outil de message générique.
Les aides SDK obsolètes pour les schémas natifs hérités restent exportées pour les plugins tiers
existants, mais les nouveaux plugins ne doivent pas les utiliser.

## Résolution de la cible du channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` décide si une cible normalisée
  doit être traitée comme `direct`, `group`, ou `channel` avant la recherche de répertoire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur si une
  entrée doit passer directement à la résolution de type identifiant au lieu de la recherche de répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le recours du plugin lorsque
  le cœur a besoin d'une résolution finale détenue par le provider après normalisation ou après
  l'échec d'accès à un répertoire.
- `messaging.resolveOutboundSessionRoute(...)` gère la construction des routes de session
  spécifiques au provider une fois qu'une cible est résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent se produire avant
  la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications « traiter ceci comme un ID de cible explicite/natif ».
- Utilisez `resolveTarget` pour le recours de normalisation spécifique au provider, et non pour
  une recherche étendue dans le répertoire.
- Conservez les IDs natifs du provider comme les IDs de chat, de fils de discussion, JIDs, handles et IDs de salle
  dans les valeurs `target` ou les paramètres spécifiques au provider, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés de
`openclaw/plugin-sdk/directory-runtime`.

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

Les plugins de provider peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de provider
- `{ providers }` pour plusieurs entrées de provider

Utilisez `catalog` lorsque le plugin possède des IDs de modèle spécifiques au provider, des valeurs par défaut d'URL de base
ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux providers implicites intégrés de OpenClaw :

- `simple` : providers simples par clé API ou pilotés par l'environnement
- `profile` : providers qui apparaissent lorsque des profils d'authentification existent
- `paired` : providers qui synthétisent plusieurs entrées de provider connexes
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs prévalent en cas de collision de clé, donc les plugins peuvent volontairement remplacer une entrée de provider intégrée avec le même id de provider.

Les plugins peuvent également publier des lignes de model en lecture seule via
`api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog
})`. Il s'agit du chemin direct pour les surfaces de liste/aide/sélecteur et prend en charge
les lignes `text`, `image_generation`, `video_generation` et `music_generation`.
Les plugins de provider possèdent toujours les appels de point de terminaison en direct, l'échange de jetons et le mappage des réponses des fournisseurs ; le cœur possède la forme de ligne commune, les étiquettes de source et le formatage de l'aide de tool média. Les enregistrements de provider de génération média synthétisent automatiquement les lignes de catalogue statique à partir de `defaultModel`, `models` et `capabilities`.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité, mais émet un avertissement de dépréciation
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`
- `augmentModelCatalog` est déprécié ; les providers groupés doivent publier
  des lignes supplémentaires via `registerModelCatalogProvider`

## Inspection de channel en lecture seule

Si votre plugin enregistre un channel, implémentez de préférence
`plugin.config.inspectAccount(cfg, accountId)` en plus de `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est autorisé à supposer que les identifiants
  sont entièrement matérialisés et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les identifiants d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyer que l'état descriptif du compte.
- Conserver `enabled` et `configured`.
- Inclure les champs de source/statut des identifiants lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Il n'est pas nécessaire de renvoyer les valeurs brutes des jetons pour signaler la disponibilité en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant) suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'un identifiant est configuré via SecretRef mais n'est pas disponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler "configuré mais indisponible dans ce chemin de commande" au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Package packs

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

Chaque entrée devient un plugin. Si le pack répertorie plusieurs extensions, l'ID du plugin devient `name/<fileBase>`.

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que npm`node_modules` soit disponible (`npm install` / `pnpm install`).

Garantie de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin après la résolution des liens symboliques. Les entrées qui s'échappent du répertoire du package sont rejetées.

Note de sécurité : `openclaw plugins install` installe les dépendances du plugin avec un `npm install --omit=dev --ignore-scripts`npm local au projet (pas de scripts de cycle de vie, pas de dépendances de dev au moment de l'exécution), en ignorant les paramètres d'installation npm globaux hérités. Gardez les arbres de dépendances des plugins "pur JS/TS" et évitez les packages qui nécessitent des `postinstall` builds.

Optionnel : `openclaw.setupEntry`OpenClaw peut pointer vers un module de configuration léger uniquement. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry` au lieu de l'entrée complète du plugin. Cela rend le démarrage et la configuration plus légers lorsque votre entrée principale de plugin connecte également des outils, des hooks ou d'autres codes exclusifs à l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
p permettre à un plugin de canal d'opter pour le même chemin `setupEntry` lors de la phase de démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

N'utilisez ceci que lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que l'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont dépend le démarrage, telle que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de la passerine qui doivent exister durant cette même fenêtre

Si votre entrée complète possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le comportement par défaut du plugin et laissez OpenClaw charger l'entrée complète pendant le démarrage.

Les canaux groupés peuvent également publier des assistants de surface de contrat uniquement pour la configuration que le cœur peut consulter avant le chargement complet de l'exécution du canal. La surface actuelle de promotion de configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Le cœur utilise cette surface lorsqu'il doit promouvoir une configuration de canal mono-compte héritée en `channels.<id>.accounts.*` sans charger l'entrée complète du plugin. Matrix est l'exemple groupé actuel : il ne déplace que les clés d'authentification/d'amorçage dans un compte promu nommé lorsque des comptes nommés existent déjà, et il peut préserver une clé de compte par défaut non canonique configurée au lieu de toujours créer `accounts.default`.

Ces adaptateurs de correctifs de configuration gardent la découverte de la surface de contrat groupée paresseuse. Le temps d'importation reste léger ; la surface de promotion est chargée uniquement lors de la première utilisation au lieu de réentrer dans le démarrage du canal groupé lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes RPC de passerine, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration du cœur (RPC`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus étroite.

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

Les plugins de canal peuvent annoncer des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela maintient le catalogue du cœur exempt de données.

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

- `detailLabel` : étiquette secondaire pour des surfaces de catalogue/statut plus riches
- `docsLabel` : remplacer le texte du lien pour le lien vers la documentation
- `preferOver` : identifiants de plugin/channel de priorité inférieure que cette entrée de catalogue devrait surpasser
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras` : contrôles de copie pour la surface de sélection
- `markdownCapable` : marque le channel comme compatible markdown pour les décisions de formatage sortant
- `exposure.configured` : masquer le channel des surfaces de listing des channels configurés lorsqu'il est défini sur `false`
- `exposure.setup` : masquer le channel des sélecteurs de configuration/installation interactifs lorsqu'il est défini sur `false`
- `exposure.docs` : marquer le channel comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : alias hérités toujours acceptés pour la compatibilité ; préférer `exposure`
- `quickstartAllowFrom` : activer le channel dans le flux de démarrage rapide standard `allowFrom`
- `forceAccountBinding` : exiger une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : préférer la recherche de session lors de la résolution des cibles d'annonce

OpenClaw peut également fusionner des **catalogues de channels externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules/points-virgules/`PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. L'analyseur accepte également `"packages"` ou `"plugins"` comme alias hérités pour la clé `"entries"`.

Les entrées de catalogue de channel générées et les entrées de catalogue d'installation de provider exposent des faits normalisés sur la source d'installation à côté du bloc brut `openclaw.install`npmnpm. Les faits normalisés identifient si la spécification npm est une version exacte ou un sélecteur flottant, si les métadonnées d'intégrité attendues sont présentes, et si un chemin source local est également disponible. Lorsque l'identité du catalogue/du package est connue, les faits normalisés avertissent si le nom du package npm analysé dérive de cette identité. Ils avertissent également lorsque `defaultChoice`npmnpm est invalide ou pointe vers une source qui n'est pas disponible, et lorsque des métadonnées d'intégrité npm sont présentes sans une source npm valide. Les consommateurs doivent traiter `installSource` comme un champ optionnel additif afin que les entrées construites à la main et les shims de catalogue n'aient pas à le synthétiser. Cela permet à l'onboarding et aux diagnostics d'expliquer l'état du plan source sans importer le runtime du plugin.

Les entrées externes officielles npm devraient préférer un npm`npmSpec` exact plus `expectedIntegrity`. Les noms de packages nus et les dist-tags fonctionnent toujours pour la compatibilité, mais ils font apparaître des avertissements du plan source afin que le catalogue puisse passer à des installations épinglées et vérifiées par intégrité sans casser les plugins existants. Lors de l'onboarding des installations à partir d'un chemin de catalogue local, il enregistre une entrée d'index de plugin gérée avec `source: "path"` et un `sourcePath` relatif à l'espace de travail lorsque cela est possible. Le chemin de chargement opérationnel absolu reste dans `plugins.load.paths` ; l'enregistrement d'installation évite de dupliquer les chemins de la station de travail locale dans la configuration longue durée. Cela garde les installations de développement locales visibles pour les diagnostics du plan source sans ajouter une seconde surface de divulgation de chemin de système de fichiers brut. L'index de plugin persisté `plugins/installs.json` est la source de vérité de l'installation et peut être actualisé sans charger les modules du runtime du plugin. Sa carte `installRecords` est durable même lorsqu'un manifeste de plugin est manquant ou invalide ; son tableau `plugins` est une vue de manifeste reconstructible.

## Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage et la compactage. Enregistrez-les depuis votre plugin avec `api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec `plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut plutôt que de simplement ajouter une recherche mémoire ou des hooks.

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
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

La fabrique `ctx` expose des valeurs facultatives `config`, `agentDir` et `workspaceDir` pour l'initialisation au moment de la construction.

Si votre moteur ne possède **pas** l'algorithme de compactage, gardez `compact()` implémenté et déléguez-le explicitement :

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
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

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à l'API actuel, ne contournez pas le système de plugin par un accès privé. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le principal doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel, et forme de l'aide à l'exécution.
2. ajouter des surfaces d'enregistrement/exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface utile
   de capacité typée.
3. connecter le principal et les consommateurs channel/fonctionnalité
   Les canaux et les plugins de fonctionnalité devraient consommer la nouvelle capacité via le principal,
   et non en important directement une implémentation de fournisseur.
4. enregistrer les implémentations de fournisseur
   Les plugins de fournisseur enregistrent ensuite leurs backends par rapport à la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites au fil du temps.

C'est ainsi que OpenClaw reste opiniâtre sans devenir codé en dur selon la vision du monde
d'un seul provider. Voir le [Capability Cookbook](/fr/tools/capability-cookbook)
pour une liste de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces ensemble :

- types de contrat principal dans `src/<capability>/types.ts`
- exécuteur principal/aide à l'exécution dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalité/canal doivent le consommer
- helpers de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, c'est généralement un signe que la capacité n'est pas encore entièrement intégrée.

### Modèle de capacité

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

Cela garde la règle simple :

- le cœur possède le contrat de capacité + l'orchestration
- les plugins fournisseur possèdent les implémentations fournisseur
- les plugins de fonctionnalité/canal consomment les helpers d'exécution
- les tests de contrat gardent la propriété explicite

## Connexes

- [Plugin architecture](/fr/plugins/architecture) — model de capacité public et formes
- [Plugin SDK subpaths](/fr/plugins/sdk-subpaths)
- [Plugin SDK setup](/fr/plugins/sdk-setup)
- [Building plugins](/fr/plugins/building-plugins)
