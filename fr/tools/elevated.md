---
summary: "Mode exec avec élévation : exécuter des commandes sur l'hôte de la passerelle à partir d'un agent sandboxé"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Mode avec élévation"
---

# Mode avec élévation

Lorsqu'un agent s'exécute dans un sandbox, ses commandes `exec` sont confinées à l'environnement
sandbox. Le **mode avec élévation** permet à l'agent de s'en échapper et d'exécuter des commandes
sur l'hôte de la passerelle à la place, avec des barrières d'approbation configurables.

<Info>
  Le mode avec élévation ne modifie le comportement que lorsque l'agent est **sandboxé**. Pour les
  agents non sandboxés, exec s'exécute déjà sur l'hôte.
</Info>

## Directives

Contrôlez le mode avec élévation par session avec les commandes slash :

| Directive        | Ce qu'elle fait                                                           |
| ---------------- | ------------------------------------------------------------------------- |
| `/elevated on`   | Exécuter sur l'hôte de la passerelle, conserver les approbations exec     |
| `/elevated ask`  | Identique à `on` (alias)                                                  |
| `/elevated full` | Exécuter sur l'hôte de la passerelle **et** ignorer les approbations exec |
| `/elevated off`  | Retourner à l'exécution confinée au sandbox                               |

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

  <Step title="Les commandes s'exécutent sur l'hôte">
    Lorsque le mode avec élévation est actif, les appels `exec` sont routés vers l'hôte de la passerelle au lieu du
    sandbox. En mode `full`, les approbations exec sont ignorées. En mode `on`/`ask`,
    les règles d'approbation configurées s'appliquent toujours.
  </Step>
</Steps>

## Ordre de résolution

1. **Directive en ligne** sur le message (s'applique uniquement à ce message)
2. **Remplacement de session** (défini en envoyant un message contenant uniquement une directive)
3. **Valeur par défaut globale** (`agents.defaults.elevatedDefault` dans la configuration)

## Disponibilité et listes d'autorisation

- **Portail global** : `tools.elevated.enabled` (doit être `true`)
- **Liste d'autorisation de l'expéditeur** : `tools.elevated.allowFrom` avec des listes par canal
- **Portail par agent** : `agents.list[].tools.elevated.enabled` (ne peut que restreindre davantage)
- **Liste d'autorisation par agent** : `agents.list[].tools.elevated.allowFrom` (l'expéditeur doit correspondre à la fois au global + par agent)
- **Repli Discord** : si `tools.elevated.allowFrom.discord` est omis, `channels.discord.allowFrom` est utilisé comme solution de repli
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

- **Stratégie d'outil** : si `exec` est refusé par la stratégie d'outil, le mode élevé ne peut pas le remplacer
- **Distinct de `/exec`** : la directive `/exec` ajuste les valeurs par défaut d'exécution par session pour les expéditeurs autorisés et ne nécessite pas le mode élevé

## Connexes

- [Outil Exec](/fr/tools/exec) — exécution de commandes shell
- [Approbations Exec](/fr/tools/exec-approvals) — système d'approbation et de liste d'autorisation
- [Bac à sable (Sandboxing)](/fr/gateway/sandboxing) — configuration du bac à sable
- [Bac à sable vs Stratégie d'outil vs Mode élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)

import fr from "/components/footer/fr.mdx";

<fr />
