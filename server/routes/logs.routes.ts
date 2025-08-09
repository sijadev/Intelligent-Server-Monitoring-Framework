import { Router } from 'express';
import { storage } from '../storage-init';
import { insertLogEntrySchema, type LogFilterOptions } from '../../shared/schema.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const options: LogFilterOptions = {};

    if (req.query.level) options.level = req.query.level as string;
    if (req.query.source) options.source = req.query.source as string;
    if (req.query.limit) options.limit = parseInt(req.query.limit as string);
    if (req.query.since) options.since = new Date(req.query.since as string);

    const logs = await storage.getLogEntries(options);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get log entries' });
  }
});

router.post('/', async (req, res) => {
  try {
    // Convert timestamp string to Date object if needed
    if (req.body.timestamp && typeof req.body.timestamp === 'string') {
      req.body.timestamp = new Date(req.body.timestamp);
    }

    const logEntry = insertLogEntrySchema.parse(req.body);
    const created = await storage.createLogEntry(logEntry);
    res.status(201).json(created);
  } catch (error) {
    console.error('❌ Log creation error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ message: 'Invalid log entry data', error: msg });
  }
});

export { router as logsRoutes };
