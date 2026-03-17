# Documentation OpenClaw 🦞

[简体中文](README.zh.md) | [English](README.md) | Français | [Español](README.es.md)

Ce dépôt contient la documentation officielle pour [OpenClaw](https://github.com/openclaw/openclaw), une passerelle auto-hébergée qui connecte des plateformes de messagerie comme WhatsApp, Telegram, Discord et iMessage à des agents de codage IA.

## 🌐 Langues

La documentation est disponible en plusieurs langues :

- [English (Anglais)](./en/index.md)
- [简体中文 (Chinois)](./zh/index.md)
- [Français](./fr/index.md)
- [Español (Espagnol)](./es/index.md)

## 🚀 Mise en route

Si vous cherchez comment utiliser OpenClaw, veuillez consulter notre [Guide de démarrage rapide](https://docs.openclaw.io/fr/start/getting-started) ou lire l'index [français](./fr/index.md).

## 🛠 Contribution

Nous acceptons les contributions ! Si vous trouvez une faute de frappe, des informations obsolètes ou si vous souhaitez ajouter un nouveau guide :

1. Forkez le dépôt.
2. Créez une nouvelle branche.
3. Apportez vos modifications dans le répertoire de langue concerné (`en/`, `zh/`, `fr/`, `es/`).
4. Assurez-vous que vos modifications respectent la configuration [Prettier](https://prettier.io/) :
   ```bash
   pnpm run format
   ```
5. Soumettez une Pull Request.

### Synchronisation des traductions

Ce projet utilise un script personnalisé pour gérer les traductions. Si vous ajoutez de nouvelles pages à la version anglaise, vous pouvez les synchroniser avec d'autres langues en utilisant :

```bash
pnpm run lang:sync
```

## 📜 Licence

Cette documentation est sous licence [MIT](./LICENSE_MIT.md).
