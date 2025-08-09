/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { PluginsController } from '../server/controllers';
import { MemStorage } from '../server/storage';

// Simple in-memory storage injection test for code persistence logic

describe('Plugin code persistence', () => {
  it('merges metadata.code & metadata.description into config when creating', async () => {
    const controller = new PluginsController();
    // @ts-expect-error override storage with MemStorage for test isolation
    controller.storage = new MemStorage();

    const req: any = {
      body: {
        name: 'code_plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'running',
        metadata: { description: 'Desc', code: 'print("hi")' },
      },
    };

    let jsonOut: any;
    const res: any = {
      json: (data: any) => {
        jsonOut = data;
      },
    };

    await controller.createPlugin(req, res);
    expect(jsonOut).toBeDefined();
    expect((jsonOut.config as any).code).toBe('print("hi")');
    expect((jsonOut.config as any).description).toBe('Desc');
  });

  it('merges metadata.code into config on update', async () => {
    const controller = new PluginsController();
    // @ts-expect-error override storage
    controller.storage = new MemStorage();

    // First create baseline plugin
    const createReq: any = {
      body: { name: 'p2', version: '1.0.0', type: 'collector', status: 'running' },
    };
    const resCreate: any = { json: () => {} };
    await controller.createPlugin(createReq, resCreate);

    // Fetch plugin id via storage
    const all = await (controller as any).storage.getPlugins();
    const plugin = all.find((p) => p.name === 'p2');
    expect(plugin).toBeDefined();

    const updateReq: any = {
      params: { id: plugin!.id },
      body: { metadata: { code: '# new code', description: 'Updated' } },
    };

    let updateOut: any;
    const resUpdate: any = {
      json: (d: any) => {
        updateOut = d;
      },
    };
    await controller.updatePlugin(updateReq, resUpdate);

    expect(updateOut).toBeDefined();
    expect((updateOut.config as any).code).toBe('# new code');
    expect((updateOut.config as any).description).toBe('Updated');
  });
});
