---
summary: "Superpositions de plug-ins de stratégie par agent superposées aux règles de stratégie globale."
read_when:
  - You are designing per-agent policy requirements
  - You need to distinguish tool posture policy from workspace policy
  - You are configuring stricter policy for one named agent
title: "Superpositions de stratégie délimitées à l'agent"
---

# Superpositions de stratégie délimitées à l'agent

La stratégie OpenClaw prend en charge les exigences globales et les exigences plus strictes pour
les IDs d'agent d'exécution explicites. Certains déploiements ont besoin qu'un agent utilise une posture
de workspace et d'outil plus stricte que les autres agents, mais les règles à l'échelle du déploiement ne
doivent pas forcer chaque agent à utiliser la même posture.

Cette page décrit le modèle de superposition délimitée à l'agent. La référence des champs reste
[`openclaw policy`](/fr/cli/policy).

## Objectifs de conception

- Conserver la stratégie globale comme base de référence du déploiement.
- Permettre à un agent nommé d'ajouter des exigences plus strictes sans affaiblir les règles globales.
- Réutiliser les formes de section de stratégie existantes lorsque les preuves peuvent être attribuées à
  un agent.
- Éviter de faire de `agents.workspace` un second système de permissions d'outil.
- Laisser les vérifications purement globales telles qu'elles sont jusqu'à ce que leurs preuves puissent être mappées à un
  agent.

## Forme

Utilisez `scopes.<scopeName>` pour les portées de stratégie d'agent nommées par objectif. Chaque
portée répertorie les `agentIds` d'exécution auxquels elle s'applique, puis réutilise la grammaire
normale de section de stratégie de premier niveau où les preuves de section peuvent être attribuées à
ces agents. Les sections délimitées initialement livrées sont `tools` et
`agents.workspace` ; sandbox et ingress restent en dehors de cette PR et peuvent rejoindre le
même conteneur une fois que ces PR de stratégie seront intégrées et que leurs preuves porteront l'identité de l'agent.
L'inventaire des champs délimités est soutenu par des métadonnées de règles de stratégie qui
enregistrent la sémantique de rigueur de chaque champ pour la conformité ultérieure des fichiers de stratégie.

```jsonc
{
  "tools": {
    "denyTools": ["process"],
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
    },
  },
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
      "tools": {
        "profiles": { "allow": ["minimal", "messaging"] },
        "fs": { "requireWorkspaceOnly": true },
        "exec": {
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
          "allowHosts": ["sandbox"],
        },
        "elevated": { "allow": false },
        "alsoAllow": { "expected": ["message", "read"] },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

`agents.workspace` reste la base de référence de l'espace de travail pour tous les agents existants. `scopes.<scopeName>` est une superposition délimitée (scoped overlay), et non un remplacement de la stratégie globale. Le nom de la portée est uniquement descriptif ; la correspondance utilise `agentIds`, et non les noms d'affichage. Elle contient délibérément des noms de section normaux au lieu d'une mini-grammaire spécifique par agent. Chaque portée présente dans `policy.jsonc` doit être valide et applicable. Dans cette PR, le seul sélecteur pris en charge est `agentIds`, et il ne prend en charge que `tools.*` et `agents.workspace.*`.

## Sémantique de superposition (Layering semantics)

L'évaluation de la stratégie est additive :

1. La stratégie de premier niveau s'applique à toutes les preuves correspondantes.
2. Le `agents.workspace` existant s'applique aux valeurs par défaut et à chaque agent répertorié.
3. `scopes.<scopeName>` s'applique aux preuves pour chaque id d'exécution normalisé dans `agentIds`.
4. Plusieurs blocs de portée peuvent cibler le même agent lorsqu'ils gouvernent différents champs, ou lorsqu'une valeur ultérieure pour le même champ est également ou plus restrictive selon les métadonnées de la stratégie.
5. Une superposition d'agent nommé peut resserrer la stratégie, mais elle ne peut pas rendre une violation globale acceptable.

Si les règles globales et délimitées à l'agent échouent toutes deux, les résultats doivent pointer vers la règle qui a été violée :

```text
oc://policy.jsonc/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/agents/workspace/allowedAccess
```

Cela permet de maintenir la posture de l'outil large, la posture de l'outil de l'agent nommé et la posture de l'espace de travail auditable en tant que exigences distinctes, même lorsqu'elles observent les mêmes champs de configuration.

Les revendications de liste exacte telles que `tools.alsoAllow.expected` comparent la liste configurée à la liste attendue et signalent à la fois les entrées attendues manquantes et les entrées supplémentaires inattendues. Ceci est destiné à une posture additive telle que `alsoAllow`, où une entrée supplémentaire peut élargir un agent au-delà de son rôle examiné.

## Superposition de stratégie et de configuration (Policy and config layering)

Le modèle de superposition sépare l'endroit où la stratégie est rédigée de l'endroit où la configuration OpenClaw est observée :

| Portée de la stratégie                  | Configuration observée                                                          | S'applique à                                         | Exemple de résultat                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tools.*` de premier niveau             | `tools.*` global et posture d'outil d'agent héritée                             | Tous les agents utilisant une posture correspondante | Refuser l'hôte d'exécution `gateway` pour chaque agent, sauf si la stratégie globale l'autorise.                        |
| Niveau supérieur `tools.*`              | Remplacements `agents.list[].tools.*`                                           | Tout agent avec un remplacement                      | Signaler un agent qui remplace `tools.exec.host` par une valeur non approuvée.                                          |
| `scopes.<scopeName>.tools.*`            | Entrée `agents.list[]` correspondante et posture héritée                        | Seul cet agent nommé                                 | Laissez la plupart des agents utiliser l'hôte d'exécution `node` tandis qu'un agent doit utiliser uniquement `sandbox`. |
| `agents.workspace`                      | Valeurs par défaut et posture de l'espace de travail de chaque agent répertorié | Valeurs par défaut et tous les agents répertoriés    | Exiger que chaque accès à l'espace de travail de l'agent soit `none` ou `ro`.                                           |
| `scopes.<scopeName>.agents.workspace.*` | Correspondance `agents.list[]` posture de l'espace de travail                   | Uniquement cet agent nommé                           | Exiger qu'un agent soit en lecture seule sans l'exiger pour `main`.                                                     |

Les superpositions par agent sont additives. Une règle pour un agent nommé peut être plus stricte que la règle de premier niveau, mais elle ne peut pas rendre une violation globale acceptable. Pour les règles de liste d'autorisation (allow-list), l'ensemble autorisé effectif est l'intersection de la règle globale et de la superposition de l'agent nommé lorsque les deux sont présentes.

Par exemple, si `tools.exec.allowHosts` de premier niveau autorise `["sandbox", "node"]`
et que `scopes.release-agent-lockdown.tools.exec.allowHosts` n'autorise que
`["sandbox"]`, `release-agent` échoue lorsque son hôte d'exécution effectif est `node` ;
un autre agent peut tout de même réussir
avec `node`.

## Posture de l'outil par rapport à la posture de l'espace de travail

La posture des outils appartient à `tools` car elle décrit le comportement des outils qu'une configuration peut exposer. La stratégie `tools.*` existante observe à la fois la configuration `tools.*` globale et les remplacements `agents.list[].tools.*` par agent.

La posture de l'espace de travail appartient à `workspace` car elle décrit le mode bac à sable et l'accès à l'espace de travail. La section de l'espace de travail ne doit pas se transformer en un espace de noms de stratégie d'outil général. Si un agent a besoin de restrictions d'outil plus strictes pour donner du sens à sa posture d'espace de travail, placez ces restrictions dans le même superposition d'agent sous `scopes.<scopeName>.tools`.

Pour un agent à publication restreinte, la répartition prévue est :

```jsonc
{
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": { "allowedAccess": ["none", "ro"] },
      },
      "tools": {
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

## Éligibilité de la section

Une section délimitée à un agent ne doit être ajoutée que lorsque les preuves de stratégie incluent un identifiant d'agent ou peuvent être attribuées à l'une d'elles sans conjecture.

| Section     | Statut initial délimité à l'agent | Raison                                                                                                                           |
| ----------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `workspace` | Inclure                           | Les preuves de sandbox/espace de travail de l'agent incluent déjà l'identité de l'agent.                                         |
| `tools`     | Inclure                           | Les preuves de posture d'outil incluent la configuration d'outil globale et par agent.                                           |
| `sandbox`   | Suivi de pipeline                 | Exclure jusqu'à ce que la PR relative à la posture du sandbox soit intégrée et que les preuves puissent être délimitées.         |
| `ingress`   | Suivi de pipeline                 | Exclure jusqu'à ce que la posture d'entrée/de canal soit intégrée avec une attribution à l'agent.                                |
| `models`    | Inclure si mappé                  | Les références de modèle sélectionnées peuvent être spécifiques à un agent.                                                      |
| `mcp`       | Inclure si mappé                  | Utiliser uniquement lorsque les preuves du serveur MCP sont attribuables à un agent.                                             |
| `auth`      | Reporter                          | Les métadonnées du profil d'authentification constituent un catalogue de configuration, sauf si la liaison à l'agent est claire. |
| `channels`  | Reporter                          | La posture du fournisseur de canal est au niveau du déploiement jusqu'à ce que le routage soit délimité.                         |
| `gateway`   | Garder global                     | La posture d'exposition/d'authentification/http du Gateway est au niveau du processus.                                           |
| `network`   | Garder global                     | La posture SSRF de réseau privé est au niveau de l'exécution.                                                                    |
| `secrets`   | Garder global d'abord             | La posture du fournisseur de secrets est partagée, sauf si les références sont attribuées à un agent.                            |

## Compatibilité

L'implémentation est additive :

- garder tous les champs de stratégie de niveau supérieur existants valides ;
- garder la sémantique de `agents.workspace` inchangée ;
- valider `scopes` avant d'évaluer les règles délimitées ;
- rejeter clairement les sections délimitées non prises en charge jusqu'à ce que leurs preuves et leurs contrats de stratégie soient implémentés ;
- ne pas réinterpréter `tools.requireMetadata` de niveau supérieur comme étant délimité à un agent, car les métadonnées de l'outil décrivent le catalogue d'outils de l'espace de travail déclaré ;
- inclure les preuves délimitées à l'agent dans le hachage d'attestation lorsqu'une règle délimitée est présente.

Cela permet à la posture large des outils de rester un contrat de stratégie de niveau supérieur, tandis que les agents nommés ajoutent des revendications observables plus strictes sans affaiblir la base de référence globale.
