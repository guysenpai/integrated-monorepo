import { createTestingContext } from '../../utils/testing';
import { getProjectDependencies } from './project-dependencies';

import type { ProjectGraph } from '@nrwl/devkit';

const projectGraph: ProjectGraph = {
  nodes: {},
  dependencies: {
    demo: [
      { type: 'static', source: 'demo', target: 'npm:@mock/npm-lib1' },
      { type: 'implicit', source: 'demo', target: 'lib1' },
      { type: 'static', source: 'demo', target: 'lib2' }
    ],
    lib1: [
      { type: 'static', source: 'lib1', target: 'npm:@mock/npm-lib1' },
      { type: 'implicit', source: 'lib1', target: 'lib2' }
    ],
    lib2: [
      { type: 'static', source: 'lib2', target: 'npm:@mock/npm-lib2' },
      { type: 'static', source: 'lib2', target: 'lib1' },
      { type: 'static', source: 'lib2', target: 'lib3' }
    ],
    lib3: [],
    'demo-e2e': [{ type: 'implicit', source: 'demo-e2e', target: 'demo' }]
  }
};
const context = createTestingContext({
  project: 'a',
  projectRoot: '/root/packages/a',
  workspaceRoot: '/root',
  projectGraph
});

describe('projectDependencies', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should returns a list of libs that the project is dependent on', () => {
    const dependencies = getProjectDependencies('demo', context);

    expect(dependencies).toEqual(['lib1', 'lib2']);
  });

  it('should returns a sub-dependency', () => {
    const dependencies = getProjectDependencies('lib1', context);

    expect(dependencies).toEqual(['lib2']);
  });

  it('should handles a failure if context dependency graph is not defined', () => {
    context.projectGraph = undefined;

    let error;
    try {
      getProjectDependencies('lib1', context);
    } catch (e) {
      error = e;
    }

    expect(error.toString()).toEqual('Error: `context.projectGraph` does not exist');
  });
});
