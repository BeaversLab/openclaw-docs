---
summary: "Approbations d'exécution de l'hôte : paramètres de stratégie, listes d'autorisation et workflow YOLO/strict"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "Approbations d'exécution"
sidebarTitle: "Approbations d'exécution"
---

Les approbations d'exécution sont la **garde-fou de l'application compagnon / de l'hôte de nœud** permettant à un agent sandboxé d'exécuter des commandes sur un hôte réel (`gateway` ou `node`). Un interverrouillage de sécurité : les commandes ne sont autorisées que lorsque la stratégie + la liste d'autorisation + l'approbation (optionnelle) de l'utilisateur sont toutes d'accord. Les approbations d'exécution s'empilent **par-dessus** la stratégie d'outil et le filtrage élevé (sauf si elevated est défini à `full`, ce qui ignore les approbations).

<Note>
  La stratégie effective est la **plus stricte** entre `tools.exec.*` et les valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée. L'exécution de l'hôte utilise également l'état local des approbations sur cette machine - un `ask: "always"` local à l'hôte dans `~/.openclaw/exec-approvals.json` continue à demander même si la session ou la
  configuration par défaut demande `ask: "on-miss"`.
</Note>

## Inspection de la stratégie effective

| Commande                                                         | Ce qu'elle affiche                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | Stratégie demandée, sources de la stratégie de l'hôte et le résultat effectif.                               |
| `openclaw exec-policy show`                                      | Vue fusionnée de la machine locale.                                                                          |
| `openclaw exec-policy set` / `preset`                            | Synchroniser la stratégie demandée locale avec le fichier d'approbations de l'hôte local en une seule étape. |

Lorsqu'une portée locale demande `host=node`, `exec-policy show` signale cette portée comme étant gérée par le nœud au moment de l'exécution au lieu de prétendre que le fichier d'approbations local est la source de vérité.

Si l'interface utilisateur de l'application compagnon est **non disponible**, toute requête qui provoquerait normalement une invite est résolue par le **secours de demande** (par défaut : `deny`).

<Tip>Les clients d'approbation de chat natifs peuvent ajouter des fonctionnalités spécifiques au channel sur le message d'approbation en attente. Par exemple, Matrix ajoute des raccourcis de réaction (`✅` autoriser une fois, `❌` refuser, `♾️` autoriser toujours) tout en laissant les commandes `/approve ...` dans le message en guise de secours.</Tip>

## Où cela s'applique

Les validations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **Hôte Gateway** → processus `openclaw` sur la machine passerelle.
- **Hôte de nœud** → exécuteur de nœud (application de compagnie macOS ou hôte de nœud sans interface).

### Modèle de confiance

- Les appelants authentifiés par Gateway sont des opérateurs de confiance pour ce Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte du nœud.
- Les approbations d'exécution réduisent le risque d'exécution accidentelle, mais ne constituent **pas** une limite d'authentification par utilisateur ni une stratégie de lecture seule du système de fichiers.
- Une fois approuvée, une commande peut modifier des fichiers en fonction des autorisations du système de fichiers de l'hôte ou du bac à sable sélectionné.
- Les exécutions approuvées sur l'hôte de nœud lient le contexte d'exécution canonique : répertoire de travail canonique, argv exact, liaison d'environnement si présente, et chemin de l'exécutable épinglé le cas échéant.
- Pour les scripts shell et les appels directs de fichiers d'interpréteur/d'exécution, OpenClaw tente également de lier un opérande de fichier local concret. Si ce fichier lié change après l'approbation mais avant l'exécution, l'exécution est refusée au lieu d'exécuter le contenu modifié.
- La liaison de fichiers est intentionnellement de type « meilleur effort » et **ne constitue pas** un modèle sémantique complet de chaque chemin de chargeur d'interpréteur/d'exécution. Si le mode d'approbation ne peut pas identifier exactement un fichier local concret à lier, il refuse de créer une exécution soutenue par une approbation au lieu de prétendre à une couverture complète.

### Fractionnement macOS

- Le **service hôte de nœud** transfère `system.run` à l'**application macOSIPC** via l'IPC local.
- L'**application macOS** applique les approbations et exécute la commande dans le contexte de l'interface utilisateur.

## Paramètres et stockage

Les approbations résident dans un fichier JSON local sur l'hôte d'exécution :

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

## Paramètres de stratégie

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - bloquer toutes les requêtes d'exécution sur l'hôte.
  - `allowlist` - autoriser uniquement les commandes figurant sur la liste d'autorisation.
  - `full` - tout autoriser (équivalent à élevé).

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - ne jamais demander.
  - `on-miss` - demander uniquement lorsque la liste d'autorisation ne correspond pas.
  - `always` - demander pour chaque commande. La confiance durable `allow-always` ne supprime **pas** les invites lorsque le mode de demande effectif est `always`.

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  Résolution lorsqu'une invite est requise mais qu'aucune interface utilisateur n'est accessible.

- `deny` - bloquer.
- `allowlist` - autoriser uniquement si la liste d'autorisation correspond.
- `full` - autoriser.

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  Lorsque `true`OpenClaw, OpenClaw traite les formes d'évaluation de code en ligne comme nécessitant une approbation uniquement même si le binaire de l'interpréteur lui-même est dans la liste d'autorisation. Défense en profondeur pour les chargeurs d'interpréteur qui ne correspondent pas proprement à un fichier opérande stable.
</ParamField>

Exemples que le mode strict intercepte :

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

En mode strict, ces commandes nécessitent toujours une approbation explicite, et
`allow-always` ne persiste pas automatiquement les nouvelles entrées de liste d'autorisation pour elles.

## Mode YOLO (sans approbation)

Si vous souhaitez que l'exécution sur l'hôte s'exécute sans invites d'approbation, vous devez ouvrir
**les deux** couches de stratégie - la stratégie d'exécution demandée dans la configuration OpenClaw
(OpenClaw`tools.exec.*`) **et** la stratégie d'approbations locale à l'hôte dans
`~/.openclaw/exec-approvals.json`.

YOLO est le comportement par défaut de l'hôte à moins que vous ne le resserriez explicitement :

| Couche                  | Paramètre YOLO              |
| ----------------------- | --------------------------- |
| `tools.exec.security`   | `full` sur `gateway`/`node` |
| `tools.exec.ask`        | `off`                       |
| `askFallback` de l'hôte | `full`                      |

<Warning>
**Distinctions importantes :**

- `tools.exec.host=auto` choisit **où** l'exécution s'effectue : bac à sable (sandbox) si disponible, sinon passerelle.
- YOLO choisit **comment** l'exécution sur l'hôte est approuvée : `security=full` plus `ask=off`.
- En mode YOLO, OpenClaw n'ajoute **pas** une porte d'approbation heuristique distincte pour l'obscurcissement de commande ni une couche de rejet préalable aux scripts par-dessus la stratégie d'exécution hôte configurée.
- `auto` ne fait pas du routage par la passerelle une substitution libre depuis une session sandboxée. Une requête `host=node` par appel est autorisée depuis `auto` ; `host=gateway` n'est autorisée depuis `auto` que lorsque aucun runtime de bac à sable n'est actif. Pour une valeur par défaut stable non automatique, définissez `tools.exec.host` ou utilisez `/exec host=...` explicitement.

</Warning>

Les fournisseurs prenant en charge CLI qui exposent leur propre mode d'autorisation non interactif peuvent suivre cette stratégie. Le CLI Claude ajoute `--permission-mode bypassPermissions` lorsque la stratégie d'exécution demandée par OpenClaw est YOLO. Remplacez ce comportement du backend avec des arguments Claude explicites sous `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` - par exemple `--permission-mode default`, `acceptEdits` ou `bypassPermissions`.

Si vous souhaitez une configuration plus prudente, resserrez l'une ou l'autre des couches en revenant à `allowlist` / `on-miss` ou `deny`.

### Configuration "never prompt" (ne jamais demander) persistante pour l'hôte de passerelle

<Steps>
  <Step title="Définir la stratégie de configuration demandée">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="Faire correspondre le fichier des approbations de l'hôte">
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

Ce raccourci local met à jour les deux éléments :

- `tools.exec.host/security/ask` local.
- Valeurs par défaut du `~/.openclaw/exec-approvals.json` local.

Il est intentionnellement uniquement local. Pour modifier les approbations de l'hôte de passerelle ou de l'hôte de nœud à distance, utilisez `openclaw approvals set --gateway` ou `openclaw approvals set --node <id|name|ip>`.

### Hôte de nœud

Pour un hôte de nœud, appliquez le même fichier d'approbations sur ce nœud à la place :

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
- Les approbations d'exécution de nœud sont récupérées auprès du nœud au moment de l'exécution. Les mises à jour ciblant le nœud doivent donc utiliser `openclaw approvals --node ...`.

</Note>

### Raccourci uniquement pour la session

- `/exec security=full ask=off` modifie uniquement la session actuelle.
- `/elevated full` est un raccourci de type « break-glass » qui ignore également les approbations d'exécution pour cette session.

Si le fichier d'approbations de l'hôte reste plus strict que la configuration, la stratégie la plus stricte de l'hôte l'emporte.

## Liste blanche (par agent)

Les listes blanches sont **par agent**. Si plusieurs agents existent, changez l'agent que vous modifiez dans l'application macOS. Les modèles sont des correspondances glob.

Les modèles peuvent être des globs de chemin binaire résolu ou des globs de nom de commande seul. Les noms seuls correspondent uniquement aux commandes invoquées via `PATH`, donc `rg` peut correspondre à `/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais **pas** `./rg` ou `/tmp/rg`. Utilisez un glob de chemin lorsque vous souhaitez faire confiance à un emplacement binaire spécifique.

Les entrées `agents.default` héritées sont migrées vers `agents.main` lors du chargement. Les chaînes de shell telles que `echo ok && pwd` nécessitent toujours que chaque segment de niveau supérieur respecte les règles de la liste blanche.

Exemples :

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### Restriction des arguments avec argPattern

Ajoutez `argPattern` lorsqu'une entrée de liste blanche doit correspondre à un binaire et une forme d'argument spécifique. OpenClaw évalue l'expression régulière par rapport aux arguments de commande analysés, à l'exclusion du jeton exécutable (`argv[0]`). Pour les entrées créées manuellement, les arguments sont joints par un seul espace, donc ancrez le modèle lorsque vous avez besoin d'une correspondance exacte.

```json
{
  "version": 1,
  "agents": {
    "main": {
      "allowlist": [
        {
          "pattern": "python3",
          "argPattern": "^safe\\.py$"
        }
      ]
    }
  }
}
```

Cette entrée autorise `python3 safe.py` ; `python3 other.py` est une erreur de correspondance de liste blanche. Si une entrée avec chemin uniquement pour le même binaire est également présente, les arguments sans correspondance peuvent encore revenir à cette entrée avec chemin uniquement. Omettez l'entrée avec chemin uniquement lorsque l'objectif est de restreindre le binaire aux arguments déclarés.

Les entrées enregistrées par les flux d'approbation peuvent utiliser un format de séparateur interne pour la correspondance exacte des argv. Privilégiez l'interface utilisateur ou le flux d'approbation pour régénérer ces entrées plutôt que de modifier manuellement la valeur encodée. Si OpenClaw ne peut pas analyser argv pour un segment de commande, les entrées avec `argPattern` ne correspondent pas.

Chaque entrée de liste blanche prend en charge :

| Champ              | Signification                                                                       |
| ------------------ | ----------------------------------------------------------------------------------- |
| `pattern`          | Glob de chemin binaire résolu ou glob de nom de commande seul                       |
| `argPattern`       | Regex argv facultatif ; les entrées omises sont des entrées avec chemin uniquement  |
| `id`               | UUID stable utilisé pour l'identité de l'interface utilisateur                      |
| `source`           | Source de l'entrée, telle que `allow-always`                                        |
| `commandText`      | Texte de commande capturé lors de la création de l'entrée par un flux d'approbation |
| `lastUsedAt`       | Horodatage de la dernière utilisation                                               |
| `lastUsedCommand`  | Dernière commande qui correspondait                                                 |
| `lastResolvedPath` | Dernier chemin binaire résolu                                                       |

## Autoriser automatiquement les CLI de compétences

Lorsque **Autoriser automatiquement les CLI de compétences** est activé, les exécutables référencés par les compétences connues sont traités comme étant sur liste blanche sur les nœuds (nœud macOS ou hôte de nœud sans interface graphique). Cela utilise `skills.bins` sur le Gateway RPC pour récupérer la liste des bins de compétences. Désactivez cette option si vous souhaitez des listes blanches manuelles strictes.

<Warning>
- Il s'agit d'une **liste blanche de commodité implicite**, distincte des entrées de liste blanche de chemin manuelles.
- Elle est destinée aux environnements d'opérateurs de confiance où le Gateway et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, conservez `autoAllowSkills: false` et utilisez uniquement des entrées de liste blanche de chemin manuelles.

</Warning>

## Bacs sûrs et transfert d'approbations

Pour les binaires sûrs (le chemin rapide stdin uniquement), les détails de liaison de l'interpréteur et
la manière de transférer les invites d'approbation vers Slack/Discord/Telegram (ou les exécuter en tant que
clients d'approbation natifs), consultez
[Exec approvals - advanced](/fr/tools/exec-approvals-advanced).

## Modification via l'interface de contrôle

Utilisez la carte **Control UI → Nodes → Exec approvals** pour modifier les valeurs par défaut,
les redéfinitions par agent et les listes d'autorisation. Choisissez une portée (Defaults ou un agent),
ajustez la stratégie, ajoutez/supprimez les modèles de liste d'autorisation, puis cliquez sur **Save**. L'interface
affiche les métadonnées de la dernière utilisation pour chaque modèle afin que vous puissiez garder la liste propre.

Le sélecteur cible choisit **Gateway** (approbations locales) ou un **Node**.
Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou
hôte de nœud sans interface). Si un nœud n'annonce pas encore les approbations d'exécution,
modifiez directement son `~/.openclaw/exec-approvals.json` local.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud - consultez
[Approvals CLI](/fr/cli/approvals).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse
`exec.approval.requested` aux clients de l'opérateur. L'interface de contrôle et l'application macOS
la résolvent via `exec.approval.resolve`, puis la passerelle transmet la
requête approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan`
canonique. La passerelle utilise ce plan comme contexte de
commande/cwd/session faisant autorité lors du transfert des requêtes `system.run`
approuvées.

C'est important pour la latence d'approbation asynchrone :

- Le chemin d'exécution du nœud prépare un plan canonique à l'avance.
- L'enregistrement d'approbation stocke ce plan et ses métadonnées de liaison.
- Une fois approuvé, l'appel `system.run` transféré final réutilise le plan stocké au lieu de faire confiance aux modifications ultérieures de l'appelant.
- Si l'appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou `sessionKey` après la création de la demande d'approbation, la passerelle rejette l'exécution transférée en tant que inadéquation d'approbation.

## Événements système

Le cycle de vie de l'exécution est présenté sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil de notification d'exécution).
- `Exec finished`.
- `Exec denied`.

Ces messages sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par le Gateway émettent les mêmes événements de cycle de vie lorsque
la commande se termine (et facultativement lors d'une exécution plus longue que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces
messages pour faciliter la corrélation.

## Comportement en cas de refus d'approbation

Lorsqu'une approbation d'exécution asynchrone est refusée, OpenClaw empêche l'agent de
réutiliser la sortie de toute exécution antérieure de la même commande dans la session.
La raison du refus est transmise avec une directive explicite indiquant qu'aucune sortie de
commande n'est disponible, ce qui empêche l'agent de prétendre qu'il y a une nouvelle sortie ou
de répéter la commande refusée avec des résultats obsolètes provenant d'une exécution
réussie antérieure.

## Implications

- **`full`** est puissant ; préférez les listes d'autorisation (allowlists) lorsque cela est possible.
- **`ask`** vous maintient informé tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les approbations d'un agent de fuiter vers d'autres.
- Les approbations ne s'appliquent qu'aux requêtes d'exécution sur l'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et contourne les approbations par conception. Pour bloquer strictement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la stratégie d'outils.

## Connexes

<CardGroup cols={2}>
  <Card title="Exec approvals - advanced" href="/fr/tools/exec-approvals-advanced" icon="gear">
    Bacs sûrs, liaison d'interpréteur et renvoi d'approbation vers le chat.
  </Card>
  <Card title="Exec tool" href="/fr/tools/exec" icon="terminal">
    Outil d'exécution de commandes shell.
  </Card>
  <Card title="Mode élevé" href="/fr/tools/elevated" icon="shield-exclamation">
    Chemin de secours qui ignore également les approbations.
  </Card>
  <Card title="Sandboxing" href="/fr/gateway/sandboxing" icon="box">
    Modes de bac à sable et accès à l'espace de travail.
  </Card>
  <Card title="Sécurité" href="/fr/gateway/security" icon="lock">
    Modèle de sécurité et durcissement.
  </Card>
  <Card title="Sandbox vs outil de politique vs élevé" href="/fr/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    Quand utiliser chaque contrôle.
  </Card>
  <Card title="Skills" href="/fr/tools/skills" icon="sparkles">
    Comportement d'autorisation automatique basé sur les Skills.
  </Card>
</CardGroup>
