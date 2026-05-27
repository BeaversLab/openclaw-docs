---
summary: "Créer et tester des compétences d'espace de travail personnalisées avec SKILL.md"
title: "Création de compétences"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Les compétences enseignent à l'agent comment et quand utiliser les outils. Chaque compétence est un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et des instructions markdown.

Pour savoir comment les compétences sont chargées et priorisées, consultez [Compétences](/fr/tools/skills).

## Créer votre première compétence

<Steps>
  <Step title="Créer le répertoire de la compétence">
    Les compétences résident dans votre espace de travail. Créez un nouveau dossier :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="Write SKILL.md">
    Créez `SKILL.md` dans ce répertoire. La page frontmatter définit les métadonnées,
    et le corps markdown contient les instructions pour l'agent.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Utilisez le format kebab-case avec des lettres minuscules, des chiffres et des traits d'union pour l'identifiant de la compétence
    `name`. Gardez le nom du dossier et `name` de la page frontmatter alignés.

  </Step>

  <Step title="Add tools (optional)">
    Vous pouvez définir des schémas d'outil personnalisés dans la page frontmatter ou instruire l'agent
    à utiliser des outils système existants (comme `exec` ou `browser`). Les compétences peuvent également
    être livrées dans des plugins aux côtés des outils qu'elles documentent.

  </Step>

  <Step title="Charger la compétence">
    Démarrez une nouvelle session pour que OpenClaw prenne en compte la compétence :

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    Vérifiez que la compétence a été chargée :

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="Testez-la">
    Envoyez un message qui devrait déclencher la compétence :

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    Ou simplement discutez avec l'agent et demandez une salutation.

  </Step>
</Steps>

## Référence des métadonnées de compétence

L'en-tête YAML prend en charge ces champs :

| Champ                               | Obligatoire | Description                                                                             |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `name`                              | Oui         | Identifiant unique utilisant des lettres minuscules, des chiffres et des traits d'union |
| `description`                       | Oui         | Description sur une ligne affichée à l'agent                                            |
| `metadata.openclaw.os`              | Non         | Filtre OS (`["darwin"]`, `["linux"]`, etc.)                                             |
| `metadata.openclaw.requires.bins`   | Non         | Binaires requis sur le PATH                                                             |
| `metadata.openclaw.requires.config` | Non         | Clés de configuration requises                                                          |

## Fonctionnalités avancées

Une fois qu'une compétence de base fonctionne, ces champs aident à la rendre fiable et portable :

- **Activation conditionnelle** — utilisez `requires.bins`, `requires.env` ou
  `requires.config` pour charger la compétence uniquement lorsque les dépendances requises sont
  disponibles. Consultez [Référence des compétences : verrouillage (gating)](/fr/tools/skills#gating).
- **Câblage de l'environnement et des clés API** — utilisez `skills.entries.<name>.env` et
  `skills.entries.<name>.apiKey` pour injecter l'environnement côté hôte pour un tour
  de compétence. Consultez [Référence des compétences : câblage de la configuration](/fr/tools/skills#config-wiring).
- **Contrôle de l'invocation** — définissez `user-invocable: false` pour masquer une commande slash,
  ou `disable-model-invocation: true` pour empêcher qu'une compétence de type commande n'apparaisse dans le
  prompt du modèle. Consultez [Référence des compétences : frontmatter](/fr/tools/skills#frontmatter).
- **Répartition directe des commandes** — utilisez `command-dispatch: tool` avec
  `command-tool` lorsqu'une commande slash doit appeler un outil directement au lieu de
  passer par le modèle.
- **Chemins portables** — utilisez `{baseDir}` dans `SKILL.md` lors de référencement à des scripts
  ou des actifs à l'intérieur du répertoire de la compétence.
- **Publication** — utilisez la compétence ClawHub lors de la préparation d'une compétence pour publication.
  Elle documente la forme actuelle de la commande `clawhub publish` et les métadonnées requises.

## Meilleures pratiques

- **Soyez concis** — instruisez le modèle sur _ce qu'il faut_ faire, et non sur comment être une IA
- **La sécurité d'abord** — si votre compétence utilise `exec`, assurez-vous que les invites ne permettent pas l'injection de commandes arbitraires depuis une entrée non fiable
- **Testez localement** — utilisez `openclaw agent --message "..."` pour tester avant de partager
- **Utilisez ClawHub** — parcourez et contribuez aux compétences sur [ClawHub](https://clawhub.ai)

## Où se trouvent les compétences

| Emplacement                     | Priorité       | Portée                           |
| ------------------------------- | -------------- | -------------------------------- |
| `\<workspace\>/skills/`         | La plus élevée | Par agent                        |
| `\<workspace\>/.agents/skills/` | Élevée         | Par agent de l'espace de travail |
| `~/.agents/skills/`             | Moyenne        | Profil d'agent partagé           |
| `~/.openclaw/skills/`           | Moyenne        | Partagé (tous les agents)        |
| Groupé (livré avec OpenClaw)    | Faible         | Global                           |
| `skills.load.extraDirs`         | Le plus bas    | Dossiers partagés personnalisés  |

## Connexes

- [Référence des Skills](/fr/tools/skills) — chargement, priorité et règles de filtrage
- [Config des Skills](/fr/tools/skills-config) — schéma de config `skills.*`
- [ClawHub](/fr/clawhub) — registre public de skills
- [Création de plugins](/fr/plugins/building-plugins) — les plugins peuvent fournir des skills
