---
summary: "CLI de modèles : liste, définition, alias, secours, analyse, statut"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modèles"
---

# Models CLI

Consultez [/concepts/model-failover](/fr/concepts/model-failover) pour la rotation des profils d'authentification,
les temps de refroidissement et leur interaction avec les mécanismes de secours.
Aperçu rapide des fournisseurs + exemples : [/concepts/model-providers](/fr/concepts/model-providers).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

1. Modèle **principal** (`agents.defaults.model.primary` ou `agents.defaults.model`).
2. **Secours** dans `agents.defaults.model.fallbacks` (dans l'ordre).
3. Le **repli en cas d'échec d'authentification du provider** se produit à l'intérieur
   d'un provider avant de passer au modèle suivant.

Connexes :

- `agents.defaults.models` est la liste d'autorisation/le catalogue des modèles qu'OpenClaw peut utiliser (ainsi que les alias).
- `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images.
- `agents.defaults.pdfModel` est utilisé par l'outil `pdf`. S'il est omis, l'outil
  revient à `agents.defaults.imageModel`, puis au modèle de session/défaut
  résolu.
- `agents.defaults.imageGenerationModel` est utilisé par la capacité partagée de génération d'images. S'il est omis, `image_generate` peut toujours déduire un fournisseur par défaut pris en charge par une authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération d'images enregistrés restants par ordre d'ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'authentification/API de ce fournisseur.
- `agents.defaults.musicGenerationModel` est utilisé par la capacité partagée de génération de musique. S'il est omis, `music_generate` peut toujours déduire un fournisseur par défaut pris en charge par une authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération de musique enregistrés restants par ordre d'ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'authentification/API de ce fournisseur.
- `agents.defaults.videoGenerationModel` est utilisé par la capacité partagée de génération de vidéo. S'il est omis, `video_generate` peut toujours déduire un fournisseur par défaut pris en charge par une authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération de vidéo enregistrés restants par ordre d'ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'authentification/API de ce fournisseur.
- Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus les liaisons (voir [/concepts/multi-agent](/fr/concepts/multi-agent)).

## Politique rapide de model

- Réglez votre principal sur le model le plus puissant de la dernière génération disponible pour vous.
- Utilisez les basculements pour les tâches sensibles aux coûts/à la latence et les chat moins critiques.
- Pour les agents activés pour les outils ou les entrées non fiables, évitez les niveaux de model plus anciens ou plus faibles.

## Onboarding (recommandé)

Si vous ne souhaitez pas modifier la configuration à la main, lancez l'onboarding :

```bash
openclaw onboard
```

Il peut configurer le model + l'authentification pour les providers courants, notamment l'abonnement **OpenAI Code (Codex)**
(OAuth) et **Anthropic** (clé API ou Claude CLI).

## Clés de configuration (aperçu)

- `agents.defaults.model.primary` et `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` et `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` et `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` et `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` et `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (allowlist + alias + paramètres provider)
- `models.providers` (providers personnalisés écrits dans `models.json`)

Les références de model sont normalisées en minuscules. Les alias de provider comme `z.ai/*` sont normalisés
en `zai/*`.

Les exemples de configuration de provider (y compris OpenCode) se trouvent dans
[/providers/opencode](/fr/providers/opencode).

### Modifications sécurisées de la liste verte (allowlist)

Utilisez des écritures additives lors de la mise à jour manuelle de `agents.defaults.models` :

```bash
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
```

`openclaw config set` protège les cartes model/provider des écrasements accidentels. Une
assignation d'objet brut à `agents.defaults.models`, `models.providers`, ou
`models.providers.<id>.models` est rejetée lorsqu'elle supprimerait des entrées
existantes. Utilisez `--merge` pour les modifications additives ; utilisez `--replace` uniquement lorsque la
valeur fournie doit devenir la valeur cible complète.

La configuration interactive du provider et `openclaw configure --section model` fusionnent également
les sélectionscopées au provider dans la liste verte existante, ainsi l'ajout de Codex,
Ollama, ou un autre provider ne supprime pas les entrées de model non liées.

## "Le model n'est pas autorisé" (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **liste verte** (allowlist) pour `/model` et pour
les remplacements de session. Lorsqu'un utilisateur sélectionne un model qui n'est pas dans cette liste verte,
OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner
l'impression qu'il « n'a pas répondu ». La solution consiste à :

- Ajouter le model à `agents.defaults.models`, ou
- Effacer la liste verte (supprimer `agents.defaults.models`), ou
- Sélectionnez un modèle depuis `/model list`.

Exemple de configuration de liste d'autorisation :

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

## Changer de modèle dans le chat (`/model`)

Vous pouvez changer de modèle pour la session en cours sans redémarrer :

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

Notes :

- `/model` (et `/model list`) est un sélecteur compact et numéroté (famille de modèles + fournisseurs disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes pour le fournisseur et le modèle, ainsi qu'une étape de validation.
- `/models add` est disponible par défaut et peut être désactivé avec `commands.modelsWrite=false`.
- Lorsqu'il est activé, `/models add <provider> <modelId>` est la méthode la plus rapide ; `/models add` seul lance un flux guidé privilégiant le fournisseur lorsque cela est pris en charge.
- Après `/models add`, le nouveau modèle devient disponible dans `/models` et `/model` sans redémarrer la passerelle.
- `/model <#>` effectue une sélection depuis ce sélecteur.
- `/model` enregistre immédiatement la nouvelle sélection de session.
- Si l'agent est inactif, la prochaine exécution utilise immédiatement le nouveau modèle.
- Si une exécution est déjà en cours, OpenClaw marque le basculement en direct comme en attente et ne redémarre avec le nouveau modèle qu'à un point de réessai propre.
- Si l'activité d'outil ou la sortie de réponse a déjà commencé, le basculement en attente peut rester en file d'attente jusqu'à une prochaine opportunité de réessai ou le prochain tour de l'utilisateur.
- `/model status` est la vue détaillée (candidats d'authentification et, lorsque configuré, point de terminaison du fournisseur `baseUrl` + mode `api`).
- Les références de modèle sont analysées en séparant sur la **première** occurrence `/`. Utilisez `provider/model` lors de la saisie de `/model <ref>`.
- Si l'ID du modèle lui-même contient `/` (style OpenRouter), vous devez inclure le préfixe du fournisseur (exemple : `/model openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw résout l'entrée dans cet ordre :
  1. correspondance d'alias
  2. correspondance unique de fournisseur configuré pour cet ID de modèle exact sans préfixe
  3. obsolète, retour au fournisseur par défaut configuré
     Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw
     revient plutôt au premier fournisseur/modèle configuré pour éviter
     d'afficher une valeur par défaut obsolète d'un fournisseur supprimé.

Comportement/configuration complet de la commande : [Commandes slash](/fr/tools/slash-commands).

Exemples :

```text
/models add
/models add ollama glm-5.1:cloud
/models add lmstudio qwen/qwen3.5-9b
```

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

- `--all` : catalogue complet
- `--local` : fournisseurs locaux uniquement
- `--provider <id>` : filtrer par id de fournisseur, par exemple `moonshot` ; les
  étiquettes des sélecteurs interactifs ne sont pas acceptées
- `--plain` : un modèle par ligne
- `--json` : sortie lisible par machine

`--all` inclut les lignes de catalogue statique propres aux fournisseurs groupés avant que l'authentification ne soit
configurée, donc les vues de découverte uniquement peuvent afficher des modèles qui ne sont pas disponibles jusqu'à ce que
vous ajoutiez les informations d'identification du fournisseur correspondantes.

### `models status`

Affiche le modèle principal résolu, les modèles de repli, le modèle d'image et une vue d'ensemble de l'authentification des fournisseurs configurés. Il indique également le statut d'expiration OAuth pour les profils trouvés dans le magasin d'authentification (avertit dans les 24h par défaut). `--plain` n'affiche que le modèle principal résolu.
Le statut OAuth est toujours affiché (et inclus dans la sortie de `--json`). Si un fournisseur configuré n'a pas d'identifiants, `models status` affiche une section **Authentification manquante**.
Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers` (authentification effective par fournisseur, y compris les identifiants basés sur des variables d'environnement). `auth.oauth` concerne uniquement la santé des profils du magasin d'authentification ; les fournisseurs basés uniquement sur des variables d'environnement n'y apparaissent pas.
Utilisez `--check` pour l'automatisation (exit `1` en cas d'absence ou d'expiration, `2` en cas d'expiration imminente).
Utilisez `--probe` pour les vérifications d'authentification en direct ; les lignes de sondage peuvent provenir de profils d'authentification, d'identifiants de variables d'environnement ou de `models.json`.
Si un `auth.order.<provider>` explicite omet un profil stocké, le sondage signale `excluded_by_auth_order` au lieu de l'essayer. Si une authentification existe mais qu'aucun modèle testable ne peut être résolu pour ce fournisseur, le sondage signale `status: no_model`.

Le choix d'authentification dépend du fournisseur/compte. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement les plus prévisibles ; la réutilisation de CLI Claude et les profils Anthropic/token existants de OAuth sont également pris en charge.

Exemple (Claude CLI) :

```bash
claude auth login
openclaw models status
```

## Analyse (modèles gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de modèles gratuits** de OpenRouter et peut optionnellement sonder les modèles pour la prise en charge des outils et des images.

Options clés :

- `--no-probe` : ignorer les sondages en direct (métadonnées uniquement)
- `--min-params <b>` : taille minimale des paramètres (milliards)
- `--max-age-days <days>` : ignorer les modèles plus anciens
- `--provider <name>` : filtre de préfixe de fournisseur
- `--max-candidates <n>` : taille de la liste de repli
- `--set-default` : définir `agents.defaults.model.primary` sur la première sélection
- `--set-image` : définir `agents.defaults.imageModel.primary` sur la première sélection d'image

Probing requires an OpenRouter API key (from auth profiles or
`OPENROUTER_API_KEY`). Without a key, use `--no-probe` to list candidates only.

Les résultats du scan sont classés par :

1. Prise en charge des images
2. Latence de l'outil
3. Taille du contexte
4. Nombre de paramètres

Entrée

- Liste OpenRouter `/models` (filtre `:free`)
- Nécessite une clé OpenRouter API issue des profils d'authentification ou de `OPENROUTER_API_KEY` (voir [/environment](/fr/help/environment))
- Filtres optionnels : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de sonde : `--timeout`, `--concurrency`

Lorsqu'il est exécuté dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode
non interactif, passez `--yes` pour accepter les valeurs par défaut.

## Registre des modèles (`models.json`)

Les providers personnalisés dans `models.providers` sont écrits dans `models.json` sous le
répertoire de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier
est fusionné par défaut sauf si `models.mode` est défini sur `replace`.

Priorité du mode de fusion pour les IDs de provider correspondants :

- Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent prime.
- Un `apiKey` non vide dans le `models.json` de l'agent ne prime que si ce provider n'est pas géré par SecretRef dans le contexte de configuration/profil d'authentification actuel.
- Les valeurs `apiKey` du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les refs env, `secretref-managed` pour les refs fichier/exec) au lieu de persister les secrets résolus.
- Les valeurs d'en-tête du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`secretref-env:ENV_VAR_NAME` pour les refs env, `secretref-managed` pour les refs fichier/exec).
- Un `apiKey`/`baseUrl` d'agent vide ou manquant revient au `models.providers` de configuration.
- Les autres champs du provider sont actualisés à partir de la configuration et des données du catalogue normalisées.

La persistance des marqueurs est basée sur la source : OpenClaw écrit les marqueurs à partir de l'instantané actif de la configuration source (pré-résolution), et non à partir des valeurs secrètes résolues lors de l'exécution.
Cela s'applique chaque fois qu'OpenClaw régénère `models.json`, y compris les chemins pilotés par commande tels que `openclaw agent`.

## Connexes

- [Fournisseurs de modèles](/fr/concepts/model-providers) — routage et authentification des fournisseurs
- [Basculement de modèle](/fr/concepts/model-failover) — chaînes de repli
- [Génération d'images](/fr/tools/image-generation) — configuration des modèles d'image
- [Génération de musique](/fr/tools/music-generation) — configuration des modèles de musique
- [Génération de vidéo](/fr/tools/video-generation) — configuration des modèles de vidéo
- [Référence de configuration](/fr/gateway/configuration-reference#agent-defaults) — clés de configuration des modèles
