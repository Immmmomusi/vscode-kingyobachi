import { hexToRgb, lightenHex } from '../../src/webview/color-utils';

describe('hexToRgb', () => {
  it('#付き16進数を正しい RGB タプルに変換する', () => {
    expect(hexToRgb('#0a2a4a')).toEqual([10, 42, 74]);
  });

  it('#なし16進数を正しい RGB タプルに変換する', () => {
    expect(hexToRgb('0a2a4a')).toEqual([10, 42, 74]);
  });

  it('#000000 を [0, 0, 0] に変換する', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('#ffffff を [255, 255, 255] に変換する', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });
});

describe('lightenHex', () => {
  it('各チャンネルを指定量だけ明るくする', () => {
    // #102030 → r=16+16=32, g=32+16=48, b=48+16=64 → #203040
    expect(lightenHex('#102030', 16)).toBe('#203040');
  });

  it('チャンネルが 255 を超えないようにクランプする', () => {
    // r=250 → 250+16=266 → 255
    expect(hexToRgb(lightenHex('#fa8040', 16))[0]).toBe(255);
  });

  it('#ffffff に amount 16 を加えても #ffffff のまま', () => {
    expect(lightenHex('#ffffff', 16)).toBe('#ffffff');
  });

  it('#000000 に amount 0 を加えると #000000 のまま', () => {
    expect(lightenHex('#000000', 0)).toBe('#000000');
  });
});
