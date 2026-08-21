# Recomp 10M — Auditoría profesional de producto y QA · 22/08/2026

## Visión
Recomp 10M debe convertirse en un sistema de recomposición corporal guiado por un único intake. El mismo perfil genera nutrición, entrenamiento y futuras adaptaciones.

## Intake unificado
Sexo, edad, altura, peso, % grasa opcional, actividad, objetivo, experiencia, días/semana, duración por sesión, equipamiento, limitaciones, preferencias, alergias/intolerancias, presupuesto, tiempo de cocina, número de comidas, medidas y fotos.

## Nutrición objetivo
- Fórmula energética explícita y ajuste por objetivo.
- Proteína/grasa/carbohidratos reconciliados con kcal.
- Reparto de kcal entre el número de comidas elegido.
- Distribución sensata de proteína por comida.
- Cantidades prácticas y recetas escalables por gramos.
- Menú de 30 días con variedad real, repetición controlada y sustituciones dentro de tolerancia.
- Ingredientes visibles y nutrición deben compartir la misma fuente de verdad.

## Entrenamiento objetivo
- Frecuencia, volumen, rangos de repeticiones, RIR, progresión y deload derivados del perfil.
- Alternativas por patrón de movimiento y compatibilidad con limitaciones/material.
- Ninguna sesión excede el tiempo disponible.
- Rendimiento y recuperación influyen en las siguientes prescripciones.

## Gates de QA
- Perfil persistente y determinista.
- Suma de kcal por comidas = objetivo diario dentro de tolerancia de redondeo.
- Totales de receta = suma de ingredientes escalados.
- Swaps respetan tolerancias y restricciones.
- Plan respeta días, duración, material y limitaciones.
- Fechas locales y backup/restore sin pérdidas.
- PWA y paquete nativo exponen la misma versión funcional.

## App Store
Bloquean release: PrivacyInfo.xcprivacy, soporte/privacidad, assets, accesibilidad, safe areas, build reproducible, device matrix y ausencia de placeholders.