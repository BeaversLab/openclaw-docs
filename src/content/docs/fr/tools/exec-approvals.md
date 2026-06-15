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

Pour une vue d'ensemble prioritaire aux modes de `deny`, `allowlist`, `ask`, `auto`, `full`,
le mappage Codex Guardian et les autorisations du harnais ACPX, voir
[Modes d'autorisation](/fr/tools/permission-modes).

<Note>
  La stratégie effective est la **plus stricte** entre `tools.exec.*` et les valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée. L'exécution de l'hôte utilise également l'état local des approbations sur cette machine - une `ask: "always"` locale à l'hôte dans `~/.openclaw/exec-approvals.json` continue de demander même si la session ou les
  valeurs par défaut de la configuration demandent `ask: "on-miss"`.
</Note>

## Inspection de la stratégie effective

| Commande                                                         | Ce qu'elle affiche                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | Stratégie demandée, sources de stratégie de l'hôte et le résultat effectif.                                  |
| `openclaw exec-policy show`                                      | Vue fusionnée de la machine locale.                                                                          |
| `openclaw exec-policy set` / `preset`                            | Synchroniser la stratégie demandée locale avec le fichier d'approbations de l'hôte local en une seule étape. |

Lorsqu'une portée locale demande `host=node`, `exec-policy show` signale cette
portée comme gérée par le nœud au moment de l'exécution au lieu de prétendre que le fichier
d'approbations local est la source de vérité.

Si l'interface utilisateur de l'application compagnon est **non disponible**, toute demande qui
provoquerait normalement une invite est résolue par le **secours de demande** (par défaut : `deny`).

<Tip>Les clients d'approbation de chat natifs peuvent amorcer des fonctionnalités spécifiques au canal sur le message d'approbation en attente. Par exemple, Matrix amorce des raccourcis de réaction (`✅` autoriser une fois, `❌` refuser, `♾️` autoriser toujours) tout en laissant les commandes `/approve ...` dans le message comme solution de secours.</Tip>

## Où cela s'applique

Les approbations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **Hôte Gateway** → processus `openclaw` sur la machine passerelle.
- **Hôte de nœud** → exécuteur de nœud (application compagnon macOS ou hôte de nœud sans interface).

### Modèle de confiance

- Les appelants authentifiés par le Gateway sont des opérateurs de confiance pour ce Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte du nœud.
- Les approbations d'exécution réduisent les risques d'exécution accidentelle, mais ne constituent **pas** une limite d'authentification par utilisateur ni une politique de lecture seule du système de fichiers.
- Une fois approuvée, une commande peut modifier des fichiers en fonction des autorisations du système de fichiers de l'hôte ou du bac à sable sélectionné.
- Les exécutions sur l'hôte de nœud approuvées lient le contexte d'exécution canonique : cwd canonique, argv exact, liaison env lorsque présente, et chemin d'exécutable épinglé le cas échéant.
- Pour les scripts shell et les invocations directes de fichiers d'interpréteur/runtime, OpenClaw tente également de lier un opérande de fichier local concret. Si ce fichier lié change après l'approbation mais avant l'exécution, l'exécution est refusée au lieu d'exécuter le contenu modifié.
- La liaison de fichiers est volontairement « best-effort » (au mieux), **pas** un modèle sémantique complet de chaque chemin de chargeur d'interpréteur/runtime. Si le mode d'approbation ne peut pas identifier exactement un fichier local concret à lier, il refuse de créer une exécution soutenue par une approbation au lieu de prétendre à une couverture complète.

### Fractionnement macOS

- Le **service d'hôte de nœud** transfère `system.run` à l'**application macOS** via IPC local.
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

## Contrôles de stratégie

### `tools.exec.mode`

`tools.exec.mode` est la surface de stratégie normalisée préférée pour l'exécution sur l'hôte.
Les valeurs sont :

- `deny` - bloquer l'exécution sur l'hôte.
- `allowlist` - exécuter uniquement les commandes autorisées sans demander.
- `ask` - utiliser la stratégie de liste d'autorisation et demander en cas d'absence.
- `auto` - utiliser la stratégie de liste d'autorisation, exécuter directement les correspondances déterministes et envoyer les absences d'approbation via le réviseur automatique natif de OpenClaw avant de revenir à une voie d'approbation humaine.
- `full` - exécuter sur l'hôte sans invites d'approbation.

Les éléments obsolètes `tools.exec.security` / `tools.exec.ask` restent pris en charge et priment toujours
lorsqu'ils sont définis au niveau de la session ou de l'agent (portée plus restreinte).

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - bloquer toutes les demandes d'exécution sur l'hôte.
  - `allowlist` - autoriser uniquement les commandes figurant sur la liste d'autorisation.
  - `full` - tout autoriser (équivalent à un niveau élevé).

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - ne jamais demander.
  - `on-miss` - demander uniquement lorsque la liste d'autorisation ne correspond pas.
  - `always` - demander pour chaque commande. `allow-always` La confiance durable ne supprime **pas** les invites lorsque le mode de demande effectif est `always`.

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
  Lorsque `true`, OpenClaw traite les formes d'évaluation de code en ligne comme étant soumise uniquement à approbation, même si le binaire de l'interpréteur lui-même est sur la liste d'autorisation. Défense en profondeur pour les chargeurs d'interpréteur qui ne correspondent pas proprement à un seul opérande de fichier stable.
</ParamField>

Exemples que le mode strict détecte :

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

En mode strict, ces commandes nécessitent toujours une approbation explicite, et
`allow-always` ne persiste pas automatiquement les nouvelles entrées de liste d'autorisation pour elles.

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  Contrôle uniquement l'affichage dans les invites d'approbation d'exécution. Lorsqu'il est activé, OpenClaw peut joindre des intervalles de commande dérivés de l'analyseur afin que les invites d'approbation Web puissent mettre en surbrillance les jetons de commande. Définissez-le sur `true` pour activer la mise en surbrillance du texte de la commande.
</ParamField>

Ce paramètre ne modifie **pas** `security`, `ask`, la correspondance de liste d'autorisation,
le comportement d'évaluation en ligne stricte, le transfert d'approbation ou l'exécution de commandes.
Il peut être défini globalement sous `tools.exec.commandHighlighting` ou par
agent sous `agents.list[].tools.exec.commandHighlighting`.

## Mode YOLO (sans approbation)

Si vous souhaitez que l'exécution de l'hôte se déroule sans invites d'approbation, vous devez ouvrir
**les deux** couches de stratégie - stratégie d'exécution demandée dans la configuration OpenClaw
(`tools.exec.*`) **et** stratégie d'approbations locale à l'hôte dans
`~/.openclaw/exec-approvals.json`.

YOLO est le comportement par défaut de l'hôte, sauf si vous le resserez explicitement :

| Couche                | Paramètre YOLO              |
| --------------------- | --------------------------- |
| `tools.exec.security` | `full` sur `gateway`/`node` |
| `tools.exec.ask`      | `off`                       |
| Hôte `askFallback`    | `full`                      |

<Warning>
**Distinctions importantes :**

- `tools.exec.host=auto` choisit **où** l'exécution s'effectue : sandbox si disponible, sinon passerelle.
- YOLO choisit **comment** l'exécution sur l'hôte est approuvée : `security=full` plus `ask=off`.
- En mode YOLO, OpenClaw n'ajoute **pas** une porte d'approbation heuristique distincte pour l'obfuscation de commandes ou une couche de rejet de pré-vol de scripts par-dessus la stratégie d'exécution sur l'hôte configurée.
- `auto` ne fait pas du routage par passerelle une priorité gratuite depuis une session sandboxée. Une demande `host=node` par appel est autorisée depuis `auto` ; `host=gateway` n'est autorisée depuis `auto` que lorsqu'aucun runtime de sandbox n'est actif. Pour une valeur par défaut stable non automatique, définissez `tools.exec.host` ou utilisez `/exec host=...` explicitement.

</Warning>

Les fournisseurs basés sur CLI qui exposent leur propre mode d'autorisation non interactif peuvent suivre cette stratégie. Le CLI Claude ajoute `--permission-mode bypassPermissions` lorsque la stratégie d'exécution effective de OpenClaw est YOLO. Pour les sessions en direct Claude gérées par OpenClaw, la stratégie d'exécution effective de OpenClaw prime sur le mode d'autorisation natif de Claude : YOLO normalise les lancements en direct à `--permission-mode bypassPermissions`, et une stratégie d'exécution effective restrictive normalise les lancements en direct à `--permission-mode default`, même si les arguments bruts du backend Claude spécifient un autre mode.

Si vous souhaitez une configuration plus conservatrice, resserrez la stratégie d'exécution OpenClaw à `allowlist` / `on-miss` ou `deny`.

### Configuration persistante « never prompt » sur l'hôte de la passerelle

<Steps>
  <Step title="Set the requested config policy">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="Match the host approvals file">
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
- Les valeurs par défaut locales `~/.openclaw/exec-approvals.json`.

Ceci est intentionnellement uniquement local. Pour modifier les approbations de l'hôte de passerelle ou de l'hôte de nœud à distance, utilisez `openclaw approvals set --gateway` ou `openclaw approvals set --node <id|name|ip>`.

### Hôte de nœud

Pour un hôte de nœud, appliquez plutôt le même fichier d'approbations sur ce nœud :

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
- Les approbations d'exécution de nœud sont récupérées depuis le nœud au moment de l'exécution, les mises à jour ciblant le nœud doivent donc utiliser `openclaw approvals --node ...`.

</Note>

### Raccourci session uniquement

- `/exec security=full ask=off` modifie uniquement la session actuelle.
- `/elevated full` est un raccourci de type « briser la vitre » qui ignore les approbations d'exécution uniquement lorsque la stratégie demandée et le fichier d'approbations de l'hête résolvent tous deux à `security: "full"` et `ask: "off"`. Un fichier hôte plus strict, tel que `ask: "always"`, demande toujours une confirmation.

Si le fichier d'approbations de l'hôte reste plus strict que la configuration, la stratégie hôte plus stricte l'emporte.

## Liste blanche (par agent)

Les listes blanches sont **par agent**. Si plusieurs agents existent, changez l'agent que vous modifiez dans l'application macOS. Les modèles sont des correspondances glob.

Les modèles peuvent être des globs de chemin binaire résolu ou des globs de nom de commande nu. Les noms nus correspondent uniquement aux commandes invoquées via `PATH`, donc `rg` peut correspondre à `/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais **pas** `./rg` ou `/tmp/rg`. Utilisez un glob de chemin lorsque vous souhaitez faire confiance à un emplacement binaire spécifique.

Les entrées héritées `agents.default` sont migrées vers `agents.main` au chargement. Les chaînes de shell telles que `echo ok && pwd` nécessitent toujours que chaque segment de niveau supérieur satisfasse les règles de la liste blanche.

Exemples :

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### Restriction des arguments avec argPattern

Ajoutez `argPattern`OpenClaw lorsqu'une entrée de liste d'autorisation doit correspondre à un binaire et à une forme d'argument spécifique. OpenClaw évalue l'expression régulière par rapport aux arguments de commande analysés, à l'exclusion du jeton exécutable (`argv[0]`). Pour les entrées créées manuellement, les arguments sont joints par un seul espace, donc ancrez le modèle lorsque vous avez besoin d'une correspondance exacte.

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

Cette entrée autorise `python3 safe.py` ; `python3 other.py` est une non-correspondance de la liste d'autorisation. Si une entrée de chemin uniquement pour le même binaire est également présente, les arguments sans correspondance peuvent toujours revenir à cette entrée de chemin uniquement. Omettez l'entrée de chemin uniquement lorsque l'objectif est de restreindre le binaire aux arguments déclarés.

Les entrées enregistrées par les flux d'approbation peuvent utiliser un format de séparateur interne pour une correspondance exacte des argv. Privilégiez l'interface utilisateur ou le flux d'approbation pour régénérer ces entrées plutôt que de modifier manuellement la valeur encodée. Si OpenClaw ne peut pas analyser argv pour un segment de commande, les entrées avec OpenClaw`argPattern` ne correspondent pas.

Chaque entrée de liste d'autorisation prend en charge :

| Champ              | Signification                                                                       |
| ------------------ | ----------------------------------------------------------------------------------- |
| `pattern`          | Chemin de binaire résolu glob ou nom de commande nu glob                            |
| `argPattern`       | Regex argv facultatif ; les entrées omises sont chemin uniquement                   |
| `id`               | UUID stable utilisé pour l'identité de l'interface utilisateur                      |
| `source`           | Source de l'entrée, telle que `allow-always`                                        |
| `commandText`      | Texte de commande capturé lors de la création de l'entrée par un flux d'approbation |
| `lastUsedAt`       | Horodatage de la dernière utilisation                                               |
| `lastUsedCommand`  | Dernière commande ayant correspondu                                                 |
| `lastResolvedPath` | Dernier chemin de binaire résolu                                                    |

## Autoriser automatiquement les lignes de commande (CLIs) des compétences

Lorsque l'option **Autoriser automatiquement les lignes de commande des compétences** est activée, les exécutables référencés par les compétences connues sont traités comme étant sur la liste d'autorisation sur les nœuds (nœud macOS ou hôte de nœud sans interface graphique). Cela utilise macOS`skills.bins`GatewayRPC via le RPC de la passerelle pour récupérer la liste des binaires de compétences. Désactivez cette option si vous souhaitez des listes d'autorisation manuelles strictes.

<Warning>
- Il s'agit d'une **liste d'autorisation de commodité implicite**, distincte des entrées de liste d'autorisation de chemin manuel.
- Elle est destinée aux environnements d'opérateurs de confiance où le Gateway et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement des entrées de liste d'autorisation de chemin manuel.

</Warning>

## Bacs sécurisés et transfert des approbations

Pour les bacs sécurisés (le chemin rapide stdin uniquement), les détails de liaison de l'interpréteur, et la manière de transférer les invites d'approbation vers Slack/Discord/Telegram (ou les exécuter en tant que clients d'approbation natifs), consultez
[Exec approvals - advanced](/fr/tools/exec-approvals-advanced).

## Modification de l'interface utilisateur de contrôle

Utilisez la carte **Control UI → Nodes → Exec approvals** pour modifier les valeurs par défaut,
les remplacements par agent et les listes d'autorisation. Choisissez une portée (Defaults ou un agent),
ajustez la stratégie, ajoutez/supprimez des modèles de liste d'autorisation, puis **Save**. L'interface utilisateur
affiche les métadonnées de dernière utilisation par modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit le **Gateway** (approbations locales) ou un **Node**.
Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou
hôte de nœud sans interface graphique). Si un nœud n'annonce pas encore les approbations d'exécution,
modifiez directement son `~/.openclaw/exec-approvals.json` local.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud - consultez
[Approvals CLI](/fr/cli/approvals).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse
`exec.approval.requested` aux clients opérateurs. L'interface utilisateur de contrôle et l'application
macOS la résolvent via `exec.approval.resolve`, puis la passerelle transmet la
requête approuvée à l'hôte du nœud.

Pour `host=node`, les requêtes d'approbation incluent une charge utile `systemRunPlan`
canonique. La passerelle utilise ce plan comme contexte
commande/cwd/session faisant autorité lors du transfert des requêtes `system.run`
approuvées.

C'est important pour la latence d'approbation asynchrone :

- Le chemin d'exécution du nœud prépare un plan canonique à l'avance.
- L'enregistrement d'approbation stocke ce plan et ses métadonnées de liaison.
- Une fois approuvé, l'appel final transféré `system.run` réutilise le plan stocké au lieu de faire confiance aux modifications ultérieures de l'appelant.
- Si l'appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou `sessionKey` après la création de la demande d'approbation, la passerelle rejette l'exécution transférée en raison d'une inadéquation de l'approbation.

## Événements système

Le cycle de vie de l'exécution est exposé sous forme de messages système :

- `Exec running` (seulement si la commande dépasse le seuil de notification d'exécution).
- `Exec finished`.

Ces messages sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution refusées sont terminales pour la commande de l'hôte elle-même : la commande
ne s'exécute pas. Pour les approbations asynchrones de l'agent principal avec une session d'origine,
OpenClaw renvoie le refus dans cette session sous forme de suivi interne afin que l'agent
puisse cesser d'attendre la commande asynchrone et éviter une réparation de résultat manquant.
S'il n'y a pas de session ou si la session ne peut pas être reprise, OpenClaw peut toujours
signaler un refus concis à l'opérateur ou à la route de discussion directe. Les refus pour
les sessions de sous-agents ne sont pas renvoyés dans le sous-agent.
Les approbations d'exécution hébergées par le Gateway émettent les mêmes événements de cycle de vie lorsque la
commande se termine (et optionnellement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions conditionnées par une approbation réutilisent l'ID d'approbation comme `runId` dans ces
messages pour une corrélation facile.

## Comportement en cas d'approbation refusée

Lorsqu'une approbation d'exécution asynchrone est refusée, OpenClaw traite la commande de l'hôte comme
terminale et échoue de manière fermée. Pour les sessions de l'agent principal, le refus est délivré sous forme de
suivi de session interne indiquant à l'agent que la commande asynchrone ne s'est pas exécutée.
Cela préserve la continuité de la transcription sans exposer de résultats de commande périmés. Si la
livraison de session est indisponible, OpenClaw se rabat sur un refus concis à l'opérateur ou
en discussion directe lorsqu'une route sûre existe.

## Implications

- **`full`** est puissant ; préférez les listes d'autorisation lorsque cela est possible.
- **`ask`** vous tient informé tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les approbations d'un agent de fuir vers les autres.
- Les approbations ne s'appliquent qu'aux demandes d'exécution sur l'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et ignore les approbations par conception. Pour bloquer strictement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez le `exec` tool via la tool policy.

## Connexes

<CardGroup cols={2}>
  <Card title="Exec approvals - advanced" href="/fr/tools/exec-approvals-advanced" icon="gear">
    Bacs sûrs, liaison d'interpréteur et transfert d'approbation vers le chat.
  </Card>
  <Card title="Exec tool" href="/fr/tools/exec" icon="terminal">
    Tool d'exécution de commandes shell.
  </Card>
  <Card title="Elevated mode" href="/fr/tools/elevated" icon="shield-exclamation">
    Chemin de secours qui ignore également les approbations.
  </Card>
  <Card title="Sandboxing" href="/fr/gateway/sandboxing" icon="box">
    Modes Sandbox et accès à l'espace de travail.
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
