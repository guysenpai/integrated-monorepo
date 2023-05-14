import { generateColorPalette } from './generate-color-palette';
import { generateContrastPalette } from './generate-contrast-palette';
import { RGBColor } from './utils/colors';

describe('generateContrastPalette', () => {
  it("should generate the contrast colors for Google's Material Design red color palette", () => {
    const palette = generateColorPalette(RGBColor.fromString('#F44336'));
    const contrastPalette = generateContrastPalette(palette);

    expect(contrastPalette[50]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[100]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[200]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[300]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[400]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[500]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[600]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[700]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette[800]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette[900]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette['A100']).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette['A200']).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette['A400']).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette['A700']).toEqual('rgba(255,255,255,1)');
  });

  it("should generate the contrast colors for Google's Material Design pink color palette", () => {
    const palette = generateColorPalette(RGBColor.fromString('#E91E63'));
    const contrastPalette = generateContrastPalette(palette);

    expect(contrastPalette[50]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[100]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[200]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[300]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[400]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[500]).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette[600]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette[700]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette[800]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette[900]).toEqual('rgba(255,255,255,1)');
    expect(contrastPalette['A100']).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette['A200']).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette['A400']).toEqual('rgba(0,0,0,0.87)');
    expect(contrastPalette['A700']).toEqual('rgba(255,255,255,1)');
  });
});
