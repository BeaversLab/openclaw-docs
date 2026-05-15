---
summary: "Fonctionnement de la publication sur ClawHub pour les compétences, les plugins, les propriétaires, les portées, les versions et la révision."
read_when:
  - Publishing a skill or plugin
  - Debugging owner or package scope errors
  - Adding publish UI, CLI, or backend behavior
---

# Publication sur ClawHub

La publication sur ClawHub est basée sur le propriétaire : chaque publication cible un éditeur, et le
serveur décide si l'utilisateur connecté est autorisé à publier cet emplacement.

## Propriétaires

Un propriétaire est un identifiant d'éditeur ClawHub, tel que `@alice` ou `@openclaw`.
Les propriétaires personnels sont créés pour les utilisateurs. Les propriétaires d'organisation peuvent avoir plusieurs membres.

Lorsque vous publiez, vous utilisez soit votre propriétaire personnel, soit vous choisissez un propriétaire d'organisation
pour lequel vous avez un accès d'éditeur.

## Compétences

Les compétences sont publiées à partir d'un dossier de compétence. La page publique est :

```text
https://clawhub.ai/<owner>/<slug>
```

Exemple :

```text
https://clawhub.ai/alice/review-helper
```

La demande de publication inclut le propriétaire sélectionné, le slug, la version, le journal des modifications et
les fichiers. Le serveur vérifie que l'acteur peut publier en tant que ce propriétaire avant de
créer la version.

## Plugins

Les plugins utilisent des noms de package de style npm. Les noms de package délimités incluent le propriétaire dans
la première partie du nom :

```text
@owner/package-name
```

La portée doit correspondre au propriétaire de publication sélectionné. Si votre package est nommé
`@openclaw/dronzer`, il ne peut être publié que sous `@openclaw`. Si vous publiez en tant que
`@vintageayu`, renommez le package en `@vintageayu/dronzer`.

Cela empêche un package de revendiquer un espace de noms d'organisation que l'éditeur ne
contrôle pas.

## Flux de publication

1. L'interface utilisateur, la CLI ou le workflow GitHub collectent les métadonnées et les fichiers du package.
2. La demande de publication est envoyée à ClawHub avec le propriétaire sélectionné.
3. Le serveur valide les autorisations du propriétaire, la portée du package, le nom du package, la version,
   les limites de fichiers et les métadonnées sources.
4. ClawHub stocke la version et lance des vérifications de sécurité automatisées.
5. Les nouvelles versions sont masquées sur les surfaces d'installation/téléchargement normales jusqu'à ce que la révision
   et la vérification soient terminées.

Si la validation échoue, la version n'est pas créée.

## FAQ

### La portée du package doit correspondre au propriétaire sélectionné

Si la portée du package et le propriétaire sélectionné ne correspondent pas, ClawHub rejette la
publication :

```text
Package scope "@openclaw" must match selected owner "@vintageayu".
Publish as "@openclaw" or rename this package to "@vintageayu/dronzer".
```

Pour corriger cela, choisissez soit le propriétaire nommé par la portée du package, soit renommez le package afin que la portée corresponde au propriétaire sous lequel vous pouvez publier.

Si le nom du package possède déjà la bonne portée mais que le package appartient au mauvais éditeur, transférez plutôt la propriété :

```sh
clawhub package transfer @opik/opik-openclaw --to opik
```

Utilisez le transfert de package uniquement lorsque vous avez un accès administrateur à la fois au propriétaire actuel du package et à l'éditeur de destination. Cela ne vous permet pas de publier dans une portée que vous ne pouvez pas gérer.

Cela protège les espaces de noms des organisations. Un package nommé `@openclaw/dronzer` revendique l'espace de noms `@openclaw`, donc seuls les éditeurs ayant accès au propriétaire `@openclaw` peuvent le publier.
