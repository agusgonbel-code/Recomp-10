# Recomp 10M — Rediseño Nutrición + Menús v5.1

Fecha: 2026-08-22

## Resumen ejecutivo

La auditoría de uso detectó que Nutrición y Menús se comportaban como herramientas acumuladas y no como dos recorridos coherentes. Nutrición abría con una calculadora de macros aunque la tarea frecuente es saber qué se ha comido y qué queda. Menús contenía dos generadores distintos y el planificador multidía se reubicaba dinámicamente dentro de Nutrición.

La v5.1 separa definitivamente las responsabilidades:

- **Nutrición = Hoy + Diario + Objetivos.**
- **Menús = Planificación + Recetas + Compra.**

Los motores nutricionales y datos existentes se conservan; se reconstruye la jerarquía y el recorrido del usuario.

## Problemas detectados como usuario

1. La calculadora era la primera experiencia de Nutrición aunque es una tarea ocasional.
2. Nutrición mezclaba estrategia, diario y planificación.
3. Menús tenía generador multidía y generadores rápidos paralelos.
4. `mealPlanner30` era movido de Menús a Nutrición, rompiendo el modelo mental de navegación.
5. El menú activo no tenía una cabecera que explicase días, comidas y energía media.
6. No se veía de un vistazo consumido frente a objetivo/restante.
7. El reparto real de kcal entre las comidas quedaba oculto.
8. Biblioteca, compra, generadores y menú competían por la misma prioridad visual.
9. La primera propuesta v5 introducía un `MutationObserver` que podía reaccionar a su propio redibujado de Menús y crear actualizaciones recursivas. Fue detectado durante revisión de ingeniería y eliminado antes de publicación.

## Arquitectura v5.1

### Nutrición · Hoy

- kcal, proteína, carbohidratos y grasas consumidos frente a objetivo;
- barras de progreso y restante;
- estado contextual del día sin juzgar una comida aislada;
- resumen de comidas realmente registradas;
- plan previsto procedente de Menús;
- accesos directos a registrar comida y al menú.

### Nutrición · Diario

Se reutiliza el diario existente, incluida la edición y eliminación, para no duplicar almacenamiento ni crear dos fuentes de verdad.

### Nutrición · Objetivos

La calculadora se mantiene, pero deja de dominar el uso diario. Sus objetivos siguen alimentando el diario y el planificador.

### Menús

- un solo estudio de planificación;
- objetivos, días, comidas y preferencias en el mismo flujo;
- generadores rápidos legacy ocultos para eliminar duplicidad;
- cabecera del plan activo con días, comidas/día y kcal promedio;
- reparto energético real por comida;
- receta completa, cantidades, sustitución, registro y compra semanal mediante el motor avanzado existente;
- biblioteca de recetas como herramienta secundaria.

## Decisiones de producto

El registro real y el plan previsto son conceptos distintos y se muestran como tales. El usuario puede desviarse del menú sin perder el seguimiento del día. La aplicación no recomienda compensaciones extremas cuando se supera el objetivo energético y no presenta una comida aislada como fracaso.

## Implementación

Archivo de producto definitivo:

- `nutrition-menu-experience-v51.js`

QA:

- `tests/nutrition-menu-experience-v5.test.mjs` (motor v5.1)
- `qa/nutrition-menu-v5.spec.js` (recorridos reales)

Integración actualizada:

- `date-engine.js`
- `scripts/build-mobile.mjs`
- `sw.js`
- `.github/workflows/browser-smoke.yml`

La v5.1 no utiliza observadores recursivos: refresca la cabecera después de acciones explícitas y eventos de datos.

## QA profesional

### Unitario

- suma del diario por fecha;
- restante de kcal/macros;
- estado contextual del día;
- reparto real de kcal del menú.

### Usuario · Nutrición

1. entrar con perfil existente;
2. abrir Nutrición;
3. verificar que la pantalla comienza por el estado del día;
4. comprobar una comida ya registrada;
5. abrir Objetivos y encontrar la calculadora;
6. abrir Diario y comprobar el editor;
7. verificar que no hay errores JavaScript.

### Usuario · Menús

1. abrir Menús;
2. confirmar un único planificador;
3. confirmar que el generador rápido legacy no compite en pantalla;
4. generar 7 días;
5. comprobar resumen y días;
6. abrir una receta y sus ingredientes;
7. sustituir una comida y comprobar que el día sigue utilizable;
8. confirmar que el planificador pertenece a Menús;
9. verificar ausencia de errores JavaScript.

## Fallos encontrados durante la iteración

- **PWA CI:** el primer cambio del service worker conservaba la misma semántica network-first, pero su minificación rompió una prueba de regresión que exigía la forma explícita `destination === 'script'`. Se restauró una implementación legible y compatible con el test.
- **Arquitectura UI v5:** riesgo de bucle de `MutationObserver` al redibujar Menús. Eliminado en v5.1.
- **Runtime v5:** la primera variante necesitaba helpers globales para la UI. v5.1 encapsula sus helpers y elimina esa dependencia.

## Release gate

No fusionar hasta que estén verdes:

- Recomp 10 CI
- Recomp Browser Smoke
- Recomp 10 iOS Native CI

Tras fusión, GitHub Pages debe desplegar `main` y se comprobará la versión pública.
