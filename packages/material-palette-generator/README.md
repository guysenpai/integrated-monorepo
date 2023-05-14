# Material Palette Generator

The Material palette generator can be used to generate a palette for any color you input. Hue, chroma, and lightness are adjusted by an algorithm that creates palettes that are usable and aesthetically pleasing.

The color palettes originally created by Material Design in 2014 uses this algorithm.

## Getting Started

### Installation

```sh
npm i @guysenpai/material-palette-generator
# or
pnpm add @guysenpai/material-palette-generator
```

### Usage

```ts
import { generateColorPalette, RGBColor } from '@guysenpai/material-palette-generator';

const palette = generateColorPalette(RGBColor.fromString('#F44336'));
// or
const palette = generateColorPalette(RGBColor.fromInt(0xfff44336));
```

For the text color of each palette colors you can use this:

```ts
import { generateColorPalette, generateContrastPalette, RGBColor } from '@guysenpai/material-palette-generator';

const palette = generateColorPalette(RGBColor.fromString('#F44336'));

const contrastPalette = generateContrastPalette(palette);
```

The generated palette is in this format:

```ts
palette = {
  50: '#FFEBEE',
  100: '#FFCDD2',
  200: '#EF9A9A',
  300: '#E57373',
  400: '#EF5350',
  500: '#F44336',
  600: '#E53935',
  700: '#D32F2F',
  800: '#C62828',
  900: '#B71C1C',
  A100: '#FF8A80',
  A200: '#FF5252',
  A400: '#FF1744',
  A700: '#D50000'
};
```
