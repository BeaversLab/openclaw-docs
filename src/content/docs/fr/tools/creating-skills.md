---
summary: "Créer et tester des compétences d'espace de travail personnalisées avec SKILL.md"
title: "Création de compétences"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Les compétences enseignent à l'agent comment et quand utiliser les outils. Chaque compétence est un répertoire contenant un fichier `SKILL.md` avec un en-tête YAML et des instructions en markdown.

Pour savoir comment les compétences sont chargées et priorisées, consultez [Skills](/fr/tools/skills).

## Créer votre première compétence

<Steps>
  <Step title="Créer le répertoire de la compétence">
    Les compétences résident dans votre espace de travail. Créez un nouveau dossier :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    Vous pouvez regrouper les compétences dans des sous-dossiers lorsque votre bibliothèque grandit :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    Les dossiers de groupe sont uniquement organisationnels. La compétence est toujours nommée par l'en-tête `SKILL.md`, donc `name: hello-world` est invoquée en tant que `/hello-world`.

  </Step>

  <Step title="Écrire SKILL.md">
    Créez `SKILL.md` à l'intérieur de ce répertoire. L'en-tête définit les métadonnées et le corps markdown contient les instructions pour l'agent.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Utilisez la casse avec tirets (hyphen-case) avec des lettres minuscules, des chiffres et des tirets pour le `name` de la compétence. Gardez le nom du dossier feuille et le `name` de l'en-tête alignés.

  </Step>

  <Step title="Ajouter des outils (facultatif)">
    Vous pouvez définir des schémas d'outils personnalisés dans l'en-tête ou instruire l'agent à utiliser les outils système existants (comme `exec` ou `browser`). Les compétences peuvent également être livrées dans des plugins aux côtés des outils qu'elles documentent.

  </Step>

  <Step title="Charger la compétence">
    Vérifiez que la compétence a été chargée :

    ```bash
    openclaw skills list
    ```

    OpenClaw surveille les fichiers `SKILL.md` imbriqués sous les racines des compétences. Si la surveillance est désactivée ou si vous continuez une session existante, démarrez une nouvelle session pour que le modèle reçoive la liste actualisée des compétences :

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Testez-le">
    Envoyez un message qui devrait déclencher le skill :

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    Ou discutez simplement avec l'agent et demandez une salutation.

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
  `requires.config` pour charger le skill uniquement lorsque les dépendances requises sont
  disponibles. Voir [Skills reference: gating](/fr/tools/skills#gating).
- **Câblage de l'environnement et des clés d'API** — utilisez API`skills.entries.<name>.env` et
  `skills.entries.<name>.apiKey` pour injecter l'environnement côté hôte pour un tour de
  skill. Voir [Skills reference: config wiring](/fr/tools/skills#config-wiring).
- **Contrôle d'invocation** — définissez `user-invocable: false` pour masquer une commande slash,
  ou `disable-model-invocation: true` pour garder un skill de type commande en dehors du
  prompt du modèle. Voir [Skills reference: frontmatter](/fr/tools/skills#frontmatter).
- **Répartition directe des commandes** — utilisez `command-dispatch: tool` avec
  `command-tool` lorsqu'une commande slash doit appeler un tool directement au lieu de
  passer par le modèle.
- **Chemins portables** — utilisez `{baseDir}` dans `SKILL.md` lors de la référence à des scripts
  ou des actifs dans le répertoire du skill.
- **Publication** — utilisez le skill ClawHub lors de la préparation d'un skill pour publication.
  Il documente la forme actuelle de la commande ClawHub`clawhub publish` et les métadonnées requises.

## Meilleures pratiques

- **Soyez concis** — instruisez le modèle sur _ce qu'il faut_ faire, et non sur comment être une IA
- **Sécurité avant tout** — si votre skill utilise `exec`, assurez-vous que les prompts ne permettent pas l'injection de commandes arbitraires depuis une entrée non fiable
- **Tester localement** — utilisez `openclaw agent --message "..."` pour tester avant de partager
- **Utiliser ClawHub** — parcourez et contribuez aux skills sur [ClawHub](ClawHubClawHubhttps://clawhub.ai)

## Où se trouvent les compétences

| Emplacement                     | Priorité       | Portée                           |
| ------------------------------- | -------------- | -------------------------------- |
| `\<workspace\>/skills/`         | La plus élevée | Par agent                        |
| `\<workspace\>/.agents/skills/` | Élevée         | Par agent de l'espace de travail |
| `~/.agents/skills/`             | Moyenne        | Profil d'agent partagé           |
| `~/.openclaw/skills/`           | Moyenne        | Partagé (tous les agents)        |
| Groupé (livré avec OpenClaw)    | Faible         | Global                           |
| `skills.load.extraDirs`         | Le plus bas    | Dossiers partagés personnalisés  |

Chaque racine de compétences peut contenir des dossiers de compétences directs tels que
`skills/hello-world/SKILL.md` ou des dossiers groupés tels que
`skills/personal/hello-world/SKILL.md`.

## Connexes

- [Référence des Skills](/fr/tools/skills) — chargement, priorité et règles de filtrage
- [Config des Skills](/fr/tools/skills-config) — schéma de configuration `skills.*`
- [ClawHub](/fr/clawhub) — registre public de compétences
- [Création de plugins](/fr/plugins/building-plugins) — les plugins peuvent fournir des compétences
