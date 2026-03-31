---
summary: "Exec approvals, allowlists, and sandbox escape prompts"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec Approvals"
---

# Approbations d'exécution

Les approbations d'exécution sont le **garde-fou de l'application compagnon / de l'hôte de nœud** permettant à un agent sandboxed d'exécuter des commandes sur un hôte réel (`gateway` ou `node`). Considérez cela comme un verrouillage de sécurité : les commandes sont autorisées uniquement lorsque la stratégie + la liste d'autorisation + (facultatif) l'approbation de l'utilisateur sont toutes d'accord. Les approbations d'exécution s'ajoutent à la stratégie de tool et au filtrage élevé (sauf si élevé est défini sur `full`, ce qui ignore les approbations). La stratégie efficace est la plus stricte de `tools.exec.*` et des valeurs par défaut des approbations ; si un champ d'approbations est omis, la valeur `tools.exec` est utilisée.

Si l'interface utilisateur de l'application compagnon n'est **pas disponible**, toute demande nécessitant une invite est résolue par le **ask fallback** (par défaut : refuser).

## Champ d'application

Les approbations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **hôte de passerelle** → processus `openclaw` sur la machine passerelle
- **hôte de nœud** → node runner (application compagnon macOS ou hôte de nœud sans interface)

Remarque sur le modèle de confiance :

- Les appelants authentifiés par la Gateway sont des opérateurs de confiance pour cette Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte de nœud.
- Les approbations d'exécution réduisent le risque d'exécution accidentelle, mais ne constituent pas une limite d'authentification par utilisateur.
- Les exécutions approuvées sur l'hôte de nœud lient le contexte d'exécution canonique : cwd canonique, argv exact, liaison env lorsqu'elle est présente, et chemin d'exécutable épinglé le cas échéant.
- Pour les scripts shell et les appels de fichiers d'interpréteur/runtime directs, OpenClaw tente également de lier un opérande de fichier local concret. Si ce fichier lié change après l'approbation mais avant l'exécution, l'exécution est refusée au lieu d'exécuter le contenu modifié.
- Cette liaison de fichier est volontairement au mieux (best-effort), et non un modèle sémantique complet de chaque chemin de chargeur d'interpréteur/de runtime. Si le mode d'approbation ne peut pas identifier exactement un fichier local concret à lier, il refuse de créer une exécution soutenue par une approbation au lieu de prétendre à une couverture complète.

macOS division :

- le **service d'hôte de nœud** transfère `system.run` à l'**application macOS** via l'IPC local.
- L'**application macOS** applique les approbations + exécute la commande dans le contexte de l'interface utilisateur.

## Paramètres et stockage

Les approbations résident dans un fichier JSON local sur l'hôte d'exécution :

`~/.openclaw/exec-approvals.json`

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
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## Boutons de contrôle de stratégie

### Sécurité (`exec.security`)

- **deny** : bloquer toutes les demandes d'exécution sur l'hôte.
- **allowlist** : autoriser uniquement les commandes de la liste blanche.
- **full** : tout autoriser (équivalent à un accès élevé).

### Demander (`exec.ask`)

- **off** : ne jamais demander.
- **on-miss** : demander uniquement lorsque la liste blanche ne correspond pas.
- **always** : demander pour chaque commande.

### Repli de demande (`askFallback`)

Si une demande est requise mais qu'aucune interface utilisateur n'est accessible, le repli décide :

- **deny** : bloquer.
- **allowlist** : autoriser uniquement si la liste blanche correspond.
- **full** : autoriser.

### Durcissement de l'éval de l'interpréteur en ligne (`tools.exec.strictInlineEval`)

Quand `tools.exec.strictInlineEval=true`, OpenClaw traite les formulaires d'évaluation de code en ligne comme nécessitant une approbation uniquement, même si le binaire de l'interpréteur lui-même est sur la liste d'autorisation.

Exemples :

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

Il s'agit d'une défense en profondeur pour les chargeurs d'interpréteur qui ne correspondent pas proprement à un seul opérande de fichier stable. En mode strict :

- ces commandes nécessitent toujours une approbation explicite ;
- `allow-always` ne persiste pas automatiquement les nouvelles entrées de liste blanche pour elles.

## Liste autorisée (par agent)

Les listes d'autorisation sont **par agent**. Si plusieurs agents existent, changez l'agent que vous
modifiez dans l'application macOS. Les correspondances sont **des correspondances glob insensibles à la casse**.
Les modèles doivent correspondre à des **chemins binaires** (les entrées composées uniquement du nom de base sont ignorées).
Les entrées `agents.default` héritées sont migrées vers `agents.main` au chargement.

Exemples :

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Chaque entrée de liste autorisée suit :

- **id** UUID stable utilisé pour l'identité de l'interface utilisateur (facultatif)
- **dernière utilisation** horodatage
- **dernière commande utilisée**
- **dernier chemin résolu**

## Autorisation automatique des lignes de commande de compétences

Lorsque **Auto-allow skill CLIs** est activé, les exécutables référencés par les compétences connues sont traités comme étant sur liste blanche sur les nœuds (nœud macOS ou hôte de nœud sans tête). Cela utilise `skills.bins` via le Gateway RPC pour récupérer la liste des binaires de compétences. Désactivez cette option si vous souhaitez des listes blanches manuelles strictes.

Remarques importantes sur la confiance :

- Il s'agit d'une **liste autorisée de commodité implicite**, distincte des entrées de liste autorisée de chemin manuel.
- Elle est destinée aux environnements d'opérateurs de confiance où la passerelle et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement des entrées de liste blanche de chemin manuel.

## Bacs sûrs (stdin uniquement)

`tools.exec.safeBins` définit une petite liste de binaires **uniquement stdin** (par exemple `cut`)
qui peuvent s'exécuter en mode liste blanche **sans** entrées de liste blanche explicites. Les bacs sûrs rejettent
les arguments de fichier positionnels et les jetons de type chemin, ils ne peuvent donc opérer que sur le flux entrant.
Traitez cela comme un chemin rapide étroit pour les filtres de flux, et non comme une liste de confiance générale.
Ne **pas** ajouter de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) à `safeBins`.
Si une commande peut évaluer du code, exécuter des sous-commandes ou lire des fichiers par conception, préférez les entrées de liste blanche explicites et gardez les invites d'approbation activées.
Les bacs sûrs personnalisés doivent définir un profil explicite dans `tools.exec.safeBinProfiles.<bin>`.
La validation est déterministe uniquement à partir de la forme d'argv (aucune vérification de l'existence du système de fichiers hôte), ce qui
empêche le comportement d'oracle d'existence de fichier à partir des différences de refus/autorisation.
Les options orientées fichier sont refusées pour les bacs sûrs par défaut (par exemple `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Les bacs sûrs appliquent également une stratégie explicite d'indicateurs par binaire pour les options qui brisent le comportement
uniquement stdin (par exemple `sort -o/--output/--compress-program` et les indicateurs récursifs de grep).
Les options longues sont validées en échec-fermé en mode bac sûr : les indicateurs inconnus et les
abréviations ambiguës sont rejetées.
Indicateurs refusés par le profil de bac sûr :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bins sûrs forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de globbing
et pas d'expansion `$VARS`) pour les segments stdin uniquement, afin que des modèles comme `*` ou `$HOME/...` ne puissent pas
être utilisés pour introduire clandestinement des lectures de fichiers.
Les bins sûrs doivent également être résolus à partir de répertoires binaires de confiance (par défaut du système plus `tools.exec.safeBinTrustedDirs` en option). Les entrées `PATH` ne sont jamais automatiquement approuvées.
Les répertoires de confiance pour les bins sûrs sont intentionnellement minimaux : `/bin`, `/usr/bin`.
Si votre exécutable bin sûr réside dans des chemins de gestionnaire de paquets/utilisateur (par exemple
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement
à `tools.exec.safeBinTrustedDirs`.
Les chaînages et redirections de shell ne sont pas automatiquement autorisés en mode liste blanche.

L'enchaînement de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de niveau supérieur satisfait à la liste d'autorisation (y compris les bacs sûrs ou l'autorisation automatique des compétences). Les redirections restent non prises en charge en mode liste d'autorisation. La substitution de commandes (`$()` / backticks) est rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur des guillemets doubles ; utilisez des guillemets simples si vous avez besoin de texte littéral `$()`. Sur les approbations de l'application compagnon macOS, le texte brut du shell contenant une syntaxe de contrôle ou d'expansion du shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est considéré comme un échec de la liste d'autorisation, sauf si le binaire du shell lui-même est sur la liste d'autorisation. Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les remplacements d'environnement limités à la requête sont réduits à une petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`). Pour les décisions d'autorisation toujours en mode liste d'autorisation, les wrappers de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) conservent les chemins des exécutables internes au lieu des chemins des wrappers. Les multiplexeurs de shell (`busybox`, `toybox`) sont également déballés pour les applets de shell (`sh`, `ash`, etc.) afin que les exécutables internes soient conservés à la place des binaires de multiplexage. Si un wrapper ou un multiplexeur ne peut pas être déballé en toute sécurité, aucune entrée de liste d'autorisation n'est conservée automatiquement. Si vous mettez sur la liste d'autorisation des interpréteurs comme `python3` ou `node`, préférez `tools.exec.strictInlineEval=true` afin que l'évaluation en ligne nécessite toujours une approbation explicite.

Bacs sûrs par défaut :

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` et `sort` ne sont pas dans la liste par défaut. Si vous activez cette option, gardez des entrées de liste d'autorisation explicites pour leurs workflows sans stdin.
Pour `grep` en mode safe-bin, fournissez le modèle avec `-e`/`--regexp` ; la forme de modèle positionnel est rejetée afin que les opérandes de fichier ne puissent pas être introduits en fraude sous forme de positionnels ambigus.

### Bacs sûrs par rapport à la liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                              | Liste d'autorisation (`exec-approvals.json`)                                                  |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Objectif               | Autoriser automatiquement les filtres stdin étroits                | Confier explicitement des exécutables spécifiques                                             |
| Type de correspondance | Nom de l'exécutable + stratégie argv de bac sûr                    | Modèle global de chemin d'exécutable résolu                                                   |
| Portée des arguments   | Restreint par le profil de bac sûr et les règles de jeton littéral | Correspondance de chemin uniquement ; les arguments sont par ailleurs de votre responsabilité |
| Exemples typiques      | `head`, `tail`, `tr`, `wc`                                         | `jq`, `python3`, `node`, `ffmpeg`, CLI personnalisés                                          |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines        | Tout outil ayant un comportement plus large ou des effets secondaires                         |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou par agent `agents.list[].tools.exec.safeBins`).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou par agent `agents.list[].tools.exec.safeBinTrustedDirs`).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou par agent `agents.list[].tools.exec.safeBinProfiles`). Les clés de profil par agent remplacent les clés globales.
- les entrées de la liste blanche résident dans `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via l'interface de contrôle / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertit avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des interpréteurs/binaires d'exécution apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut générer des entrées `safeBinProfiles.<bin>` personnalisées manquantes en tant que `{}` (à réviser et à resserrer ensuite). Les interpréteurs/binaires d'exécution ne sont pas générés automatiquement.

Exemple de profil personnalisé :

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

Si vous activez explicitement `jq` dans `safeBins`, OpenClaw rejette toujours la primitive `env` en mode safe-bin,
dont `jq -n env` ne peut pas vider l'environnement du processus hôte sans un chemin de liste d'autorisation explicite
ou une invite d'approbation.

## Modification via l'interface de contrôle

Utilisez la carte **Interface de contrôle → Nœuds → Approbations d'exécution** pour modifier les valeurs par défaut, les remplacements par agent et les listes d'autorisation. Choisissez une portée (Par défaut ou un agent), ajustez la stratégie, ajoutez/supprimez des motifs de liste d'autorisation, puis **Enregistrer**. L'interface affiche des métadonnées de **dernière utilisation** par motif afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit **Gateway** (approbations locales) ou un **Node** (Nœud). Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud sans interface graphique). Si un nœud n'annonce pas encore les approbations d'exécution, modifiez son `~/.openclaw/exec-approvals.json` local directement.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud (voir [Approvals CLI](/en/cli/approvals)).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse `exec.approval.requested` aux clients opérateurs.
L'interface de contrôle et l'application macOS la résolvent via `exec.approval.resolve`, puis la passeronne transmet la
requête approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan` canonique. La passerelle utilise ce plan comme contexte de commande/répertoire de travail/session autoritaire lors du transfert des demandes `system.run` approuvées.

## Commandes d'interpréteur/exécution

Les exécutions d'interpréteur/exécution soutenues par approbation sont intentionnellement conservatrices :

- Le contexte exact argv/répertoire de travail/env est toujours lié.
- Les formulaires de script shell direct et de fichier d'exécution direct sont liés au mieux à un instantané concret d'un fichier local.
- Les formes courantes d'enveloppe de gestionnaire de paquets qui résolvent toujours vers un fichier local direct (par exemple
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont désenveloppées avant la liaison.
- Si OpenClaw ne peut pas identifier exactement un seul fichier local concret pour une commande d'interpréteur/runtime
  (par exemple les scripts de paquets, les formes d'évaluation, les chaînes de chargeur spécifiques au runtime, ou les formes multi-fichiers
  ambiguës), l'exécution soutenue par une approbation est refusée au lieu de prétendre à une couverture sémantique qu'elle n'a pas.
- Pour ces workflows, préférez le sandboxing, une frontière d'hôte séparée, ou une liste d'autorisation/explicite de confiance (allowlist)
  ou un workflow complet où l'opérateur accepte la sémantique runtime plus large.

Lorsque des approbations sont requises, l'outil d'exécution renvoie immédiatement un identifiant d'approbation. Utilisez cet identifiant pour corréler les événements système ultérieurs (`Exec finished` / `Exec denied`). Si aucune décision n'arrive avant l'expiration du délai, la demande est traitée comme un délai d'approbation et présentée comme un motif de refus.

La boîte de dialogue de confirmation inclut :

- commande + args
- cwd
- id de l'agent
- chemin exécutable résolu
- métadonnées d'hôte + de stratégie

Actions :

- **Autoriser une fois** → exécuter maintenant
- **Toujours autoriser** → ajouter à la liste d'autorisation + exécuter
- **Refuser** → bloquer

## Transfert des approbations vers les canaux de discussion

Vous pouvez transférer les invites d'approbation d'exécution vers n'importe quel canal de discussion (y compris les canaux de plugin) et les approuver avec `/approve`. Cela utilise le pipeline de livraison sortant normal.

Config :

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

Répondre dans le chat :

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

La commande `/approve` gère à la fois les approbations d'exécution et les approbations de plugin. Si l'ID ne correspond pas à une approbation d'exécution en attente, elle vérifie automatiquement les approbations de plugin.

### Transfert des approbations de plugin

Le transfert des approbations de plug-in utilise le même pipeline de livraison que les approbations d'exécution, mais possède sa propre configuration indépendante sous `approvals.plugin`. L'activation ou la désactivation de l'une n'affecte pas l'autre.

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

La forme de la configuration est identique à `approvals.exec` : `enabled`, `mode`, `agentFilter`,
`sessionFilter` et `targets` fonctionnent de la même manière.

Les canaux qui prennent en charge les boutons d'approbation d'exécution interactifs (comme Telegram) affichent également des boutons pour les approbations de plugins. Les canaux sans prise en charge de l'adaptateur reviennent à du texte brut avec des instructions `/approve`.

### Clients d'approbation de chat intégrés

Discord et Telegram peuvent également agir en tant que clients d'approbation d'exécution explicites avec une configuration spécifique au canal.

- Discord : `channels.discord.execApprovals.*`
- Telegram : `channels.telegram.execApprovals.*`

Ces clients sont opt-in. Si un channel n'a pas les approbations d'exécution activées, OpenClaw ne traite pas
ce channel comme une surface d'approbation simplement parce que la conversation a eu lieu là-bas.

Comportement partagé :

- seuls les approbateurs configurés peuvent approuver ou refuser
- le demandeur n'a pas besoin d'être un approbateur
- lorsque la livraison par channel est activée, les invites d'approbation incluent le texte de la commande
- si aucune interface utilisateur d'opérateur ou aucun client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

Telegram utilise par défaut les MD de l'approbant (`target: "dm"`). Vous pouvez passer à `channel` ou `both` lorsque vous
souhaitez que les invites d'approbation apparaissent également dans la discussion/sujet Telegram d'origine. Pour les sujets de forum Telegram,
OpenClaw conserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](/en/channels/discord)
- [Telegram](/en/channels/telegram)

### Flux macOS IPC

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, jeton stocké dans `exec-approvals.json`.
- Vérification des pairs UID identique.
- Défi/réponse (nonce + jeton HMAC + hachage de la requête) + TTL court.

## Événements système

Le cycle de vie de l'exécution est exposé sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil d'avertissement d'exécution)
- `Exec finished`
- `Exec denied`

Ces événements sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par le Gateway émettent les mêmes événements de cycle de vie lorsque la commande est terminée (et éventuellement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces messages pour une corrélation aisée.

## Implications

- **full** est puissant ; préférez les listes d'autorisation lorsque cela est possible.
- **ask** vous maintient dans la boucle tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les approbations d'un agent de fuir vers d'autres.
- Les approbations s'appliquent uniquement aux requêtes d'exécution d'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et saute les approbations par conception.
  Pour bloquer strictement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez le tool `exec` via la stratégie de tool.

Connexe :

- [Tool Exec](/en/tools/exec)
- [Mode élevé](/en/tools/elevated)
- [Skills](/en/tools/skills)
