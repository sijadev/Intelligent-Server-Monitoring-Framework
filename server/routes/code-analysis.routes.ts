import { Router } from 'express';
import { storage } from '../storage-init';

const router = Router();

// Code Issues endpoints
router.get('/issues', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const issues = await storage.getCodeIssues(limit);
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: "Failed to get code issues" });
  }
});

router.get('/issues/active', async (req, res) => {
  try {
    const issues = await storage.getActiveCodeIssues();
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: "Failed to get active code issues" });
  }
});

router.put('/issues/:id/resolve', async (req, res) => {
  try {
    const resolved = await storage.resolveCodeIssue(req.params.id);
    if (!resolved) {
      return res.status(404).json({ message: "Code issue not found" });
    }
    res.json(resolved);
  } catch (error) {
    res.status(500).json({ message: "Failed to resolve code issue" });
  }
});

router.put('/issues/:id/apply-fix', async (req, res) => {
  try {
    const fixed = await storage.applyCodeFix(req.params.id);
    if (!fixed) {
      return res.status(404).json({ message: "Code issue not found" });
    }
    res.json(fixed);
  } catch (error) {
    res.status(500).json({ message: "Failed to apply code fix" });
  }
});

// Code Analysis Runs endpoints
router.get('/runs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const runs = await storage.getCodeAnalysisRuns(limit);
    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: "Failed to get code analysis runs" });
  }
});

router.get('/runs/latest', async (req, res) => {
  try {
    const run = await storage.getLatestCodeAnalysisRun();
    res.json(run);
  } catch (error) {
    res.status(500).json({ message: "Failed to get latest code analysis run" });
  }
});

router.post('/start', async (req, res) => {
  try {
    const config = await storage.getFrameworkConfig();
    if (!config?.codeAnalysisEnabled) {
      return res.status(400).json({ message: "Code analysis is not enabled in configuration" });
    }

    // Create a new analysis run
    const run = await storage.createCodeAnalysisRun({
      timestamp: new Date(),
      sourceDirectories: config.sourceDirectories || [],
      filesAnalyzed: 0,
      issuesFound: 0,
      fixesApplied: 0,
      status: "running",
      duration: null,
      metadata: {
        triggeredBy: "manual",
        confidenceThreshold: config.confidenceThreshold || 70
      }
    });

    res.json({ message: "Code analysis started", runId: run.id, run });
  } catch (error) {
    res.status(500).json({ message: "Failed to start code analysis" });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = await storage.getFrameworkConfig();
    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }
    
    const codeAnalysisConfig = {
      enabled: config.codeAnalysisEnabled || false,
      sourceDirectories: config.sourceDirectories || [],
      autoFix: config.autoFixEnabled || false,
      confidenceThreshold: (config.confidenceThreshold || 70) / 100,
      backupDirectory: config.backupDirectory || "./backups"
    };
    
    res.json(codeAnalysisConfig);
  } catch (error) {
    res.status(500).json({ message: "Failed to get code analysis configuration" });
  }
});

export { router as codeAnalysisRoutes };