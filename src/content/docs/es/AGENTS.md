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

## i18n de la documentación

- La documentación en idiomas extranjeros no se mantiene en este repositorio. La salida de publicación generada reside en el repositorio `openclaw/docs` separado (a menudo clonado localmente como `../openclaw-docs`).
- No agregue ni edite documentación localizada bajo `docs/<locale>/**` aquí.
- Trate la documentación en inglés en este repositorio más los archivos de glosario como la fuente de verdad.
- Canalización: actualice la documentación en inglés aquí, actualice `docs/.i18n/glossary.<locale>.json` según sea necesario y luego deje que la sincronización del repositorio de publicación y `scripts/docs-i18n` se ejecuten en `openclaw/docs`.
- Antes de volver a ejecutar `scripts/docs-i18n`, agregue entradas de glosario para cualquier término técnico nuevo, títulos de página o etiquetas de navegación cortas que deban mantenerse en inglés o usar una traducción fija.
- `pnpm docs:check-i18n-glossary` es el guardián de los títulos de documentos en inglés modificados y las etiquetas internas cortas de documentos.
- La memoria de traducción reside en archivos `docs/.i18n/*.tm.jsonl` generados en el repositorio de publicación.
- Consulte `docs/.i18n/README.md`.
