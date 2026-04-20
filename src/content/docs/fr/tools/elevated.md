---
summary: "Mode exec élevé : exécuter des commandes en dehors du bac à sable depuis un agent en bac à sable"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Mode avec élévation"
---

# Mode avec élévation

Lorsqu'un agent s'exécute dans un bac à sable, ses commandes `exec` sont confinées à l'environnement du bac à sable. Le **mode élevé** permet à l'agent de s'échapper et d'exécuter des commandes à l'extérieur du bac à sable, avec des portes d'approbation configurables.

<Info>Le mode élevé ne modifie le comportement que lorsque l'agent est **sandboxed**. Pour les agents non sandboxed, exec s'exécute déjà sur l'hôte.</Info>

## Directives

Contrôlez le mode avec élévation par session avec les commandes slash :

| Directive        | Ce qu'elle fait                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `/elevated on`   | Exécuter en dehors du bac à sable sur le chemin d'hôte configuré, garder les approbations    |
| `/elevated ask`  | Identique à `on` (alias)                                                                     |
| `/elevated full` | Exécuter en dehors du bac à sable sur le chemin d'hôte configuré et ignorer les approbations |
| `/elevated off`  | Retourner à l'exécution confinée au sandbox                                                  |

Également disponible sous la forme `/elev on|off|ask|full`.

Envoyez `/elevated` sans argument pour voir le niveau actuel.

## Fonctionnement

<Steps>
  <Step title="Vérifier la disponibilité">
    La fonctionnalité Elevated doit être activée dans la configuration et l'expéditeur doit figurer sur la liste d'autorisation (allowlist) :

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

  <Step title="Commands run outside the sandbox">
    Avec le mode élevé actif, les appels `exec` quittent le bac à sable. L'hôte effectif est
    `gateway` par défaut, ou `node` lorsque la cible d'exécution configurée/session est
    `node`. En mode `full`, les approbations d'exécution sont ignorées. En mode
    `on`/`ask`, les règles d'approbation configurées s'appliquent toujours.
  </Step>
</Steps>

## Ordre de résolution

1. **Directive en ligne** sur le message (s'applique uniquement à ce message)
2. **Remplacement de session** (défini en envoyant un message contenant uniquement une directive)
3. **Par défaut global** (`agents.defaults.elevatedDefault` dans la configuration)

## Disponibilité et listes d'autorisation

- **Porte globale** : `tools.elevated.enabled` (doit être `true`)
- **Liste d'autorisation de l'expéditeur** : `tools.elevated.allowFrom` avec des listes par canal
- **Porte par agent** : `agents.list[].tools.elevated.enabled` (ne peut que restreindre davantage)
- **Liste d'autorisation par agent** : `agents.list[].tools.elevated.allowFrom` (l'expéditeur doit correspondre à la fois à la liste globale + par agent)
- **Discord fallback** : si `tools.elevated.allowFrom.discord` est omis, `channels.discord.allowFrom` est utilisé en repli
- **Tous les portails doivent être réussis** ; sinon, le mode élevé est traité comme indisponible

Formats des entrées de la liste d'autorisation :

| Préfixe                 | Correspondances                    |
| ----------------------- | ---------------------------------- |
| (aucun)                 | ID d'expéditeur, E.164 ou champ De |
| `name:`                 | Nom d'affichage de l'expéditeur    |
| `username:`             | Nom d'utilisateur de l'expéditeur  |
| `tag:`                  | Balise de l'expéditeur             |
| `id:`, `from:`, `e164:` | Ciblage d'identité explicite       |

## Ce que le mode élevé ne contrôle pas

- **Stratégie d'outil** : si `exec` est refusé par la stratégie d'outil, le mode élevé ne peut pas l'outrepasser
- **Stratégie de sélection de l'hôte** : le mode élevé ne transforme pas `auto` en une substitution libre entre hôtes. Il utilise les règles de cible d'exécution configurées/session, en choisissant `node` uniquement lorsque la cible est déjà `node`.
- **Séparé de `/exec`** : la directive `/exec` ajuste les valeurs par défaut d'exécution par session pour les expéditeurs autorisés et ne nécessite pas le mode élevé

## Connexes

- [Exec tool](/fr/tools/exec) — exécution de commandes shell
- [Exec approvals](/fr/tools/exec-approvals) — système d'approbation et de liste d'autorisation
- [Sandboxing](/fr/gateway/sandboxing) — configuration du bac à sable
- [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
