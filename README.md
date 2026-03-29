# OpenClaw Documentation 🦞

[简体中文](README.zh.md) | English | [Français](README.fr.md) | [Español](README.es.md)

This repository contains the official documentation for [OpenClaw](https://github.com/openclaw/openclaw), a self-hosted gateway that connects messaging platforms like WhatsApp, Telegram, Discord, and iMessage to AI coding agents.

## 🌐 Languages

The documentation is available in multiple languages:

- [English](./en/index.md)
- [简体中文 (Chinese)](./zh/index.md)
- [Français (French)](./fr/index.md)
- [Español (Spanish)](./es/index.md)

## 🚀 Getting Started

If you are looking for how to use OpenClaw, please visit our [Quick Start guide](https://docs.openclaw.io/en/start/getting-started) or read the [English index](./en/index.md).

## 🛠 Contributing

We welcome contributions! If you find a typo, outdated information, or want to add a new guide:

1. Fork the repository.
2. Create a new branch.
3. Make your changes in the relevant language directory (`en/`, `zh/`, `fr/`, `es/`).
4. Ensure your changes follow the [Prettier](https://prettier.io/) configuration:
   ```bash
   pnpm run format
   ```
5. Submit a Pull Request.

### Translation Sync

This project uses a custom script to manage translations. If you add new pages to the English version, you can sync them to other languages using:
```bash
pnpm run lang:sync
```

## 📜 License

This documentation is licensed under the [MIT License](./LICENSE).
