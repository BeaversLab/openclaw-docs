---
summary: "Modèles CLI : liste, définition, alias, replis, analyse, état"
read_when:
  - Ajout ou modification de la CLI de modèles (models list/set/scan/aliases/fallbacks)
  - Modification du comportement de repli du modèle ou de l'UX de sélection
  - Mise à jour des sondes d'analyse de modèle (tools/images)
title: "Modèles CLI"
---

# Modèles CLI

Voir [/concepts/model-failover](/fr/concepts/model-failover) pour la rotation
des profils d'authentification, les temps de recharge et la manière dont cela interagit avec les replis.
Aperçu rapide du provider + exemples : [/concepts/model-providers](/fr/concepts/model-providers).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

1. Modèle **principal** (`agents.defaults.model.primary` ou `agents.defaults.model`).
2. **Replis** dans `agents.defaults.model.fallbacks` (dans l'ordre).
3. Le **repli en cas d'échec d'authentification du provider** se produit à l'intérieur d'un provider avant de passer au
   modèle suivant.

Connexes :

- `agents.defaults.models` est la liste d'autorisation/le catalogue des modèles que OpenClaw peut utiliser (plus les alias).
- `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images.
- `agents.defaults.imageGenerationModel` est utilisé par la capacité partagée de génération d'images. S'il est omis, `image_generate` peut toujours déduire une valeur par défaut du provider à partir des plugins de génération d'images compatibles et prenant en charge l'authentification.
- Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus les liaisons (voir [/concepts/multi-agent](/fr/concepts/multi-agent)).

## Politique rapide de modèle

- Définissez votre principal sur le modèle le plus puissant de la dernière génération disponible pour vous.
- Utilisez les replis pour les tâches sensibles aux coûts/à la latence et les discussions moins critiques.
- Pour les agents activant des tools ou les entrées non fiables, évitez les anciennes classes de modèles plus faibles.

## Onboarding (recommandé)

Si vous ne souhaitez pas modifier la configuration manuellement, exécutez l'onboarding :

```bash
openclaw onboard
```

Il peut configurer le modèle + l'authentification pour les providers courants, notamment l'**abonnement OpenAI Code (Codex)
** (OAuth) et **Anthropic** (clé API ou `claude setup-token`).

## Clés de configuration (aperçu)

- `agents.defaults.model.primary` et `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` et `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` et `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (liste d'autorisation + alias + params du provider)
- `models.providers` (fournisseurs personnalisés écrits dans `models.json`)

Les références de modèle sont normalisées en minuscules. Les alias de fournisseur comme `z.ai/*` sont normalisés en `zai/*`.

Les exemples de configuration de fournisseur (y compris OpenCode) se trouvent dans [/gateway/configuration](/fr/gateway/configuration#opencode).

## "Model is not allowed" (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **allowlist** (liste blanche) pour `/model` et pour les remplacements de session. Lorsqu'un utilisateur sélectionne un modèle qui n'est pas dans cette liste blanche, OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner l'impression qu'il "n'a pas répondu". La solution consiste soit à :

- Ajouter le modèle à `agents.defaults.models`, ou
- Effacer la liste blanche (supprimer `agents.defaults.models`), ou
- Choisir un modèle parmi `/model list`.

Exemple de configuration de liste blanche :

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

Vous pouvez changer de modèle pour la session en cours sans redémarrer :

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

Notes :

- `/model` (et `/model list`) est un sélecteur compact numéroté (famille de modèles + fournisseurs disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le fournisseur et le modèle, ainsi qu'une étape de soumission.
- `/model <#>` sélectionne dans ce sélecteur.
- `/model status` est la vue détaillée (candidats d'authentification et, lorsque configuré, point de terminaison du fournisseur `baseUrl` + mode `api`).
- Les références de modèle sont analysées en séparant au niveau du **premier** `/`. Utilisez `provider/model` lors de la saisie de `/model <ref>`.
- Si l'ID du modèle contient lui-même `/` (style OpenRouter), vous devez inclure le préfixe du fournisseur (exemple : `/model openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw traite la saisie comme un alias ou un modèle pour le **fournisseur par défaut** (fonctionne uniquement lorsqu'il n'y a pas de `/` dans l'ID du modèle).

Comportement/configuration complète de la commande : [Slash commands](/fr/tools/slash-commands).

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

Affiche le modèle principal résolu, les replis, le modèle d'image et un aperçu de l'authentification des fournisseurs configurés. Il affiche également l'état d'expiration OAuth pour les profils trouvés dans le magasin d'authentification (avertit par défaut dans les 24h). `--plain` n'affiche que le modèle principal résolu.
L'état OAuth est toujours affiché (et inclus dans la sortie `--json`). Si un fournisseur configuré n'a pas d'identifiants, `models status` affiche une section **Auth manquante**.
Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers` (authentification effective par fournisseur).
Utilisez `--check` pour l'automatisation (exit `1` en cas d'absence ou d'expiration, `2` en cas d'expiration proche).

Le choix d'authentification dépend du fournisseur/compte. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement les plus prévisibles ; les flux de jetons d'abonnement sont également pris en charge.

Exemple (jeton de configuration Anthropic) :

```bash
claude setup-token
openclaw models status
```

## Analyse (modèles gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de modèles gratuits** de OpenRouter et peut éventuellement sonder les modèles pour le support des outils et des images.

Indicateurs clés :

- `--no-probe` : ignorer les sondages en direct (métadonnées uniquement)
- `--min-params <b>` : taille minimale des paramètres (milliards)
- `--max-age-days <days>` : ignorer les modèles plus anciens
- `--provider <name>` : filtre de préfixe de fournisseur
- `--max-candidates <n>` : taille de la liste de repli
- `--set-default` : définir `agents.defaults.model.primary` sur la première sélection
- `--set-image` : définir `agents.defaults.imageModel.primary` sur la première sélection d'image

La sonde nécessite une clé OpenRouter API (à partir des profils d'authentification ou
`OPENROUTER_API_KEY`). Sans clé, utilisez `--no-probe` pour lister uniquement les candidats.

Les résultats de l'analyse sont classés par :

1. Prise en charge des images
2. Latence de l'outil
3. Taille du contexte
4. Nombre de paramètres

Entrée

- Liste `/models` OpenRouter (filtre `:free`)
- Nécessite une clé OpenRouter API à partir des profils d'authentification ou `OPENROUTER_API_KEY` (voir [/environment](/fr/help/environment))
- Filtres facultatifs : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de sonde : `--timeout`, `--concurrency`

Lorsqu'elle est exécutée dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode non
interactif, passez `--yes` pour accepter les valeurs par défaut.

## Registre des modèles (`models.json`)

Les fournisseurs personnalisés dans `models.providers` sont écrits dans `models.json` sous le
répertoire de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier
est fusionné par défaut sauf si `models.mode` est défini sur `replace`.

Priorité du mode de fusion pour les ID de fournisseur correspondants :

- Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent l'emporte.
- Un `apiKey` non vide dans le `models.json` de l'agent l'emporte uniquement lorsque ce fournisseur n'est pas géré par SecretRef dans le contexte de configuration/profil d'authentification actuel.
- Les valeurs `apiKey` du fournisseur géré par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références file/exec) au lieu de conserver les secrets résolus.
- Les valeurs d'en-tête du fournisseur géré par SecretRef sont actualisées à partir des marqueurs de source (`secretref-env:ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références file/exec).
- Un `apiKey`/`baseUrl` de l'agent vide ou manquant revient à la configuration `models.providers`.
- Les autres champs du fournisseur sont actualisés à partir de la configuration et des données du catalogue normalisées.

La persistance des marqueurs est basée sur la source : OpenClaw écrit les marqueurs à partir de l'instantané actif de la configuration source (pré-résolution), et non à partir des valeurs secrètes d'exécution résolues.
Cela s'applique chaque fois que OpenClaw régénère `models.json`, y compris les chemins pilotés par des commandes comme `openclaw agent`.

import fr from "/components/footer/fr.mdx";

<fr />
