---
summary: "Résumé visuel et preuves techniques pour le nettoyage des performances, de la taille des packages, des dépendances et du shrinkwrap de mai 2026"
read_when:
  - You are validating the May 2026 performance and package-size cleanup
  - You need the numbers behind the OpenClaw performance and dependency blog post
  - You are changing release gates, package shrinkwrap, or plugin dependency boundaries
title: "Analyse des performances de publication"
---

Cette page capture les preuves derrière le nettoyage des performances, de la taille des packages, des dépendances et du shrinkwrap d'OpenClaw de mai 2026. Il s'agit du compagnon technique de l'article de blog public.

Deux audits sont combinés ici :

- **Release performance sweep :** GitHub Releases de `v2026.5.28` jusqu'à
  la version stable `v2026.4.23`, en utilisant le workflow `OpenClaw Performance`,
  `profile=smoke`, voie mock-provider. La plupart des lignes de balises correspondent à un échantillon ; les
  lignes `v2026.5.27` et `v2026.5.28` utilisent les derniers artefacts de branche de publication
  repeat-3.
- **Contexte d'avril précédent :** lignes de base `clawgrit-reports` mock-provider
  publiées de `v2026.4.1` à `v2026.5.2`, utilisées uniquement pour éviter de considérer
  les publications défectueuses de fin avril comme la base de référence des performances publiques.
- **Analyse de l'empreinte d'installation :** installations `npm install --ignore-scripts` fraîches
  dans des packages temporaires, avec `du -sk node_modules` pour la taille et un
  parcours `node_modules` pour les comptes d'instances de packages.
- **Analyse de la taille du package npm :** `npm pack openclaw@<version> --dry-run --json`
  pour les publications publiées, enregistrant la taille de l'archive tar compressée, la taille décompressée et
  le nombre de fichiers.

<Warning>
  L'analyse principale des performances utilise un échantillon de fumée par balise, à l'exception des lignes `v2026.5.27` et `v2026.5.28`, qui utilisent les derniers artefacts de branche de publication repeat-3. Le contexte d'avril précédent utilise des médianes repeat-3 publiées à partir de `clawgrit-reports`. Considérez ces chiffres comme des preuves de tendance et un signal de chasse aux
  régressions, et non comme des statistiques de validation de publication.
</Warning>

## Instantané

Couverture des performances : **77 publications demandées**, **74 points soutenus par des artefacts**,
et **3 exécutions CI indisponibles**. Dernier point stable mesuré : `v2026.5.28`.

<CardGroup cols={2}>
  <Card title="Rotation d'agent stable" icon="gauge">
    **5.1x plus rapide à froid**

    - `v2026.4.14` : 9.8s
    - `v2026.5.28` : 1.9s

  </Card>
  <Card title="Package publié" icon="package">
    **Archive tar de 17.9Mo**

    Dernier package stable, en baisse par rapport au pic de taille de package de 43.3Mo en mars.

  </Card>
  <Card title="Dernière installation stable" icon="hard-drive">
    **361,7 Mo pour une nouvelle installation**

    `v2026.5.28` réduit considérablement l'arborescence des dépendances OpenClaw imbriquées, mais un
    arbre imbriqué plus petit de 259,7 Mo persiste dans l'audit d'installation locale.

  </Card>
  <Card title="Graphe des dépendances" icon="boxes">
    **300 paquets installés**

    Dernière version stable, mesurée en racines uniques de nom/version de paquet dans une
    nouvelle installation avec les scripts désactivés.

  </Card>
</CardGroup>

## Chronologie de l'empreinte d'installation

<CardGroup cols={2}>
  <Card title="Maximum mensuel" icon="triangle-alert">
    **645 dépendances**

    `2026.2.26` a été le maximum mensuel du nombre de dépendances dans cet échantillon.

  </Card>
  <Card title="Introduction du shrinkwrap" icon="lock">
    **Installation de 1 020,6 Mo**

    `2026.5.22` a ajouté un shrinkwrap racine et a révélé un problème de forme de paquet :
    911,8 Mo ont atterri sous `openclaw/node_modules` imbriqué.

  </Card>
  <Card title="Dernière version stable" icon="tag">
    **Installation de 361,7 Mo**

    `2026.5.28` réduit la taille d'une nouvelle installation de 52,8 % par rapport à `2026.5.27`, mais installe
    toujours un arbre OpenClaw imbriqué de 259,7 Mo.

  </Card>
  <Card title="Graphe des dépendances" icon="scissors">
    **300 racines de paquets**

    `2026.5.28` installe 71 racines uniques de nom/version de paquet de moins que
    `2026.5.27`.

  </Card>
</CardGroup>

<Tip>Le shrinkwrap n'était pas le problème en soi. C'était la mauvaise forme du paquet. `v2026.5.28` fournit toujours un shrinkwrap, mais l'arborescence des dépendances imbriquées est beaucoup plus petite et le déploiement multicorbeille pour toutes les plateformes a disparu dans l'audit local.</Tip>

## Ce qui a changé dans la 5.28

Le nettoyage entre `v2026.5.27` et `v2026.5.28` a réduit le graphe d'installation par défaut au lieu de supprimer les capacités elles-mêmes.

<CardGroup cols={2}>
  <Card title="Racine du graphe par défaut" icon="git-branch">
    Les racines uniques de nom/version de paquet sont passées de **371** à **300**. Les instances de paquet sont passées de **372** à **301**.
  </Card>
  <Card title="Arborescence imbriquée" icon="unplug">
    L'imbrication `openclaw/node_modules` est passée de **656.1MiB** à **259.7MiB** dans le même audit d'installation locale.
  </Card>
  <Card title="Cônes natifs optionnels" icon="cpu">
    Le cône de paquets natifs toutes plateformes `@napi-rs/canvas` a cessé d'être inclus dans l'installation par défaut.
  </Card>
  <Card title="Surface de la chaîne d'approvisionnement" icon="shield">
    Moins de packages par défaut signifie moins d'archives tarballs, de mainteneurs, de binaires natifs, de comportements au moment de l'installation et de chemins de mise à jour transitifs à faire confiance par défaut.
  </Card>
</CardGroup>

## Chiffres clés

N'utilisez pas les lignes cassées de fin avril comme références de performance publiques.
`v2026.4.23` et `v2026.4.29` sont des preuves de régression utiles, mais les grands deltas de style `14x` décrivent principalement le rétablissement après une ligne de version défectueuse.

Pour le fil du blog, utilisez la référence publiée début avril comme échelle :

| Métrique             | Référence début avril | `v2026.5.28` |                             Delta |
| -------------------- | --------------------: | -----------: | --------------------------------: |
| Tour d'agent à froid |              9 819 ms |      1,908ms | 80.6% inférieur, 5.1x plus rapide |
| Tour d'agent à chaud |               7,458ms |      1,870ms | 74.9% inférieur, 4.0x plus rapide |
| Pic RSS de l'agent   |              686,2 Mo |      581.0Mo |                   15.3% inférieur |

La référence d'avril est `v2026.4.14` issue de l'exécution publiée du `clawgrit-reports` mock-provider. Cette exécution a utilisé le mode répétition 3 et n'a échoué que parce que la chronologie de diagnostic n'a pas été émise ; les médianes à froid, à chaud et RSS sont toujours utiles comme échelle approximative. Considérez cela comme un contexte narratif, et non comme une statistique de barrière de version.

Dans le balayage de mai, la ligne de la branche de version la plus récente a changé de manière significative par rapport à `v2026.5.2` :

| Métrique             | `v2026.5.2` | `v2026.5.28` |           Delta |
| -------------------- | ----------: | -----------: | --------------: |
| Tour d'agent à froid |     3,897ms |      1,908ms | 51.0% inférieur |
| Tour d'agent à chaud |     3,610ms |      1,870ms | 48.2% inférieur |
| Pic RSS de l'agent   |    613,7 Mo |      581.0Mo |  5.3% inférieur |

Par rapport à la version stable précédente :

| Métrique             | `v2026.5.27` | `v2026.5.28` |           Delta |
| -------------------- | -----------: | -----------: | --------------: |
| Tour d'agent à froid |      2,231ms |      1,908ms | 14.5% inférieur |
| Tour d'agent à chaud |      2,226ms |      1,870ms | 16.0% inférieur |
| Pic RSS de l'agent   |      649.0Mo |      581.0Mo | 10.5% inférieur |

### Empreinte d'installation

| Métrique                                                 | Base de référence | `v2026.5.28` |               Delta |
| -------------------------------------------------------- | ----------------: | -----------: | ------------------: |
| Taille d'installation par rapport au pic `2026.5.22`     |        1 020,6 Mo |      361.7Mo |     64.6% inférieur |
| Taille d'installation de la dernière version `2026.5.27` |          767,1 Mo |     361,7 Mo | réduction de 52,8 % |
| Dépendances depuis le pic mensuel `2026.2.26`            |               645 |          300 | réduction de 53,5 % |
| Dépendances depuis la dernière version `2026.5.27`       |               371 |          300 | réduction de 19,1 % |
| `openclaw/node_modules` imbriqué depuis `2026.5.22`      |          911,8 Mo |     259,7 Mo | réduction de 71,5 % |
| `openclaw/node_modules` imbriqué depuis `2026.5.27`      |          656,1 Mo |     259,7 Mo | réduction de 60,4 % |

### Taille du paquet npm

| Version     | Tarball compressé | Paquet décompressé | Fichiers | Notes                                   |
| ----------- | ----------------: | -----------------: | -------: | --------------------------------------- |
| `2026.1.30` |           12,8 Mo |            33,5 Mo |    4 607 | paquet rénové tôt                       |
| `2026.2.26` |           23,6 Mo |            82,9 Mo |   10 125 | croissance des fonctionnalités          |
| `2026.3.31` |           43,3 Mo |           182,6 Mo |   21 037 | point haut de taille de paquet          |
| `2026.4.29` |           22,9 Mo |            74,6 Mo |    9 309 | élagage de paquet visible               |
| `2026.5.12` |           23,4 Mo |            80,1 Mo |   12 035 | fractionnement majeur du plugin externe |
| `2026.5.22` |           17,2 Mo |            76,9 Mo |   12 386 | docs/assets exclus du paquet            |
| `2026.5.27` |           17,8 Mo |            79,0 Mo |   12 509 | paquet stable précédent                 |
| `2026.5.28` |           17,9 Mo |            81,0 Mo |    9 082 | dernier paquet stable                   |

`2026.5.12` est le jalon visible d'extraction de plugins dans le journal des modifications :
Amazon Bedrock, Bedrock Mantle, Slack, le bac à sable OpenShell, Anthropic Vertex,
Matrix et WhatsApp ont été retirés du chemin de dépendance principal, de sorte que leurs cônes de dépendance s'installent avec ces plugins au lieu de chaque installation principale.

## Résumé des tours de l'agent Kova

La ligne stable d'avril contient deux histoires différentes. Le début d'avril était lent
mais reconnaissable. Fin avril, c'est devenu une falaise de régression. `v2026.5.2` est l'endroit où
la voie mock-provider tombe pour la première fois dans la plage 3-5s et commence à réussir
constamment dans le balayage fourni.

Contexte publié précédemment :

| Version      | Kova  | Tour à froid | Tour à chaud | Pic RSS de l'agent |
| ------------ | ----- | -----------: | -----------: | -----------------: |
| `v2026.4.10` | FAIL  |    11 031 ms |     7 962 ms |           679,0 Mo |
| `v2026.4.12` | FAIL  |    11 965 ms |     8 289 ms |           713,5 Mo |
| `v2026.4.14` | FAIL  |     9 819 ms |     7 458 ms |           686,2 Mo |
| `v2026.4.20` | FAIL  |    22 314 ms |    18 811 ms |           810,8 Mo |
| `v2026.4.22` | ÉCHEC |     9 630 ms |     7 459 ms |           743,0 Mo |

Balayage fourni :

| Version             | Kova     | Tour à froid | Tour à chaud | Pic RSS de l'agent |
| ------------------- | -------- | -----------: | -----------: | -----------------: |
| `v2026.4.23`        | FAIL     |    47 847 ms |     8 010 ms |         1 082,7 Mo |
| `v2026.4.24`        | FAIL     |    48 264 ms |    25 483 ms |           996,0 Mo |
| `v2026.4.25`        | FAIL     |    81 080 ms |    59 172 ms |         1 113,9 Mo |
| `v2026.4.26`        | FAIL     |     76,771ms |     54,941ms |          1,140.8Mo |
| `v2026.4.27`        | FAIL     |     60,902ms |     33,699ms |          1,156.0Mo |
| `v2026.4.29`        | ÉCHEC    |     94,031ms |     57,334ms |          3,613.7Mo |
| `v2026.5.2`         | PASS     |      3,897ms |      3,610ms |            613,7Mo |
| `v2026.5.7`         | PASS     |      3,923ms |      3,693ms |            654,1Mo |
| `v2026.5.12`        | PASS     |      7,248ms |      6,629ms |            834,8Mo |
| `v2026.5.18`        | PASS     |      3,301ms |      2,913ms |            630,3Mo |
| `v2026.5.20`        | PASS     |      3,413ms |      2,952ms |            643,2Mo |
| `v2026.5.22`        | PASS     |      4,494ms |      4,093ms |            654,3Mo |
| `v2026.5.26`        | PASS     |      2,626ms |      2,282ms |            660,4Mo |
| `v2026.5.27-beta.1` | PASS     |      2,575ms |      2,217ms |            635,3Mo |
| `v2026.5.27`        | RÉUSSITE |      2,231ms |      2,226ms |            649,0Mo |
| `v2026.5.28`        | RÉUSSITE |      1,908ms |      1,870ms |            581,0Mo |

## Sondages source

Les sondes de source ont été ignorées pour 17 anciennes références réussies car ces arbres source ne possédaient pas encore les points d'entrée de sonde requis. Les métriques de tours d'agent existent toujours pour ces références.

Points de sonde de source représentatifs :

| Release             | `readyz` p50 par défaut | 50 plugins `readyz` p50 | Santé CLI p50 | RSS max du plugin |
| ------------------- | ----------------------: | ----------------------: | ------------: | ----------------: |
| `v2026.4.29`        |                2 819 ms |                2 618 ms |      1 679 ms |          389,0 Mo |
| `v2026.5.2`         |                2 324 ms |                2 013 ms |      1 384 ms |          377,2 Mo |
| `v2026.5.7`         |                1 649 ms |                1 540 ms |      1 175 ms |          387,6 Mo |
| `v2026.5.18`        |                1 942 ms |                1 927 ms |        607 ms |          426,5 Mo |
| `v2026.5.20`        |                1 966 ms |                1 987 ms |        621 ms |          455,0 Mo |
| `v2026.5.22`        |                2 081 ms |                1 884 ms |      5 095 ms |          444,2 Mo |
| `v2026.5.26`        |                1 546 ms |                1 634 ms |        656 ms |          400,4 Mo |
| `v2026.5.27-beta.1` |                 1,462ms |                 1,548ms |         548ms |           394,0Mo |
| `v2026.5.27`        |                 1,491ms |                 1,571ms |         553ms |           401,5Mo |
| `v2026.5.28`        |                 1,457ms |                 1,474ms |         623ms |           386,1Mo |

Le pic de santé du `v2026.5.22` CLI est visible dans ce tableau même si la voie agent-turn a toujours réussi. Conservez les sondes source lors de l'enquête sur les régressions ciblées du CLI ou de la passerelle.

## Audit de l'empreinte d'installation

Dependency samples use one stable release per month, plus the
`2026.5.22` shrinkwrap-introduction event and the latest `2026.5.28` release.

| Point              | Installed deps | Fresh install | OpenClaw package | Nested `openclaw/node_modules` | Root shrinkwrap | Canvas install behavior                   |
| ------------------ | -------------: | ------------: | ---------------: | -----------------------------: | --------------- | ----------------------------------------- |
| Jan `2026.1.30`    |            605 |       438.4MB |           45.8MB |                          2.4MB | no              | top-level wrapper + `darwin-arm64`        |
| Feb `2026.2.26`    |            645 |       575.7MB |          110.1MB |                          3.5MB | no              | top-level wrapper + `darwin-arm64`        |
| Mar `2026.3.31`    |            438 |       584.1MB |          234.8MB |                            0MB | no              | top-level wrapper + `darwin-arm64`        |
| Apr `2026.4.29`    |            392 |       335.0MB |           97.4MB |                            0MB | no              | none installed                            |
| `2026.5.22`        |            401 |     1,020.6MB |        1,020.4MB |                        911.8MB | yes             | nested: all 12 `@napi-rs/canvas` packages |
| May `2026.5.26`    |            371 |       767.5MB |          767.4MB |                        656.4MB | yes             | nested: all 12 `@napi-rs/canvas` packages |
| `2026.5.27`        |            371 |      767.1MiB |         766.9MiB |                       656.1MiB | yes             | nested: all 12 `@napi-rs/canvas` packages |
| Latest `2026.5.28` |            300 |      361.7MiB |         361.6MiB |                       259.7MiB | yes             | none installed                            |

### Shrinkwrap boundary

<CardGroup cols={2}>
  <Card title="Avant shrinkwrap" icon="unlock">
    `2026.5.20` n'a pas de shrinkwrap racine et pas d'arbre de dépendances OpenClaw imbriqué important.
  </Card>
  <Card title="Introduit" icon="lock">
    `2026.5.22` ajoute un shrinkwrap racine et installe 911.8MB sous `openclaw/node_modules` imbriqué.
  </Card>
  <Card title="Dernière stable" icon="tag">
    `2026.5.28` conserve le shrinkwrap et installe toujours 259.7MiB sous `openclaw/node_modules` imbriqué.
  </Card>
  <Card title="CanvasExtension de répartition Canvas corrigée" icon="check">
    `2026.5.28` n'installe plus aucun package `@napi-rs/canvas` lors de l'audit d'installation fraîche locale.
  </Card>
</CardGroup>

L'inspection de l'archive tarball publiée vérifie la limite :

| Version     | Version stable publiée ? | Racine `npm-shrinkwrap.json` | Notes                                                      |
| ----------- | ------------------------ | ---------------------------- | ---------------------------------------------------------- |
| `2026.5.20` | oui                      | non                          | dernière version stable avant shrinkwrap                   |
| `2026.5.21` | non                      | n/a                          | aucune version stable npm publiée                          |
| `2026.5.22` | oui                      | oui                          | shrinkwrap introduit                                       |
| `2026.5.23` | non                      | n/a                          | aucune version stable npm publiée                          |
| `2026.5.24` | non                      | n/a                          | aucune version stable npm publiée                          |
| `2026.5.25` | non                      | n/a                          | aucune version stable npm publiée                          |
| `2026.5.26` | oui                      | oui                          | arborescence de dépendances imbriquée toujours présente    |
| `2026.5.27` | oui                      | oui                          | arborescence de dépendances imbriquée toujours présente    |
| `2026.5.28` | oui                      | oui                          | arborescence de dépendances imbriquée beaucoup plus petite |

La distinction importante : **le shrinkwrap lui-même n'est pas le problème**.
`v2026.5.28` livre toujours un shrinkwrap racine. Le problème était la forme du package
qui obligeait npm à matérialiser une grande arborescence de dépendances OpenClaw imbriquée et les 12
packages de plateforme `@napi-rs/canvas`. L'arborescence imbriquée est plus petite dans `v2026.5.28`,
et l'extension de la plateforme Canvas n'apparaît plus dans l'audit local.

Pour une explication en langage clair du shrinkwrap et des vérifications de package
au niveau mainteneur, consultez [npm shrinkwrap](/fr/gateway/security/shrinkwrap).

## Interprétation de la chaîne d'approvisionnement

Le nombre de dépendances est une mesure de sécurité opérationnelle, et pas seulement une mesure
de taille d'installation. Chaque package élargit l'ensemble des mainteneurs, des archives tarball, des mises à jour
transitives, des binaires natifs facultatifs et des comportements au moment de l'installation que les opérateurs
doivent faire confiance.

La direction du nettoyage est :

- garder les capacités lourdes et facultatives en dehors de l'installation centrale par défaut
- faire en sorte que les packages de plugins possèdent leur propre graphe de dépendances d'exécution
- éviter les réparations du gestionnaire de packages lors du démarrage du Gateway
- préserver les installations déterministes sans provoquer la matérialisation de packages natifs pour toutes les plates-formes
- garder les scripts d'installation désactivés dans les chemins d'acceptation et de mesure des packages
- intercepter les arbres de dépendances imbriqués et les explosions de dépendances natives optionnelles avant la publication

Documentation connexe :

- [Résolution des dépendances de plugin](/fr/plugins/dependency-resolution)
- [Inventaire des plugins](/fr/plugins/plugin-inventory)
- [Validation complète de la version](/fr/reference/full-release-validation)
