---
summary: "Connexions manuelles pour l'automatisation du navigateur + publications sur X/Twitter"
read_when:
  - You need to log into sites for browser automation
  - You want to post updates to X/Twitter
title: "Connexion via le navigateur"
---

# Connexion via le navigateur + publications sur X/Twitter

## Connexion manuelle (recommandée)

Lorsqu'un site nécessite une connexion, **connectez-vous manuellement** dans le profil du navigateur **hôte** (le navigateur openclaw).

Ne **donnez pas** vos identifiants au modèle. Les connexions automatisées déclenchent souvent des défenses anti‑robots et peuvent verrouiller le compte.

Retour à la documentation principale du navigateur : [Navigateur](/en/tools/browser).

## Quel profil Chrome est utilisé ?

OpenClaw contrôle un **profil Chrome dédié** (nommé `openclaw`, interface teintée d'orange). Il est distinct de votre profil de navigateur quotidien.

Pour les appels d'outil de navigateur de l'agent :

- Choix par défaut : l'agent doit utiliser son navigateur `openclaw` isolé.
- Utilisez `profile="user"` uniquement lorsque les sessions de connexion existantes sont importantes et que l'utilisateur est devant l'ordinateur pour cliquer/approuver toute invite d'attachement.
- Si vous avez plusieurs profils utilisateur-navigateur, spécifiez le profil explicitement au lieu de deviner.

Deux moyens simples d'y accéder :

1. **Demandez à l'agent d'ouvrir le navigateur** et connectez-vous vous-même.
2. **Ouvrez-le via CLI** :

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si vous avez plusieurs profils, passez `--browser-profile <name>` (la valeur par défaut est `openclaw`).

## X/Twitter : flux recommandé

- **Lecture/recherche/fils :** utilisez le navigateur **hôte** (connexion manuelle).
- **Publier des mises à jour :** utilisez le navigateur **hôte** (connexion manuelle).

## Sandboxing + accès au navigateur hôte

Les sessions de navigateur sandboxed sont **plus susceptibles** de déclencher la détection de bots. Pour X/Twitter (et d'autres sites stricts), privilégiez le navigateur **hôte**.

Si l'agent est sandboxed, l'outil de navigateur utilise par défaut le bac à sable. Pour autoriser le contrôle hôte :

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
