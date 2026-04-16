# Guía de documentos

Este directorio es propietario de la redacción de documentos, las reglas de enlaces de Mintlify y la política i18n de los documentos.

## Reglas de Mintlify

- Los documentos están alojados en Mintlify (`https://docs.openclaw.ai`).
- Los enlaces internos de documentos en `docs/**/*.md` deben mantenerse relativos a la raíz sin el sufijo `.md` o `.mdx` (ejemplo: `[Config](/configuration)`).
- Las referencias cruzadas de sección deben usar anclas en rutas relativas a la raíz (ejemplo: `[Hooks](/configuration#hooks)`).
- Los encabezados de los documentos deben evitar los guiones largos y los apóstrofos porque la generación de anclas de Mintlify es frágil en esos casos.
- Los README y otros documentos renderizados por GitHub deben mantener URL absolutas de documentos para que los enlaces funcionen fuera de Mintlify.
- El contenido de los documentos debe mantenerse genérico: sin nombres de dispositivos personales, nombres de host o rutas locales; use marcadores de posición como `user@gateway-host`.

## Reglas de contenido de documentos

- Para los documentos, el texto de la interfaz de usuario y las listas de selección, ordene los servicios/proveedores alfabéticamente a menos que la sección describa explícitamente el orden de tiempo de ejecución o el orden de detección automática.
- Mantenga la nomenclatura de los complementos incluidos coherente con las reglas de terminología de complementos en todo el repositorio en el archivo `AGENTS.md` de la raíz.

## i18n de documentos

- Los documentos en idiomas extranjeros no se mantienen en este repositorio. La salida de publicación generada reside en el repositorio `openclaw/docs` (a menudo clonado localmente como `../openclaw-docs`).
- No agregue ni edite documentos localizados bajo `docs/<locale>/**` aquí.
- Trate los documentos en inglés en este repositorio, además de los archivos de glosario, como la fuente de verdad.
- Canalización: actualice los documentos en inglés aquí, actualice `docs/.i18n/glossary.<locale>.json` según sea necesario, y luego permita que la sincronización del repositorio de publicación y `scripts/docs-i18n` se ejecuten en `openclaw/docs`.
- Antes de volver a ejecutar `scripts/docs-i18n`, agregue entradas al glosario para cualquier término técnico nuevo, título de página o etiqueta de navegación corta que deba mantenerse en inglés o usar una traducción fija.
- `pnpm docs:check-i18n-glossary` es el guardián de los títulos de documentos en inglés modificados y las etiquetas cortas de documentos internos.
- La memoria de traducción reside en archivos `docs/.i18n/*.tm.jsonl` generados en el repositorio de publicación.
- Consulte `docs/.i18n/README.md`.
