---
summary: "Models CLI : liste, définition, alias, replis, analyse, statut"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

Voir [/concepts/model-failover](/en/concepts/model-failover) pour la rotation des profils d'authentification,
les temps de recharge et leur interaction avec les basculements.
Aperçu rapide du provider + exemples : [/concepts/model-providers](/en/concepts/model-providers).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

1. Modèle **Principal** (`agents.defaults.model.primary` ou `agents.defaults.model`).
2. **Replis** dans `agents.defaults.model.fallbacks` (dans l'ordre).
3. Le **repli en cas d'échec d'authentification du provider** se produit à l'intérieur
   d'un provider avant de passer au modèle suivant.

Connexes :

- `agents.defaults.models` est la liste d'autorisation/catalogue des modèles qu'OpenClaw peut utiliser (plus les alias).
- `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images.
- `agents.defaults.pdfModel` est utilisé par l'outil `pdf`. Si omis, l'outil
  revient à `agents.defaults.imageModel`, puis au model de session/défaut
  résolu.
- `agents.defaults.imageGenerationModel` est utilisé par la capacité partagée de génération d'images. Si omis, `image_generate` peut toujours déduire un provider par défaut basé sur l'authentification. Il essaie d'abord le provider par défaut actuel, puis les providers de génération d'images enregistrés restants par ordre d'ID de provider. Si vous définissez un provider/model spécifique, configurez également la clé d'authentification/API de ce provider.
- `agents.defaults.musicGenerationModel` est utilisé par la capacité partagée de génération de musique. Si omis, `music_generate` peut toujours déduire un provider par défaut basé sur l'authentification. Il essaie d'abord le provider par défaut actuel, puis les providers de génération de musique enregistrés restants par ordre d'ID de provider. Si vous définissez un provider/model spécifique, configurez également la clé d'authentification/API de ce provider.
- `agents.defaults.videoGenerationModel` est utilisé par la capacité partagée de génération de vidéo. Si omis, `video_generate` peut toujours déduire un provider par défaut basé sur l'authentification. Il essaie d'abord le provider par défaut actuel, puis les providers de génération de vidéo enregistrés restants par ordre d'ID de provider. Si vous définissez un provider/model spécifique, configurez également la clé d'authentification/API de ce provider.
- Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus des liaisons (voir [/concepts/multi-agent](/en/concepts/multi-agent)).

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
- `agents.defaults.models` (liste d'autorisation + alias + params fournisseur)
- `models.providers` (fournisseurs personnalisés écrits dans `models.json`)

Les références de model sont normalisées en minuscules. Les alias de fournisseur comme `z.ai/*` sont normalisés
en `zai/*`.

Les exemples de configuration de fournisseur (y compris OpenCode) se trouvent dans
[/providers/opencode](/en/providers/opencode).

## "Model is not allowed" (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et pour
les substitutions de session. Lorsqu'un utilisateur sélectionne un model qui n'est pas dans cette liste d'autorisation,
OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner
l'impression qu'il « n'a pas répondu ». La solution consiste à :

- Ajouter le model à `agents.defaults.models`, ou
- Effacer la liste d'autorisation (supprimer `agents.defaults.models`), ou
- Choisir un model parmi `/model list`.

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

## Changer de model dans le chat (`/model`)

Vous pouvez changer de model pour la session actuelle sans redémarrer :

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

Notes :

- `/model` (et `/model list`) est un sélecteur compact et numéroté (famille de models + fournisseurs disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes pour le fournisseur et le model, plus une étape de validation.
- `/model <#>` sélectionne dans ce sélecteur.
- `/model` enregistre immédiatement la nouvelle sélection de session.
- Si l'agent est inactif, la prochaine exécution utilise immédiatement le nouveau model.
- Si une exécution est déjà en cours, OpenClaw marque le basculement en direct comme en attente et ne redémarre avec le nouveau model qu'à un point de réessai propre.
- Si l'activité de l'outil ou la sortie de la réponse a déjà commencé, le basculement en attente peut rester en file d'attente jusqu'à une nouvelle tentative ultérieure ou au prochain tour de l'utilisateur.
- `/model status` est la vue détaillée (candidats d'auth et, lorsqu'ils sont configurés, point de terminaison du fournisseur `baseUrl` + mode `api`).
- Les références de modèle sont analysées en divisant sur la **première** `/`. Utilisez `provider/model` lors de la frappe de `/model <ref>`.
- Si l'ID du modèle lui-même contient `/` (style OpenRouter), vous devez inclure le préfixe du fournisseur (exemple : `/model openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw résout l'entrée dans cet ordre :
  1. correspondance d'alias
  2. correspondance unique de fournisseur configuré pour cet ID de modèle exact sans préfixe
  3. repli déconseillé vers le fournisseur par défaut configuré
     Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw
     revient plutôt au premier fournisseur/modèle configuré pour éviter
     d'afficher un défaut obsolète d'un fournisseur supprimé.

Comportement/configuration complète des commandes : [Commandes slash](/en/tools/slash-commands).

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
- `--provider <name>` : filtrer par fournisseur
- `--plain` : un modèle par ligne
- `--json` : sortie lisible par machine

### `models status`

Affiche le model principal résolu, les secours, le model d'image et une vue d'ensemble de l'auth
des providers configurés. Il affiche également le statut d'expiration OAuth pour les profils trouvés
dans le magasin d'auth (avertit dans les 24h par défaut). `--plain` n'imprime que le
model principal résolu.
Le statut OAuth est toujours affiché (et inclus dans la sortie `--json`). Si un provider
configuré n'a pas d'identifiants, `models status` imprime une section **Missing auth**.
Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers`
(auth effective par provider, incluant les identifiants soutenus par env). `auth.oauth`
est uniquement la santé du profil du magasin d'auth ; les providers uniquement env n'y apparaissent pas.
Utilisez `--check` pour l'automatisation (exit `1` lorsque manquant/expiré, `2` lors de l'expiration).
Utilisez `--probe` pour les vérifications d'auth en direct ; les lignes de sondage peuvent provenir des profils d'auth, des identifiants
env ou `models.json`.
Si un `auth.order.<provider>` explicite omet un profil stocké, le sondage signale
`excluded_by_auth_order` au lieu d'essayer. Si l'auth existe mais qu'aucun model
sondable ne peut être résolu pour ce provider, le sondage signale `status: no_model`.

Le choix d'auth dépend du provider/compte. Pour les hôtes de passerelle toujours actifs, les clés API
sont généralement les plus prévisibles ; la réutilisation du CLI Claude et les profils Anthropic/token OAuth
existant sont également pris en charge.

Exemple (Claude CLI) :

```bash
claude auth login
openclaw models status
```

## Analyse (models gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de models gratuits** de OpenRouter et peut
optionnellement sonder les models pour la prise en charge des tools et des images.

Drapeaux clés :

- `--no-probe` : ignorer les sondages en direct (métadonnées uniquement)
- `--min-params <b>` : taille minimale des paramètres (milliards)
- `--max-age-days <days>` : ignorer les models plus anciens
- `--provider <name>` : filtre de préfixe de provider
- `--max-candidates <n>` : taille de la liste de secours
- `--set-default` : définir `agents.defaults.model.primary` sur la première sélection
- `--set-image` : définir `agents.defaults.imageModel.primary` sur la première sélection d'image

L'analyse nécessite une clé API OpenRouter (à partir des profils d'authentification ou `OPENROUTER_API_KEY`). Sans clé, utilisez `--no-probe` pour lister uniquement les candidats.

Les résultats de l'analyse sont classés par :

1. Prise en charge des images
2. Latence des outils
3. Taille du contexte
4. Nombre de paramètres

Entrée

- Liste OpenRouter `/models` (filtre `:free`)
- Nécessite une clé API OpenRouter provenant des profils d'authentification ou `OPENROUTER_API_KEY` (voir [/environment](/en/help/environment))
- Filtres optionnels : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de sonde : `--timeout`, `--concurrency`

Lorsqu'elle est exécutée dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode non interactif, passez `--yes` pour accepter les valeurs par défaut.

## Registre des modèles (`models.json`)

Les fournisseurs personnalisés dans `models.providers` sont écrits dans `models.json` sous le
dossier de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier
est fusionné par défaut sauf si `models.mode` est défini sur `replace`.

Priorité du mode de fusion pour les ID de fournisseur correspondants :

- Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent l'emporte.
- Un `apiKey` non vide dans le `models.json` de l'agent l'emporte uniquement lorsque ce fournisseur n'est pas géré par SecretRef dans le contexte de configuration/profil d'authentification actuel.
- Les valeurs `apiKey` du fournisseur géré par SecretRef sont actualisées à partir des marqueurs source (`ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exécution) au lieu de conserver les secrets résolus.
- Les valeurs d'en-tête du fournisseur géré par SecretRef sont actualisées à partir des marqueurs source (`secretref-env:ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exécution).
- Les `apiKey`/`baseUrl` de l'agent vides ou manquants reviennent à la configuration `models.providers`.
- Les autres champs du fournisseur sont actualisés à partir de la configuration et des données normalisées du catalogue.

La persistance des marqueurs est basée sur la source : OpenClaw écrit les marqueurs à partir de l'instantané actif de la configuration source (pré-résolution), et non à partir des valeurs résolues des secrets d'exécution.
Cela s'applique chaque fois qu'OpenClaw régénère `models.json`, y compris les chemins pilotés par commande comme `openclaw agent`.

## Connexes

- [Modèles de fournisseurs](/en/concepts/model-providers) — routage et authentification des fournisseurs
- [Basculement de modèle](/en/concepts/model-failover) — chaînes de secours
- [Génération d'images](/en/tools/image-generation) — configuration des modèles d'image
- [Génération de musique](/en/tools/music-generation) — configuration des modèles de musique
- [Génération de vidéo](/en/tools/video-generation) — configuration des modèles vidéo
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) — clés de configuration du modèle
