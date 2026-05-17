---
summary: "CLI de modèles : liste, définition, alias, secours, analyse, statut"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modèles"
sidebarTitle: "CLIModels CLI"
---

<CardGroup cols={2}>
  <Card title="Model failover" href="/fr/concepts/model-failover">
    Rotation du profil d'authentification, temps de refroidissement et interaction avec les basculements.
  </Card>
  <Card title="Model providers" href="/fr/concepts/model-providers">
    Aperçu rapide des fournisseurs et exemples.
  </Card>
  <Card title="Agent runtimes" href="/fr/concepts/agent-runtimes">
    PI, Codex et autres runtimes de boucle d'agent.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/config-agents#agent-defaults">
    Clés de configuration du modèle.
  </Card>
</CardGroup>

Les références de modèle choisissent un fournisseur et un modèle. Elles ne choisissent généralement pas le runtime d'agent de bas niveau. Les références d'agent OpenAI constituent la principale exception : `openai/gpt-5.5` s'exécute par défaut via le runtime du serveur d'application Codex sur le fournisseur OpenAI officiel. Les substitutions explicites de runtime appartiennent à la stratégie du fournisseur/modèle, et non à l'agent ou à la session entière. En mode runtime Codex, la référence `openai/gpt-*` n'implique pas la facturation par clé API ; l'authentification peut provenir d'un compte Codex ou d'un profil d'authentification `openai-codex`. Voir [Agent runtimes](/fr/concepts/agent-runtimes).

## Fonctionnement de la sélection de modèle

OpenClaw sélectionne les modèles dans cet ordre :

<Steps>
  <Step title="Primary model">`agents.defaults.model.primary` (ou `agents.defaults.model`).</Step>
  <Step title="Fallbacks">`agents.defaults.model.fallbacks` (dans l'ordre).</Step>
  <Step title="Provider auth failover">Le basculement d'authentification se produit à l'intérieur d'un fournisseur avant de passer au modèle suivant.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Surfaces de modèle associées">
    - `agents.defaults.models` est la liste d'autorisation/le catalogue de modèles que OpenClaw peut utiliser (plus les alias). Utilisez les entrées `provider/*` pour limiter les fournisseurs visibles tout en gardant la découverte de fournisseurs dynamique.
    - `agents.defaults.imageModel` est utilisé **uniquement lorsque** le modèle principal ne peut pas accepter d'images.
    - `agents.defaults.pdfModel` est utilisé par l'outil `pdf`. S'il est omis, l'outil revient à `agents.defaults.imageModel`, puis au modèle de session/défaut résolu.
    - `agents.defaults.imageGenerationModel` est utilisé par la capacité de génération d'images partagée. S'il est omis, `image_generate` peut toujours déduire un fournisseur par défaut pris en charge par l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération d'images enregistrés restants par ordre d'ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'authentification/API de ce fournisseur.
    - `agents.defaults.musicGenerationModel` est utilisé par la capacité de génération de musique partagée. S'il est omis, `music_generate` peut toujours déduire un fournisseur par défaut pris en charge par l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération de musique enregistrés restants par ordre d'ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'authentification/API de ce fournisseur.
    - `agents.defaults.videoGenerationModel` est utilisé par la capacité de génération de vidéo partagée. S'il est omis, `video_generate` peut toujours déduire un fournisseur par défaut pris en charge par l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération de vidéo enregistrés restants par ordre d'ID de fournisseur. Si vous définissez un fournisseur/modèle spécifique, configurez également la clé d'authentification/API de ce fournisseur.
    - Les valeurs par défaut par agent peuvent remplacer `agents.defaults.model` via `agents.list[].model` plus des liaisons (voir [Routage multi-agent](/fr/concepts/multi-agent)).

  </Accordion>
</AccordionGroup>

## Source de sélection et comportement de repli

Le même `provider/model` peut signifier différentes choses selon sa provenance :

- Les valeurs par défaut configurées (`agents.defaults.model.primary` et les principaux spécifiques aux agents) constituent le point de départ normal et utilisent `agents.defaults.model.fallbacks`.
- Les sélections de repli automatique sont un état de récupération temporaire. Elles sont stockées avec `modelOverrideSource: "auto"` afin que les tours suivants puissent continuer à utiliser la chaîne de repli sans sonder d'abord un principal connu comme défaillant.
- Les sélections de session utilisateur sont exactes. `/model`, le sélecteur de modèle, `session_status(model=...)` et `sessions.patch` stockent `modelOverrideSource: "user"` ; si le fournisseur/modèle sélectionné est inaccessible, OpenClaw échoue visiblement au lieu de passer à un autre modèle configuré.
- Le Cron `--model` / la payload `model` est un principal par tâche. Il utilise toujours les replis configurés, sauf si la tâche fournit une `fallbacks` de payload explicite (utilisez `fallbacks: []` pour une exécution Cron stricte).
- Les sélecteurs default-model et allowlist de la CLI respectent `models.mode: "replace"` en listant des `models.providers.*.models` explicites au lieu de charger le catalogue intégré complet.
- Le sélecteur de modèle de l'interface de contrôle demande au Gateway sa vue de modèle configurée : `agents.defaults.models` si présent, y compris les entrées `provider/*` à l'échelle du fournisseur, sinon des `models.providers.*.models` explicites plus les fournisseurs avec une authentification utilisable. Le catalogue intégré complet est réservé aux vues de navigation explicites telles que `models.list` avec `view: "all"` ou `openclaw models list --all`.

## Politique rapide de modèle

- Définissez votre principal sur le modèle le plus puissant de la dernière génération disponible pour vous.
- Utilisez les replis pour les tâches sensibles aux coûts/à la latence et pour les discussions moins critiques.
- Pour les agents activant des outils ou les entrées non fiables, évitez les niveaux de modèle plus anciens ou plus faibles.

## Onboarding (recommandé)

Si vous ne souhaitez pas modifier la configuration manuellement, lancez l'onboarding :

```bash
openclaw onboard
```

Il peut configurer le modèle + l'authentification pour les fournisseurs courants, notamment l'abonnement **OpenAI Code (Codex)** (OAuth) et **Anthropic** (clé API ou CLI Claude).

## Clés de configuration (aperçu)

- `agents.defaults.model.primary` et `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` et `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` et `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` et `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` et `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (allowlist + alias + paramètres du fournisseur + entrées de fournisseur dynamique `provider/*`)
- `models.providers` (fournisseurs personnalisés écrits dans `models.json`)

<Note>
Les références de modèle sont normalisées en minuscules. Les alias de fournisseur comme `z.ai/*` sont normalisés en `zai/*`.

Des exemples de configuration de fournisseurs (y compris OpenCode) sont disponibles dans [OpenCode](/fr/providers/opencode).

</Note>

### Modifications sûres de la liste blanche

Utilisez des écritures additives lors de la mise à jour manuelle de `agents.defaults.models` :

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Règles de protection contre l'écrasement">
    `openclaw config set` protège les cartes model/provider des écrasements accidentels. Une affectation d'objet simple à `agents.defaults.models`, `models.providers` ou `models.providers.<id>.models` est rejetée lorsqu'elle supprimerait des entrées existantes. Utilisez `--merge` pour les modifications additives ; utilisez `--replace` uniquement lorsque la valeur fournie doit devenir la valeur cible complète.

    La configuration interactive du provider et `openclaw configure --section model` fusionnent également les selections étendues au provider dans la liste d'autorisation existante, donc l'ajout de Codex, Ollama ou un autre provider ne supprime pas les entrées de model non liées. Configure préserve un `agents.defaults.model.primary` existant lorsque l'authentification du provider est réappliquée. Les commandes explicites de définition par défaut telles que `openclaw models auth login --provider <id> --set-default` et `openclaw models set <model>` remplacent toujours `agents.defaults.model.primary`.

  </Accordion>
</AccordionGroup>

## "Le modèle n'est pas autorisé" (et pourquoi les réponses s'arrêtent)

Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et pour les overrides de session. Lorsqu'un utilisateur sélectionne un modèle qui n'est pas dans cette liste d'autorisation, OpenClaw renvoie :

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
Cela se produit **avant** qu'une réponse normale ne soit générée, le message peut donc donner l'impression qu'il "n'a pas répondu". La solution consiste à :

- Ajouter le modèle à `agents.defaults.models`, ou
- Effacer la liste d'autorisation (supprimer `agents.defaults.models`), ou
- Choisir un modèle parmi `/model list`.

</Warning>

Lorsque la commande rejetée incluait un override de runtime tel que `/model openai/gpt-5.5 --runtime codex`, corrigez d'abord la liste d'autorisation, puis réessayez la même commande `/model ... --runtime ...`. Pour l'exécution native de Codex, le modèle sélectionné est toujours `openai/gpt-5.5` ; le runtime `codex` sélectionne le harnais et utilise l'authentification Codex séparément.

Pour les modèles locaux/GGUF, stockez la référence complète préfixée par le fournisseur dans la liste blanche (allowlist),
par exemple `ollama/gemma4:26b`, `lmstudio/Gemma4-26b-a4-it-gguf`, ou le
fournisseur/modèle exact affiché par `openclaw models list --provider <provider>`.
Les noms de fichiers locaux simples ou les noms d'affichage ne suffisent pas lorsque la liste blanche est
active.

Si vous souhaitez limiter les fournisseurs sans lister manuellement chaque modèle, ajoutez
des entrées `provider/*` à `agents.defaults.models` :

```json5
{
  agents: {
    defaults: {
      models: {
        "openai-codex/*": {},
        "vllm/*": {},
      },
    },
  },
}
```

Avec cette stratégie, `/model`, `/models` et les sélecteurs de modèles affichent le catalogue
découvert pour ces fournisseurs uniquement. Les nouveaux modèles des fournisseurs sélectionnés peuvent
apparaître sans modifier la liste blanche. Les entrées exactes `provider/model` peuvent être mélangées
avec des entrées `provider/*` lorsque vous avez besoin d'un modèle spécifique d'un autre fournisseur.

Exemple de configuration de liste blanche :

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4-6" },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
}
```

## Changer de modèles dans le chat (`/model`)

Vous pouvez changer de modèles pour la session actuelle sans redémarrer :

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="Comportement du sélecteur">
    - `/model` (et `/model list`) est un sélecteur compact numéroté (famille de modèles + fournisseurs disponibles).
    - Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes pour le fournisseur et le modèle, plus une étape de soumission.
    - Sur Telegram, les sélections du sélecteur `/models` sont limitées à la session ; elles ne modifient pas le défaut persistant de l'agent dans `openclaw.json`.
    - `/models add` est obsolète et renvoie désormais un message d'obsolescence au lieu d'enregistrer des modèles depuis le chat.
    - `/model <#>` effectue une sélection à partir de ce sélecteur.

  </Accordion>
  <Accordion title="Persistence and live switching">
    - `/model`OpenClaw enregistre immédiatement la nouvelle sélection de session.
    - Si l'agent est inactif, la prochaine exécution utilise le nouveau modèle immédiatement.
    - Si une exécution est déjà en cours, OpenClaw marque le changement à chaud comme en attente et redémarre uniquement avec le nouveau modèle à un point de réessai propre.
    - Si l'activité de l'outil ou la sortie de la réponse a déjà commencé, le changement en attente peut rester en file jusqu'à une prochaine opportunité de réessai ou au prochain tour de l'utilisateur.
    - Une référence `/model` sélectionnée par l'utilisateur est stricte pour cette session : si le fournisseur/modèle sélectionné est inaccessible, la réponse échoue de manière visible au lieu de répondre silencieusement à partir de `agents.defaults.model.fallbacks`. Cela diffère des valeurs par défaut configurées et des primaires des tâches cron, qui peuvent toujours utiliser des chaînes de repli.
    - `/model status` est la vue détaillée (candidats d'authentification et, lorsque configuré, point de terminaison du fournisseur `baseUrl` + mode `api`).

  </Accordion>
  <Accordion title="Ref parsing">
    - Les références de modèle sont analysées en divisant sur la **première** occurrence de `/`. Utilisez `provider/model` lors de la saisie de `/model <ref>`.
    - Si l'ID du modèle contient lui-même `/`OpenRouter (style OpenRouter), vous devez inclure le préfixe du fournisseur (exemple : `/model openrouter/moonshotai/kimi-k2`OpenClawOpenClaw).
    - Si vous omettez le fournisseur, OpenClaw résout l'entrée dans cet ordre :
      1. correspondance d'alias
      2. correspondance unique de fournisseur configuré pour cet ID de modèle exact sans préfixe
      3. repli obsolète vers le fournisseur par défaut configuré — si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient plutôt au premier fournisseur/modèle configuré pour éviter d'afficher une valeur par défaut périmée d'un fournisseur supprimé.
  </Accordion>
</AccordionGroup>

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

Affiche les models configurés/disponibles via auth par défaut. Indicateurs utiles :

<ParamField path="--all" type="boolean">
  Catalogue complet. Inclut les lignes de catalogue statique détenues par le provider et groupées avant que l'auth ne soit configurée, afin que les vues de découverte uniquement puissent afficher des models qui sont indisponibles jusqu'à ce que vous ajoutiez des informations d'identification de provider correspondantes.
</ParamField>
<ParamField path="--local" type="boolean">
  Providers locaux uniquement.
</ParamField>
<ParamField path="--provider <id>" type="string">
  Filtrer par id de provider, par exemple `moonshot`. Les libellés d'affichage des sélecteurs interactifs ne sont pas acceptés.
</ParamField>
<ParamField path="--plain" type="boolean">
  Un model par ligne.
</ParamField>
<ParamField path="--json" type="boolean">
  Sortie lisible par machine.
</ParamField>

### `models status`

Affiche le model principal résolu, les replis, le model d'image et un aperçu de l'auth des providers configurés. Il signale également le statut d'expiration OAuth pour les profils trouvés dans le magasin d'auth (avertit par défaut dans les 24h). `--plain` n'affiche que le model principal résolu.

<AccordionGroup>
  <Accordion title="Comportement d'authentification et de sonde">
    - Le statut OAuth est toujours affiché (et inclus dans la sortie `--json`). Si un fournisseur configuré n'a pas d'identifiants, `models status` affiche une section **Missing auth**.
    - Le JSON inclut `auth.oauth` (fenêtre d'avertissement + profils) et `auth.providers` (authentification effective par fournisseur, y compris les identifiants basés sur les variables d'environnement). `auth.oauth` concerne uniquement la santé des profils du magasin d'authentification ; les fournisseurs basés uniquement sur les variables d'environnement n'y apparaissent pas.
    - Utilisez `--check` pour l'automatisation (sortie `1` en cas d'absence ou d'expiration, `2` en cas d'expiration imminente).
    - Utilisez `--probe` pour les vérifications d'authentification en direct ; les lignes de sonde peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
    - Si un `auth.order.<provider>` explicite omet un profil stocké, la sonde signale `excluded_by_auth_order` au lieu de l'essayer. Si une authentification existe mais qu'aucun modèle sondeable ne peut être résolu pour ce fournisseur, la sonde signale `status: no_model`.

  </Accordion>
</AccordionGroup>

<Note>Le choix d'authentification dépend du fournisseur/du compte. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement les plus prévisibles ; la réutilisation du CLI Claude et les profils Anthropic OAuth/token existants sont également pris en charge.</Note>

Exemple (Claude CLI) :

```bash
claude auth login
openclaw models status
```

## Analyse (modèles gratuits OpenRouter)

`openclaw models scan` inspecte le **catalogue de modèles gratuits** de OpenRouter et peut sonder facultativement les modèles pour le support des outils et des images.

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
  Le catalogue OpenRouter `/models` est public, les sondages de métadonnées uniquement peuvent donc lister les candidats gratuits sans clé. Les sondages et l'inférence nécessitent toujours une clé OpenRouter de l'API (à partir des profils d'authentification ou de `OPENROUTER_API_KEY`). Si aucune clé n'est disponible, `openclaw models scan` revient à une sortie de métadonnées uniquement et laisse
  la configuration inchangée. Utilisez `--no-probe` pour demander explicitement le mode métadonnées uniquement.
</Note>

Les résultats du scan sont classés par :

1. Prise en charge des images
2. Latence des outils
3. Taille du contexte
4. Nombre de paramètres

Entrée :

- Liste OpenRouter `/models` (filtre `:free`)
- Les sondages en direct nécessitent une clé OpenRouter API à partir des profils d'authentification ou de `OPENROUTER_API_KEY` (voir [Variables d'environnement](/fr/help/environment))
- Filtres optionnels : `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Contrôles de requête/sondage : `--timeout`, `--concurrency`

Lorsque les sondes en direct s'exécutent dans un TTY, vous pouvez sélectionner les replis de manière interactive. En mode non interactif, passez `--yes` pour accepter les valeurs par défaut. Les résultats contenant uniquement des métadonnées sont informatifs ; `--set-default` et `--set-image`OpenClawOpenRouter nécessitent des sondes en direct, donc OpenClaw ne configure pas un modèle OpenRouter sans clé inutilisable.

## Registre des modèles (`models.json`)

Les fournisseurs personnalisés dans `models.providers` sont écrits dans `models.json` sous le répertoire de l'agent (par défaut `~/.openclaw/agents/<agentId>/agent/models.json`). Ce fichier est fusionné par défaut, sauf si `models.mode` est défini sur `replace`.

<AccordionGroup>
  <Accordion title="Priorité du mode de fusion">
    Priorité du mode de fusion pour les ID de fournisseur correspondants :

    - Un `baseUrl` non vide déjà présent dans le `models.json` de l'agent l'emporte.
    - Un `apiKey` non vide dans le `models.json` de l'agent ne l'emporte que si ce fournisseur n'est pas géré par SecretRef dans le contexte de configuration/profil d'authentification actuel.
    - Les valeurs `apiKey` des fournisseurs gérés par SecretRef sont actualisées à partir des marqueurs sources (`ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exec) au lieu de persister les secrets résolus.
    - Les valeurs d'en-tête des fournisseurs gérés par SecretRef sont actualisées à partir des marqueurs sources (`secretref-env:ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exec).
    - Les `apiKey`/`baseUrl` de l'agent vides ou manquants reviennent à la `models.providers` de configuration.
    - Les autres champs du fournisseur sont actualisés à partir de la configuration et des données du catalogue normalisées.

  </Accordion>
</AccordionGroup>

<Note>La persistance des marqueurs est basée sur la source : OpenClaw écrit les marqueurs à partir de l'instantané actif de la configuration source (pré-résolution), et non à partir des valeurs de secret d'exécution résolues. Cela s'applique chaque fois qu'OpenClaw régénère OpenClawOpenClaw`models.json`, y compris pour les chemins pilotés par commande comme `openclaw agent`.</Note>

## Connexes

- [Runtimes d'agent](/fr/concepts/agent-runtimes) — PI, Codex et autres runtimes de boucle d'agent
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) — clés de configuration de model
- [Génération d'images](/fr/tools/image-generation) — configuration de model d'image
- [Basculement de model](/fr/concepts/model-failover) — chaînes de repli
- [Providers de model](/fr/concepts/model-providers) — routage et authentification des providers
- [Génération de musique](/fr/tools/music-generation) — configuration de model de musique
- [Génération de vidéo](/fr/tools/video-generation) — configuration de model de vidéo
