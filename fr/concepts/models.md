---
summary: "Models CLI : liste, définition, alias, replis, analyse, statut"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

Voir [/concepts/model-failover](/fr/concepts/model-failover) pour la rotation
profil auth, temps de recharge, et comment cela interagit avec les replis.
Aperçu rapide des providers + exemples : [/concepts/model-providers](/fr/concepts/model-providers).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

1. Modèle **Principal** (`agents.defaults.model.primary` ou `agents.defaults.model`).
2. **Replis** dans `agents.defaults.model.fallbacks` (dans l'ordre).
3. Le **repli en cas d'échec d'authentification du provider** se produit à l'intérieur
   d'un provider avant de passer au modèle suivant.

Connexes :

- `agents.defaults.models` est la liste d'autorisation/catalogue des modèles qu'OpenClaw peut utiliser (plus les alias).
- `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images.
- Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus les liaisons (voir [/concepts/multi-agent](/fr/concepts/multi-agent)).

## Politique de modèle rapide

- Définissez votre modèle principal sur le modèle le plus puissant de la dernière génération qui vous est accessible.
- Utilisez les replis pour les tâches sensibles aux coûts/à la latence et pour les discussions à faible enjeu.
- Pour les agents compatibles avec les outils ou les entrées non fiables, évitez les niveaux de modèles plus anciens ou plus faibles.

## Onboarding (recommandé)

Si vous ne souhaitez pas modifier la configuration à la main, exécutez l'onboarding :

```bash
openclaw onboard
```

Il peut configurer le modèle + l'auth pour les providers courants, y compris l'abonnement **OpenAI Code (Codex)
** (OAuth) et **Anthropic** (clé API ou `claude setup-token`).

## Clés de configuration (aperçu)

- `agents.defaults.model.primary` et `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` et `agents.defaults.imageModel.fallbacks`
- `agents.defaults.models` (liste d'autorisation + alias + params provider)
- `models.providers` (providers personnalisés écrits dans `models.json`)

Les références de modèle sont normalisées en minuscules. Les alias de fournisseur comme `z.ai/*` sont normalisés
en `zai/*`.

Les exemples de configuration de fournisseur (y compris OpenCode) se trouvent dans
[/gateway/configuration](/fr/gateway/configuration#opencode).

## “Modèle non autorisé” (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et pour
les remplacements de session. Lorsqu'un utilisateur sélectionne un modèle qui n'est pas dans cette liste d'autorisation,
OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner
l'impression qu'il « n'a pas répondu ». La solution consiste soit à :

- Ajouter le modèle à `agents.defaults.models`, ou
- Effacer la liste d'autorisation (supprimer `agents.defaults.models`), ou
- Choisir un modèle parmi `/model list`.

Exemple de configuration de liste d'autorisation :

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
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

- `/model` (et `/model list`) est un sélecteur compact numéroté (famille de modèles + fournisseurs disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le fournisseur et le modèle, plus une étape de validation.
- `/model <#>` sélectionne depuis ce sélecteur.
- `/model status` est la vue détaillée (candidats d'authentification et, lorsqu'ils sont configurés, point de terminaison du fournisseur `baseUrl` + mode `api`).
- Les références de modèle sont analysées en séparant sur la **première** `/`. Utilisez `provider/model` lors de la saisie de `/model <ref>`.
- Si l'ID du modèle contient lui-même `/` (style OpenRouter), vous devez inclure le préfixe du fournisseur (exemple : `/model openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw traite l'entrée comme un alias ou un modèle pour le **fournisseur par défaut** (fonctionne uniquement lorsqu'il n'y a pas de `/` dans l'ID du modèle).

Comportement complet de la commande/configuration : [Commandes slash](/fr/tools/slash-commands).

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

Affiche les modèles configurés par défaut. Options utiles :

- `--all` : catalogue complet
- `--local` : fournisseurs locaux uniquement
- `--provider <name>` : filtrer par fournisseur
- `--plain` : un modèle par ligne
- `--json` : sortie lisible par machine

### `models status`

Affiche le modèle principal résolu, les solutions de repli, le modèle d'image et une vue d'ensemble de l'auth des fournisseurs configurés. Il affiche également l'état d'expiration OAuth pour les profils trouvés dans le magasin d'authentification (avertit dans les 24h par défaut). `--plain` n'affiche que le modèle principal résolu.
L'état OAuth est toujours affiché (et inclus dans la sortie `--json`). Si un fournisseur configuré n'a pas d'identifiants, `models status` affiche une section **Auth manquante**.
Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers`
(authentification effective par fournisseur).
Utilisez `--check` pour l'automatisation (exit `1` si manquant/expiré, `2` en cas d'expiration).

Le choix de l'auth dépend du fournisseur/compte. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement les plus prévisibles ; les flux de jetons d'abonnement sont également pris en charge.

Exemple (jeton de configuration Anthropic) :

```bash
claude setup-token
openclaw models status
```

## Analyse (modèles gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de modèles gratuits** d'OpenRouter et peut
optionnellement sonder les modèles pour la prise en charge des outils et des images.

Options clés :

- `--no-probe` : ignorer les sondages en direct (métadonnées uniquement)
- `--min-params <b>` : taille minimale des paramètres (milliards)
- `--max-age-days <days>` : ignorer les modèles plus anciens
- `--provider <name>` : filtre de préfixe de provider
- `--max-candidates <n>` : taille de la liste de repli
- `--set-default` : définir `agents.defaults.model.primary` à la première sélection
- `--set-image` : définir `agents.defaults.imageModel.primary` à la première sélection d'image

La sonde nécessite une clé API OpenRouter issue des profils d'authentification ou de `OPENROUTER_API_KEY`. Sans clé, utilisez `--no-probe` pour lister uniquement les candidats.

Les résultats du scan sont classés par :

1. Support des images
2. Latence des outils
3. Taille du contexte
4. Nombre de paramètres

Entrée

- Liste `/models` OpenRouter (filtre `:free`)
- Nécessite une clé API OpenRouter issue des profils d'authentification ou de `OPENROUTER_API_KEY` (voir [/environment](/fr/help/environment))
- Filtres optionnels : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de sonde : `--timeout`, `--concurrency`

Lorsqu'il est exécuté dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode non-interactif, passez `--yes` pour accepter les valeurs par défaut.

## Registre des modèles (`models.json`)

Les providers personnalisés dans `models.providers` sont écrits dans `models.json` sous le
répertoire de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier
est fusionné par défaut sauf si `models.mode` est défini à `replace`.

Priorité du mode de fusion pour les ID de provider correspondants :

- Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent l'emporte.
- Un `apiKey` non vide dans le `models.json` de l'agent l'emporte uniquement si ce provider n'est pas géré par SecretRef dans le contexte de configuration/auth-profile actuel.
- Les valeurs `apiKey` du fournisseur géré par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exécutable) au lieu de conserver les secrets résolus.
- Les valeurs d'en-tête du fournisseur géré par SecretRef sont actualisées à partir des marqueurs de source (`secretref-env:ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exécutable).
- Les `apiKey`/`baseUrl` de l'agent vides ou manquantes reviennent au `models.providers` de la configuration.
- Les autres champs du fournisseur sont actualisés à partir de la configuration et des données normalisées du catalogue.

La persistance des marqueurs est soumise à l'autorité de la source : OpenClaw écrit les marqueurs à partir de l'instantané de la configuration source active (pré-résolution), et non à partir des valeurs de secret d'exécution résolues.
Cela s'applique chaque fois que OpenClaw régénère `models.json`, y compris les chemins pilotés par commande tels que `openclaw agent`.

import fr from "/components/footer/fr.mdx";

<fr />
