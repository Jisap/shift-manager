# Propuesta de Rediseño Visual y UI/UX — ShiftManager

## 1. Diagnóstico Actual: ¿Por qué resulta "horrible" o tosco a la vista?

Aunque la base técnica (Next.js 16, Convex, Tailwind CSS v4, shadcn/ui) y la lógica de negocio son sólidas, visualmente la aplicación parece un prototipo técnico en lugar de un producto pulido:

1. **Falta de layout/armazón global (App Shell):**
   - No hay cabecera principal (`Navbar`), menú de navegación persistente ni barra lateral.
   - Para navegar entre páginas se depende de enlaces aislados en la portada o botones dispersos en cada pantalla.
   - No hay indicación visual de en qué sección te encuentras ni acceso rápido al perfil de usuario / cerrar sesión.

2. **Sobrecarga y explosión del panel del día seleccionado en el Calendario:**
   - Al hacer clic en un día del calendario, se despliega de golpe una cuadrícula con **4 formularios simultáneos** (`DayOverrideEditor`, `DayActualEditor`, `DayOvertimeEditor`, `DayHolidayEditor`) en `grid-cols-4`.
   - Rompe drásticamente el flujo visual, empuja todo el calendario hacia abajo y genera saturación cognitiva.

3. **Jerarquía cromática y "ruido visual" en las celdas:**
   - Colores arbitrarios o poco armonizados en las celdas (fondos directos, bordes estridentes, píldoras con exceso de contraste o textos apiñados).
   - En móviles y pantallas pequeñas, las celdas de 7 columnas colapsan textos pequeños e ilegibles sin espacio para respirar.

4. **Aspecto "crudo" de formularios y botones:**
   - Selectores nativos y campos de hora con estilos básicos (`border-input bg-transparent`).
   - Botones apilados sin jerarquía clara (varios botones primarios compitiendo por atención).
   - Ausencia de micro-interacciones, transiciones suaves y estados vacíos (*empty states*) ilustrados.

5. **Modo oscuro y paleta de colores deslucida:**
   - El color primario actual (`oklch(0.546 0.245 262.881)`) es un azul/índigo genérico, y no hay selector visible ni soporte cuidado para alternar entre tema claro/oscuro.

---

## 2. Plan Maestro de Mejoras Recomendadas

### A. Layout Global y Navegación (App Shell)
* **Barra de navegación unificada (`AppHeader` / `AppSidebar`):**
  - Implementar un `Header` superior pegajoso (*sticky*) o un `Sidebar` colapsable.
  - Logo moderno con isotipo de ShiftManager.
  - Enlaces de navegación con estado activo marcado: **Dashboard**, **Calendario**, **Turnos**, **Patrones**, **Exportar**.
  - Dropdown de usuario a la derecha (Avatar, nombre/email, selector de tema claro/oscuro, botón Salir).
* **Navegación móvil:**
  - Barra inferior (*Bottom Navigation Bar*) en móviles con acceso directo a: *Hoy*, *Calendario*, *Estadísticas* y *Ajustes*.

### B. Transformación del Calendario (`CalendarView`)
* **Sustituir los 4 paneles expandidos por un `Drawer` / `Sheet` lateral:**
  - En vez de incrustar 4 tarjetas gigantes en la cuadrícula que desplazan el calendario, abrir un panel lateral deslizante (*Slide-over Sheet*) o modal contextual enfocado al pulsar un día.
  - Agrupar la edición en pestañas ordenadas dentro del panel:
    1. **Turno & Excepción** (cambio de turno o descanso).
    2. **Fichaje Real** (entrada, salida, descansos).
    3. **Horas Extra** (tramos y motivos).
    4. **Festivos & Notas**.
* **Diseño refinado de celdas:**
  - Uso de bordes sutiles (`border-border/40`), sombras suaves y esquinas redondeadas modernas (`rounded-xl`).
  - Cada tipo de turno debe representarse con un distintivo cromático elegante (barra lateral vertical de color o *pill* pastel con texto seminegrita contrastado).
  - Indicador claro de "Hoy" con anillo focal (`ring-2 ring-primary/80 ring-offset-2`).
  - Días de meses anteriores/posteriores atenuados de forma equilibrada (`opacity-35`).

### C. Rediseño del Dashboard y Tarjetas de Métricas
* **Tarjetas KPI con iconografía moderna:**
  - Tarjetas de resumen (Horas trabajadas vs. previstas, balance del mes, próximas guardias/turnos) con degradados sutiles de fondo, iconos de Lucide estilizados y comparación porcentual visual (+12% vs. mes anterior).
* **Gráficos más limpios:**
  - Recharts con tooltips personalizados translúcidos con desenfoque de fondo (*backdrop-blur*).

### D. Paleta Cromática y Tipografía
* **Paleta de diseño refinada:**
  - Adopción de una paleta Slate/Zinc con un color de acento distintivo (p. ej., Azul Índigo moderno o Esmeralda/Teal corporativo).
  - Colores de turnos predefinidos armoniosos (Mañana: ámbar suave, Tarde: azul sereno, Noche: violeta/índigo nocturno, Descanso: gris perla o verde salvia).
* **Contraste y accesibilidad garantizados:**
  - Píldoras con fondos translúcidos (`bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300`).

---

## 3. Hoja de Ruta de Implementación Propuesta

| Fase | Tarea | Impacto Visual |
| :--- | :--- | :--- |
| **Fase 1** | **App Shell & Navegación:** Crear componente `AppLayout` con barra superior, enlaces activos, selector de tema claro/oscuro y menú de usuario. | ⭐⭐⭐⭐⭐ (Inmediato) |
| **Fase 2** | **Rediseño del Editor de Día:** Migrar los 4 formularios de `DayActualEditor`/`DayOverrideEditor` a un `Sheet` (panel lateral) con Tabs. | ⭐⭐⭐⭐⭐ (Descongestiona el calendario) |
| **Fase 3** | **Estilización de Celdas y Vistas:** Rediseñar la cuadrícula del calendario, insignias de turnos y selector de vistas (Mes/Semana/Día/Agenda). | ⭐⭐⭐⭐ |
| **Fase 4** | **Página de Inicio / Landing:** Transformar la portada simple en un panel de bienvenida o redirigir directamente al Dashboard si está autenticado. | ⭐⭐⭐ |

---

> [!TIP]
> Si deseas comenzar con la Fase 1 o la Fase 2, indícalo y crearemos los componentes correspondientes (`AppShell`, `Sheet` lateral para edición de días) manteniendo el 100% de la funcionalidad actual.

