---
summary: "Mode exec élevé : exécuter des commandes en dehors du bac à sable depuis un agent en bac à sable"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Mode élevé"
---

Lorsqu'un agent s'exécute dans un sandbox, ses commandes `exec` sont confinées à l'environnement du sandbox. Le **Mode élevé** permet à l'agent de s'échapper et d'exécuter des commandes à l'extérieur du sandbox à la place, avec des portes d'approbation configurables.

<Info>Le mode élevé ne modifie le comportement que lorsque l'agent est **sandboxed**. Pour les agents non sandboxés, exec s'exécute déjà sur l'hôte.</Info>

## Directives

Contrôlez le mode élevé par session avec des commandes slash :

| Directive        | Ce qu'elle fait                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `/elevated on`   | Exécuter à l'extérieur du sandbox sur le chemin d'hôte configuré, conserver les approbations |
| `/elevated ask`  | Identique à `on` (alias)                                                                     |
| `/elevated full` | Exécuter à l'extérieur du sandbox sur le chemin d'hôte configuré et ignorer les approbations |
| `/elevated off`  | Retourner à l'exécution confinée au sandbox                                                  |

Également disponible sous la forme `/elev on|off|ask|full`.

Envoyez `/elevated` sans argument pour voir le niveau actuel.

## Comment cela fonctionne

<Steps>
  <Step title="Vérifier la disponibilité">
    Le mode élevé doit être activé dans la configuration et l'expéditeur doit figurer sur la liste d'autorisation :

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Définir le niveau">
    Envoyez un message contenant uniquement une directive pour définir la valeur par défaut de la session :

    ```
    /elevated full
    ```

    Ou utilisez-la en ligne (s'applique uniquement à ce message) :

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="Les commandes s'exécutent à l'extérieur du sandbox">
    Avec le mode élevé actif, les appels `exec` quittent le sandbox. L'hôte effectif est
    `gateway` par défaut, ou `node` lorsque la cible d'exécution configurée/de session est
    `node`. En mode `full`, les approbations exec sont ignorées. En mode `on`/`ask`,
    les règles d'approbation configurées s'appliquent toujours.
  </Step>
</Steps>

## Ordre de résolution

1. **Directive en ligne** sur le message (s'applique uniquement à ce message)
2. **Remplacement de session** (défini en envoyant un message contenant uniquement une directive)
3. **Par défaut global** (`agents.defaults.elevatedDefault` dans la configuration)

## Disponibilité et listes d'autorisation

- **Portail global** : `tools.elevated.enabled` (doit être `true`)
- **Liste d'autorisation de l'expéditeur** : `tools.elevated.allowFrom` avec des listes par canal
- **Portail par agent** : `agents.list[].tools.elevated.enabled` (ne peut que restreindre davantage)
- **Liste d'autorisation par agent** : `agents.list[].tools.elevated.allowFrom` (l'expéditeur doit correspondre à la fois au global et au par agent)
- **Repli Discord** : si `tools.elevated.allowFrom.discord` est omis, `channels.discord.allowFrom` est utilisé comme solution de repli
- **Tous les portails doivent être validés** ; sinon le mode élevé est considéré comme indisponible

Formats d'entrée de liste d'autorisation :

| Préfixe                 | Correspondances                         |
| ----------------------- | --------------------------------------- |
| (aucun)                 | ID de l'expéditeur, E.164 ou champ From |
| `name:`                 | Nom d'affichage de l'expéditeur         |
| `username:`             | Nom d'utilisateur de l'expéditeur       |
| `tag:`                  | Tag de l'expéditeur                     |
| `id:`, `from:`, `e164:` | Ciblage d'identité explicite            |

## Ce que le mode élevé ne contrôle pas

- **Stratégie d'outil** : si `exec` est refusé par la stratégie d'outil, le mode élevé ne peut pas l'outrepasser
- **Stratégie de sélection de l'hôte** : le mode élevé ne transforme pas `auto` en une substitution libre entre hôtes. Il utilise les règles de cible d'exécution configurées/session, choisissant `node` uniquement lorsque la cible est déjà `node`.
- **Distinct de `/exec`** : la directive `/exec` ajuste les défauts d'exécution par session pour les expéditeurs autorisés et ne nécessite pas le mode élevé

## Connexes

- [Outil Exec](/fr/tools/exec) — exécution de commandes shell
- [Approbations Exec](/fr/tools/exec-approvals) — système d'approbation et de liste d'autorisation
- [Mise en bac à sable (Sandboxing)](/fr/gateway/sandboxing) — configuration du bac à sable
- [Bac à sable vs Stratégie d'outil vs Mode élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
