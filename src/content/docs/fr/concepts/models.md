---
summary: "Models CLI : liste, définition, alias, replis, analyse, statut"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

Consultez [/concepts/model-failover](/en/concepts/model-failover) pour la rotation des profils d'authentification, les temps de recharge (cooldowns) et leur interaction avec les basculements (fallbacks).
Aperçu rapide des providers + exemples : [/concepts/model-providers](/en/concepts/model-providers).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

1. Modèle **Principal** (`agents.defaults.model.primary` ou `agents.defaults.model`).
2. **Replis** dans `agents.defaults.model.fallbacks` (dans l'ordre).
3. Le **repli en cas d'échec d'authentification du provider** se produit à l'intérieur
   d'un provider avant de passer au modèle suivant.

Connexes :

- `agents.defaults.models` est la liste d'autorisation/catalogue des modèles qu'OpenClaw peut utiliser (plus les alias).
- `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images.
- `agents.defaults.imageGenerationModel` est utilisé par la fonctionnalité de génération d'images partagée. S'il est omis, `image_generate` peut toujours déduire un provider par défaut à partir des plugins de génération d'images compatibles et authentifiés. Si vous définissez un provider/model spécifique, configurez également la clé d'auth/API de ce provider.
- Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus les liaisons (voir [/concepts/multi-agent](/en/concepts/multi-agent)).

## Politique de modèle rapide

- Définissez votre principal sur le modèle de dernière génération le plus puissant disponible pour vous.
- Utilisez des replis pour les tâches sensibles aux coûts/à la latence et les chats moins critiques.
- Pour les agents activés pour les outils ou les entrées non fiables, évitez les niveaux de modèles plus anciens ou plus faibles.

## Onboarding (recommandé)

Si vous ne souhaitez pas modifier la configuration manuellement, exécutez l'onboarding :

```bash
openclaw onboard
```

Il peut configurer le modèle + l'authentification pour les providers courants, y compris l'abonnement **OpenAI Code (Codex)** (OAuth) et **Anthropic** (clé API ou `claude setup-token`).

## Clés de configuration (aperçu)

- `agents.defaults.model.primary` et `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` et `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` et `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (liste d'autorisation + alias + paramètres du provider)
- `models.providers` (providers personnalisés écrits dans `models.json`)

Les références de modèle sont normalisées en minuscules. Les alias de provider comme `z.ai/*` sont normalisés en `zai/*`.

Les exemples de configuration de provider (y compris OpenCode) se trouvent dans
[/providers/opencode](/en/providers/opencode).

## "Modèle non autorisé" (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et pour les remplacements de session. Lorsqu'un utilisateur sélectionne un modèle qui n'est pas dans cette liste d'autorisation, OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner l'impression qu'il « n'a pas répondu ». La solution consiste à :

- Ajouter le modèle à `agents.defaults.models`, ou
- Effacer la liste blanche (supprimer `agents.defaults.models`), ou
- Choisir un modèle depuis `/model list`.

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

## Changer de modèle dans le chat (`/model`)

Vous pouvez changer de modèle pour la session actuelle sans redémarrer :

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

Remarques :

- `/model` (et `/model list`) est un sélecteur compact et numéroté (famille de modèles + providers disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le provider et le modèle, ainsi qu'une étape de validation.
- `/model <#>` effectue une sélection depuis ce sélecteur.
- `/model` met à jour la sélection de session immédiatement. Si l'agent est inactif, la prochaine exécution utilise le nouveau modèle immédiatement. Si l'agent est occupé, l'exécution en cours se termine d'abord et le travail en file d'attente/futur utilise le nouveau modèle par la suite.
- `/model status` est la vue détaillée (candidats d'authentification et, lorsque configuré, endpoint du provider `baseUrl` + mode `api`).
- Les références de modèle sont analysées en séparant sur le **premier** `/`. Utilisez `provider/model` lors de la saisie de `/model <ref>`.
- Si l'ID du modèle contient lui-même `/` (style OpenRouter), vous devez inclure le préfixe du provider (exemple : `/model openrouter/moonshotai/kimi-k2`).
- Si vous omettez le provider, OpenClaw traite l'entrée comme un alias ou un modèle pour le **provider par défaut** (fonctionne uniquement lorsqu'il n'y a pas de `/` dans l'ID du modèle).

Comportement/configuration complet de la commande : [Slash commands](/en/tools/slash-commands).

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
- `--provider <name>` : filtrer par provider
- `--plain` : un modèle par ligne
- `--json` : sortie lisible par machine

### `models status`

Affiche le modèle principal résolu, les modèles de repli, le modèle d'image et une vue d'ensemble de l'authentification des fournisseurs configurés. Il affiche également le statut d'expiration OAuth pour les profils trouvés dans le magasin d'authentification (avertit par défaut dans les 24h). `--plain` n'affiche que le modèle principal résolu.
Le statut OAuth est toujours affiché (et inclus dans la sortie `--json`). Si un fournisseur configuré n'a pas d'identifiants, `models status` affiche une section **Authentification manquante**.
Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers`
(authentification effective par fournisseur).
Utilisez `--check` pour l'automatisation (code de sortie `1` en cas d'absence ou d'expiration, `2` en cas d'expiration imminente).

Le choix d'authentification dépend du fournisseur/compte. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement les plus prévisibles ; les flux de jetons d'abonnement sont également pris en charge.

Exemple (jeton de configuration Anthropic) :

```bash
claude setup-token
openclaw models status
```

## Analyse (modèles gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de modèles gratuits** de OpenRouter et peut
éventuellement sonder les modèles pour la prise en charge des outils et des images.

Principaux indicateurs :

- `--no-probe` : ignorer les sondages en direct (métadonnées uniquement)
- `--min-params <b>` : taille minimale des paramètres (milliards)
- `--max-age-days <days>` : ignorer les modèles plus anciens
- `--provider <name>` : filtre de préfixe de fournisseur
- `--max-candidates <n>` : taille de la liste de repli
- `--set-default` : définir `agents.defaults.model.primary` sur la première sélection
- `--set-image` : définir `agents.defaults.imageModel.primary` sur la première sélection d'image

Le sondage nécessite une clé OpenRouter API (à partir des profils d'authentification ou
de `OPENROUTER_API_KEY`). Sans clé, utilisez `--no-probe` pour lister uniquement les candidats.

Les résultats de l'analyse sont classés par :

1. Prise en charge des images
2. Latence des outils
3. Taille du contexte
4. Nombre de paramètres

Entrée

- Liste `/models` OpenRouter (filtre `:free`)
- Nécessite une clé OpenRouter API à partir des profils d'authentification ou de `OPENROUTER_API_KEY` (voir [/environment](/en/help/environment))
- Filtres optionnels : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de sonde : `--timeout`, `--concurrency`

Lorsqu'il est exécuté dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode non-interactif, passez `--yes` pour accepter les valeurs par défaut.

## Registre des modèles (`models.json`)

Les providers personnalisés dans `models.providers` sont écrits dans `models.json` sous le répertoire de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier est fusionné par défaut sauf si `models.mode` est défini sur `replace`.

Priorité du mode de fusion pour les ID de provider correspondants :

- Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent l'emporte.
- Un `apiKey` non vide dans le `models.json` de l'agent l'emporte uniquement lorsque ce provider n'est pas géré par SecretRef dans le contexte de configuration/auth-profile actuel.
- Les valeurs `apiKey` du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références fichier/exec) au lieu de conserver les secrets résolus.
- Les valeurs d'en-tête du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`secretref-env:ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références fichier/exec).
- Les `apiKey`/`baseUrl` de l'agent vides ou manquants reviennent à `models.providers` de la configuration.
- Les autres champs du provider sont actualisés à partir de la configuration et des données du catalogue normalisées.

La persistance des marqueurs est source-autoritaire : OpenClaw écrit les marqueurs à partir de l'instantané de la configuration source active (pré-résolution), et non à partir des valeurs de secret d'exécution résolues.
Cela s'applique chaque fois que OpenClaw régénère `models.json`, y compris les chemins pilotés par commande comme `openclaw agent`.

## Connexes

- [Modèles de Providers](/en/concepts/model-providers) — routage et auth des providers
- [Basculement de Modèle (Failover)](/en/concepts/model-failover) — chaînes de repli
- [Génération d'images](/en/tools/image-generation) — configuration du model d'image
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) — clés de configuration du model
