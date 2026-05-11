---
summary: "Approbations d'exécution de l'hôte : paramètres de stratégie, listes blanches et workflow YOLO/strict"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "Approbations d'exécution"
sidebarTitle: "Approbations d'exécution"
---

Les approbations d'exécution constituent la **garde-fou de l'application compagnon / de l'hôte de nœud** permettant à un agent sandboxed d'exécuter des commandes sur un hôte réel (`gateway` ou `node`). Un interverrouillage de sécurité : les commandes sont autorisées uniquement lorsque la stratégie + la liste blanche + l'approbation (facultative) de l'utilisateur sont toutes d'accord. Les approbations d'exécution s'empilent **au-dessus de** la stratégie d'outil et du filtrage élevé (sauf si élevé est défini sur `full`, ce qui ignore les approbations).

<Note>
  La stratégie effective est la **plus stricte** entre `tools.exec.*` et les valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée. L'exécution de l'hôte utilise également l'état local des approbations sur cette machine — un `ask: "always"` local à l'hôte dans `~/.openclaw/exec-approvals.json` continue à demander même si la session ou les
  valeurs par défaut de la configuration demandent `ask: "on-miss"`.
</Note>

## Inspection de la stratégie effective

| Commande                                                         | Ce qu'elle affiche                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | Stratégie demandée, sources de la stratégie de l'hôte et le résultat effectif.                               |
| `openclaw exec-policy show`                                      | Vue fusionnée de la machine locale.                                                                          |
| `openclaw exec-policy set` / `preset`                            | Synchroniser la stratégie demandée locale avec le fichier d'approbations de l'hôte local en une seule étape. |

Lorsqu'une portée locale demande `host=node`, `exec-policy show` signale cette portée comme étant gérée par le nœud au moment de l'exécution au lieu de faire semblant que le fichier d'approbations local est la source de vérité.

Si l'interface utilisateur de l'application compagnon n'est **pas disponible**, toute demande qui nécessiterait normalement une invite est résolue par le **secours de demande** (par défaut : `deny`).

<Tip>Les clients de validation de chat natifs peuvent initialiser des fonctionnalités spécifiques au canal sur le message de validation en attente. Par exemple, Matrix initialise des raccourcis de réaction (`✅` autoriser une fois, `❌` refuser, `♾️` autoriser toujours) tout en laissant les commandes `/approve ...` dans le message en guise de solution de repli.</Tip>

## Où cela s'applique

Les validations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **Hôte Gateway** → processus `openclaw` sur la machine passerelle.
- **Hôte de nœud** → exécuteur de nœud (application de compagnie macOS ou hôte de nœud sans interface).

### Modèle de confiance

- Les appelants authentifiés par Gateway sont des opérateurs de confiance pour ce Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte du nœud.
- Les validations d'exécution réduisent le risque d'exécution accidentelle, mais ne constituent **pas** une limite d'authentification par utilisateur.
- Les exécutions validées sur l'hôte du nœud lient le contexte d'exécution canonique : cwd canonique, argv exact, liaison env si présente, et chemin d'exécutable épinglé le cas échéant.
- Pour les scripts shell et les invocations directes de fichiers d'interpréteur/de runtime, OpenClaw tente également de lier un opérande de fichier local concret. Si ce fichier lié change après la validation mais avant l'exécution, l'exécution est refusée au lieu d'exécuter le contenu modifié.
- La liaison de fichiers est intentionnellement « best-effort », **pas** un modèle sémantique complet de chaque chemin de chargeur d'interpréteur/runtime. Si le mode de validation ne peut pas identifier exactement un fichier local concret à lier, il refuse de créer une exécution soutenue par une validation au lieu de prétendre à une couverture complète.

### Séparation macOS

- Le **service d'hôte de nœud** transfère `system.run` à l'**application macOS** via IPC local.
- L'**application macOS** applique les validations et exécute la commande dans le contexte de l'interface utilisateur.

## Paramètres et stockage

Les validations résident dans un fichier JSON local sur l'hôte d'exécution :

```text
~/.openclaw/exec-approvals.json
```

Exemple de schéma :

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## Boutons de politique

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` — bloquer toutes les demandes d'exécution d'hôte. - `allowlist` — autoriser uniquement les commandes figurant sur la liste d'autorisation. - `full` — tout autoriser (équivalent à élevé).
</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` — ne jamais demander. - `on-miss` — demander uniquement lorsque la liste d'autorisation ne correspond pas. - `always` — demander à chaque commande. La confiance durable `allow-always` ne **supprime pas** les demandes lorsque le mode de demande effectif est `always`.
</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  Résolution lorsqu'une demande est requise mais qu'aucune interface utilisateur n'est accessible.

- `deny` — bloquer.
- `allowlist` — autoriser uniquement si la liste d'autorisation correspond.
- `full` — autoriser.
  </ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  Lorsque `true`, OpenClaw traite les formes d'évaluation de code en ligne comme nécessitant une approbation uniquement même si le binaire de l'interpréteur lui-même est sur la liste d'autorisation. Défense en profondeur pour les chargeurs d'interpréteur qui ne correspondent pas proprement à un opérande de fichier stable.
</ParamField>

Exemples interceptés par le mode strict :

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

En mode strict, ces commandes nécessitent toujours une approbation explicite, et
`allow-always` ne conserve pas automatiquement les nouvelles entrées de liste d'autorisation pour elles.

## Mode YOLO (sans approbation)

Si vous souhaitez que l'exécution hôte s'exécute sans demandes d'approbation, vous devez ouvrir
**les deux** couches de stratégie — la stratégie d'exécution demandée dans la configuration OpenClaw
(`tools.exec.*`) **et** la stratégie d'approbations locale à l'hôte dans
`~/.openclaw/exec-approvals.json`.

YOLO est le comportement hôte par défaut sauf si vous le resserrez explicitement :

| Couche                | Paramètre YOLO              |
| --------------------- | --------------------------- |
| `tools.exec.security` | `full` sur `gateway`/`node` |
| `tools.exec.ask`      | `off`                       |
| Hôte `askFallback`    | `full`                      |

<Warning>
**Distinctions importantes :**

- `tools.exec.host=auto` choisit **où** l'exécution s'effectue : bac à sable (sandbox) si disponible, sinon passerelle.
- YOLO choisit **comment** l'exécution sur l'hôte est approuvée : `security=full` plus `ask=off`.
- En mode YOLO, OpenClaw n'ajoute **pas** de couche distincte de porte d'approbation heuristique d'obfuscation de commande ou de rejet préalable de script par-dessus la stratégie d'exécution hôte configurée.
- `auto` ne fait pas du routage par passerelle une priorité libre depuis une session OpenClaw. Une demande `host=node` par appel est autorisée depuis `auto` ; `host=gateway` n'est autorisée depuis `auto` que lorsqu'aucun runtime de bac à sable n'est actif. Pour une valeur par défaut non automatique stable, définissez `tools.exec.host` ou utilisez `/exec host=...` explicitement.
  </Warning>

Les fournisseurs prenant en charge CLI qui exposent leur propre mode d'autorisation non interactif peuvent suivre cette stratégie. Le CLI Claude ajoute `--permission-mode bypassPermissions` lorsque la stratégie d'exécution demandée par OpenClaw est YOLO. Remplacez ce comportement backend avec des arguments explicites de Claude sous `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` — par exemple `--permission-mode default`, `acceptEdits`, ou `bypassPermissions`.

Si vous souhaitez une configuration plus prudente, resserrez l'une ou l'autre des couches à `allowlist` / `on-miss` ou `deny`.

### Configuration de passerelle-hôte persistante "jamais demander"

<Steps>
  <Step title="Définir la stratégie de configuration demandée">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="Faire correspondre le fichier d'approbations de l'hôte">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### Raccourci local

```bash
openclaw exec-policy preset yolo
```

Ce raccourci local met à jour les deux :

- `tools.exec.host/security/ask` local.
- Valeurs par défaut `~/.openclaw/exec-approvals.json` locales.

Il est intentionnellement local uniquement. Pour modifier les approbations de passerelle-hôte ou de nœud-hôte à distance, utilisez `openclaw approvals set --gateway` ou `openclaw approvals set --node <id|name|ip>`.

### Hôte de nœud

Pour un nœud hôte, appliquez plutôt le même fichier d'approbations sur ce nœud :

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
**Limitations locales uniquement :**

- `openclaw exec-policy` ne synchronise pas les approbations de nœud.
- `openclaw exec-policy set --host node` est rejeté.
- Les approbations d'exécution de nœud sont récupérées depuis le nœud au moment de l'exécution, les mises à jour ciblées sur le nœud doivent donc utiliser `openclaw approvals --node ...`.
  </Note>

### Raccourci session uniquement

- `/exec security=full ask=off` modifie uniquement la session en cours.
- `/elevated full` est un raccourci de type « bris de glace » qui contourne également les approbations d'exécution pour cette session.

Si le fichier d'approbations de l'hôte reste plus strict que la configuration, la stratégie d'hôte la plus stricte l'emporte toujours.

## Liste d'autorisation (par agent)

Les listes d'autorisation sont **par agent**. Si plusieurs agents existent, changez l'agent que vous modifiez dans l'application macOS. Les modèles sont des correspondances glob (glob matches).

Les modèles peuvent être des globs de chemin binaire résolu ou des globs de nom de commande nu.
Les noms nus ne correspondent qu'aux commandes invoquées via `PATH`, donc `rg` peut correspondre à
`/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais **pas** `./rg` ou
`/tmp/rg`. Utilisez un glob de chemin lorsque vous souhaitez faire confiance à un emplacement binaire spécifique.

Les entrées `agents.default` héritées sont migrées vers `agents.main` au chargement.
Les chaînes de shell telles que `echo ok && pwd` nécessitent toujours que chaque segment de premier niveau
respecte les règles de la liste d'autorisation.

Exemples :

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Chaque entrée de la liste d'autorisation suit :

| Champ              | Signification                                                  |
| ------------------ | -------------------------------------------------------------- |
| `id`               | UUID stable utilisé pour l'identité de l'interface utilisateur |
| `lastUsedAt`       | Horodatage de la dernière utilisation                          |
| `lastUsedCommand`  | Dernière commande correspondante                               |
| `lastResolvedPath` | Dernier chemin binaire résolu                                  |

## Autoriser automatiquement les lignes de commande des compétences

Lorsque **Autoriser automatiquement les lignes de commande des compétences** est activé, les exécutables référencés par
les compétences connues sont traités comme autorisés sur les nœuds (nœud macOS ou hôte de nœud
sans interface graphique). Cela utilise `skills.bins` sur le Gateway RPC pour récupérer la
liste des binaires de la compétence. Désactivez cette option si vous souhaitez des listes d'autorisation manuelles strictes.

<Warning>
  - Il s'agit d'une **liste d'autorisation de commodité implicite**, distincte des entrées de liste d'autorisation de chemin manuelles. - Elle est destinée aux environnements d'opérateurs de confiance où Gateway et le nœud se trouvent dans la même limite de confiance. - Si vous nécessitez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement les entrées de liste
  d'autorisation de chemin manuelles.
</Warning>

## Bacs sûrs et transfert d'approbations

Pour les bacs sûrs (le chemin rapide stdin uniquement), les détails de liaison de l'interpréteur, et
comment transférer les invites d'approbation vers Slack/Discord/Telegram (ou les exécuter en tant que
clients d'approbation natifs), consultez
[Exec approvals — advanced](/fr/tools/exec-approvals-advanced).

## Modification via l'interface de contrôle

Utilisez la carte **Interface de contrôle → Nœuds → Exec approvals** pour modifier les valeurs par défaut,
les remplacements par agent et les listes d'autorisation. Choisissez une portée (Par défaut ou un agent),
ajustez la stratégie, ajoutez/supprimez des modèles de liste d'autorisation, puis **Enregistrez**. L'interface
affiche les métadonnées de dernière utilisation par modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit **Gateway** (approbations locales) ou un **Nœud**.
Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou
hôte de nœud sans interface). Si un nœud n'annonce pas encore les approbations d'exécution,
modifiez son fichier `~/.openclaw/exec-approvals.json` local directement.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud — consultez
[Approvals CLI](/fr/cli/approvals).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse
`exec.approval.requested` aux clients de l'opérateur. L'interface de contrôle et l'application macOS
la résolvent via `exec.approval.resolve`, puis la passerelle transmet la
requête approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan`
canonique. La passerelle utilise ce plan comme contexte
commande/cwd/session faisant autorité lors du transfert des requêtes `system.run`
approuvées.

Cela est important pour la latence d'approbation asynchrone :

- Le chemin d'exécution du nœud prépare un plan canonique à l'avance.
- L'enregistrement d'approbation stocke ce plan et ses métadonnées de liaison.
- Une fois approuvée, l'appel `system.run` final transféré réutilise le plan stocké au lieu de faire confiance aux modifications ultérieures de l'appelant.
- Si l'appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou `sessionKey` après la création de la demande d'approbation, la passerelle rejette l'exécution transmise en raison d'une inadéquation de l'approbation.

## Événements système

Le cycle de vie de l'exécution est affiché sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil de notification d'exécution).
- `Exec finished`.
- `Exec denied`.

Ces éléments sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par le Gateway émettent les mêmes événements de cycle de vie lorsque
la commande se termine (et facultativement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces
messages pour faciliter la corrélation.

## Comportement en cas d'approbation refusée

Lorsqu'une approbation d'exécution asynchrone est refusée, OpenClaw empêche l'agent de
réutiliser la sortie de toute exécution antérieure de la même commande dans la session.
Le motif du refus est transmis avec des directives explicites indiquant qu'aucune sortie de
commande n'est disponible, ce qui empêche l'agent de prétendre qu'il y a une nouvelle sortie ou
de répéter la commande refusée avec des résultats obsolètes provenant d'une exécution réussie
antérieure.

## Implications

- **`full`** est puissant ; préférez les listes blanches (allowlists) lorsque cela est possible.
- **`ask`** vous tient informé tout en permettant des approbations rapides.
- Les listes blanches par agent empêchent les approbations d'un agent de fuir vers d'autres.
- Les approbations ne s'appliquent qu'aux demandes d'exécution sur l'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre de `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et ignore les approbations par conception. Pour bloquer fermement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la stratégie d'outil (tool policy).

## Connexes

<CardGroup cols={2}>
  <Card title="Exec approvals — advanced" href="/fr/tools/exec-approvals-advanced" icon="gear">
    Bacs sûrs, liaison d'interpréteur et transfert d'approbation vers le chat.
  </Card>
  <Card title="Exec tool" href="/fr/tools/exec" icon="terminal">
    Outil d'exécution de commandes shell.
  </Card>
  <Card title="Elevated mode" href="/fr/tools/elevated" icon="shield-exclamation">
    Chemin de secours qui ignore également les approbations.
  </Card>
  <Card title="Sandboxing" href="/fr/gateway/sandboxing" icon="box">
    Modes de Sandbox et accès à l'espace de travail.
  </Card>
  <Card title="Security" href="/fr/gateway/security" icon="lock">
    Modèle de sécurité et durcissement.
  </Card>
  <Card title="Sandbox vs tool policy vs elevated" href="/fr/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    Quand utiliser chaque contrôle.
  </Card>
  <Card title="Skills" href="/fr/tools/skills" icon="sparkles">
    Comportement d'autorisation automatique basé sur les Skills.
  </Card>
</CardGroup>
