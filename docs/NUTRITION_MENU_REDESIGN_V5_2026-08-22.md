# Recomp 10M — Rediseño Nutrición + Menús v5.2

Fecha: 2026-08-22

## Resumen ejecutivo

La auditoría de uso detectó que Nutrición y Menús se comportaban como herramientas acumuladas y no como dos recorridos coherentes. Nutrición abría con una calculadora de macros aunque la tarea frecuente es saber qué se ha comido y qué queda. Menús contenía dos generadores distintos y el planificador multidía se reubicaba dinámicamente dentro de Nutrición.

La reconstrucción v5.2 separa definitivamente las responsabilidades y, además, hace que el perfil único sea la fuente real de verdad para nutrición y planificación:

- **Nutrición = Hoy + Diario + Objetivos.**
- **Menús = Planificación + Recetas + Compra.**
- **Perfil único = objetivos + número de comidas + preferencias que recibe el planificador.**
- **3–6 comidas reales**, incluida planificación avanzada en seis tomas.

Los motores nutricionales y datos existentes se conservan cuando aportan valor; se reconstruye la jerarquía, el recorrido y la conexión entre datos.

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
10. El perfil único guardaba los objetivos en `recomp_unified_nutrition_v2`, mientras el planificador avanzado seguía leyendo `targets`. Podían existir dos objetivos diferentes para el mismo usuario.
11. El onboarding permitía elegir 6 comidas, pero el planificador avanzado solo aceptaba 3–5. Era una contradicción directa entre lo prometido y lo generado.
12. El redondeo visual del reparto por comidas podía sumar 101% aunque las kcal fueran correctas.

## Arquitectura v5.2

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

La calculadora se mantiene, pero deja de dominar el uso diario. Sus objetivos alimentan el diario y el planificador. Cuando el perfil único genera una nueva estrategia, `nutrition-target-sync-v51.js` sincroniza los objetivos comunes y emite el evento de actualización.

### Menús

- un solo estudio de planificación;
- objetivos, días, comidas y preferencias en el mismo flujo;
- generadores rápidos legacy ocultos para eliminar duplicidad;
- cabecera del plan activo con días, comidas/día y kcal promedio;
- reparto energético real por comida, reconciliado visualmente al 100%;
- receta completa, cantidades, sustitución, registro y compra semanal;
- biblioteca de recetas como herramienta secundaria;
- preferencias del perfil único propagadas al planificador;
- soporte real de 3, 4, 5 o 6 comidas.

### Seis comidas

La extensión `meal-planner-six-v52.js` amplía el planificador avanzado con seis franjas:

1. Desayuno
2. Media mañana
3. Comida
4. Merienda
5. Cena
6. Snack nocturno

El motor selecciona recetas compatibles, evita repeticiones dentro del día cuando el catálogo lo permite y optimiza las escalas de las seis recetas contra kcal, proteína, carbohidratos y grasas. Las sustituciones vuelven a optimizar el día completo.

## Decisiones de producto

El registro real y el plan previsto son conceptos distintos y se muestran como tales. El usuario puede desviarse del menú sin perder el seguimiento del día. La aplicación no recomienda compensaciones extremas cuando se supera el objetivo energético y no presenta una comida aislada como fracaso.

El perfil único tiene prioridad sobre valores antiguos. Si el usuario modifica manualmente los objetivos dentro del planificador, esa elección se respeta hasta que vuelva a recalcular su estrategia.

## Implementación

Archivos de producto:

- `nutrition-menu-experience-v51.js`
- `nutrition-target-sync-v51.js`
- `meal-planner-six-v52.js`
- `meal-planner-profile-sync-v52.js`

QA:

- `tests/nutrition-menu-experience-v5.test.mjs`
- `tests/meal-planner-six-v52.test.mjs`
- `qa/nutrition-menu-v5.spec.js`
- `qa/browser-smoke.spec.js`

Integración actualizada:

- `date-engine.js`
- `scripts/build-mobile.mjs`
- `sw.js`
- `.github/workflows/browser-smoke.yml`

La experiencia no utiliza observadores recursivos: refresca las cabeceras tras acciones explícitas y eventos de datos.

## QA profesional

### Unitario

- suma del diario por fecha;
- restante de kcal/macros;
- estado contextual del día;
- reparto real de kcal del menú y suma visual exacta al 100%;
- aceptación de 6 comidas;
- generación de seis franjas reales;
- sustitución en un día de seis comidas;
- lista de compra compatible con seis comidas.

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
9. seleccionar/perfilar seis comidas y comprobar seis comidas reales en el día;
10. verificar ausencia de errores JavaScript.

### Usuario · Fuente única

1. completar el perfil único;
2. generar nutrición y entrenamiento;
3. comprobar `recomp_unified_nutrition_v2.targets`;
4. comprobar que `targets` coincide exactamente;
5. abrir Menús y confirmar que utiliza esos objetivos;
6. comprobar que el número de comidas del perfil aparece en el planificador.

## Fallos encontrados y corregidos durante la iteración

- **PWA CI:** el primer cambio del service worker conservaba la semántica network-first, pero su minificación rompió una regresión protegida. Se restauró una implementación legible y compatible.
- **Arquitectura UI v5:** riesgo de bucle de `MutationObserver` al redibujar Menús. Eliminado en v5.1.
- **Runtime v5:** dependencia innecesaria de helpers globales. Eliminada en v5.1.
- **Reparto visual:** porcentajes redondeados podían totalizar 101%. El último elemento absorbe ahora el residual y el total visible es exactamente 100%.
- **Fuente de verdad:** el intake y el planificador podían usar claves distintas para los objetivos. Se creó sincronización explícita y QA que exige igualdad exacta.
- **Número de comidas:** el perfil ofrecía 6 y el planificador rechazaba 6. La v5.2 amplía generación, sustitución, QA y UI a 3–6 comidas.
- **Deuda de producto:** PR #19, que proponía mover el planificador a Nutrición, fue cerrado sin fusionar para no reintroducir la arquitectura descartada.

## Release gate

No fusionar hasta que estén verdes en el mismo HEAD:

- Recomp 10 CI
- Recomp Browser Smoke
- Recomp 10 iOS Native CI

Tras fusión, GitHub Pages debe desplegar `main` y se comprobará la versión pública.
