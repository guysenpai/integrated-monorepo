import { RGBColor } from './utils/colors';
import { BLACK_COLOR, DarkTextEmphasis, LightTextEmphasis, WHITE_COLOR } from './utils/constants';

import type { ColorPalette } from './generate-color-palette';

export function generateContrastPalette(palette: ColorPalette): ColorPalette {
  return Object.entries(palette).reduce(
    (palette, [hue, color]) => ({
      ...palette,
      [hue]: _getContrastColor(RGBColor.fromString(color)).toRGBAString()
    }),
    {} as ColorPalette
  );
}

function _getContrastColor(rgbColor: RGBColor): RGBColor {
  const MIN_CONTRAST = 4.5;
  const whiteContrast = rgbColor.toContrastRatio(WHITE_COLOR);

  if (whiteContrast >= MIN_CONTRAST) {
    return LightTextEmphasis.HIGH;
  }

  const darkContrast = rgbColor.toContrastRatio(BLACK_COLOR);

  if (darkContrast >= MIN_CONTRAST) {
    return DarkTextEmphasis.HIGH;
  } else if (whiteContrast > darkContrast) {
    return LightTextEmphasis.HIGH;
  } else {
    return DarkTextEmphasis.HIGH;
  }
}
