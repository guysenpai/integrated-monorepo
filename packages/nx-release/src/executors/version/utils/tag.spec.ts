import { formatTagPrefix } from './tag';

describe('formatTagPrefix', () => {
  it('should resolve interpolated string', () => {
    expect(
      formatTagPrefix({
        tagVersionPrefix: 'testtagPrefix',
        projectName: 'testProjectName',
        independent: false
      })
    ).toBe('testtagPrefix');
  });

  it('should resolve independent', () => {
    expect(
      formatTagPrefix({
        tagVersionPrefix: undefined,
        projectName: 'testProjectName',
        independent: false
      })
    ).toBe('v');
  });

  it('should resolve default tag', () => {
    expect(
      formatTagPrefix({
        tagVersionPrefix: undefined,
        projectName: 'testProjectName',
        independent: true
      })
    ).toBe('testProjectName@');
  });
});
