# EcoSteel AI - Industry 4.0 Dashboard Design Guidelines

## Design Approach

**Selected Approach:** Hybrid - Industrial Control Room Aesthetic + Modern Data Dashboard Patterns

**References:** 
- Tesla Factory Control Interfaces (futuristic industrial)
- Grafana/ThingsBoard IoT Dashboards (data visualization)
- Mission Control Centers (NASA, SpaceX) for critical monitoring aesthetics
- Cyberpunk 2077 UI elements (glowing, technical overlays)

**Core Principles:**
1. Information density with visual breathing room
2. Immediate status recognition through visual hierarchy
3. Glowing/animated elements only for critical real-time data
4. Glassmorphic depth for layered information architecture
5. Technical precision with futuristic edge

---

## Typography

**Font System:**
- Primary: 'Inter' or 'Space Grotesk' (clean, technical, excellent at small sizes)
- Monospace: 'JetBrains Mono' or 'Fira Code' (sensor values, technical readouts)
- Display: 'Orbitron' or 'Rajdhani' (page headers, major labels - futuristic industrial feel)

**Hierarchy:**
- Dashboard Headers: Display font, 2xl-3xl, bold
- Section Titles: Primary font, xl-2xl, semibold
- Card Headers: Primary font, lg, medium
- Body/Labels: Primary font, sm-base, regular
- Metrics/Values: Monospace, lg-2xl, bold (glowing treatment)
- Sensor Readouts: Monospace, sm-base, medium
- Timestamps: Monospace, xs-sm, regular, reduced opacity

---

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16
- Card padding: p-6
- Section gaps: gap-6 or gap-8
- Grid spacing: gap-4 (dense data) or gap-6 (standard)
- Page margins: px-6 lg:px-8
- Vertical sections: py-8 lg:py-12

**Grid Structures:**
- Main Dashboard: 12-column grid with 3-4-3 or 4-4-4 column card layouts
- Furnace Monitoring: 3-column grid (lg:grid-cols-3) for furnace cards
- Sensor Network: 4-6 column grid (grid-cols-2 md:grid-cols-4 lg:grid-cols-6) for compact sensor tiles
- Analytics: 2-column split (8-4 grid) for charts + sidebar insights
- Full-width sections for 3D Digital Twin and camera feeds

**Layout Patterns:**
- Persistent sidebar navigation (w-64, collapsible to w-16 icon-only on mobile)
- Top bar with breadcrumbs, global search, notification bell, user profile
- Content area with max-w-screen-2xl centering for ultra-wide displays
- Sticky section headers when scrolling through long data lists

---

## Component Library

### Core UI Elements

**Glassmorphic Cards:**
- Backdrop blur effect (backdrop-blur-md)
- Semi-transparent backgrounds
- Subtle border with glow effect on hover/active states
- Rounded corners (rounded-lg for standard, rounded-xl for featured cards)
- Inner shadow for depth perception

**Status Indicators:**
- Circular dots (w-3 h-3) with pulse animation for active states
- Color-coded: Green (operational), Red (critical), Yellow (warning), Blue (idle), Gray (offline)
- Glowing ring effect for critical alerts
- Pulsing animation only for changing/alerting states

**Metric Cards:**
- Large numerical display (text-3xl-4xl, monospace font)
- Glowing text effect for primary value
- Small trend indicator (↑/↓ with percentage change)
- Sparkline chart beneath main value
- Icon in top-left corner
- Subtle grid background pattern

**Gauge Visualizations:**
- Semi-circular or full-circle gauges for temperature/pressure
- Segmented color zones (safe/warning/danger)
- Animated needle with smooth transitions
- Digital readout overlaid at center
- Min/max range labels

### Navigation

**Sidebar Navigation:**
- Grouped menu items by function (Monitoring, Analytics, Control, Settings)
- Icons with labels (collapse to icons only on narrow screens)
- Active state with vertical accent bar and glow
- Smooth expand/collapse transitions
- Furnace quick-access submenu

**Breadcrumbs:**
- Top of content area
- Subtle separators (/ or >)
- Clickable navigation trail
- Current page highlighted

### Forms & Inputs

**Input Fields:**
- Dark background with light border
- Focused state with glowing border accent
- Inline labels or floating labels for complex forms
- Icon prefixes for search, filter inputs
- Monospace font for numerical inputs

**Buttons:**
- Primary: Solid with glow effect on hover
- Secondary: Outlined with fill on hover
- Danger: Red accent for critical actions
- Icon buttons for compact toolbars
- Loading state with spinner animation

### Data Displays

**Real-time Charts:**
- Time-series line charts with gradient fills
- Glowing data points on hover
- Grid lines with low opacity
- Animated line drawing on initial load
- Legend with color-coded series
- Smooth data transitions (not jarring jumps)

**Data Tables:**
- Striped rows for readability (subtle)
- Sticky headers for long scrolls
- Sortable columns with indicator
- Row hover highlight
- Dense padding for large datasets
- Expandable rows for detailed views

**Sensor Grids:**
- Compact tiles (4x4 or 6x6 layout)
- Icon + label + value + unit
- Status color border/glow
- Click to expand detailed modal
- Update animation on value change

### Overlays

**Modals:**
- Centered glassmorphic container
- Dark backdrop with blur
- Close button (top-right)
- Max width constraints (max-w-2xl to max-w-4xl based on content)
- Slide-in animation from bottom or fade-in

**Notifications/Toasts:**
- Top-right stacking
- Auto-dismiss after 5s (or manual close)
- Color-coded by severity
- Icon + message + timestamp
- Slide-in from right animation

**Digital Twin Overlay:**
- Full-screen 3D canvas
- Floating info panels for selected equipment
- Semi-transparent control panel at bottom
- Exit/minimize controls at top-right

---

## Animations

**Use Sparingly - Purpose-Driven Only:**

1. **Critical Real-time Updates:**
   - Pulse animation on sensor value changes (0.3s)
   - Glowing effect intensification on alerts
   - Gauge needle smooth transitions (0.5s ease)

2. **State Feedback:**
   - Button press scale (0.95)
   - Card hover lift (translateY -2px)
   - Loading spinners on data fetch

3. **Page Transitions:**
   - Fade-in content on route change (0.2s)
   - Sidebar expand/collapse (0.3s)

**Avoid:**
- Scroll-triggered animations (performance impact with real-time data)
- Decorative parallax effects
- Excessive micro-interactions

---

## Page-Specific Layouts

**Main Dashboard:**
- Top row: 4 KPI cards (grid-cols-4)
- Second row: Large furnace overview chart (8 cols) + Quick alerts panel (4 cols)
- Third row: 3-column layout for Energy, Production, Quality summary cards
- Bottom: Recent activity feed

**Multi-Furnace Monitoring:**
- Grid of 6-8 furnace cards (grid-cols-3)
- Each card: Furnace ID, temperature gauge, pressure bar, composition breakdown, status badge
- Click card to expand full-screen detailed view with time-series charts

**Digital Twin 3D View:**
- Full viewport 3D canvas
- Floating overlay panels with transparent backgrounds
- Minimap in bottom-right corner
- Sensor hotspot markers on 3D model
- Side panel (can slide out) with equipment list

**IoT Sensor Network:**
- Dense grid (grid-cols-6) of sensor tiles
- Filter bar at top (by zone, type, status)
- Search functionality
- Color-coded borders for sensor health
- Click sensor to see historical trend modal

**Camera Detection System:**
- 2x2 or 3x2 grid of video feed placeholders
- AI detection overlay boxes drawn on feeds
- Defect counter badges
- Recording indicator
- Full-screen mode for individual feed

**Analytics Dashboard:**
- Time range selector at top (Today, Week, Month, Quarter, Custom)
- Large time-series chart for primary metric
- 2-column grid below with breakdown charts
- Export/download controls

---

## Images

**Where to Use Images:**
- **Hero Section:** Not applicable (this is a dashboard app, not marketing site)
- **3D Digital Twin:** Rendered 3D model of steel plant (Three.js generated, not static image)
- **Camera Feeds:** Placeholder video frames with detection overlays
- **Empty States:** Illustrative graphics for "No data available" or "No alerts" states
- **Onboarding/Tutorial:** Screenshot-based guides for complex features

**Background Treatments:**
- Subtle grid pattern overlay on dashboard background
- Noise texture for glassmorphic cards (very subtle)
- No hero images - this is a functional control room interface

---

## Accessibility Implementation

- Maintain 4.5:1 contrast ratio for all text despite dark theme
- Provide text alternatives for icon-only buttons
- Keyboard navigation for all interactive elements
- ARIA labels for real-time updating values (announce changes to screen readers)
- Focus indicators visible on all focusable elements
- Status communicated through text + color (not color alone)

---

**Design Delivery Notes:**
This is a data-dense, mission-critical industrial interface. Prioritize information clarity and immediate status comprehension over decorative flourishes. The "futuristic" aesthetic comes from precise typography, strategic glow effects on live data, and glassmorphic depth—not from excessive animation or visual noise. Every pixel should serve the operator's need to monitor and respond to plant conditions efficiently.