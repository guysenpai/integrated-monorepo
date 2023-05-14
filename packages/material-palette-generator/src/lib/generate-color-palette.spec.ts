import { generateColorPalette } from './generate-color-palette';
import { RGBColor } from './utils/colors';

describe('generateColorPalette', () => {
  it("should generate the Google's Material Design red color palette", () => {
    const palette = generateColorPalette(RGBColor.fromString('#F44336'));

    expect(palette[50].toUpperCase()).toEqual('#FFEBEE');
    expect(palette[100].toUpperCase()).toEqual('#FFCDD2');
    expect(palette[200].toUpperCase()).toEqual('#EF9A9A');
    expect(palette[300].toUpperCase()).toEqual('#E57373');
    expect(palette[400].toUpperCase()).toEqual('#EF5350');
    expect(palette[500].toUpperCase()).toEqual('#F44336');
    expect(palette[600].toUpperCase()).toEqual('#E53935');
    expect(palette[700].toUpperCase()).toEqual('#D32F2F');
    expect(palette[800].toUpperCase()).toEqual('#C62828');
    expect(palette[900].toUpperCase()).toEqual('#B71C1C');
    expect(palette['A100'].toUpperCase()).toEqual('#FF8A80');
    expect(palette['A200'].toUpperCase()).toEqual('#FF5252');
    expect(palette['A400'].toUpperCase()).toEqual('#FF1744');
    expect(palette['A700'].toUpperCase()).toEqual('#D50000');
  });

  it("should generate the Google's Material Design pink color palette", () => {
    const palette = generateColorPalette(RGBColor.fromInt(0xffe91e63));

    expect(palette[50].toUpperCase()).toEqual('#FCE4EC');
    expect(palette[100].toUpperCase()).toEqual('#F8BBD0');
    expect(palette[200].toUpperCase()).toEqual('#F48FB1');
    expect(palette[300].toUpperCase()).toEqual('#F06292');
    expect(palette[400].toUpperCase()).toEqual('#EC407A');
    expect(palette[500].toUpperCase()).toEqual('#E91E63');
    expect(palette[600].toUpperCase()).toEqual('#D81B60');
    expect(palette[700].toUpperCase()).toEqual('#C2185B');
    expect(palette[800].toUpperCase()).toEqual('#AD1457');
    expect(palette[900].toUpperCase()).toEqual('#880E4F');
    expect(palette['A100'].toUpperCase()).toEqual('#FF80AB');
    expect(palette['A200'].toUpperCase()).toEqual('#FF4081');
    expect(palette['A400'].toUpperCase()).toEqual('#F50057');
    expect(palette['A700'].toUpperCase()).toEqual('#C51162');
  });
});
