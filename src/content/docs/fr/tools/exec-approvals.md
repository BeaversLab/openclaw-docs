---
summary: "Approbations d'exécution de l'hôte : paramètres de stratégie, listes d'autorisation et workflow YOLO/strict"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "Approbations d'exécution"
sidebarTitle: "Approbations d'exécution"
---

Les approbations d'exécution sont la **garde-fou de l'application compagnon / de l'hôte nœud** permettant à un agent sandboxed d'exécuter des commandes sur un hôte réel (`gateway` ou `node`). Un interlock de sécurité : les commandes sont autorisées uniquement lorsque la stratégie + la liste d'autorisation + l'approbation (optionnelle) de l'utilisateur sont toutes d'accord. Les approbations d'exécution s'empilent **au-dessus de** la stratégie d'outil et le filtrage élevé (sauf si elevated est défini sur `full`, ce qui ignore les approbations).

<Note>
  La stratégie effective est la **plus stricte** entre `tools.exec.*` et les valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée. L'exécution sur l'hôte utilise également l'état local des approbations sur cette machine - un `ask: "always"` local à l'hôte dans `~/.openclaw/exec-approvals.json` continue à demander même si la session ou la
  configuration par défaut demandent `ask: "on-miss"`.
</Note>

## Inspection de la stratégie effective

| Commande                                                         | Ce qu'elle affiche                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | Stratégie demandée, sources de la stratégie de l'hôte et le résultat effectif.                               |
| `openclaw exec-policy show`                                      | Vue fusionnée de la machine locale.                                                                          |
| `openclaw exec-policy set` / `preset`                            | Synchroniser la stratégie demandée locale avec le fichier d'approbations de l'hôte local en une seule étape. |

Lorsqu'une portée locale demande `host=node`, `exec-policy show` signale cette portée comme étant gérée par le nœud au moment de l'exécution, au lieu de faire semblant que le fichier d'approbations local est la source de vérité.

Si l'interface utilisateur de l'application compagnon est **non disponible**, toute demande qui entraînerait normalement une invite est résolue par le **ask fallback** (par défaut : `deny`).

<Tip>Les clients d'approbation de chat natifs peuvent inclure des fonctionnalités spécifiques au channel sur le message d'approbation en attente. Par exemple, Matrix inclut des raccourcis de réaction (Matrix`✅` autoriser une fois, `❌` refuser, `♾️` autoriser toujours) tout en laissant les commandes `/approve ...` dans le message en guise de solution de repli.</Tip>

## Où cela s'applique

Les validations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **Hôte Gateway** → processus Gateway`openclaw` sur la machine passerelle.
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

- Le **service d'hôte de nœud** transfère `system.run`macOSIPC à l'**application macOS** via l'IPC local.
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
  - `deny` - bloquer toutes les demandes d'exécution sur l'hôte.
  - `allowlist` - autoriser uniquement les commandes figurant sur la liste d'autorisation.
  - `full` - tout autoriser (équivalent à elevated).

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
  Lorsque `true`, OpenClaw traite les formulaires d'évaluation de code en ligne comme étant uniquement soumis à approbation, même si l'exécutable de l'interpréteur lui-même figure sur la liste d'autorisation. Défense en profondeur pour les chargeurs d'interpréteur qui ne correspondent pas proprement à un seul opérande de fichier stable.
</ParamField>

Exemples que le mode strict intercepte :

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

En mode strict, ces commandes nécessitent toujours une approbation explicite et
`allow-always` ne conserve pas automatiquement les nouvelles entrées de la liste d'autorisation pour elles.

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  Contrôle uniquement la présentation dans les invites d'approbation d'exécution. Lorsqu'il est activé, OpenClaw peut attacher des étendues de commande dérivées de l'analyseur afin que les invites d'approbation Web puissent mettre en surbrillance les jetons de commande. Définissez-le sur `true` pour activer la mise en surbrillance du texte de la commande.
</ParamField>

Ce paramètre ne modifie **pas** `security`, `ask`, la correspondance de liste d'autorisation (allowlist), le comportement d'évaluation en ligne stricte, le transfert d'approbation ou l'exécution de commandes.
Il peut être défini globalement sous `tools.exec.commandHighlighting` ou par
agent sous `agents.list[].tools.exec.commandHighlighting`.

## Mode YOLO (sans approbation)

Si vous souhaitez que l'exécution sur l'hôte (host exec) s'exécute sans invite d'approbation, vous devez ouvrir
**les deux** couches de stratégie - la stratégie d'exécution demandée dans la configuration OpenClaw
(`tools.exec.*`) **et** la stratégie d'approbations locale à l'hôte dans
`~/.openclaw/exec-approvals.json`.

YOLO est le comportement par défaut de l'hôte, sauf si vous le resserez explicitement :

| Couche                | Paramètre YOLO              |
| --------------------- | --------------------------- |
| `tools.exec.security` | `full` sur `gateway`/`node` |
| `tools.exec.ask`      | `off`                       |
| Hôte `askFallback`    | `full`                      |

<Warning>
**Distinctions importantes :**

- `tools.exec.host=auto` choisit **l'endroit où** l'exécution a lieu : bac à sable (sandbox) si disponible, sinon passerelle (gateway).
- YOLO choisit **comment** l'exécution sur l'hôte est approuvée : `security=full` plus `ask=off`.
- En mode YOLO, OpenClaw n'ajoute **pas** une porte d'approbation heuristique distincte pour l'obfuscation de commande ni une couche de rejet préalable aux scripts par-dessus la stratégie d'exécution sur l'hôte configurée.
- `auto` ne rend pas le routage par passerelle une priorité gratuite depuis une session sandboxed. Une demande `host=node` par appel est autorisée depuis `auto` ; `host=gateway` n'est autorisée depuis `auto` que lorsqu'aucun runtime de bac à sable n'est actif. Pour une valeur par défaut non automatique stable, définissez `tools.exec.host` ou utilisez `/exec host=...` explicitement.

</Warning>

Les fournisseurs basés sur la CLI qui exposent leur propre mode d'autorisation non interactif peuvent suivre cette politique. Claude CLI ajoute `--permission-mode bypassPermissions` lorsque la stratégie d'exécution demandée par OpenClaw est YOLO. Remplacez ce comportement du backend par des arguments Claude explicites sous `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` - par exemple `--permission-mode default`, `acceptEdits` ou `bypassPermissions`.

Si vous souhaitez une configuration plus prudente, resserrez l'une ou l'autre couche à `allowlist` / `on-miss` ou `deny`.

### Configuration persistante de passerelle-hôte « never prompt »

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
- Valeurs par défaut `~/.openclaw/exec-approvals.json` locales.

C'est intentionnellement local uniquement. Pour modifier les approbations de passerelle-hôte ou de nœud-hôte à distance, utilisez `openclaw approvals set --gateway` ou `openclaw approvals set --node <id|name|ip>`.

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
- Les approbations d'exécution de nœud sont récupérées depuis le nœud au moment de l'exécution, donc les mises à jour ciblées vers le nœud doivent utiliser `openclaw approvals --node ...`.

</Note>

### Raccourci session uniquement

- `/exec security=full ask=off` ne modifie que la session en cours.
- `/elevated full` est un raccourci de contournement (break-glass) qui ignore également les approbations d'exécution pour cette session.

Si le fichier d'approbations de l'h reste plus strict que la configuration, la stratégie de l'hôte la plus stricte l'emporte.

## Liste d'autorisation (par agent)

Les listes d'autorisation sont **par agent**. Si plusieurs agents existent, changez l'agent que vous modifiez dans l'application macOS. Les modèles utilisent des correspondances globales.

Les modèles peuvent être des globs de chemin d'accès binaire résolus ou des globs de nom de commande seul. Les noms seuls correspondent uniquement aux commandes invoquées via `PATH`, donc `rg` peut correspondre à `/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais `./rg` ou `/tmp/rg`. Utilisez un glob de chemin lorsque vous souhaitez faire confiance à un emplacement binaire spécifique.

Les entrées `agents.default` héritées sont migrées vers `agents.main` lors du chargement. Les chaînes shell telles que `echo ok && pwd` nécessitent toujours que chaque segment de niveau supérieur satisfasse aux règles de la liste d'autorisation.

Exemples :

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### Restriction des arguments avec argPattern

Ajoutez `argPattern` lorsqu'une entrée de la liste d'autorisation doit correspondre à un binaire et à une forme d'argument spécifique. OpenClaw évalue l'expression régulière par rapport aux arguments de commande analysés, à l'exclusion du jeton exécutable (`argv[0]`). Pour les entrées créées manuellement, les arguments sont joints par un seul espace, donc ancrez le modèle lorsque vous avez besoin d'une correspondance exacte.

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

Cette entrée permet `python3 safe.py` ; `python3 other.py` est une erreur de correspondance de la liste d'autorisation. Si une entrée de chemin uniquement pour le même binaire est également présente, les arguments non correspondants peuvent toujours revenir à cette entrée de chemin uniquement. Omettez l'entrée de chemin uniquement lorsque l'objectif est de restreindre le binaire aux arguments déclarés.

Les entrées enregistrées par les flux d'approbation peuvent utiliser un format de séparateur interne pour une correspondance exacte d'argv. Privilégiez l'interface utilisateur ou le flux d'approbation pour régénérer ces entrées plutôt que de modifier manuellement la valeur encodée. Si OpenClaw ne peut pas analyser argv pour un segment de commande, les entrées avec `argPattern` ne correspondent pas.

Chaque entrée de la liste d'autorisation prend en charge :

| Champ              | Signification                                                                          |
| ------------------ | -------------------------------------------------------------------------------------- |
| `pattern`          | Glob de chemin binaire résolu ou glob de nom de commande seul                          |
| `argPattern`       | Regex argv facultatif ; les entrées omises sont de chemin uniquement                   |
| `id`               | UUID stable utilisé pour l'identité de l'interface utilisateur                         |
| `source`           | Source d'entrée, telle que `allow-always`                                              |
| `commandText`      | Texte de la commande capturé lors de la création de l'entrée par un flux d'approbation |
| `lastUsedAt`       | Horodatage de la dernière utilisation                                                  |
| `lastUsedCommand`  | Dernière commande correspondante                                                       |
| `lastResolvedPath` | Dernier chemin binaire résolu                                                          |

## Autoriser automatiquement les compétences CLI

Lorsque **Autoriser automatiquement les compétences CLI** est activé, les exécutables référencés par
les compétences connues sont traités comme étant sur la liste blanche des nœuds (nœud macOS ou hôte de
nœud sans interface). Cela utilise `skills.bins` via le Gateway RPC pour récupérer la
liste des binaires des compétences. Désactivez ceci si vous souhaitez des listes blanches manuelles strictes.

<Warning>
- Il s'agit d'une **liste blanche de commodité implicite**, distincte des entrées de liste blanche de chemin manuel.
- Elle est destinée aux environnements d'opérateurs de confiance où le Gateway et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement des entrées de liste blanche de chemin manuel.

</Warning>

## Bacs sûrs et transfert des approbations

Pour les bacs sûrs (le chemin rapide stdin uniquement), les détails de liaison de l'interpréteur, et
la façon de transférer les invites d'approbation vers Slack/Discord/Telegram (ou les exécuter en tant que
clients d'approbation natifs), voir
[Exec approvals - advanced](/fr/tools/exec-approvals-advanced).

## Modification via l'interface de contrôle

Utilisez la carte **Interface de contrôle → Nœuds → Approbations d'exécution** pour modifier les valeurs par
par défaut, les remplacements par agent et les listes blanches. Choisissez une portée (Par défaut ou un agent),
ajustez la stratégie, ajoutez/supprimez des modèles de liste blanche, puis **Enregistrez**. L'interface
affiche les métadonnées de la dernière utilisation par modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit **Gateway** (approbations locales) ou un **Nœud**.
Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou
hôte de nœud sans interface). Si un nœud n'annonce pas encore les approbations d'exécution,
modifiez son `~/.openclaw/exec-approvals.json` local directement.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud - voir
[Approbations CLI](/fr/cli/approvals).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse `exec.approval.requested` aux clients opérateurs. L'interface de contrôle et l'application macOS la résolvent via `exec.approval.resolve`, puis la passerelle transmet la demande approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan` canonique. La passerelle utilise ce plan comme contexte de commande/répertoire de travail/session faisant autorité lors du transfert des demandes `system.run` approuvées.

Cela est important pour la latence d'approbation asynchrone :

- Le chemin d'exécution du nœud prépare à l'avance un plan canonique.
- L'enregistrement d'approbation stocke ce plan et ses métadonnées de liaison.
- Une fois approuvé, l'appel final transféré `system.run` réutilise le plan stocké au lieu de faire confiance aux modifications ultérieures de l'appelant.
- Si l'appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou `sessionKey` après la création de la demande d'approbation, la passerelle rejette l'exécution transférée en tant que non-concordance d'approbation.

## Événements système

Le cycle de vie d'exécution est présenté sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil d'avertissement d'exécution).
- `Exec finished`.

Ces éléments sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution refusées sont finales : OpenClaw peut signaler le refus à l'opérateur ou via la route de discussion directe, mais il ne publie pas `Exec denied` dans la session de l'agent ni ne réveille le travail de l'agent.
Les approbations d'exécution hébergées sur Gateway émettent les mêmes événements de cycle de vie lorsque la commande se termine (et éventuellement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces messages pour faciliter la corrélation.

## Comportement en cas de refus d'approbation

Lorsqu'une approbation d'exécution asynchrone est refusée, OpenClaw traite la demande comme finale.
Il peut afficher un refus concis à l'opérateur ou via la route de discussion directe, mais il n'envoie pas de directive de refus par le biais de la session de l'agent. Cela empêche une commande refusée de devenir un autre tour de model et empêche l'agent de réutiliser la sortie d'une exécution antérieure de la même commande.

## Implications

- **`full`** est puissant ; privilégiez les listes d'autorisation (allowlists) lorsque cela est possible.
- **`ask`** vous maintient informé tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les approbations d'un agent de fuir vers d'autres.
- Les approbations ne s'appliquent qu'aux requêtes d'exécution sur l'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre de `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et ignore les approbations par conception. Pour bloquer fermement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la stratégie d'outils (tool policy).

## Connexes

<CardGroup cols={2}>
  <Card title="Approbations d'exécution - avancé" href="/fr/tools/exec-approvals-advanced" icon="gear">
    Bacs sûrs (safe bins), liaison de l'interpréteur et transfert des approbations vers la discussion.
  </Card>
  <Card title="Outil d'exécution" href="/fr/tools/exec" icon="terminal">
    Outil d'exécution de commandes shell.
  </Card>
  <Card title="Mode élevé" href="/fr/tools/elevated" icon="shield-exclamation">
    Chemin de rupture qui contourne également les approbations.
  </Card>
  <Card title="Sandboxing" href="/fr/gateway/sandboxing" icon="box">
    Modes de bac à sable et accès à l'espace de travail.
  </Card>
  <Card title="Sécurité" href="/fr/gateway/security" icon="lock">
    Modèle de sécurité et durcissement.
  </Card>
  <Card title="Bac à sable vs stratégie de tool vs élevé" href="/fr/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    Quand utiliser chaque contrôle.
  </Card>
  <Card title="Skills" href="/fr/tools/skills" icon="sparkles">
    Comportement d'autorisation automatique soutenu par des Skills.
  </Card>
</CardGroup>
