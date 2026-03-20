---
summary: "Connexions manuelles pour l'automatisation du navigateur + publication sur X/Twitter"
read_when:
  - Vous devez vous connecter à des sites pour l'automatisation du navigateur
  - Vous souhaitez publier des mises à jour sur X/Twitter
title: "Connexion au navigateur"
---

# Connexion au navigateur + publication sur X/Twitter

## Connexion manuelle (recommandée)

Lorsqu'un site exige une connexion, **connectez-vous manuellement** dans le profil du navigateur **hôte** (le navigateur openclaw).

Ne donnez **pas** vos identifiants au modèle. Les connexions automatiques déclenchent souvent des défenses anti-bots et peuvent verrouiller le compte.

Retour à la documentation principale du navigateur : [Navigateur](/fr/tools/browser).

## Quel profil Chrome est utilisé ?

OpenClaw contrôle un **profil Chrome dédié** (nommé `openclaw`, interface orange). Celui-ci est distinct de votre profil de navigateur quotidien.

Pour les appels d'outil de navigateur de l'agent :

- Choix par défaut : l'agent doit utiliser son navigateur isolé `openclaw`.
- Utilisez `profile="user"` uniquement lorsque les sessions de connexion existantes sont importantes et que l'utilisateur est devant l'ordinateur pour cliquer/approuver toute invite d'attachement.
- Si vous avez plusieurs profils de navigateur utilisateur, spécifiez le profil explicitement au lieu de deviner.

Deux moyens simples d'y accéder :

1. **Demandez à l'agent d'ouvrir le navigateur** puis connectez-vous vous-même.
2. **Ouvrez-le via la CLI** :

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si vous avez plusieurs profils, passez `--browser-profile <name>` (le défaut est `openclaw`).

## X/Twitter : flux recommandé

- **Lire/rechercher/fils :** utilisez le navigateur **hôte** (connexion manuelle).
- **Publier des mises à jour :** utilisez le navigateur **hôte** (connexion manuelle).

## Sandboxing + accès au navigateur hôte

Les sessions de navigateur sandboxed sont **plus susceptibles** de déclencher la détection de bots. Pour X/Twitter (et d'autres sites stricts), privilégiez le navigateur **hôte**.

Si l'agent est sandboxed, l'outil de navigateur utilise par défaut le bac à sable. Pour autoriser le contrôle de l'hôte :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

Ciblez ensuite le navigateur hôte :

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

Ou désactivez le sandboxing pour l'agent qui publie des mises à jour.

import en from "/components/footer/en.mdx";

<en />
