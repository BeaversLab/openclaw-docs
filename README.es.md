# Documentación de OpenClaw 🦞

[简体中文](README.zh.md) | [English](README.md) | [Français](README.fr.md) | Español

Este repositorio contiene la documentación oficial de [OpenClaw](https://github.com/openclaw/openclaw), una pasarela auto-alojada que conecta plataformas de mensajería como WhatsApp, Telegram, Discord e iMessage con agentes de programación de IA.

## 🌐 Idiomas

La documentación está disponible en varios idiomas:

- [English (Inglés)](./en/index.md)
- [简体中文 (Chino)](./zh/index.md)
- [Français (Francés)](./fr/index.md)
- [Español](./es/index.md)

## 🚀 Empezando

Si buscas cómo usar OpenClaw, visita nuestra [Guía de inicio rápido](https://docs.openclaw.io/es/start/getting-started) o lee el índice en [español](./es/index.md).

## 🛠 Contribuyendo

¡Agradecemos las contribuciones! Si encuentras un error tipográfico, información desactualizada o quieres añadir una nueva guía:

1. Haz un fork del repositorio.
2. Crea una nueva rama.
3. Realiza tus cambios en el directorio del idioma correspondiente (`en/`, `zh/`, `fr/`, `es/`).
4. Asegúrate de que tus cambios sigan la configuración de [Prettier](https://prettier.io/):
   ```bash
   pnpm run format
   ```
5. Envía un Pull Request.

### Sincronización de traducciones

Este proyecto utiliza un script personalizado para gestionar las traducciones. Si añades nuevas páginas a la versión en inglés, puedes sincronizarlas con otros idiomas usando:

```bash
pnpm run lang:sync
```

## 📜 Licencia

Esta documentación está bajo la [Licencia MIT](./LICENSE_MIT.md).
