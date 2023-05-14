const ACCURACY = Math.pow(2, -16);

function assertRange(value: number, maxValue: number, label: string) {
  if (isNaN(value) || 0.0 > value || value > maxValue) {
    throw new RangeError(`${value} for ${label} is not between 0 and ${maxValue}`);
  }
}

export class RGBColor {
  static fromString(colorString: string): RGBColor {
    const hexString = colorString.replace('#', '').padEnd(8, 'f');
    const colorInt = parseInt(hexString, 16);

    return new RGBColor(
      ((colorInt & 0xff000000) >>> 24) / 0xff,
      ((colorInt & 0x00ff0000) >>> 16) / 0xff,
      ((colorInt & 0x0000ff00) >>> 8) / 0xff,
      (colorInt & 0x000000ff) / 0xff
    );
  }

  static fromInt(colorInt: number): RGBColor {
    return RGBColor.fromString(`#${('000000' + colorInt.toString(16)).slice(-6)}`);
  }

  constructor(public red: number, public green: number, public blue: number, public alpha = 1.0) {
    assertRange(red, 1.0, 'red');
    assertRange(green, 1.0, 'green');
    assertRange(blue, 1.0, 'blue');
    assertRange(alpha, 1.0, 'alpha');
  }

  toContrastRatio(rgbColor: RGBColor) {
    const color = 1 - this.alpha < ACCURACY ? this : new RGBColor(this.red, this.green, this.blue);

    if (!(1 - rgbColor.alpha < ACCURACY)) {
      const delta = color.alpha * (1 - rgbColor.alpha);
      rgbColor = new RGBColor(
        rgbColor.red * rgbColor.alpha + color.red * delta,
        rgbColor.green * rgbColor.alpha + color.green * delta,
        rgbColor.blue * rgbColor.alpha + color.blue * delta,
        rgbColor.alpha + delta
      );
    }

    const color1 =
      0.2126 * XYZColor.channelFromRGBChannel(rgbColor.red) +
      0.7152 * XYZColor.channelFromRGBChannel(rgbColor.green) +
      0.0722 * XYZColor.channelFromRGBChannel(rgbColor.blue);
    const color2 =
      0.2126 * XYZColor.channelFromRGBChannel(this.red) +
      0.7152 * XYZColor.channelFromRGBChannel(this.green) +
      0.0722 * XYZColor.channelFromRGBChannel(this.blue);

    return color1 >= color2 ? (color1 + 0.05) / (color2 + 0.05) : (color2 + 0.05) / (color1 + 0.05);
  }

  toInt(): number {
    const transparent = 0x00000000;

    return (
      transparent |
      (Math.floor(this.alpha) << 32) |
      (Math.floor(this.red) << 16) |
      (Math.floor(this.green) << 8) |
      Math.floor(this.blue)
    );
  }

  toString(): string {
    const alpha = 1 > this.alpha ? this.toHexString(Math.round(255 * this.alpha)) : '';

    return (
      this.toHexString(Math.round(0xff * this.red)) +
      this.toHexString(Math.round(0xff * this.green)) +
      this.toHexString(Math.round(0xff * this.blue)) +
      alpha
    )
      .padStart(7, '#')
      .toLowerCase();
  }

  toRGBAString(): string {
    return `rgba(${this.toTuple().concat(this.alpha).join(',')})`;
  }

  toTuple(): [number, number, number] {
    return [Math.round(0xff * this.red), Math.round(0xff * this.green), Math.round(0xff * this.blue)];
  }

  toHexString(value: number): string {
    return value.toString(16).padStart(2, '0');
  }
}

export class XYZColor {
  static fromRGBColor(rgbColor: RGBColor): XYZColor {
    return new XYZColor(
      this.channelFromRGBChannel(rgbColor.red),
      this.channelFromRGBChannel(rgbColor.green),
      this.channelFromRGBChannel(rgbColor.blue),
      rgbColor.alpha
    );
  }

  static channelFromRGBChannel(ch: number): number {
    return 0.04045 >= ch ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4);
  }

  constructor(public x: number, public y: number, public z: number, public alpha = 1.0) {
    assertRange(alpha, 1.0, 'alpha');
  }

  toRGBColor(): RGBColor {
    let red = this.x * 3.2404542 + this.y * -1.5371385 + this.z * -0.4985314;
    let green = this.x * -0.969266 + this.y * 1.8760108 + this.z * 0.041556;
    let blue = this.x * 0.0556434 + this.y * -0.2040259 + this.z * 1.0572252;

    // Assume sRGB
    red = red > 0.0031308 ? 1.055 * Math.pow(red, 1.0 / 2.4) - 0.055 : red * 12.92;
    green = green > 0.0031308 ? 1.055 * Math.pow(green, 1.0 / 2.4) - 0.055 : green * 12.92;
    blue = blue > 0.0031308 ? 1.055 * Math.pow(blue, 1.0 / 2.4) - 0.055 : blue * 12.92;

    red = Math.min(Math.max(0.0, red), 1.0);
    green = Math.min(Math.max(0.0, green), 1.0);
    blue = Math.min(Math.max(0.0, blue), 1.0);

    return new RGBColor(red, green, blue, this.alpha);
  }
}

export class LABColor {
  static fromRGBColor(rgbColor: RGBColor): LABColor {
    const xyzColor = XYZColor.fromRGBColor(rgbColor);
    const e = 0.2126729 * xyzColor.x + 0.7151522 * xyzColor.y + 0.072175 * xyzColor.z;

    return new LABColor(
      116 * this._valueFromXYZSpace(e) - 16,
      500 *
        (this._valueFromXYZSpace((0.4124564 * xyzColor.x + 0.3575761 * xyzColor.y + 0.1804375 * xyzColor.z) / 0.95047) -
          this._valueFromXYZSpace(e)),
      200 *
        (this._valueFromXYZSpace(e) -
          this._valueFromXYZSpace((0.0193339 * xyzColor.x + 0.119192 * xyzColor.y + 0.9503041 * xyzColor.z) / 1.08883)),
      rgbColor.alpha
    );
  }

  static fromRGBInt(colorInt: number): LABColor {
    return LABColor.fromRGBColor(RGBColor.fromInt(colorInt));
  }

  static fromRGBString(colorString: string): LABColor {
    return LABColor.fromRGBColor(RGBColor.fromString(colorString));
  }

  private static _valueFromXYZSpace(t: number) {
    const t0 = 4 / 29;
    const t1 = 6 / 29;
    const t2 = 3 * Math.pow(t1, 2);
    const t3 = Math.pow(t1, 3);

    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
  }

  constructor(public lightness: number, public a: number, public b: number, public alpha = 1.0) {
    assertRange(lightness, Number.MAX_VALUE, 'lightness');
    assertRange(alpha, 1, 'alpha');
  }

  equals(other: LABColor): boolean {
    return (
      1e-4 > Math.abs(this.lightness - other.lightness) &&
      1e-4 > Math.abs(this.a - other.a) &&
      1e-4 > Math.abs(this.b - other.b) &&
      Math.abs(this.alpha - other.alpha) < 0
    );
  }

  toXYZColor(): XYZColor {
    let y = (this.lightness + 16) / 116;
    let x = this.a / 500 + y;
    let z = y - this.b / 200;

    const y2 = Math.pow(y, 3);
    const x2 = Math.pow(x, 3);
    const z2 = Math.pow(z, 3);

    y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
    x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
    z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

    return new XYZColor(x * 0.95047, y * 1.0, z * 1.08883, this.alpha);
  }

  toRGBColor(): RGBColor {
    return this.toXYZColor().toRGBColor();
  }
}

export class LCHColor {
  static fromLABColor(labColor: LABColor): LCHColor {
    return new LCHColor(
      labColor.lightness,
      Math.sqrt(Math.pow(labColor.a, 2) + Math.pow(labColor.b, 2)),
      ((180 * Math.atan2(labColor.b, labColor.a)) / Math.PI + 360) % 360,
      labColor.alpha
    );
  }

  constructor(public lightness: number, public chroma: number, public hue: number, public alpha = 1.0) {
    assertRange(lightness, Number.MAX_VALUE, 'lightness');
    assertRange(chroma, Number.MAX_VALUE, 'chroma');
    assertRange(hue, 360.0, 'hue');
    assertRange(alpha, 1.0, 'alpha');
  }

  toLABColor(): LABColor {
    const hr = (this.hue / 360) * 2 * Math.PI;

    return new LABColor(this.lightness, this.chroma * Math.cos(hr), this.chroma * Math.sin(hr), this.alpha);
  }

  toRGBColor(): RGBColor {
    return this.toLABColor().toRGBColor();
  }
}

export class HSVColor {
  static fromRGBColor(rgbColor: RGBColor): HSVColor {
    const value = Math.max(Math.max(rgbColor.red, rgbColor.green), rgbColor.blue);
    const c = Math.min(Math.min(rgbColor.red, rgbColor.green), rgbColor.blue);
    let hue = 0;
    let saturation = 0;

    if (value - c > ACCURACY) {
      saturation = (value - c) / value;

      if (value == rgbColor.red) {
        hue = (60 * (rgbColor.green - rgbColor.blue)) / (value - c);
      } else if (value == rgbColor.green) {
        hue = (60 * (rgbColor.blue - rgbColor.red)) / (value - c) + 120;
      } else if (value == rgbColor.blue) {
        hue = (60 * (rgbColor.red - rgbColor.green)) / (value - c) + 240;
      }
    }

    hue = Math.round(hue + 360) % 360;

    return new HSVColor(hue, saturation, value, rgbColor.alpha);
  }

  constructor(public hue: number, public saturation: number, public value: number, public alpha = 1.0) {
    assertRange(hue, 360.0, 'hue');
    assertRange(saturation, 1.0, 'saturation');
    assertRange(value, 1.0, 'value');
    assertRange(alpha, 1.0, 'alpha');
  }

  toRGBColor(): RGBColor {
    const chroma = this.value * this.saturation;

    return this._hsxToRGBColor(this.hue, chroma, Math.max(0, this.value - chroma), this.alpha);
  }

  toString(): string {
    return `hsv(${this.hue},${this.saturation},${this.value},${this.alpha})`;
  }

  private _hsxToRGBColor(hue: number, chroma: number, m: number, alpha: number): RGBColor {
    let red = m;
    let green = m;
    let blue = m;
    const h = (hue % 360) / 60;
    const x = chroma * (1.0 - Math.abs((h % 2) - 1)); //second largest component of this color

    switch (Math.floor(h)) {
      case 0:
        red += chroma;
        green += x;
        break;
      case 1:
        red += x;
        green += chroma;
        break;
      case 2:
        green += chroma;
        blue += x;
        break;
      case 3:
        green += x;
        blue += chroma;
        break;
      case 4:
        red += x;
        blue += chroma;
        break;
      case 5:
        red += chroma;
        blue += x;
    }

    return new RGBColor(red, green, blue, alpha);
  }
}
