# Guía de documentación

Este directorio es responsable de la redacción de la documentación, las reglas de enlaces de Mintlify y la política i18n de la documentación.

## Reglas de Mintlify

- La documentación se aloja en Mintlify (`https://docs.openclaw.ai`).
- Los enlaces internos a documentos en `docs/**/*.md` deben mantenerse relativos a la raíz, sin sufijos `.md` o `.mdx` (ejemplo: `[Config](/gateway/configuration)`).
- Las referencias cruzadas de secciones deben usar anclas en rutas relativas a la raíz (ejemplo: `[Hooks](/gateway/configuration-reference#hooks)`).
- Los encabezados de los documentos deben evitar los guiones largos y los apóstrofos porque la generación de anclas de Mintlify es frágil allí.
- Los archivos README y otra documentación renderizada por GitHub deben mantener URLs de documentación absolutas para que los enlaces funcionen fuera de Mintlify.
- El contenido de la documentación debe mantenerse genérico: sin nombres de dispositivos personales, nombres de host ni rutas locales; use marcadores de posición como `user@gateway-host`.

## Reglas de contenido de la documentación

- Para la documentación, el texto de la interfaz de usuario y las listas de selección, ordene los servicios/proveedores alfabéticamente a menos que la sección describa explícitamente el orden de tiempo de ejecución o el orden de detección automática.
- Mantenga la nomenclatura de los complementos incluidos coherente con las reglas de terminología de complementos en todo el repositorio en el archivo `AGENTS.md` raíz.

## Documentación interna

- La documentación privada de operadores de larga duración pertenece a `~/Projects/manager/docs/`.
- La documentación interna de borrador/espejo local del repositorio puede residir en `docs/internal/` ignorado.
- Nunca añadas páginas `docs/internal/**` a la navegación de `docs/docs.json` ni las vincules desde la documentación pública.
- `scripts/docs-sync-publish.mjs` excluye y poda `docs/internal/**` del repositorio de publicación público `openclaw/docs` si una página se añade forzosamente más tarde.
- La documentación interna puede mencionar rutas de repositorios, nombres de aplicaciones privadas, nombres de elementos de 1Password y libros de ejecución, pero nunca debe incluir valores secretos.

## Documentación i18n

- La documentación en idiomas extranjeros no se mantiene en este repositorio. La salida de publicación generada reside en el repositorio separado `openclaw/docs` (a menudo clonado localmente como `../openclaw-docs`).
- No añada ni edite documentos localizados bajo `docs/<locale>/**` aquí.
- Trate los documentos en inglés en este repositorio más los archivos de glosario como la fuente de la verdad.
- Canalización: actualice los documentos en inglés aquí, actualice `docs/.i18n/glossary.<locale>.json` según sea necesario y, a continuación, permita que la sincronización del repositorio de publicación y `scripts/docs-i18n` se ejecuten en `openclaw/docs`.
- Antes de volver a ejecutar `scripts/docs-i18n`, añada entradas de glosario para cualquier término técnico nuevo, títulos de página o etiquetas de navegación cortas que deban permanecer en inglés o utilizar una traducción fija.
- `pnpm docs:check-i18n-glossary` es el guardián de los títulos de documentos en inglés cambiados y las etiquetas cortas de documentos internos.
- La memoria de traducción reside en archivos `docs/.i18n/*.tm.jsonl` generados en el repositorio de publicación.
- Consulte `docs/.i18n/README.md`.
