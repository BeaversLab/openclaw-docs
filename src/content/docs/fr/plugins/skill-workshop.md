---
title: "Skill Workshop Plugin"
summary: "Capture expérimental de procédures réutilisables en tant que compétences d'espace de travail avec examen, approbation, quarantaine et rechargement à chaud des compétences"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

# Plugin Skill Workshop

Skill Workshop est **expérimental**. Il est désactivé par défaut, ses heuristiques
de capture et ses invites de révision peuvent changer entre les versions, et les
écritures automatiques ne doivent être utilisées que dans des espaces de travail
fiables après avoir examiné d'abord la sortie du mode en attente.

Skill Workshop est une mémoire procédurale pour les compétences de l'espace de
travail. Il permet à un agent de transformer des flux de travail réutilisables,
des corrections utilisateur, des solutions durement gagnées et des pièges
récurrents en fichiers `SKILL.md` sous :

```text
<workspace>/skills/<skill-name>/SKILL.md
```

Cela est différent de la mémoire à long terme :

- **La mémoire** stocke des faits, des préférences, des entités et le contexte passé.
- **Les compétences** stockent des procédures réutilisables que l'agent doit suivre lors de futures tâches.
- **Skill Workshop** est le pont entre un tour utile et une compétence durable
  de l'espace de travail, avec des vérifications de sécurité et une approbation optionnelle.

Skill Workshop est utile lorsque l'agent apprend une procédure telle que :

- comment valider les ressources GIF animées provenant de sources externes
- comment remplacer les ressources de captures d'écran et vérifier les dimensions
- comment exécuter un scénario QA spécifique au dépôt
- comment déboguer une panne récurrente du fournisseur
- comment réparer une note de flux de travail local obsolète

Il n'est pas destiné à :

- des faits comme « l'utilisateur aime le bleu »
- une mémoire autobiographique large
- l'archivage de transcriptions brutes
- des secrets, des identifiants ou du texte d'invite caché
- des instructions ponctuelles qui ne se répéteront pas

## État par défaut

Le plugin inclus est **expérimental** et **désactivé par défaut**, sauf s'il est
explicitement activé dans `plugins.entries.skill-workshop`.

Le manifeste du plugin ne définit pas `enabledByDefault: true`. La valeur par
défaut `enabled: true` dans le schéma de configuration du plugin
s'applique uniquement après que l'entrée du plugin a déjà été sélectionnée et
chargée.

Expérimental signifie :

- le plugin est suffisamment pris en charge pour des tests opt-in et le dogfooding
- le stockage des propositions, les seuils de révision et les heuristiques de capture peuvent évoluer
- l'approbation en attente est le mode de démarrage recommandé
- l'application automatique est destinée aux configurations personnelles/d'espace de travail fiables, et non aux environnements partagés ou hostiles avec beaucoup d'entrées

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

Utilisez les écritures automatiques uniquement dans des espaces de travail de confiance :

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

| Clé                  | Par défaut  | Plage / valeurs                             | Signification                                                                               |
| -------------------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `enabled`            | `true`      | booléen                                     | Active le plugin après le chargement de l'entrée du plugin.                                 |
| `autoCapture`        | `true`      | booléen                                     | Active la capture/révision post-tour sur les tours réussis de l'agent.                      |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | Mettre en file d'attente les propositions ou écrire automatiquement les propositions sûres. |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | Choisit la capture de correction explicite, le révisionnaire LLM, les deux, ou aucun.       |
| `reviewInterval`     | `15`        | `1..200`                                    | Exécuter le révisionnaire après ce nombre de tours réussis.                                 |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | Exécuter le révisionnaire après ce nombre d'appels d'outils observés.                       |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | Délai d'expiration pour l'exécution du révisionnaire intégré.                               |
| `maxPending`         | `50`        | `1..200`                                    | Nombre maximal de propositions en attente/en quarantaine conservées par espace de travail.  |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | Taille maximale des fichiers de compétence/support générés.                                 |

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

Skill Workshop possède trois chemins de capture.

### Suggestions d'outils

Le model peut appeler `skill_workshop` directement lorsqu'il voit une procédure
réutilisable ou lorsque l'utilisateur lui demande de sauvegarder/mettre à jour une compétence.

C'est le chemin le plus explicite et fonctionne même avec `autoCapture: false`.

### Capture heuristique

Lorsque `autoCapture` est activé et que `reviewMode` est `heuristic` ou `hybrid`, le
plugin analyse les tours réussis pour détecter des phrases de correction explicites de l'utilisateur :

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

L'heuristique crée une proposition à partir de la dernière instruction utilisateur correspondante. Il
utilise des indices de sujet pour choisir des noms de compétences pour les workflows courants :

- tâches GIF animés -> `animated-gif-workflow`
- tâches de capture d'écran ou de ressources -> `screenshot-asset-workflow`
- tâches de QA ou de scénario -> `qa-scenario-workflow`
- tâches GitHub PR -> `github-pr-workflow`
- repli (fallback) -> `learned-workflows`

La capture heuristique est volontairement restreinte. Elle est destinée aux corrections claires et
aux notes de processus reproductibles, et non à la résumé général des transcriptions.

### Relecteur LLM

Lorsque `autoCapture` est activé et que `reviewMode` est `llm` ou `hybrid`, le plugin
exécute un relecteur embarqué compact une fois les seuils atteints.

Le relecteur reçoit :

- le texte de la transcription récente, limité aux 12 000 derniers caractères
- jusqu'à 12 compétences d'espace de travail existantes
- jusqu'à 2 000 caractères de chaque compétence existante
- des instructions JSON uniquement

Le relecteur n'a aucun outil :

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

Il peut renvoyer :

```json
{ "action": "none" }
```

ou une proposition de compétence :

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

Il peut également ajouter à une compétence existante :

```json
{
  "action": "append",
  "skillName": "qa-scenario-workflow",
  "title": "QA Scenario Workflow",
  "reason": "Animated media QA needs reusable checks",
  "description": "QA scenario workflow.",
  "section": "Workflow",
  "body": "- For animated GIF tasks, verify frame count and attribution before passing."
}
```

Ou remplacer le texte exact dans une compétence existante :

```json
{
  "action": "replace",
  "skillName": "screenshot-asset-workflow",
  "title": "Screenshot Asset Workflow",
  "reason": "Old validation missed image optimization",
  "oldText": "- Replace the screenshot asset.",
  "newText": "- Replace the screenshot asset, preserve dimensions, optimize the PNG, and run the relevant validation gate."
}
```

Privilégiez `append` ou `replace` lorsqu'une compétence pertinente existe déjà. Utilisez `create`
uniquement lorsqu'aucune compétence existante ne convient.

## Cycle de vie de la proposition

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
- `source` : `tool`, `agent_end` ou `reviewer`
- `status`
- `change`
- optionnel `scanFindings`
- optionnel `quarantineReason`

Statuts des propositions :

- `pending` - en attente d'approbation
- `applied` - écrit dans `<workspace>/skills`
- `rejected` - rejeté par l'opérateur/le modèle
- `quarantined` - bloqué par des résultats critiques de l'analyseur

L'état est stocké par espace de travail dans le répertoire d'état du Gateway :

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

Les propositions en attente et mises en quarantaine sont dédupliquées par nom de compétence et payload de modification. Le stockage conserve les plus récentes propositions en attente/mises en quarantaine jusqu'à `maxPending`.

## Référence de l'outil

Le plugin enregistre un outil d'agent :

```text
skill_workshop
```

### `status`

Compte les propositions par état pour l'espace de travail actif.

```json
{ "action": "status" }
```

Forme du résultat :

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

Liste les propositions en attente.

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

Liste les propositions en quarantaine.

```json
{ "action": "list_quarantine" }
```

Utilisez ceci lorsque la capture automatique semble ne rien faire et que les journaux mentionnent `skill-workshop: quarantined <skill>`.

### `inspect`

Récupère une proposition par id.

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

Crée une proposition. Avec `approvalPolicy: "pending"`, cela est mis en file d'attente par défaut.

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

Forcer une écriture sécurisée :

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

Forcer l'état en attente même dans `approvalPolicy: "auto"` :

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

Ajouter à une section :

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

Remplacer le texte exact :

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

### `apply`

Appliquer une proposition en attente.

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` refuse les propositions en quarantaine :

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

Write a supporting file inside an existing or proposed skill directory.

Allowed top-level support directories:

- `references/`
- `templates/`
- `scripts/`
- `assets/`

Example:

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# Release Checklist\n\n- Run release docs.\n- Verify changelog.\n"
}
```

Support files are workspace-scoped, path-checked, byte-limited by
`maxSkillBytes`, scanned, and written atomically.

## Skill Writes

Skill Workshop writes only under:

```text
<workspace>/skills/<normalized-skill-name>/
```

Skill names are normalized:

- lowercased
- non `[a-z0-9_-]` runs become `-`
- leading/trailing non-alphanumerics are removed
- max length is 80 characters
- final name must match `[a-z0-9][a-z0-9_-]{1,79}`

For `create`:

- if the skill does not exist, Skill Workshop writes a new `SKILL.md`
- if it already exists, Skill Workshop appends the body to `## Workflow`

For `append`:

- if the skill exists, Skill Workshop appends to the requested section
- if it does not exist, Skill Workshop creates a minimal skill then appends

For `replace`:

- the skill must already exist
- `oldText` must be present exactly
- only the first exact match is replaced

All writes are atomic and refresh the in-memory skills snapshot immediately, so
the new or updated skill can become visible without a Gateway restart.

## Safety Model

Skill Workshop has a safety scanner on generated `SKILL.md` content and support
files.

Critical findings quarantine proposals:

| Rule id                                | Blocks content that...                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | tells the agent to ignore prior/higher instructions                   |
| `prompt-injection-system`              | references system prompts, developer messages, or hidden instructions |
| `prompt-injection-tool`                | encourages bypassing tool permission/approval                         |
| `shell-pipe-to-shell`                  | includes `curl`/`wget` piped into `sh`, `bash`, or `zsh`              |
| `secret-exfiltration`                  | appears to send env/process env data over the network                 |

Warn findings are retained but do not block by themselves:

| Rule id              | Warns on...                      |
| -------------------- | -------------------------------- |
| `destructive-delete` | broad `rm -rf` style commands    |
| `unsafe-permissions` | `chmod 777` style permission use |

Quarantined proposals:

- keep `scanFindings`
- keep `quarantineReason`
- appear in `list_quarantine`
- cannot be applied through `apply`

To recover from a quarantined proposal, create a new safe proposal with the
unsafe content removed. Do not edit the store JSON by hand.

## Prompt Guidance

When enabled, Skill Workshop injects a short prompt section that tells the agent
to use `skill_workshop` for durable procedural memory.

The guidance emphasizes:

- procedures, not facts/preferences
- user corrections
- non-obvious successful procedures
- recurring pitfalls
- stale/thin/wrong skill repair through append/replace
- saving reusable procedure after long tool loops or hard fixes
- short imperative skill text
- no transcript dumps

The write mode text changes with `approvalPolicy`:

- pending mode: queue suggestions; apply only after explicit approval
- auto mode: apply safe workspace-skill updates when clearly reusable

## Costs and Runtime Behavior

Heuristic capture does not call a model.

LLM review uses an embedded run on the active/default agent model. It is
threshold-based so it does not run on every turn by default.

The reviewer:

- uses the same configured provider/model context when available
- falls back to runtime agent defaults
- has `reviewTimeoutMs`
- uses lightweight bootstrap context
- has no tools
- writes nothing directly
- can only emit a proposal that goes through the normal scanner and
  approval/quarantine path

If the reviewer fails, times out, or returns invalid JSON, the plugin logs a
warning/debug message and skips that review pass.

## Operating Patterns

Use Skill Workshop when the user says:

- “next time, do X”
- “from now on, prefer Y”
- “make sure to verify Z”
- “save this as a workflow”
- “this took a while; remember the process”
- “update the local skill for this”

Good skill text:

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

Poor skill text:

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

Reasons the poor version should not be saved:

- en forme de transcription
- non impératif
- inclut des détails bruyants ponctuels
- ne dit pas à l'agent suivant quoi faire

## Débogage

Vérifiez si le plugin est chargé :

```bash
openclaw plugins list --enabled
```

Vérifiez les nombres de propositions depuis un contexte agent/tool :

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

| Symptôme                                                 | Cause probable                                                                                             | Vérifier                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| L'outil n'est pas disponible                             | L'entrée du plugin n'est pas activée                                                                       | `plugins.entries.skill-workshop.enabled` et `openclaw plugins list`            |
| Aucune proposition automatique n'apparaît                | `autoCapture: false`, `reviewMode: "off"`, ou seuils non atteints                                          | Config, statut de la proposition, journaux du Gateway                          |
| L'heuristique n'a pas capturé                            | La formulation de l'utilisateur ne correspond pas aux modèles de correction                                | Utilisez explicitement `skill_workshop.suggest` ou activez le réviseur LLM     |
| Le réviseur n'a pas créé de proposition                  | Le réviseur a renvoyé `none`, JSON invalide, ou a expiré                                                   | Journaux du Gateway, `reviewTimeoutMs`, seuils                                 |
| La proposition n'est pas appliquée                       | `approvalPolicy: "pending"`                                                                                | `list_pending`, puis `apply`                                                   |
| La proposition a disparu de l'attente                    | Proposition en double réutilisée, nettoyage max en attente, ou a été appliquée/rejetée/mise en quarantaine | `status`, `list_pending` avec des filtres de statut, `list_quarantine`         |
| Le fichier de compétence existe mais le modèle le manque | L'instantané de compétence n'est pas actualisé ou le filtrage de compétences l'exclut                      | Statut `openclaw skills` et éligibilité des compétences de l'espace de travail |

Journaux pertinents :

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## Scénarios QA

Scénarios QA sauvegardés par dépôt :

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

Exécutez la couverture déterministe :

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

Exécutez la couverture du réviseur :

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
- l'agent travaille sur une entrée non fiable
- les Skills sont partagées au sein d'une grande équipe
- vous réglez encore les invites ou les règles du scanner
- le modèle traite fréquemment du contenu web/e-mail hostile

Utilisez d'abord le mode en attente. Ne passez en mode automatique qu'après avoir examiné le type de
Skills que l'agent propose dans cet espace de travail.

## Documentation connexe

- [Skills](/fr/tools/skills)
- [Plugins](/fr/tools/plugin)
- [Tests](/fr/reference/test)
