# Retros · MVP

MVP frontend-only de una retrospectiva interactiva conectada a Supabase.

## Ejecutar
Abrí `index.html` directamente en el navegador o publicá el proyecto en GitHub Pages.

## Publicar en GitHub Pages
1. Creá o utilizá el repositorio de GitHub.
2. Subí los archivos del proyecto a la raíz del repositorio.
3. En **Settings → Pages**, seleccioná la rama principal y la carpeta `/root`.
4. Guardá. GitHub Pages generará la URL pública.

## Migración necesaria para la mejora de Preguntas
Antes de usar la nueva etapa **Preguntas**, ejecutá una sola vez el archivo:

`supabase_preguntas_respuestas.sql`

en el **SQL Editor de Supabase**.

La migración agrega el campo `respuesta` a `preguntas_guia` y crea las funciones necesarias para guardar respuestas y validar que todas las preguntas registradas estén respondidas antes de avanzar.

## Importante
Cuando se actualice el proyecto, reemplazá el conjunto completo de archivos del ZIP por los nuevos archivos del proyecto.


## Mejoras UX
- Las respuestas de Preguntas se guardan automáticamente mientras se escribe, con un pequeño debounce y guardado inmediato al salir del campo.
- Se conserva un borrador local para evitar perder texto si la página se recarga antes de completar el autosave.
- Los temas en común pueden reordenarse visualmente con arrastrar y soltar o con los botones ↑/↓.
- Para habilitar el reordenamiento persistido hay que ejecutar una vez `supabase_reordenamiento_temas.sql` en Supabase.

## Autoría y derechos de uso

**RETROS** es un proyecto personal desarrollado por **Diego Gabriel Montefusco**.

Copyright © RETROS Todos los derechos reservados. El contenido, diseño y funcionalidades de esta aplicación son propiedad de Diego Gabriel Montefusco.

El software, su código fuente, estructura, diseño y demás contenidos originales incluidos en este proyecto son de titularidad de su autor, salvo aquellos componentes o recursos de terceros que se encuentren sujetos a sus propias licencias.

La publicación del proyecto no implica autorización para copiar, modificar, distribuir, publicar, sublicenciar o crear obras derivadas del código o de sus componentes originales sin autorización previa y expresa del titular de los derechos.

Para las condiciones de uso aplicables al código fuente de este proyecto, consultar el archivo `LICENSE`.
