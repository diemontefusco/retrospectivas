# RETROS Design System v1

## Objetivo

Crear una capa visual y de interacción consistente para RETROS, con prioridad en mobile y con especial foco en los campos de fecha.

Esta versión inicia el sistema sin rediseñar las pantallas existentes. Los componentes nuevos se incorporan progresivamente sobre la implementación actual.

## Principios

1. Mobile no es desktop reducido.
2. Un componente debe tener una única fuente de verdad visual.
3. Los valores de negocio y la representación visual deben estar desacoplados.
4. Los componentes interactivos deben resolver touch, teclado, foco y estados.
5. Evitar `!important`, estilos inline y excepciones por pantalla cuando exista un componente reutilizable.
6. Las migraciones se realizan de forma incremental para preservar la experiencia existente.

## Foundations

La capa `css/design-system.css` define tokens para:

- color
- tipografía
- spacing
- radius
- controles
- foco
- z-index
- interacción

Los tokens DS utilizan los valores visuales existentes de RETROS como base, por lo que esta primera versión no busca cambiar arbitrariamente la identidad visual.

## Form primitives

Se incorporan las bases:

- `.ds-field`
- `.ds-field__label`
- `.ds-field__hint`
- `.ds-field__error`
- `.ds-control`

Estos componentes serán la base para la migración progresiva de los formularios.

## DateField

`js/components/dateField.js` introduce un DateField propio.

### Contrato de datos

El valor interno continúa siendo ISO:

`YYYY-MM-DD`

Esto mantiene compatibilidad con la persistencia existente.

### Representación

El usuario visualiza:

`DD/MM/YYYY`

### Desktop

El selector aparece como popover asociado al campo.

### Mobile

El selector se transforma en un bottom sheet para evitar depender del date picker nativo del navegador.

### Estados

- vacío
- fecha seleccionada
- hoy
- foco
- abierto
- disabled
- navegación de mes
- limpieza

### Accesibilidad inicial

- botón con `aria-haspopup="dialog"`
- `aria-expanded`
- foco visible
- Escape para cerrar
- controles de navegación de mes
- labels de los días

## Migración actual

El DateField se monta automáticamente sobre los `input[type="date"]` existentes en:

- creación de retrospectiva
- creación de acciones
- acciones de post mortem

El input original se conserva como campo oculto para no alterar el contrato de datos existente.

## Próximas fases

### Fase 4
Migrar edición de acciones del `prompt()` a un componente de formulario reutilizable y utilizar DateField.

### Fase 5
Migrar botones, inputs, selects, textareas, cards, modales y layouts a primitives/patterns del Design System.

### Fase 6
Reducir estilos inline y excepciones responsive, priorizando las reglas de componentes.

### Fase 7
Auditar los principales viewports:

- 320px
- 360px
- 390px
- 430px
- 768px
- desktop

El objetivo es validar comportamiento, no solamente dimensiones.
