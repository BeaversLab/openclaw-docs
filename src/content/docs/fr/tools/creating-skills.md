---
title: "Création de compétences"
summary: "Créez et testez des compétences d'espace de travail personnalisées avec SKILL.md"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# Création de compétences

Les compétences enseignent à l'agent comment et quand utiliser les outils. Chaque compétence est un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et des instructions markdown.

Pour savoir comment les compétences sont chargées et priorisées, consultez [Skills](/fr/tools/skills).

## Créez votre première compétence

<Steps>
  <Step title="Créer le répertoire de la compétence">
    Les compétences résident dans votre espace de travail. Créez un nouveau dossier :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="Écrire SKILL.md">
    Créez `SKILL.md` à l'intérieur de ce répertoire. L'en-tête définit les métadonnées,
    et le corps markdown contient les instructions pour l'agent.

    ```markdown
    ---
    name: hello_world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

  </Step>

  <Step title="Ajouter des outils (optionnel)">
    Vous pouvez définir des schémas d'outils personnalisés dans l'en-tête ou instruire l'agent
    d'utiliser les outils système existants (comme `exec` ou `browser`). Les compétences peuvent également
    être livrées dans des plugins aux côtés des outils qu'elles documentent.

  </Step>

  <Step title="Charger la compétence">
    Démarrez une nouvelle session pour que OpenClaw prenne en charge la compétence :

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

  <Step title="Tester">
    Envoyez un message qui devrait déclencher la compétence :

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    Ou discutez simplement avec l'agent et demandez une salutation.

  </Step>
</Steps>

## Référence des métadonnées des compétences

L'en-tête YAML prend en charge ces champs :

| Champ                               | Obligatoire | Description                                 |
| ----------------------------------- | ----------- | ------------------------------------------- |
| `name`                              | Oui         | Identifiant unique (snake_case)             |
| `description`                       | Oui         | Description en une ligne montrée à l'agent  |
| `metadata.openclaw.os`              | Non         | Filtre OS (`["darwin"]`, `["linux"]`, etc.) |
| `metadata.openclaw.requires.bins`   | Non         | Binaires requis sur le PATH                 |
| `metadata.openclaw.requires.config` | Non         | Clés de configuration requises              |

## Meilleures pratiques

- **Soyez concis** — indiquez au modèle _quoi_ faire, pas comment être une IA
- **Sécurité avant tout** — si votre skill utilise `exec`, assurez-vous que les invites ne permettent pas l'injection de commandes arbitraires à partir d'une entrée non fiable
- **Testez localement** — utilisez `openclaw agent --message "..."` pour tester avant de partager
- **Utilisez ClawHub** — parcourez et contribuez aux compétences sur [ClawHub](https://clawhub.ai)

## Emplacement des skills

| Emplacement                     | Priorité       | Portée                          |
| ------------------------------- | -------------- | ------------------------------- |
| `\<workspace\>/skills/`         | La plus élevée | Par agent                       |
| `\<workspace\>/.agents/skills/` | Élevé          | Agent par espace de travail     |
| `~/.agents/skills/`             | Moyen          | Profil d'agent partagé          |
| `~/.openclaw/skills/`           | Moyen          | Partagé (tous les agents)       |
| Groupé (livré avec OpenClaw)    | Faible         | Global                          |
| `skills.load.extraDirs`         | Le plus faible | Dossiers partagés personnalisés |

## Connexes

- [Référence des compétences](/fr/tools/skills) — chargement, priorité et règles de blocage
- [Configuration des compétences](/fr/tools/skills-config) — schéma de configuration `skills.*`
- [ClawHub](/fr/tools/clawhub) — registre public de compétences
- [Création de plugins](/fr/plugins/building-plugins) — les plugins peuvent fournir des compétences
