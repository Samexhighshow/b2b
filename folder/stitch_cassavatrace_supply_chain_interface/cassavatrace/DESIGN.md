---
name: CassavaTrace
colors:
  surface: '#ecfeef'
  surface-dim: '#ccdfd0'
  surface-bright: '#ecfeef'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e6f8e9'
  surface-container: '#e0f2e4'
  surface-container-high: '#dbedde'
  surface-container-highest: '#d5e7d8'
  on-surface: '#101f16'
  on-surface-variant: '#424844'
  inverse-surface: '#24342a'
  inverse-on-surface: '#e3f5e6'
  outline: '#727974'
  outline-variant: '#c2c8c2'
  surface-tint: '#496457'
  primary: '#001109'
  on-primary: '#ffffff'
  primary-container: '#0d281d'
  on-primary-container: '#749182'
  inverse-primary: '#afcdbd'
  secondary: '#006d33'
  on-secondary: '#ffffff'
  secondary-container: '#8ff9a7'
  on-secondary-container: '#007437'
  tertiary: '#000b2c'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e5b'
  on-tertiary-container: '#5784fc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbead8'
  primary-fixed-dim: '#afcdbd'
  on-primary-fixed: '#052016'
  on-primary-fixed-variant: '#324c40'
  secondary-fixed: '#8ff9a7'
  secondary-fixed-dim: '#73dc8d'
  on-secondary-fixed: '#00210b'
  on-secondary-fixed-variant: '#005225'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea7'
  background: '#ecfeef'
  on-background: '#101f16'
  surface-variant: '#d5e7d8'
typography:
  h1:
    fontFamily: Sora
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  h3:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  status-tag:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 40px
  grid-gutter: 20px
---

## Brand & Style

The design system is engineered for the intersection of agricultural logistics and blockchain transparency. The brand personality is **Professional, Trustworthy, and Data-Driven**, aiming to instill confidence in stakeholders from farmers to global distributors.

The visual style is **Corporate Modern**, utilizing a structured, card-based layout that prioritizes information density without sacrificing clarity. It leans into a "Green-Tech" aesthetic—combining organic, earthy tones with precise, technical execution. The interface should feel as stable as the blockchain ledger it represents, using subtle depth and a clean grid to organize complex supply chain data.

## Colors

The palette is rooted in a deep, forest-inspired Primary Dark Green, often applied as a sophisticated gradient to represent the "tech" layer of the blockchain. 

- **Primary:** Used for sidebars, primary buttons, and heavy headers. The gradient (#0d281d to #123826) adds depth to large surfaces.
- **Accent Green:** Reserved for high-priority actions, "Verified" statuses, and success states.
- **Soft Green:** Used as a background for tags or subtle highlight areas to maintain the monochromatic agricultural theme.
- **Functional Accents:** Blue is utilized for data visualization lines (logistics tracking), while Orange is strictly for "Pending" states or warning indicators.
- **Backgrounds:** A tiered system of off-whites and pale greens (#e5ebe3 for the page, #f4f7f2 for cards) creates a soft, low-strain reading environment.

## Typography

This design system employs a dual-font strategy. **Sora** provides a modern, geometric character for headings, reinforcing the technological aspect of the product. **Inter** is used for all body text, data tables, and labels to ensure maximum legibility at small sizes—critical for complex supply chain manifests.

Headings should be kept tight with slightly negative letter-spacing in larger sizes. Body text follows a standard vertical rhythm, ensuring data-heavy screens remain scannable and accessible.

## Layout & Spacing

The system uses a **Fixed Grid** approach for internal dashboard content, centering within a 1440px max-width container, while the sidebar remains fixed to the viewport. 

- **Grid:** A 12-column system with 20px gutters.
- **Rhythm:** An 8px base unit (with a 4px sub-step) governs all padding and margins. 
- **Card Spacing:** Standard internal card padding is set to 24px (lg) to provide "breathability" for data points. Complex tables may drop to 12px (sm) padding to maximize information density.

## Elevation & Depth

To maintain a professional, grounded feel, this design system avoids heavy shadows. Instead, it utilizes **Ambient Shadows** and **Tonal Layering**:

- **Card Level:** Cards use a subtle, diffused shadow (0px 4px 20px rgba(13, 40, 29, 0.05)) to lift them slightly from the #e5ebe3 background.
- **Interactive States:** On hover, cards may increase their shadow slightly or apply a 1px border using the Accent Green at 20% opacity.
- **Separators:** Use thin, 1px lines in #d9efe0 for internal card divisions.
- **Modals:** High elevation with a 15% opacity primary dark green backdrop blur to focus the user on critical data entry.

## Shapes

The design system adopts a **Rounded** shape language to soften the industrial nature of the supply chain. 

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Cards & Containers:** Large containers and data cards use a 1rem (16px) radius to create a distinct modular look.
- **Tags & Badges:** Fully pill-shaped (round-full) to differentiate them from interactive buttons.
- **Progress Bars:** Use a 4px radius for a sleek, modern appearance within data rows.

## Components

### Buttons
- **Primary:** Solid gradient (#0d281d to #123826) with white text.
- **Secondary:** Outline button using #2f9b54.
- **Ghost:** For low-priority actions, using Main Text color.

### Status Tags
- **Verified:** Soft Green background (#d9efe0) with Accent Green (#2f9b54) text. Includes a small checkmark icon.
- **Pending:** Soft Orange (lightened #d3781f) background with Orange Line (#d3781f) text.

### Progress Bars
- Background: #e5ebe3.
- Fill: Accent Green (#2f9b54) for completed stages; Blue Line (#2f61d8) for active transit stages.
- Height: 8px for standard, 4px for compact table views.

### Cards
- Background: #f4f7f2.
- Border: Optional 1px solid #d9efe0 for increased definition on high-density screens.

### Data Inputs
- Border: 1.5px solid #d9efe0.
- Focus State: 1.5px solid #2f9b54 with a soft outer glow.
- Background: White or #ffffff.

### Additional Components
- **Traceability Timeline:** A vertical line component using #2f61d8 to connect logistics nodes.
- **Blockchain Hash Chips:** Monospaced (Inter) small labels for displaying transaction IDs with a "copy" icon.