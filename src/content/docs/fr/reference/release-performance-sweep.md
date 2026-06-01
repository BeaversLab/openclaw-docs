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

- **Analyse des performances de publication :** publications GitHub GitHub de `v2026.5.27` jusqu'à la version stable `v2026.4.23`, en utilisant le workflow `OpenClaw Performance`, `profile=smoke`, `repeat=1`, mock-provider lane.
- **Contexte d'avril antérieur :** lignes de base du fournisseur simulé (mock-provider) `clawgrit-reports` publiées de `v2026.4.1` à `v2026.5.2`, utilisées uniquement pour éviter de traiter les publications corrompues de fin avril comme référence de performance publique.
- **Analyse de l'empreinte d'installation :** installations fraîches `npm install --ignore-scripts` dans des packages temporaires, avec `du -sk node_modules` pour la taille et une analyse `node_modules` pour les comptes d'instances de packages.
- **Analyse de la taille du package npm :** `npm pack openclaw@<version> --dry-run --json` pour les publications publiées, enregistrant la taille de l'archive compressée, la taille décompressée et le nombre de fichiers.

<Warning>L'analyse principale des performances utilise un échantillon de test par étiquette. Le contexte d'avril antérieur utilise des médianes répétées-3 publiées à partir de `clawgrit-reports`. Traitez les chiffres comme une preuve de tendance et un signal de recherche de régression, et non comme des statistiques de barrière de publication.</Warning>

## Instantané

Couverture des performances : **76 publications demandées**, **73 points basés sur des artefacts** et **3 exécutions CI indisponibles**. Dernier point stable mesuré : `v2026.5.27`.

<CardGroup cols={2}>
  <Card title="Rotation de l'agent stable" icon="gauge">
    **Démarrage à froid 2,9 fois plus rapide**

    - `v2026.4.14` : 9,8 s
    - `v2026.5.27` : 3,4 s

  </Card>
  <Card title="Package publié" icon="package">
    **Archive tar de 17,8 Mo**

    Dernier package stable, en baisse par rapport au pic de taille de package de 43,3 Mo en mars.

  </Card>
  <Card title="Dernière installation stable" icon="hard-drive">
    **786,9 Mo pour une nouvelle installation**

    `v2026.5.27`OpenClaw contient encore l'arborescence de dépendances OpenClaw imbriquée. L'état de la prochaine version sur `main` est de 407,4 Mo.

  </Card>
  <Card title="Graphe des dépendances" icon="boxes">
    **371 packages installés**

    Dernière version stable. `main` actuel est descendu à 314 après le nettoyage des dépendances.

  </Card>
</CardGroup>

## Chronologie de l'empreinte d'installation

<CardGroup cols={2}>
  <Card title="Maximum mensuel" icon="triangle-alert">
    **645 dépendances**

    `2026.2.26` a été le nombre mensuel de dépendances le plus élevé dans cet échantillon.

  </Card>
  <Card title="Introduction du shrinkwrap" icon="lock">
    **1 020,6 Mo d'installation**

    `2026.5.22` a ajouté un shrinkwrap racine et a révélé un problème de forme de package : 911,8 Mo ont atterri sous `openclaw/node_modules` imbriqué.

  </Card>
  <Card title="Dernier stable" icon="tag">
    **786,9 Mo d'installation**

    `2026.5.27`OpenClaw a réduit le pic mais a toujours installé un arbre OpenClaw imbriqué de 675,9 Mo.

  </Card>
  <Card title="État de la prochaine version" icon="scissors">
    **407,4 Mo d'installation**

    `main` actuel conserve le shrinkwrap, supprime l'arbre imbriqué et installe 314 packages.

  </Card>
</CardGroup>

<Tip>Shrinkwrap n'était pas le problème en soi. C'était la mauvaise forme du package. Les versions actuelles de `main`npmOpenClaw incluent toujours le shrinkwrap, mais npm ne matérialise plus un second arbre de dépendances OpenClaw lors de l'installation.</Tip>

## Ce qui a changé après la 5.27

Le nettoyage entre `v2026.5.27` et la version actuelle `main` a supprimé le graphe d'installation par défaut en double au lieu de supprimer les capacités elles-mêmes.

<CardGroup cols={2}>
  <Card title="Graphe racine par défaut" icon="git-branch">
    Les chemins de packages shrinkwrap racine sont passés de **372** à **331**. Les noms de packages uniques sont passés de **357** à **318**.
  </Card>
  <Card title="Dépendances racine directes" icon="unplug">
    `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent` et `pdfjs-dist` ont quitté le chemin des dépendances racine par défaut.
  </Card>
  <Card title="Cones optionnels natifs" icon="cpu">
    Les cones de packages natifs toutes plates-formes `@napi-rs/canvas` et `@mariozechner/clipboard` ont cessé d'atterrir dans l'installation par défaut.
  </Card>
  <Card title="Surface de la chaîne d'approvisionnement" icon="shield">
    Moins de packages par défaut signifie moins d'archives tarballs, de mainteneurs, de binaires natifs, de comportements au moment de l'installation et de chemins de mise à jour transitifs à faire confiance par défaut.
  </Card>
</CardGroup>

## Chiffres clés

N'utilisez pas les lignes cassées de fin avril comme références de performances publiques.
`v2026.4.23` et `v2026.4.29` sont des preuves de régression utiles, mais les grands deltas de style `14x` décrivent principalement le rétablissement d'une ligne de publication défectueuse.

Pour le fil du blog, utilisez la référence publiée début avril comme échelle :

| Métrique             | Référence début avril | `v2026.5.27` |                              Delta |
| -------------------- | --------------------: | -----------: | ---------------------------------: |
| Tour d'agent à froid |              9 819 ms |     3 378 ms | 65,6 % inférieur, 2,9x plus rapide |
| Tour d'agent à chaud |               7,458ms |      2,973ms | 60,1 % inférieur, 2,5x plus rapide |
| Pic RSS de l'agent   |              686,2 Mo |     635,5 Mo |                    7,4 % inférieur |

La base de référence d'avril est `v2026.4.14` issue de l'exécution
`clawgrit-reports` du mock-provider publiée. Cette exécution utilisait la répétition 3 et n'a échoué que
parce que la chronologie de diagnostic n'a pas été émise ; les médianes à froid, à chaud et RSS
sont toujours utiles comme échelle approximative. Considérez ceci comme un contexte narratif, et non comme une
statistique de barrière de version.

Dans le balayage stable de mai à échantillon unique, la ligne a évolué plus modestement :

| Métrique             | `v2026.5.2` | `v2026.5.27` |            Delta |
| -------------------- | ----------: | -----------: | ---------------: |
| Tour d'agent à froid |     3,897ms |      3,378ms | 13,3 % inférieur |
| Tour d'agent à chaud |     3,610ms |      2,973ms | 17,6 % inférieur |
| Pic RSS de l'agent   |    613,7 Mo |     635,5 Mo |  3,6 % supérieur |

Meilleur point de pré-version dans le balayage à échantillon unique :

| Métrique             | `v2026.5.27` | `v2026.5.27-beta.1` |            Delta |
| -------------------- | -----------: | ------------------: | ---------------: |
| Tour d'agent à froid |      3,378ms |             2,575ms | 23,8 % inférieur |
| Tour d'agent à chaud |      2,973ms |             2,217ms | 25,4 % inférieur |
| Pic RSS de l'agent   |     635,5 Mo |            635,3 Mo |           stable |

### Empreinte d'installation

| Métrique                                                     | Base de référence | Main actuel |            Delta |
| ------------------------------------------------------------ | ----------------: | ----------: | ---------------: |
| Taille d'installation depuis le pic `2026.5.22`              |        1 020,6 Mo |    407,4 Mo | 60,1 % inférieur |
| Taille d'installation depuis la dernière version `2026.5.27` |          786,9 Mo |    407,4 Mo | 48,2 % inférieur |
| Dépendances depuis le pic mensuel `2026.2.26`                |               645 |         314 | 51,3 % inférieur |
| Dépendances depuis la dernière version `2026.5.27`           |               371 |         314 | 15,4 % inférieur |
| `openclaw/node_modules` imbriqués depuis `2026.5.22`         |          911,8 Mo |        0 Mo |         supprimé |
| `openclaw/node_modules` imbriqués depuis `2026.5.27`         |          675,9 Mo |        0 Mo |         supprimé |

### Taille du paquet npm

| Version     | Tarball compressé | Paquet décompressé | Fichiers | Notes                                   |
| ----------- | ----------------: | -----------------: | -------: | --------------------------------------- |
| `2026.1.30` |           12,8 Mo |            33,5 Mo |    4 607 | paquet rénové tôt                       |
| `2026.2.26` |           23,6 Mo |            82,9 Mo |   10 125 | croissance des fonctionnalités          |
| `2026.3.31` |           43,3 Mo |           182,6 Mo |   21 037 | point haut de taille de paquet          |
| `2026.4.29` |           22,9 Mo |            74,6 Mo |    9 309 | élagage de paquet visible               |
| `2026.5.12` |           23,4 Mo |            80,1 Mo |   12 035 | fractionnement majeur du plugin externe |
| `2026.5.22` |           17,2 Mo |            76,9 Mo |   12 386 | docs/assets exclus du paquet            |
| `2026.5.27` |           17,8 Mo |            79,0 Mo |   12 509 | dernier paquet stable                   |

`2026.5.12`Amazon Bedrock est l'étape visible de l'extraction de plugins dans le journal des modifications :
Amazon Bedrock, Bedrock Mantle, Slack, le bac à sable OpenShell, Anthropic Vertex,
Matrix et WhatsApp ont été déplacés hors du chemin des dépendances principales, de sorte que leurs cônes de dépendances s'installent avec ces plugins au lieu de chaque installation principale.

## Résumé du tour de l'agent Kova

La ligne stable d'avril contient deux histoires différentes. Le début d'avril était lent
mais reconnaissable. Fin avril est devenu une falaise de régression. `v2026.5.2` est là où
la ligne mock-provider tombe pour la première fois dans la plage 3-5s et commence à passer
constamment dans le balayage fourni.

Contexte publié précédemment :

| Release      | Kova | Cold turn | Warm turn | Agent peak RSS |
| ------------ | ---- | --------: | --------: | -------------: |
| `v2026.4.10` | FAIL | 11 031 ms |  7 962 ms |       679,0 Mo |
| `v2026.4.12` | FAIL | 11 965 ms |  8 289 ms |       713,5 Mo |
| `v2026.4.14` | FAIL |  9 819 ms |  7 458 ms |       686,2 Mo |
| `v2026.4.20` | FAIL | 22 314 ms | 18 811 ms |       810,8 Mo |
| `v2026.4.22` | FAIL |  9 630 ms |  7 459 ms |       743,0 Mo |

Balayage à échantillon unique fourni :

| Release             | Kova | Cold turn | Warm turn | Agent peak RSS |
| ------------------- | ---- | --------: | --------: | -------------: |
| `v2026.4.23`        | FAIL | 47 847 ms |  8 010 ms |     1 082,7 Mo |
| `v2026.4.24`        | FAIL | 48 264 ms | 25 483 ms |       996,0 Mo |
| `v2026.4.25`        | FAIL | 81 080 ms | 59 172 ms |     1 113,9 Mo |
| `v2026.4.26`        | FAIL | 76 771 ms | 54 941 ms |     1 140,8 Mo |
| `v2026.4.27`        | FAIL | 60 902 ms | 33 699 ms |     1 156,0 Mo |
| `v2026.4.29`        | FAIL | 94 031 ms | 57 334 ms |     3 613,7 Mo |
| `v2026.5.2`         | PASS |  3 897 ms |  3 610 ms |       613,7 Mo |
| `v2026.5.7`         | PASS |  3 923 ms |  3 693 ms |       654,1 Mo |
| `v2026.5.12`        | PASS |  7 248 ms |  6 629 ms |       834,8 Mo |
| `v2026.5.18`        | PASS |  3 301 ms |  2 913 ms |       630,3 Mo |
| `v2026.5.20`        | PASS |  3 413 ms |  2 952 ms |       643,2 Mo |
| `v2026.5.22`        | PASS |  4 494 ms |  4 093 ms |       654,3 Mo |
| `v2026.5.26`        | PASS |   2,626ms |   2,282ms |        660,4MB |
| `v2026.5.27-beta.1` | PASS |   2,575ms |   2,217ms |        635,3MB |
| `v2026.5.27`        | PASS |   3,378ms |   2,973ms |        635,5MB |

## Sondes source

Les sondes source ont été ignorées pour 17 anciennes références réussies car ces arbres source ne possédaient pas encore les points d'entrée de sonde requis. Les métriques de tours d'agent existent toujours pour ces références.

Points de sonde source représentatifs :

| Version             | Défaut `readyz` p50 | 50 plugins `readyz` p50 | Santé CLI p50 | RSS max du plugin |
| ------------------- | ------------------: | ----------------------: | ------------: | ----------------: |
| `v2026.4.29`        |             2,819ms |                 2,618ms |       1,679ms |           389,0MB |
| `v2026.5.2`         |             2,324ms |                 2,013ms |       1,384ms |           377,2MB |
| `v2026.5.7`         |             1,649ms |                 1,540ms |       1,175ms |           387,6MB |
| `v2026.5.18`        |             1,942ms |                 1,927ms |         607ms |           426,5MB |
| `v2026.5.20`        |             1,966ms |                 1,987ms |         621ms |           455,0MB |
| `v2026.5.22`        |             2,081ms |                 1,884ms |       5,095ms |           444,2MB |
| `v2026.5.26`        |             1,546ms |                 1,634ms |         656ms |           400,4MB |
| `v2026.5.27-beta.1` |             1,462ms |                 1,548ms |         548ms |           394,0MB |
| `v2026.5.27`        |             1,874ms |                 1,925ms |         660ms |           398,0MB |

Le pic de santé CLI de `v2026.5.22` est visible dans ce tableau même si la voie de tours d'agent a toujours réussi. Gardez les sondes source lors de l'enquête sur les régressions ciblées du CLI ou de la passerelle.

## Audit de l'empreinte d'installation

Les échantillons de dépendances utilisent une version stable par mois, ainsi que l'événement d'introduction du shrinkwrap `2026.5.22`, la dernière version `2026.5.27`, et la version `main` actuelle.

| Point                | Dépendances installées | Installation fraîche | Paquet OpenClaw | `openclaw/node_modules` imbriqué | Racine shrinkwrap | Comportement d'installation Canvas           |
| -------------------- | ---------------------: | -------------------: | --------------: | -------------------------------: | ----------------- | -------------------------------------------- |
| Jan `2026.1.30`      |                    605 |              438,4MB |          45,8MB |                            2,4MB | non               | wrapper de premier niveau + `darwin-arm64`   |
| Fév `2026.2.26`      |                    645 |              575,7MB |         110,1MB |                            3,5MB | non               | wrapper de premier niveau + `darwin-arm64`   |
| Mar `2026.3.31`      |                    438 |              584,1MB |        234,8 Mo |                             0 Mo | non               | wrapper de premier niveau + `darwin-arm64`   |
| avril `2026.4.29`    |                    392 |             335,0 Mo |         97,4 Mo |                             0 Mo | non               | aucun installé                               |
| `2026.5.22`          |                    401 |           1 020,6 Mo |      1 020,4 Mo |                         911,8 Mo | oui               | imbriqué : les 12 packages `@napi-rs/canvas` |
| mai `2026.5.26`      |                    371 |             767,5 Mo |        767,4 Mo |                         656,4 Mo | oui               | imbriqué : les 12 packages `@napi-rs/canvas` |
| Dernière `2026.5.27` |                    371 |             786,9 Mo |        786,7 Mo |                         675,9 Mo | oui               | imbriqué : les 12 packages `@napi-rs/canvas` |
| `main` actuel        |                    314 |             407,4 Mo |        101,0 Mo |                             0 Mo | oui               | wrapper de premier niveau + `darwin-arm64`   |

### Limite du shrinkwrap

<CardGroup cols={2}>
  <Card title="Avant shrinkwrap" icon="unlock">
    `2026.5.20` n'a pas de shrinkwrap racine et aucun grand arbre de dépendances OpenClaw imbriqué.
  </Card>
  <Card title="Introduit" icon="lock">
    `2026.5.22` ajoute un shrinkwrap racine et installe 911,8 Mo sous `openclaw/node_modules` imbriqué.
  </Card>
  <Card title="Dernière stable" icon="tag">
    `2026.5.27` conserve le shrinkwrap et installe toujours 675,9 Mo sous `openclaw/node_modules` imbriqué.
  </Card>
  <Card title="Main actuel" icon="check">
    `main` conserve le shrinkwrap et supprime l'arbre de dépendances OpenClaw imbriqué.
  </Card>
</CardGroup>

L'inspection de l'archive tarball publiée vérifie la limite :

| Version     | Stable publiée ? | `npm-shrinkwrap.json` racine | Notes                                                           |
| ----------- | ---------------- | ---------------------------- | --------------------------------------------------------------- |
| `2026.5.20` | oui              | non                          | dernière version stable avant le shrinkwrap                     |
| `2026.5.21` | non              | n/a                          | aucune publication stable npm                                   |
| `2026.5.22` | oui              | oui                          | shrinkwrap introduit                                            |
| `2026.5.23` | non              | n/a                          | aucune version stable npm                                       |
| `2026.5.24` | non              | n/a                          | aucune version stable npm                                       |
| `2026.5.25` | non              | n/a                          | aucune version stable npm                                       |
| `2026.5.26` | oui              | oui                          | l'arborescence des dépendances imbriquées est toujours présente |
| `2026.5.27` | oui              | oui                          | l'arborescence des dépendances imbriquées est toujours présente |
| `main`      | n/a              | oui                          | l'arborescence des dépendances imbriquées a été supprimée       |

La distinction importante : **le shrinkwrap lui-même n'est pas le problème**. Le `main` actuel fournit toujours un shrinkwrap racine. Le problème était la forme du package qui a fait que npm a matérialisé un grand arbre de dépendances OpenClaw imbriquées et les 12 packages de plate-forme `@napi-rs/canvas`.

Pour une explication en langage clair du shrinkwrap et des vérifications de package au niveau du mainteneur, voir [npm shrinkwrap](/fr/gateway/security/shrinkwrap).

## Interprétation de la chaîne d'approvisionnement

Le nombre de dépendances est une métrique de sécurité opérationnelle, et pas seulement une métrique de taille d'installation. Chaque package élargit l'ensemble des mainteneurs, des archives tar, des mises à jour transitives, des binaires natifs facultatifs et des comportements au moment de l'installation que les opérateurs doivent faire confiance.

La direction du nettoyage est :

- garder les capacités lourdes et facultatives en dehors de l'installation principale par défaut
- faire en sorte que les packages de plugins possèdent leur propre graphe de dépendances d'exécution
- éviter la réparation du gestionnaire de packages au moment de l'exécution lors du démarrage du Gateway
- préserver les installations déterministes sans provoquer la matérialisation de packages natifs pour toutes les plateformes
- garder les scripts d'installation désactivés dans les chemins d'acceptation et de mesure des packages
- détecter les arbres de dépendances imbriquées et les explosions de dépendances facultatives natives avant la publication

Documentation connexe :

- [Résolution des dépendances des plugins](/fr/plugins/dependency-resolution)
- [Inventaire des plugins](/fr/plugins/plugin-inventory)
- [Validation complète des versions](/fr/reference/full-release-validation)

## Exécutions de performances indisponibles

| Version             | Exécution                                                                    | Résultat | Raison                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `v2026.5.3-1`       | [26561664645](https://github.com/openclaw/openclaw/actions/runs/26561664645) | échec    | mock-provider job failed: CLI startup timed out waiting for qa-channel ready; no qa-channel accounts reported |
| `v2026.5.3`         | [26561666722](https://github.com/openclaw/openclaw/actions/runs/26561666722) | échec    | mock-provider job failed: CLI startup timed out waiting for qa-channel ready; no qa-channel accounts reported |
| `v2026.4.29-beta.2` | [26561683635](https://github.com/openclaw/openclaw/actions/runs/26561683635) | annulé   | optional baseline fetch hung before artifact upload                                                           |

## Follow-up gates

Recommended release checks from this sweep:

1. Run the mock-provider performance smoke for release candidates and retain
   artifacts.
2. Track cold turn, warm turn, agent RSS, Gateway `readyz`, and CLI health.
3. Fresh-install the packed tarball with scripts disabled.
4. Record installed dependency count, install size, package size, nested
   `openclaw/node_modules` size, and native optional package shape.
5. Fail or hold release review when nested dependency trees or all-platform
   native packages appear unexpectedly.
