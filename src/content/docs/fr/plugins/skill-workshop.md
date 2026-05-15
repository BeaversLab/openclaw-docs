---
summary: "Capture expérimentale de procédures réutilisables en tant que compétences de l'espace de travail avec révision, approbation, quarantaine et rafraîchissement à chaud des compétences"
title: "Plugin Skill Workshop"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

Skill Workshop est **expérimental**. Il est désactivé par défaut, ses heuristiques
de capture et ses invites de révision peuvent changer d'une version à l'autre, et les
écritures automatiques ne doivent être utilisées que dans des espaces de travail de confiance
après avoir examiné d'abord la sortie en mode attente.

Skill Workshop est la mémoire procédurale pour les compétences de l'espace de travail. Il permet à un agent de transformer
les flux de travail réutilisables, les corrections des utilisateurs, les correctifs difficiles à obtenir et les pièges récurrents
en fichiers `SKILL.md` sous :

```text
<workspace>/skills/<skill-name>/SKILL.md
```

Cela diffère de la mémoire à long terme :

- La **Mémoire** stocke des faits, des préférences, des entités et le contexte passé.
- Les **Compétences** stockent des procédures réutilisables que l'agent doit suivre lors des futures tâches.
- **Skill Workshop** est le pont entre un tour utile et une compétence durable
  de l'espace de travail, avec des vérifications de sécurité et une approbation facultative.

Skill Workshop est utile lorsque l'agent apprend une procédure telle que :

- comment valider les assets GIF animés provenant de sources externes
- comment remplacer les assets de captures d'écran et vérifier les dimensions
- comment exécuter un scénario QA spécifique au dépôt
- comment déboguer une panne récurrente du fournisseur
- comment réparer une note de flux de travail locale obsolète

Il n'est pas prévu pour :

- des faits comme « l'utilisateur aime le bleu »
- une mémoire autobiographique large
- l'archivage de transcriptions brutes
- des secrets, des identifiants ou du texte d'invite caché
- des instructions ponctuelles qui ne se répéteront pas

## État par défaut

Le plugin groupé est **expérimental** et **désactivé par défaut**, sauf s'il est
explicitement activé dans `plugins.entries.skill-workshop`.

Le manifeste du plugin ne définit pas `enabledByDefault: true`. La valeur par défaut `enabled: true`
dans le schéma de configuration du plugin ne s'applique qu'après l'entrée du plugin
a déjà été sélectionnée et chargée.

Expérimental signifie :

- le plugin est suffisamment pris en charge pour des tests opt-in et le dogfooding
- le stockage des propositions, les seuils de révision et les heuristiques de capture peuvent évoluer
- l'approbation en attente est le mode de démarrage recommandé
- l'application automatique est destinée aux configurations personnelles/de l'espace de travail de confiance, et non aux environnements partagés ou hostiles
  fortement chargés en entrées

## Activer

Configuration minimale sûre :

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "pending",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

Avec cette configuration :

- l'outil `skill_workshop` est disponible
- les corrections réutilisables explicites sont mises en file d'attente en tant que propositions en attente
- les passes de révision basées sur un seuil peuvent proposer des mises à jour de compétences
- aucun fichier de compétence n'est écrit tant qu'une proposition en attente n'est pas appliquée

Utilisez les écritures automatiques uniquement dans les espaces de travail de confiance :

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "auto",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

`approvalPolicy: "auto"` utilise toujours le même scanner et le même chemin de quarantaine. Il
n'applique pas les propositions avec des résultats critiques.

## Configuration

| Clé                  | Par défaut  | Plage / valeurs                             | Signification                                                                                    |
| -------------------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `enabled`            | `true`      | booléen                                     | Active le plugin après le chargement de l'entrée du plugin.                                      |
| `autoCapture`        | `true`      | booléen                                     | Active la capture/révision post-tour sur les tours réussis de l'agent.                           |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | Mettre en file d'attente les propositions ou écrire automatiquement les propositions sûres.      |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | Choisit la capture de correction explicite, le réviseur LLM, les deux, ou aucun.                 |
| `reviewInterval`     | `15`        | `1..200`                                    | Exécuter le réviseur après ce nombre de tours réussis.                                           |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | Exécuter le réviseur après ce nombre d'appels d'outils observés.                                 |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | Délai d'expiration pour l'exécution du réviseur intégré.                                         |
| `maxPending`         | `50`        | `1..200`                                    | Nombre maximal de propositions en attente/mises en quarantaine conservées par espace de travail. |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | Taille maximale des fichiers de compétence/support générés.                                      |

Profils recommandés :

```json5
// Conservative: explicit tool use only, no automatic capture.
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// Review-first: capture automatically, but require approval.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "hybrid",
}
```

```json5
// Trusted automation: write safe proposals immediately.
{
  autoCapture: true,
  approvalPolicy: "auto",
  reviewMode: "hybrid",
}
```

```json5
// Low-cost: no reviewer LLM call, only explicit correction phrases.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## Chemins de capture

Skill Workshop a trois chemins de capture.

### Suggestions d'outils

Le modèle peut appeler `skill_workshop` directement lorsqu'il voit une procédure
réutilisable ou lorsque l'utilisateur lui demande d'enregistrer/mettre à jour une compétence.

Il s'agit du chemin le plus explicite et fonctionne même avec `autoCapture: false`.

### Capture heuristique

Lorsque `autoCapture` est activé et que `reviewMode` est `heuristic` ou `hybrid`, le
plugin analyse les tours réussis pour trouver des phrases de correction explicite de l'utilisateur :

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

L'heuristique crée une proposition à partir de la dernière instruction utilisateur correspondante. Elle
utilise des indices de sujet pour choisir des noms de compétences pour les workflows courants :

- tâches GIF animé -> `animated-gif-workflow`
- tâches de capture d'écran ou de ressource -> `screenshot-asset-workflow`
- tâches QA ou de scénario -> `qa-scenario-workflow`
- tâches de PR GitHub -> `github-pr-workflow`
- secours -> `learned-workflows`

La capture heuristique est intentionnellement limitée. Elle est destinée aux corrections claires et
aux notes de processus reproductibles, et non à la résumé général des transcriptions.

### Relecteur LLM

Lorsque `autoCapture` est activé et que `reviewMode` est `llm` ou `hybrid`, le plugin
exécute un relecteur intégré compact une fois les seuils atteints.

Le relecteur reçoit :

- le texte de la transcription récente, limité aux 12 000 derniers caractères
- jusqu'à 12 compétences de l'espace de travail existantes
- jusqu'à 2 000 caractères de chaque compétence existante
- instructions JSON uniquement

Le relecteur n'a aucun outil :

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

Le réviseur renvoie soit `{ "action": "none" }` soit une proposition. Le champ `action` est `create`, `append` ou `replace` - privilégiez `append`/`replace` lorsqu'une compétence pertinente existe déjà ; utilisez `create` uniquement si aucune compétence existante ne convient.

Exemple `create` :

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "Media Asset QA",
  "reason": "Reusable animated media acceptance workflow",
  "description": "Validate externally sourced animated media before product use.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution.\n- Store a local approved copy.\n- Verify in product UI before final reply."
}
```

`append` ajoute `section` + `body`. `replace` échange `oldText` contre `newText` dans la compétence nommée.

## Cycle de vie des propositions

Chaque mise à jour générée devient une proposition avec :

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- optionnel `agentId`
- optionnel `sessionId`
- `skillName`
- `title`
- `reason`
- `source` : `tool`, `agent_end`, ou `reviewer`
- `status`
- `change`
- optionnel `scanFindings`
- optionnel `quarantineReason`

Statuts des propositions :

- `pending` - en attente d'approbation
- `applied` - écrit dans `<workspace>/skills`
- `rejected` - rejeté par l'opérateur/le modèle
- `quarantined` - bloqué par des résultats critiques de l'analyseur

L'état est stocké par espace de travail sous le répertoire d'état du Gateway :

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

Les propositions en attente et mises en quarantaine sont dédoublonnées par nom de compétence et payload de modification. Le stockage conserve les propositions en attente/mises en quarantaine les plus récentes jusqu'à `maxPending`.

## Référence d'outil

Le plugin enregistre un outil agent :

```text
skill_workshop
```

### `status`

Compte les propositions par état pour l'espace de travail actif.

```json
{ "action": "status" }
```

Format du résultat :

```json
{
  "workspaceDir": "/path/to/workspace",
  "pending": 1,
  "quarantined": 0,
  "applied": 3,
  "rejected": 0
}
```

### `list_pending`

Lister les propositions en attente.

```json
{ "action": "list_pending" }
```

Pour lister un autre statut :

```json
{ "action": "list_pending", "status": "applied" }
```

Valeurs `status` valides :

- `pending`
- `applied`
- `rejected`
- `quarantined`

### `list_quarantine`

Lister les propositions en quarantaine.

```json
{ "action": "list_quarantine" }
```

Utilisez ceci lorsque la capture automatique semble ne rien faire et que les journaux mentionnent `skill-workshop: quarantined <skill>`.

### `inspect`

Récupérer une proposition par id.

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

Créer une proposition. Avec `approvalPolicy: "pending"` (par défaut), cela met en file d'attente au lieu d'écrire.

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "Animated GIF Workflow",
  "reason": "User established reusable GIF validation rules.",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify the URL resolves to image/gif.\n- Confirm it has multiple frames.\n- Record attribution and license.\n- Avoid hotlinking when a local asset is needed."
}
```

<AccordionGroup>
  <Accordion title="Demander une écriture immédiate en mode automatique (apply: true)">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

Avec `approvalPolicy: "pending"`, `apply: true` met toujours la proposition en file d'attente. Passez-la en revue, puis utilisez
l'action `apply` après approbation.

  </Accordion>

  <Accordion title="Forcer l'état en attente sous la politique automatique (apply: false)">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

  </Accordion>

  <Accordion title="Ajouter à une section nommée">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

  </Accordion>

  <Accordion title="Remplacer le texte exact">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

  </Accordion>
</AccordionGroup>

### `apply`

Appliquer une proposition en attente.

Avec `approvalPolicy: "pending"`, cette action demande l'approbation de l'opérateur avant d'écrire
la compétence de l'espace de travail.

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` refuse les propositions mises en quarantaine :

```text
quarantined proposal cannot be applied
```

### `reject`

Marquer une proposition comme rejetée.

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

Écrire un fichier de support dans un répertoire de compétence existant ou proposé.

Répertoires de support de niveau supérieur autorisés :

- `references/`
- `templates/`
- `scripts/`
- `assets/`

Exemple :

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# Release Checklist\n\n- Run release docs.\n- Verify changelog.\n"
}
```

Les fichiers de support sont limités à l'espace de travail, vérifiés par chemin, limités en octets par
`maxSkillBytes`, analysés et écrits de manière atomique.

## Écritures de compétences

Skill Workshop écrit uniquement sous :

```text
<workspace>/skills/<normalized-skill-name>/
```

Les noms de compétences sont normalisés :

- en minuscules
- les exécutions non `[a-z0-9_-]` deviennent `-`
- les caractères non alphanumériques au début ou à la fin sont supprimés
- la longueur maximale est de 80 caractères
- le nom final doit correspondre à `[a-z0-9][a-z0-9_-]{1,79}`

Pour `create` :

- si la compétence n'existe pas, Skill Workshop écrit un nouveau `SKILL.md`
- si elle existe déjà, Skill Workshop ajoute le corps à `## Workflow`

Pour `append` :

- si la compétence existe, Skill Workshop ajoute à la section demandée
- si elle n'existe pas, Skill Workshop crée une compétence minimale puis ajoute

Pour `replace` :

- la compétence doit déjà exister
- `oldText` doit être présent exactement
- seule la première correspondance exacte est remplacée

Toutes les écritures sont atomiques et actualisent immédiatement l'instantané des compétences en mémoire, de sorte que
la nouvelle ou la compétence mise à jour peut devenir visible sans redémarrage du Gateway.

## Modèle de sécurité

Skill Workshop dispose d'un scanner de sécurité sur le contenu `SKILL.md` généré et les fichiers
de support.

Les résultats critiques mettent en quarantaine les propositions :

| ID de règle                            | Bloque le contenu qui...                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | dit à l'agent d'ignorer les instructions antérieures/supérieures                      |
| `prompt-injection-system`              | réfère à des invites système, des messages de développeur ou des instructions cachées |
| `prompt-injection-tool`                | encourage à contourner l'autorisation/approbation des outils                          |
| `shell-pipe-to-shell`                  | inclut `curl`/`wget` redirigé vers `sh`, `bash` ou `zsh`                              |
| `secret-exfiltration`                  | semble envoyer des données d'environnement/de processus sur le réseau                 |

Les avertissements sont conservés mais ne bloquent pas par eux-mêmes :

| ID de règle          | Avertit pour...                                 |
| -------------------- | ----------------------------------------------- |
| `destructive-delete` | commandes de style `rm -rf` larges              |
| `unsafe-permissions` | utilisation d'autorisation de style `chmod 777` |

Propositions mises en quarantaine :

- garder `scanFindings`
- garder `quarantineReason`
- apparaissent dans `list_quarantine`
- ne peuvent pas être appliquées via `apply`

Pour récupérer une proposition mise en quarantaine, créez une nouvelle proposition sûre avec le
contenu non sûr supprimé. N'éditez pas le JSON du magasin à la main.

## Conseils d'invite

Lorsqu'il est activé, Skill Workshop injecte une courte section d'invite qui indique à l'agent
d'utiliser `skill_workshop` pour une mémoire procédurale durable.

Les conseils soulignent :

- les procédures, pas les faits/préférences
- les corrections de l'utilisateur
- les procédures réussites non évidentes
- les pièges récurrents
- la réparation de compétences périmées/fines/incorrectes par ajout/remplacement
- sauvegarder la procédure réutilisable après de longues boucles d'outils ou des correctifs difficiles
- texte de compétence impératif court
- pas de vidages de transcription

Le texte du mode d'écriture change avec `approvalPolicy` :

- mode en attente : mettre les suggestions en file d'attente ; utiliser `apply` après approbation explicite
- mode automatique : appliquer les mises à jour sûres des compétences de l'espace de travail, sauf si `apply: false` les met en file d'attente à la place

## Coûts et comportement à l'exécution

La capture heuristique n'appelle pas de modèle.

La révision LLM utilise une exécution intégrée sur le modèle d'agent actif/défaut. Elle est basée sur un seuil et ne s'exécute donc pas à chaque tour par défaut.

Le réviseur :

- utilise le même contexte fournisseur/modèle configuré lorsque disponible
- revient aux valeurs par défaut de l'agent à l'exécution
- a `reviewTimeoutMs`
- utilise un contexte d'amorçage léger
- n'a aucun outil
- n'écrit rien directement
- peut uniquement émettre une proposition qui passe par le scanner normal et
  le chemin d'approbation/quarantaine

Si le réviseur échoue, expire ou renvoie du JSON invalide, le plugin enregistre un
message d'avertissement/débogage et ignore cette passe de révision.

## Modes opératoires

Utilisez Skill Workshop lorsque l'utilisateur dit :

- "la prochaine fois, fais X"
- "dorénavant, préfère Y"
- "assure-toi de vérifier Z"
- "enregistre ceci en tant que workflow"
- "cela a pris du temps ; souviens-toi du processus"
- "met à jour la compétence locale pour cela"

Bon texte de compétence :

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

Mauvais texte de compétence :

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

Raisons pour lesquelles la mauvaise version ne devrait pas être enregistrée :

- forme de transcription
- pas impératif
- inclut des détails ponctuels bruyants
- ne dit pas au prochain agent quoi faire

## Débogage

Vérifiez si le plugin est chargé :

```bash
openclaw plugins list --enabled
```

Vérifiez les nombres de propositions depuis un contexte agent/outil :

```json
{ "action": "status" }
```

Inspectez les propositions en attente :

```json
{ "action": "list_pending" }
```

Inspectez les propositions en quarantaine :

```json
{ "action": "list_quarantine" }
```

Symptômes courants :

| Symptôme                                                      | Cause probable                                                                                                    | Vérifier                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L'outil est indisponible                                      | L'entrée du plugin n'est pas activée                                                                              | `plugins.entries.skill-workshop.enabled` et `openclaw plugins list`            |
| Aucune proposition automatique n'apparaît                     | `autoCapture: false`, `reviewMode: "off"`, ou seuils non atteints                                                 | Configuration, statut de la proposition, journaux Gateway                      |
| L'heuristique n'a pas capturé                                 | Les termes de l'utilisateur ne correspondaient pas aux modèles de correction                                      | Utilisez `skill_workshop.suggest` explicite ou activez le réviseur LLM         |
| Le réviseur n'a pas créé de proposition                       | Le réviseur a renvoyé `none`, du JSON invalide ou a expiré                                                        | Journaux Gateway, `reviewTimeoutMs`, seuils                                    |
| La proposition n'est pas appliquée                            | `approvalPolicy: "pending"`                                                                                       | `list_pending`, puis `apply`                                                   |
| La proposition a disparu de la liste en attente               | Proposition en double réutilisée, nettoyage de l'attente maximale, ou a été appliquée/rejetée/mise en quarantaine | `status`, `list_pending` avec des filtres de statut, `list_quarantine`         |
| Le fichier de compétence existe mais le modèle ne le voit pas | L'instantané des compétences n'a pas été actualisé ou le filtrage des compétences l'exclut                        | Statut `openclaw skills` et éligibilité des compétences de l'espace de travail |

Journaux pertinents :

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## Scénarios de tests qualité

Scénarios de tests qualité basés sur le dépôt :

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

Exécuter la couverture déterministe :

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

Exécuter la couverture du réviseur :

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

Le scénario du réviseur est intentionnellement séparé car il active
`reviewMode: "llm"` et exerce la passe de révision intégrée.

## Quand ne pas activer l'application automatique

Évitez `approvalPolicy: "auto"` lorsque :

- l'espace de travail contient des procédures sensibles
- l'agent travaille sur des entrées non fiables
- les compétences sont partagées au sein d'une large équipe
- vous êtes toujours en train d'ajuster les invites ou les règles du scanner
- le modèle gère fréquemment du contenu web/e-mail hostile

Utilisez d'abord le mode en attente. Ne passez en mode automatique qu'après avoir examiné le type de
compétences que l'agent propose dans cet espace de travail.

## Documentation connexe

- [Skills](/fr/tools/skills)
- [Plugins](/fr/tools/plugin)
- [Testing](/fr/reference/test)
