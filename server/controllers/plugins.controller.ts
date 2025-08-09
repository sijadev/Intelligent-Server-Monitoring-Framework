import type { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { insertPluginSchema } from '../../shared/schema.js';
import { pythonMonitorService } from '../services/python-monitor';

export class PluginsController extends BaseController {
  async getPlugins(req: Request, res: Response): Promise<void> {
    try {
      const plugins = await this.storage.getPlugins();
      res.json(plugins);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch plugins');
    }
  }

  async getPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plugin = await this.storage.getPluginById(id);

      if (!plugin) {
        this.handleNotFound(res, 'Plugin');
        return;
      }

      res.json(plugin);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch plugin');
    }
  }

  async createPlugin(req: Request, res: Response): Promise<void> {
    try {
      const raw = req.body || {};
      // Merge metadata (legacy front-end format) into config so code & description persist
      const mergedConfig = {
        ...(raw.config || {}),
        ...(raw.metadata?.description ? { description: raw.metadata.description } : {}),
        ...(raw.metadata?.code ? { code: raw.metadata.code } : {}),
      };
      const parsed = insertPluginSchema.parse({
        name: raw.name,
        version: raw.version || '1.0.0',
        type: raw.type,
        status: raw.status || 'running',
        config: mergedConfig,
      });
      parsed.status = 'running';
      const created = await this.storage.createOrUpdatePlugin(parsed);

      // Notify Python framework about new plugin
      try {
        await pythonMonitorService.sendCommand('reload_plugins');
      } catch (error) {
        this.logger.log('WARN', 'plugins', 'Failed to notify Python framework about new plugin', {
          error,
        });
      }

      res.json(created);
    } catch {
      this.handleValidationError(res, 'Invalid plugin data');
    }
  }

  async updatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body || {};
      const mergedConfig = {
        ...(updates.config || {}),
        ...(updates.metadata?.description ? { description: updates.metadata.description } : {}),
        ...(updates.metadata?.code ? { code: updates.metadata.code } : {}),
      };
      const updated = await this.storage.updatePlugin(req.params.id, {
        ...updates,
        config: mergedConfig,
      });

      if (!updated) {
        this.handleNotFound(res, 'Plugin');
        return;
      }

      // Notify Python framework about plugin update
      try {
        await pythonMonitorService.sendCommand('reload_plugins');
      } catch (error) {
        this.logger.log(
          'WARN',
          'plugins',
          'Failed to notify Python framework about plugin update',
          { error },
        );
      }

      res.json(updated);
    } catch (error) {
      this.handleError(res, error, 'Failed to update plugin');
    }
  }

  async deletePlugin(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.storage.deletePlugin(req.params.id);

      if (!deleted) {
        this.handleNotFound(res, 'Plugin');
        return;
      }

      // Notify Python framework about plugin deletion
      try {
        await pythonMonitorService.sendCommand('reload_plugins');
      } catch (error) {
        this.logger.log(
          'WARN',
          'plugins',
          'Failed to notify Python framework about plugin deletion',
          { error },
        );
      }

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, 'Failed to delete plugin');
    }
  }

  async startPlugin(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.storage.updatePlugin(req.params.pluginId, { status: 'running' });

      if (!updated) {
        this.handleNotFound(res, 'Plugin');
        return;
      }

      res.json(updated);
    } catch (error) {
      this.handleError(res, error, 'Failed to start plugin');
    }
  }

  async stopPlugin(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.storage.updatePlugin(req.params.pluginId, { status: 'stopped' });

      if (!updated) {
        this.handleNotFound(res, 'Plugin');
        return;
      }

      res.json(updated);
    } catch (error) {
      this.handleError(res, error, 'Failed to stop plugin');
    }
  }
}
