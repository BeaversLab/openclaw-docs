---
summary: "Models CLI : liste, définition, alias, replis, analyse, statut"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
sidebarTitle: "Models CLI"
---

<CardGroup cols={2}>
  <Card title="Model failover" href="/fr/concepts/model-failover">
    Rotation du profil d'authentification, temps de recharge et interaction avec les replis.
  </Card>
  <Card title="Model providers" href="/fr/concepts/model-providers">
    Aperçu rapide des providers et exemples.
  </Card>
  <Card title="Agent runtimes" href="/fr/concepts/agent-runtimes">
    PI, Codex et autres runtimes de boucle d'agent.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/config-agents#agent-defaults">
    Clés de configuration du modèle.
  </Card>
</CardGroup>

Les références de modèle choisissent un provider et un modèle. Elles ne choisissent généralement pas le runtime d'agent de bas niveau. Par exemple, `openai/gpt-5.5` peut s'exécuter via le chemin normal du provider OpenAI ou via le runtime app-server Codex, selon `agents.defaults.agentRuntime.id`. Voir [Agent runtimes](/fr/concepts/agent-runtimes).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

<Steps>
  <Step title="Primary model">`agents.defaults.model.primary` (ou `agents.defaults.model`).</Step>
  <Step title="Fallbacks">`agents.defaults.model.fallbacks` (dans l'ordre).</Step>
  <Step title="Provider auth failover">Le repli d'authentification se produit à l'intérieur d'un provider avant de passer au modèle suivant.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Surfaces de modèles associés">
    - `agents.defaults.models` est la liste d'autorisation/catalogue des modèles OpenClaw peut utiliser (plus les alias). - `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images. - `agents.defaults.pdfModel` est utilisé par l'outil `pdf`. S'il est omis, l'outil revient à `agents.defaults.imageModel`, puis au modèle de session/défaut
    résolu. - `agents.defaults.imageGenerationModel` est utilisé par la capacité de génération d'images partagée. S'il est omis, `image_generate` peut quand même déduire un fournisseur par défaut basé sur l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les autres fournisseurs de génération d'images enregistrés dans l'ordre des ID de fournisseur. Si vous définissez un
    fournisseur/modèle spécifique, configurez également la clé d'auth/API de ce fournisseur. - `agents.defaults.musicGenerationModel` est utilisé par la capacité de génération de musique partagée. S'il est omis, `music_generate` peut quand même déduire un fournisseur par défaut basé sur l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les autres fournisseurs de
    génération de musique enregistrés dans l'ordre des ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'auth/API de ce fournisseur. - `agents.defaults.videoGenerationModel` est utilisé par la capacité de génération de vidéo partagée. S'il est omis, `video_generate` peut quand même déduire un fournisseur par défaut basé sur l'authentification. Il
    essaie d'abord le fournisseur par défaut actuel, puis les autres fournisseurs de génération de vidéo enregistrés dans l'ordre des ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'auth/API de ce fournisseur. - Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus des liaisons (voir [Routage
    multi-agent](/fr/concepts/multi-agent)).
  </Accordion>
</AccordionGroup>

## Politique rapide de modèle

- Définissez votre modèle principal sur le modèle de la dernière génération le plus puissant disponible pour vous.
- Utilisez les modèles de repli pour les tâches sensibles aux coûts/à la latence et les discussions moins critiques.
- Pour les agents activés par outils ou les entrées non fiables, évitez les niveaux de modèles plus anciens ou plus faibles.

## Intégration (recommandée)

Si vous ne souhaitez pas modifier la configuration manuellement, lancez l'intégration :

```bash
openclaw onboard
```

Il peut configurer le modèle + l'auth pour les providers courants, notamment l'abonnement **OpenAI Code (Codex)** (OAuth) et **Anthropic** (clé API ou Claude CLI).

## Clés de configuration (aperçu)

- `agents.defaults.model.primary` et `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` et `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` et `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` et `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` et `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (liste d'autorisation + alias + paramètres du provider)
- `models.providers` (providers personnalisés écrits dans `models.json`)

<Note>
Les références de modèle sont normalisées en minuscules. Les alias de provider comme `z.ai/*` sont normalisés en `zai/*`.

Les exemples de configuration de provider (y compris OpenCode) se trouvent dans [OpenCode](/fr/providers/opencode).

</Note>

### Modifications sécurisées de la liste d'autorisation

Utilisez des écritures additives lors de la mise à jour manuelle de `agents.defaults.models` :

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Règles de protection contre l'écrasement">
    `openclaw config set` protège les cartes de modèle/provider contre les écrasements accidentels. Une assignation d'objet simple à `agents.defaults.models`, `models.providers` ou `models.providers.<id>.models` est rejetée si elle supprimerait des entrées existantes. Utilisez `--merge` pour les modifications additives ; utilisez `--replace` uniquement lorsque la valeur fournie doit devenir la valeur cible complète.

    La configuration interactive du provider et `openclaw configure --section model` fusionnent également les sélectionss étendues au provider dans la liste d'autorisation existante, ainsi l'ajout de Codex, Ollama ou un autre provider ne supprime pas les entrées de modèle non liées. Configure préserve un `agents.defaults.model.primary` existant lorsque l'auth du provider est réappliquée. Les commandes explicites de définition par défaut telles que `openclaw models auth login --provider <id> --set-default` et `openclaw models set <model>` remplacent toujours `agents.defaults.model.primary`.

  </Accordion>
</AccordionGroup>

## "Modèle non autorisé" (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **liste blanche** (allowlist) pour `/model` et pour les overrides de session. Lorsqu'un utilisateur sélectionne un model qui n'est pas dans cette liste blanche, OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

<Warning>
Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner l'impression qu'il "n'a pas répondu". La solution consiste à :

- Ajouter le model à `agents.defaults.models`, ou
- Effacer la liste blanche (supprimer `agents.defaults.models`), ou
- Choisir un model parmi `/model list`.
  </Warning>

Exemple de configuration de liste blanche :

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-6" },
    models: {
      "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## Changer de model dans le chat (`/model`)

Vous pouvez changer de model pour la session actuelle sans redémarrer :

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="Comportement du sélecteur">
    - `/model` (et `/model list`) est un sélecteur compact numéroté (famille de models + providers disponibles).
    - Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes de provider et de model, plus une étape de soumission.
    - `/models add` est obsolète et renvoie désormais un message d'obsolescence au lieu d'enregistrer les models depuis le chat.
    - `/model <#>` effectue une sélection depuis ce sélecteur.
  </Accordion>
  <Accordion title="Persistance et changement à la volée">
    - `/model` enregistre immédiatement la nouvelle sélection de session.
    - Si l'agent est inactif, l'exécution suivante utilise le nouveau model immédiatement.
    - Si une exécution est déjà en cours, OpenClaw marque un changement à la volée comme en attente et ne redémarre avec le nouveau model qu'à un point de réessai propre.
    - Si l'activité des tools ou la sortie de la réponse a déjà commencé, le changement en attente peut rester en file jusqu'à une prochaine opportunité de réessai ou au prochain tour de l'utilisateur.
    - `/model status` est la vue détaillée (candidats d'authentification et, lorsque configuré, point de terminaison du provider `baseUrl` + mode `api`).
  </Accordion>
  <Accordion title="Analyse des références">
    - Les références de modèle sont analysées en séparant sur le **premier** `/`. Utilisez `provider/model` lors de la saisie de `/model <ref>`.
    - Si l'ID du modèle lui-même contient `/` (style OpenRouter), vous devez inclure le préfixe du fournisseur (exemple : `/model openrouter/moonshotai/kimi-k2`).
    - Si vous omettez le fournisseur, OpenClaw résout l'entrée dans cet ordre :
      1. correspondance d'alias
      2. correspondance unique de fournisseur configuré pour cet ID de modèle exact non préfixé
      3. repli déprécié vers le fournisseur par défaut configuré — si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient plutôt au premier fournisseur/modèle configuré pour éviter d'afficher un défaut obsolète d'un fournisseur supprimé.
  </Accordion>
</AccordionGroup>

Comportement/configuration complète de la commande : [Commandes slash](/fr/tools/slash-commands).

## Commandes CLI

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models` (sans sous-commande) est un raccourci pour `models status`.

### `models list`

Affiche les modèles configurés par défaut. Indicateurs utiles :

<ParamField path="--all" type="boolean">
  Catalogue complet. Inclut les lignes de catalogue statique appartenant au fournisseur groupé avant que l'authentification ne soit configurée, afin que les vues de découverte uniquement puissent afficher des modèles qui sont indisponibles jusqu'à ce que vous ajoutiez des identifiants de fournisseur correspondants.
</ParamField>
<ParamField path="--local" type="boolean">
  Fournisseurs locaux uniquement.
</ParamField>
<ParamField path="--provider <id>" type="string">
  Filtrer par ID de fournisseur, par exemple `moonshot`. Les étiquettes d'affichage des sélecteurs interactifs ne sont pas acceptées.
</ParamField>
<ParamField path="--plain" type="boolean">
  Un modèle par ligne.
</ParamField>
<ParamField path="--json" type="boolean">
  Sortie lisible par machine.
</ParamField>

### `models status`

Affiche le modèle principal résolu, les replis, le modèle d'image et une vue d'ensemble de l'authentification des fournisseurs configurés. Il signale également le statut d'expiration OAuth pour les profils trouvés dans le magasin d'authentification (avertit dans les 24h par défaut). `--plain` n'affiche que le modèle principal résolu.

<AccordionGroup>
  <Accordion title="Comportement d'authentification et de sonde">
    - Le statut OAuth est toujours affiché (et inclus dans la sortie `--json`). Si un fournisseur configuré n'a pas d'identifiants, `models status` imprime une section **Missing auth**.
    - Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers` (authentification effective par fournisseur, y compris les identifiants soutenus par l'environnement). `auth.oauth` concerne uniquement la santé des profils de stockage d'authentification ; les fournisseurs uniquement environnement n'y apparaissent pas.
    - Utilisez `--check` pour l'automatisation (sortie `1` en cas d'absence ou d'expiration, `2` en cas d'expiration imminente).
    - Utilisez `--probe` pour les vérifications d'authentification en direct ; les lignes de sonde peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
    - Si un `auth.order.<provider>` explicite omet un profil stocké, la sonde signale `excluded_by_auth_order` au lieu de l'essayer. Si l'authentification existe mais qu'aucun modèle sondeable ne peut être résolu pour ce fournisseur, la sonde signale `status: no_model`.
  </Accordion>
</AccordionGroup>

<Note>Le choix d'authentification dépend du fournisseur/compte. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement les plus prévisibles ; la réutilisation du CLI Claude et les profils Anthropic/token OAuth existants sont également pris en charge.</Note>

Exemple (CLI Claude) :

```bash
claude auth login
openclaw models status
```

## Analyse (modèles gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de modèles gratuits** de OpenRouter et peut sonder facultativement les modèles pour la prise en charge des outils et des images.

<ParamField path="--no-probe" type="boolean">
  Ignorer les sondages en direct (métadonnées uniquement).
</ParamField>
<ParamField path="--min-params <b>" type="number">
  Taille minimale des paramètres (milliards).
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  Ignorer les modèles plus anciens.
</ParamField>
<ParamField path="--provider <name>" type="string">
  Filtre de préfixe de fournisseur.
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  Taille de la liste de repli.
</ParamField>
<ParamField path="--set-default" type="boolean">
  Définir `agents.defaults.model.primary` sur la première sélection.
</ParamField>
<ParamField path="--set-image" type="boolean">
  Définir `agents.defaults.imageModel.primary` sur la première sélection d'image.
</ParamField>

<Note>
  Le catalogue `/models` d'OpenRouter est public, donc les analyses basées uniquement sur les métadonnées peuvent lister les candidats gratuits sans clé. Les sondages et l'inférence nécessitent toujours une clé OpenRouter API (issue des profils d'authentification ou de `OPENROUTER_API_KEY`). Si aucune clé n'est disponible, `openclaw models scan` revient à une sortie basée sur les métadonnées
  uniquement et laisse la configuration inchangée. Utilisez `--no-probe` pour demander explicitement le mode basé sur les métadonnées uniquement.
</Note>

Les résultats de l'analyse sont classés par :

1. Support des images
2. Latence des outils
3. Taille du contexte
4. Nombre de paramètres

Entrée :

- Liste `/models` OpenRouter (filtre `:free`)
- Les sondages en direct nécessitent une clé OpenRouter API issue des profils d'authentification ou de `OPENROUTER_API_KEY` (voir [Variables d'environnement](/fr/help/environment))
- Filtres optionnels : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de requête/sondage : `--timeout`, `--concurrency`

Lorsque les sondes en direct s'exécutent dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode non interactif, passez `--yes` pour accepter les valeurs par défaut. Les résultats contenant uniquement des métadonnées sont informatifs ; `--set-default` et `--set-image` nécessitent des sondes en direct, donc OpenClaw ne configure pas un model OpenRouter sans clé inutilisable.

## Registre des models (`models.json`)

Les providers personnalisés dans `models.providers` sont écrits dans `models.json` sous le répertoire de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier est fusionné par défaut, sauf si `models.mode` est défini sur `replace`.

<AccordionGroup>
  <Accordion title="Priorité du mode de fusion">
    Priorité du mode de fusion pour les ID de provider correspondants :

    - Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent l'emporte.
    - Un `apiKey` non vide dans le `models.json` de l'agent ne l'emporte que si ce provider n'est pas géré par SecretRef dans le contexte de configuration/profil d'auth actuel.
    - Les valeurs `apiKey` du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les références d'env, `secretref-managed` pour les références de fichier/exec) au lieu de persister les secrets résolus.
    - Les valeurs d'en-tête du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`secretref-env:ENV_VAR_NAME` pour les références d'env, `secretref-managed` pour les références de fichier/exec).
    - Les `apiKey`/`baseUrl` de l'agent vides ou manquants reviennent à la configuration `models.providers`.
    - Les autres champs du provider sont actualisés à partir de la configuration et des données normalisées du catalogue.

  </Accordion>
</AccordionGroup>

<Note>La persistance des marqueurs est basée sur la source : OpenClaw écrit les marqueurs à partir de l'instantané de la configuration source active (pré-résolution), et non à partir des valeurs de secret d'exécution résolues. Cela s'applique chaque fois que OpenClaw régénère `models.json`, y compris les chemins pilotés par commande comme `openclaw agent`.</Note>

## Connexes

- [Runtimes d'agent](/fr/concepts/agent-runtimes) — PI, Codex et autres runtimes de boucle d'agent
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) — clés de configuration du modèle
- [Génération d'images](/fr/tools/image-generation) — configuration du modèle d'image
- [Basculement de modèle](/fr/concepts/model-failover) — chaînes de repli
- [Fournisseurs de modèles](/fr/concepts/model-providers) — routage et authentification des fournisseurs
- [Génération de musique](/fr/tools/music-generation) — configuration du modèle de musique
- [Génération de vidéo](/fr/tools/video-generation) — configuration du modèle de vidéo
