import { formatTagPrefix } from './tag';

describe('formatTagPrefix', () => {
  it('should resolve interpolated string', () => {
    expect(
      formatTagPrefix({
        tagVersionPrefix: 'testtagPrefix',
        projectName: 'testProjectName',
        syncVersions: true
      })
    ).toBe('testtagPrefix');
  });

  it('should resolve independent', () => {
    expect(
      formatTagPrefix({
        tagVersionPrefix: undefined,
        projectName: 'testProjectName',
        syncVersions: true
      })
    ).toBe('v');
  });

  it('should resolve default tag', () => {
    expect(
      formatTagPrefix({
        tagVersionPrefix: undefined,
        projectName: 'testProjectName',
        syncVersions: false
      })
    ).toBe('testProjectName@');
  });
});
