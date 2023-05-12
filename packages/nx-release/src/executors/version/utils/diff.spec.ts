import { diff } from './diff';

const FILE_BEFORE = `# This is the header
## This is the second line of the header

Change 6

Change 5
Change 4
Change 3
Change 2
Change 1
`;
const FILE_AFTER = `# This is the header
## This is the second line of the header

Change 9

Change 8
Change 7
Change 6

Change 5
Change 4
Change 3
Change 2
Change 1
`;

describe('diff', () => {
  it('should not include the header in the diff', () => {
    const difference = diff(FILE_BEFORE, FILE_AFTER);

    expect(difference).not.toInclude('# This is the header');
    expect(difference).not.toInclude('## This is the second line of the header');
  });

  it('should not include changes from before', async () => {
    const difference = diff(FILE_BEFORE, FILE_AFTER);

    expect(difference).not.toMatch(/Change [1-6]/);
  });

  it('should include changes from after', async () => {
    const difference = diff(FILE_BEFORE, FILE_AFTER);

    expect(difference).toMatch(/Change [7-9]/);
  });
});
