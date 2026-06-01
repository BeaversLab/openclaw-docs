---
summary: "Internes de l'architecture des plugins : pipeline de chargement, registre, hooks d'exécution, routes HTTP et tables de référence"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "Internes de l'architecture des plugins"
---

Pour le modèle de capacité publique, les formes de plugins et les contrats de propriété/exécution, consultez [Plugin architecture](/fr/plugins/architectureGateway). Cette page est la référence pour la mécanique interne : pipeline de chargement, registre, hooks d'exécution, routes HTTP du Gateway, chemins d'importation et tables de schéma.

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
- **Runtime hooks** : plus de 40 hooks optionnels couvrant l'authentification, la résolution de modèle, l'encapsulation de flux, les niveaux de réflexion, la politique de relecture et les points de terminaison d'utilisation. Consultez la liste complète sous [Hook order and usage](#hook-order-and-usage).

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

| #   | Hook                              | Ce qu'il fait                                                                                                                                                                      | Quand utiliser                                                                                                                                                                                         |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `catalog`                         | Publier la config du fournisseur dans `models.providers` lors de la génération `models.json`                                                                                       | Le fournisseur possède un catalogue ou des valeurs par défaut d'URL de base                                                                                                                            |
| 2   | `applyConfigDefaults`             | Appliquer les valeurs par défaut de config globales possédées par le fournisseur lors de la matérialisation de la config                                                           | Les valeurs par défaut dépendent du mode d'auth, de l'env, ou de la sémantique de la famille de modèles du fournisseur                                                                                 |
| --  | _(recherche de modèle intégrée)_  | OpenClaw essaie d'abord le chemin normal du registre/catalogue                                                                                                                     | _(pas un hook de plugin)_                                                                                                                                                                              |
| 3   | `normalizeModelId`                | Normaliser les alias d'ID de modèle hérités ou preview avant la recherche                                                                                                          | Le fournisseur possède le nettoyage des alias avant la résolution du modèle canonique                                                                                                                  |
| 4   | `normalizeTransport`              | Normaliser `api` / `baseUrl` de la famille du fournisseur avant l'assemblage du modèle générique                                                                                   | Le fournisseur possède le nettoyage du transport pour les IDs de fournisseur personnalisés dans la même famille de transport                                                                           |
| 5   | `normalizeConfig`                 | Normaliser `models.providers.<id>` avant la résolution runtime/fournisseur                                                                                                         | Le fournisseur a besoin d'un nettoyage de config qui doit résider avec le plugin ; les aides Google groupées servent également de filet de sécurité pour les entrées de config Google prises en charge |
| 6   | `applyNativeStreamingUsageCompat` | Appliquer les réécritures de compatibilité d'utilisation du streaming natif aux fournisseurs de config                                                                             | Le fournisseur a besoin de correctifs de métadonnées d'utilisation du streaming natif pilotés par le point de terminaison                                                                              |
| 7   | `resolveConfigApiKey`             | Résoudre l'auth par marqueur d'env pour les fournisseurs de config avant le chargement de l'auth runtime                                                                           | Les providers exposent leurs propres hooks de résolution de clé API env-marker                                                                                                                         |
| 8   | `resolveSyntheticAuth`            | Exposer l'auth locale/auto-hébergée ou basée sur la config sans persister le texte en clair                                                                                        | Le fournisseur peut fonctionner avec un marqueur d'identification synthétique/local                                                                                                                    |
| 9   | `resolveExternalAuthProfiles`     | Superposition des profils d'authentification externe détenus par le provider ; par défaut, `persistence` est `runtime-only` pour les identifiants détenus par la CLI/l'application | Le provider réutilise les identifiants d'authentification externe sans conserver les jetons d'actualisation copiés ; déclarer `contracts.externalAuthProviders` dans le manifeste                      |
| 10  | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil synthétiques stockés derrière une authentification soutenue par env/config                                                                 | Le provider stocke des profils synthétiques espaces réservés qui ne doivent pas primer                                                                                                                 |
| 11  | `resolveDynamicModel`             | Synchronisation de secours pour les ids de modèle appartenant au provider qui ne sont pas encore dans le registre local                                                            | Le provider accepte des ids de modèle en amont arbitraires                                                                                                                                             |
| 12  | `prepareDynamicModel`             | Préchauffage asynchrone, puis `resolveDynamicModel` s'exécute à nouveau                                                                                                            | Le provider a besoin de métadonnées réseau avant de résoudre les ids inconnus                                                                                                                          |
| 13  | `normalizeResolvedModel`          | Réécriture finale avant que l'exécuteur intégré n'utilise le modèle résolu                                                                                                         | Le provider a besoin de réécritures de transport mais utilise toujours un transport principal                                                                                                          |
| 14  | `normalizeToolSchemas`            | Normaliser les schémas de tool avant que le runner intégré ne les voie                                                                                                             | Le provider a besoin d'un nettoyage de schéma de la famille de transport                                                                                                                               |
| 15  | `inspectToolSchemas`              | Présenter les diagnostics de schéma possédés par le provider après normalisation                                                                                                   | Le provider souhaite des avertissements de mots-clés sans enseigner de règles spécifiques au provider au cœur                                                                                          |
| 16  | `resolveReasoningOutputMode`      | Sélectionner le contrat de sortie de raisonnement natif ou balisé                                                                                                                  | Le provider a besoin d'une sortie de raisonnement/finale balisée au lieu des champs natifs                                                                                                             |
| 17  | `prepareExtraParams`              | Normalisation des paramètres de requête avant les wrappers génériques d'options de flux                                                                                            | Le fournisseur a besoin de paramètres de requête par défaut ou d'un nettoyage de paramètres par fournisseur                                                                                            |
| 18  | `createStreamFn`                  | Remplacer entièrement le chemin de flux normal par un transport personnalisé                                                                                                       | Le fournisseur a besoin d'un protocole filaire personnalisé, et pas seulement d'un wrapper                                                                                                             |
| 20  | `wrapStreamFn`                    | Wrapper de flux après l'application des wrappers génériques                                                                                                                        | Le fournisseur a besoin de wrappers de compatibilité pour les en-têtes/corps/modèles de requête sans transport personnalisé                                                                            |
| 21  | `resolveTransportTurnState`       | Attacher les en-têtes ou métadonnées de transport natifs par tour                                                                                                                  | Le fournisseur souhaite que les transports génériques envoient l'identité de tour native du fournisseur                                                                                                |
| 22  | `resolveWebSocketSessionPolicy`   | Attacher les en-têtes WebSocket natifs ou la politique de refroidissement de session                                                                                               | Le fournisseur souhaite que les transports WS génériques ajustent les en-têtes de session ou la politique de repli                                                                                     |
| 23  | `formatApiKey`                    | Formateur de profil d'authentification : le profil stocké devient la chaîne `apiKey` d'exécution                                                                                   | Le provider stocke des métadonnées d'auth supplémentaires et a besoin d'une forme personnalisée de jeton d'exécution                                                                                   |
| 24  | `refreshOAuth`                    | Surcharge de rafraîchissement OAuth pour les points de terminaison de rafraîchissement personnalisés ou la stratégie d'échec de rafraîchissement                                   | Le provider ne correspond pas aux actualiseurs partagés d'OpenClaw                                                                                                                                     |
| 25  | `buildAuthDoctorHint`             | Indice de réparation ajouté lorsque le rafraîchissement OAuth échoue                                                                                                               | Le provider a besoin de directives de réparation d'auth appartenant au provider après un échec de rafraîchissement                                                                                     |
| 26  | `matchesContextOverflowError`     | Correspondance de dépassement de fenêtre de contexte appartenant au provider                                                                                                       | Le provider a des erreurs brutes de dépassement que les heuristiques génériques manqueraient                                                                                                           |
| 27  | `classifyFailoverReason`          | Classification des raisons de basculement appartenant au provider                                                                                                                  | Le provider peut mapper les erreurs brutes API/transport aux limites de taux/surcharges/etc.                                                                                                           |
| 28  | `isCacheTtlEligible`              | Stratégie de cache de prompt pour les providers proxy/backhaul                                                                                                                     | Le provider a besoin d'une limitation de TTL de cache spécifique au proxy                                                                                                                              |
| 29  | `buildMissingAuthMessage`         | Remplacement du message générique de récupération d'auth manquante                                                                                                                 | Le fournisseur a besoin d'une indication de récupération d'auth manquante spécifique au fournisseur                                                                                                    |
| 30  | `augmentModelCatalog`             | Lignes de catalogue synthétiques/finales ajoutées après la découverte                                                                                                              | Le provider a besoin de lignes de rétrocompatibilité synthétiques dans `models list` et les sélecteurs                                                                                                 |
| 31  | `resolveThinkingProfile`          | Définition du niveau `/think` spécifique au model, étiquettes d'affichage et valeur par défaut                                                                                     | Le provider expose une échelle de réflexion personnalisée ou une étiquette binaire pour les modèles sélectionnés                                                                                       |
| 32  | `isBinaryThinking`                | Hook de compatibilité avec le bouton de raisonnement marche/arrêt                                                                                                                  | Le provider expose uniquement une réflexion binaire marche/arrêt                                                                                                                                       |
| 33  | `supportsXHighThinking`           | Hook de compatibilité du support de raisonnement `xhigh`                                                                                                                           | Le provider souhaite `xhigh` uniquement sur un sous-ensemble de modèles                                                                                                                                |
| 34  | `resolveDefaultThinkingLevel`     | Hook de compatibilité du niveau `/think` par défaut                                                                                                                                | Le provider définit la stratégie par défaut de `/think` pour une famille de modèles                                                                                                                    |
| 35  | `isModernModelRef`                | Correspondance de modèle moderne pour les filtres de profil en direct et la sélection smoke                                                                                        | Le provider gère la correspondance du modèle préféré live/smoke                                                                                                                                        |
| 36  | `prepareRuntimeAuth`              | Échanger une information d'identification configurée contre le jeton/clé de runtime réel juste avant l'inférence                                                                   | Le provider a besoin d'un échange de jetons ou d'une information d'identification de demande à courte durée de vie                                                                                     |
| 37  | `resolveUsageAuth`                | Résoudre les informations d'identification d'utilisation/facturation pour `/usage` et les surfaces d'état associées                                                                | Le provider nécessite une analyse personnalisée des jetons d'utilisation/quota ou une information d'identification d'utilisation différente                                                            |
| 38  | `fetchUsageSnapshot`              | Récupérer et normaliser les instantanés d'utilisation/quota spécifiques au provider après résolution de l'authentification                                                         | Le provider nécessite un point de terminaison d'utilisation spécifique au provider ou un analyseur de payload                                                                                          |
| 39  | `createEmbeddingProvider`         | Construire un adaptateur d'embedding appartenant au provider pour la mémoire/recherche                                                                                             | Le comportement d'embedding mémoire appartient au plugin provider                                                                                                                                      |
| 40  | `buildReplayPolicy`               | Renvoyer une stratégie de relecture contrôlant la gestion des transcriptions pour le provider                                                                                      | Le provider nécessite une stratégie de transcription personnalisée (par exemple, suppression des blocs de réflexion)                                                                                   |
| 41  | `sanitizeReplayHistory`           | Réécrire l'historique de relecture après le nettoyage générique de la transcription                                                                                                | Le provider nécessite des réécritures de relecture spécifiques au provider au-delà des helpers de compactage partagés                                                                                  |
| 42  | `validateReplayTurns`             | Validation finale ou remodelage du tour de relecture avant le runner intégré                                                                                                       | Le transport du provider nécessite une validation plus stricte des tours après la sanitation générique                                                                                                 |
| 43  | `onModelSelected`                 | Exécuter les effets secondaires après sélection appartenant au provider                                                                                                            | Le provider a besoin de la télémétrie ou d'un état appartenant au provider lorsqu'un modèle devient actif                                                                                              |

`normalizeModelId`, `normalizeTransport`, et `normalizeConfig` vérifient d'abord le
plugin provider correspondant, puis passent aux autres plugins provider capables de hooks
jusqu'à ce que l'un d'eux modifie réellement l'id du modèle ou le transport/la config. Cela permet
de garder les shims de provider d'alias/compatibilité fonctionnels sans que l'appelant ait besoin de savoir quel
plugin fourni possède la réécriture. Si aucun hook de provider ne réécrit une entrée de configuration
de la famille Google prise en charge, le normaliseur de configuration Google fourni applique toujours
ce nettoyage de compatibilité.

Si le provider a besoin d'un protocole filaire entièrement personnalisé ou d'un exécuteur de requête personnalisé,
c'est une classe d'extension différente. Ces hooks sont destinés au comportement du provider
qui s'exécute toujours sur la boucle d'inférence normale d'OpenClaw.

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

Les plugins provider fournis combinent les hooks ci-dessus pour s'adapter au catalogue, à l'auth,
à la réflexion (thinking), au rejeu et aux besoins d'utilisation de chaque fournisseur. L'ensemble de hooks faisant autorité
réside avec chaque plugin sous `extensions/` ; cette page illustre les formes plutôt que
de refléter la liste.

<AccordionGroup>
  <Accordion title="Pass-through catalog providers">OpenRouter, Kilocode, Z.AI, xAI enregistrent `catalog` ainsi que `resolveDynamicModel` / `prepareDynamicModel` afin qu'ils puissent afficher les ids de modèle en amont avant le catalogue statique d'OpenClaw.</Accordion>
  <Accordion title="OAuthFournisseurs de point de terminaison OAuth et d'utilisation">GitHub Copilot, Gemini CLI, ChatGPT Codex, MiniMax, Xiaomi, z.ai associent `prepareRuntimeAuth` ou `formatApiKey` à `resolveUsageAuth` + `fetchUsageSnapshot` pour gérer l'échange de jetons et l'intégration `/usage`.</Accordion>
  <Accordion title="Familles de relecture et de nettoyage des transcriptions">Des familles nommées partagées (`google-gemini`, `passthrough-gemini`, `anthropic-by-model`, `hybrid-anthropic-openai`) permettent aux providers d'opter pour la stratégie de transcription via `buildReplayPolicy` au lieu que chaque plugin ne réimplémente le nettoyage.</Accordion>
  <Accordion title="Providers de catalogue uniquement">`byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`, `vercel-ai-gateway` et `volcengine` n'enregistrent que `catalog` et utilisent la boucle d'inférence partagée.</Accordion>
  <Accordion title="Assistants de flux spécifiques à Anthropic">Les en-têtes bêta, `/fast` / `serviceTier`, et `context1m` résident dans la couture publique `api.ts` / `contract-api.ts` du plugin Anthropic (`wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`) plutôt que dans le SDK générique.</Accordion>
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

- `textToSpeech` renvoie la charge utile de sortie TTS principale normale pour les surfaces de fichiers/notes vocales.
- Utilise la configuration principale `messages.tts` et la sélection du provider.
- Renvoie un tampon audio PCM + un taux d'échantillonnage. Les plugins doivent rééchantillonner/encoder pour les providers.
- `listVoices` est optionnel pour chaque provider. Utilisez-le pour les sélecteurs de voix ou les flux de configuration détenus par le fournisseur.
- Les listes de voix peuvent inclure des métadonnées plus riches telles que les paramètres régionaux, le genre et les balises de personnalité pour les sélecteurs conscients du provider.
- OpenAI et ElevenLabs prennent en charge la téléphonie aujourd'hui. Microsoft ne le fait pas.

Les plugins peuvent également enregistrer des fournisseurs de reconnaissance vocale via `api.registerSpeechProvider(...)`.

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

Notes :

- Conservez la stratégie TTS, le repli et la livraison des réponses dans le cœur.
- Utilisez les fournisseurs de reconnaissance vocale pour le comportement de synthèse propriétaire au fournisseur.
- L'entrée Microsoft `edge` héritée est normalisée vers l'ID de fournisseur `microsoft`.
- Le modèle de propriété privilégié est orienté entreprise : un plugin fournisseur peut posséder des fournisseurs de texte, de parole, d'image et de médias futurs, à mesure que OpenClaw ajoute ces contrats de capacité.

Pour la compréhension d'image/audio/vidéo, les plugins enregistrent un seul fournisseur de compréhension de média typé au lieu d'un sac générique de clé/valeur :

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

- Conservez l'orchestration, le repli, la configuration et le câblage des canaux dans le cœur.
- Conservez le comportement du fournisseur dans le plugin de fournisseur.
- L'expansion additive doit rester typée : nouvelles méthodes optionnelles, nouveaux champs de résultat optionnels, nouvelles capacités optionnelles.
- La génération vidéo suit déjà le même modèle :
  - le cœur possède le contrat de capacité et le helper d'exécution
  - les plugins fournisseurs enregistrent `api.registerVideoGenerationProvider(...)`
  - les plugins de fonctionnalité/canal consomment `api.runtime.videoGeneration.*`

Pour les helpers d'exécution de compréhension de média, les plugins peuvent appeler :

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

const extraction = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
  provider: "codex",
  model: "gpt-5.5",
  input: [
    {
      type: "image",
      buffer: receiptImageBuffer,
      fileName: "receipt.png",
      mime: "image/png",
    },
    { type: "text", text: "Use the printed fields as the source of truth." },
  ],
  instructions: "Return entities and searchable tags.",
  schemaName: "example.evidence",
  jsonSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
  },
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

- `api.runtime.mediaUnderstanding.*` est la surface partagée privilégiée pour la compréhension d'image/audio/vidéo.
- `extractStructuredWithModel(...)` est la seam orientée plugin pour l'extraction d'abord image bornée et propriétaire du fournisseur. Incluez au moins une entrée d'image ; les entrées de texte sont un contexte supplémentaire. Les plugins produit possèdent leurs routes et schémas tandis que OpenClaw possède la frontière fournisseur/exécution.
- Utilise la configuration audio de compréhension de média du cœur (`tools.media.audio`) et l'ordre de repli du fournisseur.
- Renvoie `{ text: undefined }` lorsqu'aucune sortie de transcription n'est produite (par exemple, entrée ignorée/non prise en charge).
- `api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité.

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

- `provider` et `model` sont des redéfinitions optionnelles par exécution, et non des modifications persistantes de la session.
- OpenClaw honore uniquement ces champs de redéfinition pour les appelants de confiance.
- Pour les exécutions de repli appartenant au plugin, les opérateurs doivent opter pour `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Utilisez `plugins.entries.<id>.subagent.allowedModels` pour restreindre les plugins de confiance à des `provider/model` cibles canoniques spécifiques, ou `"*"` pour autoriser explicitement n'importe quelle cible.
- Les exécutions de sous-agents de plug-ins non approuvés fonctionnent toujours, mais les demandes de redéfinition sont rejetées au lieu de revenir silencieusement.
- Les sessions de sous-agents créées par des plugins sont étiquetées avec l'identifiant du plugin créateur. Le repli `api.runtime.subagent.deleteSession(...)` ne peut supprimer que ces sessions appartenant au propriétaire ; la suppression arbitraire de sessions nécessite toujours une requête Gateway de portée administrateur.

Pour la recherche web, les plugins peuvent utiliser le helper d'exécution partagé au lieu d'interférer avec le câblage de l'outil de l'agent :

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

- Conservez la sélection du provider, la résolution des informations d'identification et la sémantique des requêtes partagées dans le cœur.
- Utilisez des providers de recherche web pour les transports de recherche spécifiques aux fournisseurs.
- `api.runtime.webSearch.*` est la surface partagée préférée pour les plugins de fonctionnalité/canal qui ont besoin d'un comportement de recherche sans dépendre du wrapper d'outil de l'agent.

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

- `path` : chemin de route sous le serveur HTTP du .
- `auth` : requis. Utilisez `"gateway"` pour exiger l'authentification normale du , ou `"plugin"` pour l'authentification gérée par le plugin / la vérification du webhook.
- `match` : optionnel. `"exact"` (par défaut) ou `"prefix"`.
- `replaceExisting` : facultatif. Permet au même plugin de remplacer son propre enregistrement de route existant.
- `handler` : renvoie `true` lorsque la route a géré la requête.

Notes :

- `api.registerHttpHandler(...)` a été supprimé et provoquera une erreur de chargement de plugin. Utilisez `api.registerHttpRoute(...)` à la place.
- Les routes de plugin doivent déclarer `auth` explicitement.
- Les conflits exacts de `path + match` sont rejetés, sauf si `replaceExisting: true`, et un plugin ne peut pas remplacer la route d'un autre plugin.
- Les routes qui se chevauchent avec des niveaux `auth` différents sont rejetées. Gardez les chaînes de repli `exact`/`prefix` uniquement sur le même niveau d'authentification.
- Les routes `auth: "plugin"` ne reçoivent **pas** automatiquement les scopes d'exécution de l'opérateur. Elles sont destinées aux webhooks gérés par le plugin/vérification de signature, et non aux appels aux helpers privilégiés du Gateway.
- Les routes `auth: "gateway"` s'exécutent dans un scope d'exécution de requête du Gateway, mais ce scope est intentionnellement conservateur :
  - l'authentification bearer par secret partagé (`gateway.auth.mode = "token"` / `"password"`) maintient les scopes d'exécution des routes de plugin liés à `operator.write`, même si l'appelant envoie `x-openclaw-scopes`
  - les modes HTTP porteurs d'identité de confiance (par exemple `trusted-proxy` ou `gateway.auth.mode = "none"` sur une entrée privée) honorent `x-openclaw-scopes` uniquement lorsque l'en-tête est explicitement présent
  - si `x-openclaw-scopes` est absent lors de ces requêtes de route de plugin porteuses d'identité, le scope d'exécution revient à `operator.write`
- Règle pratique : ne supposez pas qu'une route de plugin authentifiée par la passerelle est une surface d'administration implicite. Si votre route nécessite un comportement réservé aux administrateurs, exigez un mode d'authentification porteur d'identité et documentez le contrat explicite de l'en-tête `x-openclaw-scopes`.

## Chemins d'import du SDK de plugin

Utilisez des sous-chemins SDK étroits au lieu du module racine monolithique `openclaw/plugin-sdk` lors de la création de nouveaux plugins. Sous-chemins principaux :

| Sous-chemin                         | Objectif                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | Primitives d'enregistrement de plugins               |
| `openclaw/plugin-sdk/channel-core`  | Assistants d'entrée/construction de channel          |
| `openclaw/plugin-sdk/core`          | Assistants partagés génériques et contrat parapluie  |
| `openclaw/plugin-sdk/config-schema` | Schéma Zod racine `openclaw.json` (`OpenClawSchema`) |

Les plugins de channel choisissent parmi une famille de jointures étroites — `channel-setup`,
`setup-runtime`, `setup-tools`, `channel-pairing`,
`channel-contract`, `channel-feedback`, `channel-inbound`, `channel-outbound`,
`command-auth`, `secret-input`, `webhook-ingress`,
`channel-targets` et `channel-actions`. Le comportement d'approbation doit être consolidé
sur un seul contrat `approvalCapability` plutôt que mélangé entre des champs de
plugins non liés. Voir [Channel plugins](/fr/plugins/sdk-channel-plugins).

Les assistants d'exécution et de configuration résident sous des sous-chemins focalisés `*-runtime` correspondants
(`approval-runtime`, `agent-runtime`, `lazy-runtime`, `directory-runtime`,
`text-runtime`, `runtime-store`, `system-event-runtime`, `heartbeat-runtime`,
`channel-activity-runtime`, etc.). Préférez `config-contracts`,
`plugin-config-runtime`, `runtime-config-snapshot` et `config-mutation`
plutôt que le barrel de compatibilité large `config-runtime`.

<Info>
  `openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/channel-lifecycle`, les petites façades d'assistant de channel, `openclaw/plugin-sdk/outbound-runtime`, `openclaw/plugin-sdk/outbound-send-deps`, `openclaw/plugin-sdk/config-runtime` et `openclaw/plugin-sdk/infra-runtime` sont des shims de compatibilité obsolètes pour les anciens plugins. Le nouveau code devrait plutôt importer des
  primitives génériques plus étroites.
</Info>

Points d'entrée internes au dépôt (par racine de package de plugin groupé) :

- `index.js` — entrée du plugin groupé
- `api.js` — barrel d'aides/types
- `runtime-api.js` — barrel d'exécution uniquement
- `setup-entry.js` — point d'entrée du plugin de configuration

Les plugins externes doivent uniquement importer des sous-chemins `openclaw/plugin-sdk/*`. N'importez jamais le `src/*` d'un autre package de plugin depuis le cœur ou depuis un autre plugin.
Les points d'entrée chargés par la façade préfèrent l'instantané de configuration d'exécution active lorsqu'il en existe un, puis reviennent au fichier de configuration résolu sur le disque.

Les sous-chemins spécifiques aux capacités tels que `image-generation`, `media-understanding`,
et `speech` existent car les plugins groupés les utilisent aujourd'hui. Ils ne constituent pas automatiquement des contrats externes figés à long terme — consultez la page de référence pertinente du SDK lorsque vous vous y fiez.

## Schémas d'outils de message

Les plugins doivent posséder des contributions de schéma `describeMessageTool(...)` spécifiques au channel pour les primitives non message telles que les réactions, les lectures et les sondages.
La présentation d'envoi partagée doit utiliser le contrat générique `MessagePresentation` au lieu des champs de bouton, de composant, de bloc ou de carte natifs du provider.
Voir [Message Presentation](/fr/plugins/message-presentation) pour le contrat,
les règles de repli, le mappage du provider et la liste de contrôle pour les auteurs de plugins.

Les plugins capables d'envoi déclarent ce qu'ils peuvent restituer via les capacités de message :

- `presentation` pour les blocs de présentation sémantique (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` pour les demandes de livraison épinglée

Le cœur décide s'il faut restituer la présentation en mode natif ou la dégrader en texte.
N'exposez pas de voies d'échec d'interface utilisateur natives du provider à partir de l'outil de message générique.
Les aides SDK déconseillées pour les schémas natifs hérités restent exportées pour les plugins tiers existants, mais les nouveaux plugins ne doivent pas les utiliser.

## Résolution de la cible du channel

Les plugins de channel doivent posséder la sémantique de cible spécifique au channel. Gardez l'hôte sortant partagé générique et utilisez la surface de l'adaptateur de messagerie pour les règles du provider :

- `messaging.inferTargetChatType({ to })` détermine si une cible normalisée
  doit être traitée comme `direct`, `group`, ou `channel` avant la recherche dans le répertoire.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indique au cœur (core) si une
  entrée doit passer directement à la résolution de type identifiant au lieu de la recherche dans le répertoire.
- `messaging.targetResolver.resolveTarget(...)` est le repli du plugin lorsque
  le cœur a besoin d'une résolution finale appartenant au fournisseur après normalisation ou après un
  échec de recherche dans le répertoire.
- `messaging.resolveOutboundSessionRoute(...)` gère la construction de routes de
  session spécifiques au fournisseur une fois la cible résolue.

Répartition recommandée :

- Utilisez `inferTargetChatType` pour les décisions de catégorie qui doivent avoir lieu avant
  la recherche de pairs/groupes.
- Utilisez `looksLikeId` pour les vérifications de type "traiter ceci comme un identifiant de cible explicite/native".
- Utilisez `resolveTarget` pour le repli de normalisation spécifique au fournisseur, et non pour
  une recherche large dans le répertoire.
- Conservez les identifiants natifs du fournisseur tels que les identifiants de chat, de fil de discussion, JIDs, identifiants (handles) et identifiants de salle
  à l'intérieur des valeurs `target` ou des paramètres spécifiques au fournisseur, et non dans les champs génériques du SDK.

## Répertoires basés sur la configuration

Les plugins qui dérivent des entrées de répertoire à partir de la configuration doivent conserver cette logique dans le
plugin et réutiliser les assistants partagés de
`openclaw/plugin-sdk/directory-runtime`.

Utilisez ceci lorsqu'un channel a besoin de pairs/groupes basés sur la configuration, tels que :

- pairs en DM basés sur une liste d'autorisation (allowlist)
- cartes de channels/groupes configurés
- replis de répertoire statique délimités au compte

Les assistants partagés dans `directory-runtime` ne gèrent que les opérations génériques :

- filtrage des requêtes
- application des limites
- assistants de déduplication/normalisation
- construction de `ChannelDirectoryEntry[]`

L'inspection de compte spécifique au channel et la normalisation des identifiants doivent rester dans l'
implémentation du plugin.

## Catalogues de fournisseurs

Les plugins de fournisseur peuvent définir des catalogues de modèles pour l'inférence avec
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` renvoie la même forme que OpenClaw écrit dans
`models.providers` :

- `{ provider }` pour une entrée de fournisseur
- `{ providers }` pour plusieurs entrées de fournisseur

Utilisez `catalog` lorsque le plugin possède des identifiants de modèle spécifiques au provider, des URL de base par défaut ou des métadonnées de modèle protégées par authentification.

`catalog.order` contrôle le moment où le catalogue d'un plugin fusionne par rapport aux providers implicites intégrés d'OpenClaw :

- `simple` : providers basés sur une clé API simple ou pilotés par des variables d'environnement
- `profile` : providers qui apparaissent lorsque des profils d'authentification existent
- `paired` : providers qui synthétisent plusieurs entrées de provider liées
- `late` : dernière passe, après les autres providers implicites

Les providers ultérieurs prévalent en cas de collision de clé, les plugins peuvent donc remplacer intentionnellement une entrée de provider intégrée avec le même identifiant de provider.

Les plugins peuvent également publier des lignes de modèle en lecture seule via `api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog })`. C'est le chemin direct pour les surfaces de liste/aide/sélection et prend en charge les lignes `text`, `image_generation`, `video_generation` et `music_generation`. Les plugins de provider possèdent toujours les appels de point de terminaison en direct, l'échange de jetons et le mappage des réponses du fournisseur ; le cœur possède la forme de ligne commune, les étiquettes de source et le formatage de l'aide des outils média. Les inscriptions de provider de génération de média synthétisent automatiquement des lignes de catalogue statique à partir de `defaultModel`, `models` et `capabilities`.

Compatibilité :

- `discovery` fonctionne toujours comme un alias hérité, mais émet un avertissement de dépréciation
- si `catalog` et `discovery` sont tous deux enregistrés, OpenClaw utilise `catalog`
- `augmentModelCatalog` est déprécié ; les providers groupés doivent publier des lignes supplémentaires via `registerModelCatalogProvider`

## Inspection de canal en lecture seule

Si votre plugin enregistre un canal, privilégiez l'implémentation de `plugin.config.inspectAccount(cfg, accountId)` ainsi que `resolveAccount(...)`.

Pourquoi :

- `resolveAccount(...)` est le chemin d'exécution. Il est supposé que les informations d'identification sont entièrement matérialisées et peut échouer rapidement lorsque les secrets requis sont manquants.
- Les chemins de commande en lecture seule tels que `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, et les flux de réparation
  doctor/config ne devraient pas avoir besoin de matérialiser les identifiants d'exécution juste pour
  décrire la configuration.

Comportement recommandé pour `inspectAccount(...)` :

- Ne renvoyer que l'état descriptif du compte.
- Préserver `enabled` et `configured`.
- Inclure les champs de source/statut des identifiants lorsque cela est pertinent, tels que :
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- Vous n'avez pas besoin de renvoyer les valeurs brutes des jetons juste pour signaler la disponibilité
  en lecture seule. Renvoyer `tokenStatus: "available"` (et le champ source correspondant)
  suffit pour les commandes de type statut.
- Utilisez `configured_unavailable` lorsqu'un identifiant est configuré via SecretRef mais
  indisponible dans le chemin de commande actuel.

Cela permet aux commandes en lecture seule de signaler "configuré mais indisponible dans ce chemin de commande"
au lieu de planter ou de signaler incorrectement que le compte n'est pas configuré.

## Packs de paquets

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

Si votre plugin importe des dépendances npm, installez-les dans ce répertoire afin que
npm`node_modules` soit disponible (`npm install` / `pnpm install`).

Garde-fou de sécurité : chaque entrée `openclaw.extensions` doit rester à l'intérieur du répertoire du plugin
après résolution des liens symboliques. Les entrées qui s'échappent du répertoire du paquet sont
rejetées.

Remarque de sécurité : `openclaw plugins install` installe les dépendances du plugin avec un `npm install --omit=dev --ignore-scripts` local au projet (pas de scripts de cycle de vie, pas de dépendances de développement à l'exécution), en ignorant les paramètres d'installation globaux hérités de npm. Gardez les arbres de dépendances des plugins « pure JS/TS » et évitez les packages qui nécessitent des `postinstall`.

Optionnel : `openclaw.setupEntry` peut pointer vers un module léger dédié à la configuration. Lorsque OpenClaw a besoin de surfaces de configuration pour un plugin de canal désactivé, ou lorsqu'un plugin de canal est activé mais toujours non configuré, il charge `setupEntry` au lieu du point d'entrée complet du plugin. Cela allège le démarrage et la configuration lorsque votre point d'entrée principal connecte également des outils, des hooks ou d'autres codes spécifiques à l'exécution.

Optionnel : `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` peut permettre à un plugin de canal d'emprunter le même chemin `setupEntry` durant la phase de démarrage pré-écoute de la passerelle, même lorsque le canal est déjà configuré.

Utilisez ceci uniquement lorsque `setupEntry` couvre entièrement la surface de démarrage qui doit exister avant que la passerelle ne commence à écouter. En pratique, cela signifie que le point d'entrée de configuration doit enregistrer chaque capacité détenue par le canal dont le démarrage dépend, telle que :

- l'enregistrement du canal lui-même
- toutes les routes HTTP qui doivent être disponibles avant que la passerelle ne commence à écouter
- toutes les méthodes, outils ou services de passerelle qui doivent exister durant cette même fenêtre

Si votre point d'entrée complet possède toujours une capacité de démarrage requise, n'activez pas ce drapeau. Conservez le comportement par défaut du plugin et laissez OpenClaw charger le point d'entrée complet lors du démarrage.

Les canaux groupés peuvent également publier des assistants de surface de contrat de configuration uniquement que le cœur peut consulter avant le chargement complet de l'exécution du canal. La surface actuelle de promotion de la configuration est :

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Le cœur utilise cette surface lorsqu'il doit promouvoir une configuration de canal héritée à compte unique en `channels.<id>.accounts.*` sans charger l'entrée complète du plugin. Matrix est l'exemple actuel fourni : il ne déplace que les clés d'authentification/d'amorçage dans un compte promu nommé lorsque des comptes nommés existent déjà, et il peut préserver une clé de compte par défaut configurée non canonique au lieu de toujours créer `accounts.default`.

Ces adaptateurs de correctif de configuration maintiennent la découverte de la surface de contrat fournie en différé. Le temps d'importation reste léger ; la surface de promotion n'est chargée qu'à la première utilisation au lieu de ré-entrer dans le démarrage du canal fourni lors de l'importation du module.

Lorsque ces surfaces de démarrage incluent des méthodes RPC de passerelle, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration du cœur (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus restreinte.

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

Les plugins de canal peuvent publier des métadonnées de configuration/découverte via `openclaw.channel` et des indices d'installation via `openclaw.install`. Cela permet de garder le cœur du catalogue sans données.

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

- `detailLabel` : étiquette secondaire pour des surfaces de catalogue/état plus riches
- `docsLabel` : remplacer le texte du lien pour le lien vers la documentation
- `preferOver` : identifiants de plugin/canal de priorité inférieure que cette entrée de catalogue devrait surpasser
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras` : contrôles de copie pour la surface de sélection
- `markdownCapable` : marque le canal comme compatible markdown pour les décisions de formatage sortant
- `exposure.configured` : masque le canal des surfaces de liste des canaux configurés lorsqu'il est défini sur `false`
- `exposure.setup` : masque le canal des sélecteurs de configuration/Installation interactifs lorsqu'il est défini sur `false`
- `exposure.docs` : marquer le canal comme interne/privé pour les surfaces de navigation de la documentation
- `showConfigured` / `showInSetup` : alias hérités toujours acceptés pour la compatibilité ; préférer `exposure`
- `quickstartAllowFrom` : activer le canal pour le flux de démarrage rapide standard `allowFrom`
- `forceAccountBinding` : exiger une liaison de compte explicite même lorsqu'un seul compte existe
- `preferSessionLookupForAnnounceTarget` : préférer la recherche de session lors de la résolution des cibles d'annonce

OpenClaw peut également fusionner des **catalogues de canaux externes** (par exemple, un export de registre MPM). Déposez un fichier JSON à l'un des emplacements suivants :

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Ou pointez `OPENCLAW_PLUGIN_CATALOG_PATHS` (ou `OPENCLAW_MPM_CATALOG_PATHS`) vers
un ou plusieurs fichiers JSON (délimités par des virgules, des points-virgules ou `PATH`). Chaque fichier doit
contenir `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. L'analyseur accepte également `"packages"` ou `"plugins"` comme alias hérités pour la clé `"entries"`.

Les entrées de catalogue de canaux générées et les entrées de catalogue d'installation de fournisseurs exposent
des faits normalisés sur la source d'installation à côté du bloc brut `openclaw.install`. Les
faits normalisés identifient si la spécification npm est une version exacte ou un
sélecteur flottant, si les métadonnées d'intégrité attendues sont présentes, et si un chemin de
source local est également disponible. Lorsque l'identité du catalogue/du package est connue, les
faits normalisés avertissent si le nom du package npm analysé dérive de cette identité.
Ils avertissent également lorsque `defaultChoice` est invalide ou pointe vers une source qui n'est
pas disponible, et lorsque des métadonnées d'intégrité npm sont présentes sans une source npm
valide. Les consommateurs doivent traiter `installSource` comme un champ optionnel additif afin que
les entrées créées manuellement et les shims de catalogue n'aient pas à le synthétiser.
Cela permet à l'intégration et aux diagnostics d'expliquer l'état du plan source sans
importer le runtime du plugin.

Les entrées externes officielles de npm devraient préférer une exactitude `npmSpec` plus
`expectedIntegrity`. Les noms de packages nus et les dist-tags fonctionnent toujours pour
la compatibilité, mais ils déclenchent des avertissements du plan source afin que le catalogue puisse passer
à des installations épinglées et vérifiées par intégrité sans briser les plugins existants.
Lors de l'onboarding des installations à partir d'un chemin de catalogue local, il enregistre une entrée d'index de
plugin géré avec `source: "path"` et un chemin relatif à l'espace de travail
`sourcePath` lorsque cela est possible. Le chemin de chargement opérationnel absolu reste dans
`plugins.load.paths` ; l'enregistrement d'installation évite de dupliquer les chemins de la station de travail locale
dans la configuration longue durée. Cela permet de garder les installations de développement locales visibles pour
les diagnostics du plan source sans ajouter une deuxième surface de divulgation de chemin de système de fichiers brut.
L'index de plugin `plugins/installs.json` persisté est la source de vérité de l'installation
et peut être actualisé sans charger les modules d'exécution du plugin.
Sa carte `installRecords` est durable même lorsqu'un manifeste de plugin est manquant ou
invalide ; son tableau `plugins` est une vue de manifeste reconstructible.

## Plugins de moteur de contexte

Les plugins de moteur de contexte possèdent l'orchestration du contexte de session pour l'ingestion, l'assemblage
et la compactage. Enregistrez-les depuis votre plugin avec
`api.registerContextEngine(id, factory)`, puis sélectionnez le moteur actif avec
`plugins.slots.contextEngine`.

Utilisez ceci lorsque votre plugin doit remplacer ou étendre le pipeline de contexte par défaut
plutôt que de simplement ajouter une recherche dans la mémoire ou des crochets (hooks).

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

La fabrique `ctx` expose des valeurs `config`, `agentDir` et `workspaceDir`
optionnelles pour l'initialisation au moment de la construction.

`assemble()` peut renvoyer `contextProjection` lorsque le harnais actif possède
un thread backend persistant. Omettez-le pour une projection héritée par tour. Renvoyez
`{ mode: "thread_bootstrap", epoch }` lorsque le contexte assemblé doit être
injecté une fois dans un thread backend et réutilisé jusqu'à ce que l'époque change. Changez
l'époque après que le contexte sémantique du moteur a changé, par exemple après une
passe de compactage appartenant au moteur. Les hôtes peuvent préserver les métadonnées d'appel d'outil, la
forme d'entrée et les résultats d'outil expurgés dans une projection d'amorçage de thread afin que les threads
backend frais conservent la continuité de l'outil sans copier de charges utiles brutes portant des secrets.

Si votre moteur ne possède **pas** l'algorithme de compactage, gardez `compact()`
implémenté et déléguez-le explicitement :

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

Lorsqu'un plugin a besoin d'un comportement qui ne correspond pas à l'API actuelle, ne contournez pas
le système de plugin avec une intervention privée. Ajoutez la capacité manquante.

Séquence recommandée :

1. définir le contrat principal
   Décidez du comportement partagé que le principal doit posséder : stratégie, repli, fusion de configuration,
   cycle de vie, sémantique orientée channel, et forme de l'aide à l'exécution.
2. ajouter des surfaces d'enregistrement/d'exécution de plugin typées
   Étendez `OpenClawPluginApi` et/ou `api.runtime` avec la plus petite surface de capacité
   typée utile.
3. connecter le principal + les consommateurs channel/fonctionnalité
   Les canaux et les plugins de fonctionnalité doivent consommer la nouvelle capacité via le principal,
   et non en important une implémentation fournisseur directement.
4. enregistrer les implémentations fournisseur
   Les plugins fournisseur enregistrent ensuite leurs backends contre la capacité.
5. ajouter une couverture de contrat
   Ajoutez des tests pour que la propriété et la forme de l'enregistrement restent explicites dans le temps.

C'est ainsi que OpenClaw reste opinionné sans devenir codé en dur selon la vision du monde
d'un provider. Consultez le [Capability Cookbook](/fr/tools/capability-cookbook)
pour une liste de contrôle de fichiers concrète et un exemple travaillé.

### Liste de contrôle des capacités

Lorsque vous ajoutez une nouvelle capacité, l'implémentation doit généralement toucher ces surfaces ensemble :

- types de contrat principal dans `src/<capability>/types.ts`
- aide d'exécution/exécution principale dans `src/<capability>/runtime.ts`
- surface d'enregistrement de l'API du plugin dans `src/plugins/types.ts`
- câblage du registre de plugins dans `src/plugins/registry.ts`
- exposition du runtime du plugin dans `src/plugins/runtime/*` lorsque les plugins de fonctionnalités/canaux
  doivent le consommer
- assistants de capture/test dans `src/test-utils/plugin-registration.ts`
- assertions de propriété/contrat dans `src/plugins/contracts/registry.ts`
- documentation opérateur/plugin dans `docs/`

Si l'une de ces surfaces est manquante, cela indique généralement que la capacité n'est
pas encore entièrement intégrée.

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

Cela permet de garder la règle simple :

- le cœur possède le contrat de capacité + l'orchestration
- les plugins fournisseurs possèdent les implémentations fournisseurs
- les plugins de fonctionnalités/canaux consomment les assistants d'exécution
- les tests de contrat maintiennent la propriété explicite

## Connexes

- [Architecture des plugins](/fr/plugins/architecture) — modèle de capacité publique et formes
- [Sous-chemins du SDK de plugin](/fr/plugins/sdk-subpaths)
- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Création de plugins](/fr/plugins/building-plugins)
