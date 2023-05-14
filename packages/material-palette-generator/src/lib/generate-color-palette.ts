import { LABColor, LCHColor, RGBColor } from './utils/colors';
import {
  DEFAULT_CHROMA_TOLERANCE,
  DEFAULT_LIGHTNESS_TOLERANCE,
  GOLDEN_PALETTES,
  PALETTE_HUES
} from './utils/constants';

class ClosestGoldenPalette {
  constructor(public colors: LABColor[], public closestReference = -1) {}
}

type ColorHue =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 'A100'
  | 'A200'
  | 'A400'
  | 'A700';
export type ColorPalette = Record<ColorHue, string>;

export function generateColorPalette(rgbColor: RGBColor): ColorPalette {
  return _generatePalette(
    rgbColor,
    GOLDEN_PALETTES,
    DEFAULT_LIGHTNESS_TOLERANCE,
    DEFAULT_CHROMA_TOLERANCE,
    PALETTE_HUES
  );
}

function _generatePalette(
  sourceRgbColor: RGBColor,
  goldenPalettes: LABColor[][] = GOLDEN_PALETTES,
  lightnessTolerance: number[] = DEFAULT_LIGHTNESS_TOLERANCE,
  chromaTolerance: number[] = DEFAULT_CHROMA_TOLERANCE,
  paletteHues: string[] = PALETTE_HUES
): ColorPalette {
  const sourceLabColor = LABColor.fromRGBColor(sourceRgbColor);
  const goldenPalette = _findClosestGoldenPalette(sourceLabColor, goldenPalettes);
  const goldenColors = goldenPalette.colors;
  const closestGoldenLabColor = goldenColors[goldenPalette.closestReference];
  const closestGoldenLchColor = LCHColor.fromLABColor(closestGoldenLabColor);
  const sourceLchColor = LCHColor.fromLABColor(sourceLabColor);
  const isGoldenColorGreyInMiddle = 30 > LCHColor.fromLABColor(goldenColors[5]).chroma;
  const deltaGoldenLightness = closestGoldenLchColor.lightness - sourceLchColor.lightness;
  const deltaGoldenChroma = closestGoldenLchColor.chroma - sourceLchColor.chroma;
  const deltaGoldenHue = closestGoldenLchColor.hue - sourceLchColor.hue;
  const lightnessMinimumStep = 1.7;
  let lightnessMaximum = 100.0;

  return goldenColors
    .map((goldenLabColor, index) => {
      if (goldenLabColor.equals(closestGoldenLabColor)) {
        lightnessMaximum = Math.max(sourceLchColor.lightness - 1.7, 0);

        return sourceRgbColor;
      }

      if (index === 10) {
        lightnessMaximum = 100; //restart maximum lightness when trasitioning from color 900 to A100
      }

      const goldenLchColor = LCHColor.fromLABColor(goldenLabColor);

      let lightness =
        goldenLabColor.lightness -
        (lightnessTolerance[index] / lightnessTolerance[goldenPalette.closestReference]) * deltaGoldenLightness;
      lightness = Math.min(lightness, lightnessMaximum);
      lightness = Math.min(Math.max(0.0, lightness), 100);

      let chroma = isGoldenColorGreyInMiddle
        ? goldenLchColor.chroma - deltaGoldenChroma
        : goldenLchColor.chroma -
          deltaGoldenChroma * Math.min(chromaTolerance[index] / chromaTolerance[goldenPalette.closestReference], 1.25);
      chroma = Math.max(0, chroma);

      const hue = (goldenLchColor.hue - deltaGoldenHue + 360) % 360;
      const lchColor = new LCHColor(lightness, chroma, hue);

      lightnessMaximum = Math.max(lchColor.lightness - lightnessMinimumStep, 0);

      return lchColor.toRGBColor();
    })
    .reduce(
      (palette, rgbColor, index) => ({
        ...palette,
        [paletteHues[index]]: rgbColor.toString()
      }),
      {} as ColorPalette
    );
}

function _findClosestGoldenPalette(
  labColor: LABColor,
  goldenPalettes: LABColor[][] = GOLDEN_PALETTES
): ClosestGoldenPalette {
  let differenceMinimum = Infinity;
  let closestGoldenPalette = goldenPalettes[0];
  let closestReference = -1;

  for (let paletteIndex = 0; paletteIndex < goldenPalettes.length; paletteIndex++) {
    for (let colorIndex = 0; colorIndex < goldenPalettes[paletteIndex].length && 0 < differenceMinimum; colorIndex++) {
      const goldenColor = goldenPalettes[paletteIndex][colorIndex];
      const avgLightness = (goldenColor.lightness + labColor.lightness) / 2;
      const goldenColorChroma = Math.sqrt(Math.pow(goldenColor.a, 2) + Math.pow(goldenColor.b, 2));
      const labColorChroma = Math.sqrt(Math.pow(labColor.a, 2) + Math.pow(labColor.b, 2));
      const avgChroma = (goldenColorChroma + labColorChroma) / 2;
      const G = 0.5 * (1 - Math.sqrt(Math.pow(avgChroma, 7) / (Math.pow(avgChroma, 7) + Math.pow(25, 7))));
      const adjustedGoldenA = goldenColor.a * (1 + G);
      const adjustedLabA = labColor.a * (1 + G);
      const goldenColorAdjustedChroma = Math.sqrt(Math.pow(adjustedGoldenA, 2) + Math.pow(goldenColor.b, 2));
      const labColorAdjustedChroma = Math.sqrt(Math.pow(adjustedLabA, 2) + Math.pow(labColor.b, 2));
      const deltaAdjustedChroma = labColorAdjustedChroma - goldenColorAdjustedChroma;
      const avgAdjustedChroma = (goldenColorAdjustedChroma + labColorAdjustedChroma) / 2;
      const goldenColorModifiedHue = _lab2hue(goldenColor.b, adjustedGoldenA);
      const labColorModifiedHue = _lab2hue(labColor.b, adjustedLabA);
      const deltaHue =
        2 *
        Math.sqrt(goldenColorAdjustedChroma * labColorAdjustedChroma) *
        Math.sin(
          (((1e-4 > Math.abs(goldenColorChroma) || 1e-4 > Math.abs(labColorChroma)
            ? 0
            : 180 >= Math.abs(labColorModifiedHue - goldenColorModifiedHue)
            ? labColorModifiedHue - goldenColorModifiedHue
            : labColorModifiedHue <= goldenColorModifiedHue
            ? labColorModifiedHue - goldenColorModifiedHue + 360
            : labColorModifiedHue - goldenColorModifiedHue - 360) /
            2) *
            Math.PI) /
            180
        );
      const avgHue =
        1e-4 > Math.abs(goldenColorChroma) || 1e-4 > Math.abs(labColorChroma)
          ? 0
          : 180 >= Math.abs(labColorModifiedHue - goldenColorModifiedHue)
          ? (goldenColorModifiedHue + labColorModifiedHue) / 2
          : 360 > goldenColorModifiedHue + labColorModifiedHue
          ? (goldenColorModifiedHue + labColorModifiedHue + 360) / 2
          : (goldenColorModifiedHue + labColorModifiedHue - 360) / 2;
      const chromaCompensation = 1 + 0.045 * avgAdjustedChroma;
      const hueCompensation =
        1 +
        0.015 *
          avgAdjustedChroma *
          (1 -
            0.17 * Math.cos(((avgHue - 30) * Math.PI) / 180) +
            0.24 * Math.cos((2 * avgHue * Math.PI) / 180) +
            0.32 * Math.cos(((3 * avgHue + 6) * Math.PI) / 180) -
            0.2 * Math.cos(((4 * avgHue - 63) * Math.PI) / 180));
      const lightnessCompensation =
        1 + (0.015 * Math.pow(avgLightness - 50, 2)) / Math.sqrt(20 + Math.pow(avgLightness - 50, 2));
      const chromaRotation =
        2 * Math.sqrt(Math.pow(avgAdjustedChroma, 7) / (Math.pow(avgAdjustedChroma, 7) + Math.pow(25, 7)));
      const deltaTheta = 30 * Math.exp(-Math.pow((avgHue - 275) / 25, 2));
      const hueRotation = -1 * chromaRotation * Math.sin((2 * deltaTheta * Math.PI) / 180);
      const difference = Math.sqrt(
        Math.pow((labColor.lightness - goldenColor.lightness) / lightnessCompensation, 2) +
          Math.pow(deltaAdjustedChroma / (1 * chromaCompensation), 2) +
          Math.pow(deltaHue / (1 * hueCompensation), 2) +
          (deltaAdjustedChroma / (1 * chromaCompensation)) * hueRotation * (deltaHue / (1 * hueCompensation))
      );

      if (difference < differenceMinimum) {
        differenceMinimum = difference;
        closestGoldenPalette = goldenPalettes[paletteIndex];
        closestReference = colorIndex;
      }
    }
  }

  return new ClosestGoldenPalette(closestGoldenPalette, closestReference);
}

function _lab2hue(a: number, b: number) {
  if (1e-4 > Math.abs(a) && 1e-4 > Math.abs(b)) {
    return 0;
  }

  a = (180 * Math.atan2(a, b)) / Math.PI;

  return 0 <= a ? a : a + 360;
}
