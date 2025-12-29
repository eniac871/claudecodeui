import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { userDb } from '../database/db.js';
import CodeSpeaksOrchestrator from '../codespeaks-agents.js';

const router = express.Router();

// Helper to validate path prevents directory traversal
const validatePath = (basePath, requestedPath) => {
  const resolved = path.resolve(basePath, requestedPath);
  if (!resolved.startsWith(path.resolve(basePath))) {
    throw new Error('Invalid path');
  }
  return resolved;
};

// Get list of projects from the configured project folder
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = userDb.getCodeSpeaksConfig(userId);

    if (!config || !config.codespeaks_project_folder) {
      return res.status(400).json({ error: 'Project folder not configured' });
    }

    const projectFolder = config.codespeaks_project_folder;

    try {
      const entries = await fs.readdir(projectFolder, { withFileTypes: true });
      const projects = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(projectFolder, entry.name)
        }));

      res.json({ success: true, projects });
    } catch (fsError) {
      console.error('Error reading project folder:', fsError);
      res.status(500).json({ error: 'Failed to read project folder. Check path and permissions.' });
    }
  } catch (error) {
    console.error('Error listing codespeaks projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ask a question about a project (Streamed response)
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectPath, question } = req.body;

    if (!projectPath || !question) {
      return res.status(400).json({ error: 'Project path and question are required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const orchestrator = new CodeSpeaksOrchestrator(userId, projectPath, question);

    // Hook up status updates to SSE
    orchestrator.setStatusCallback((event) => {
      if (event.type === 'status') {
        res.write(`data: ${JSON.stringify({ type: 'status', data: event })}\n\n`);
      } else if (event.type === 'agent_result') {
        res.write(`data: ${JSON.stringify({ type: 'agent_result', data: event })}\n\n`);
      }
    });

    // Run the agents
    const report = await orchestrator.run();

    // Send final report
    res.write(`data: ${JSON.stringify({ type: 'result', data: report })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in codespeaks ask:', error);
    // If headers haven't been sent, send JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      // Otherwise send error event
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// Get knowledge/reports for a project
router.get('/knowledge', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectName } = req.query;
    const config = userDb.getCodeSpeaksConfig(userId);

    if (!config || !config.codespeaks_knowledge_folder) {
      return res.status(400).json({ error: 'Knowledge folder not configured' });
    }

    const knowledgeBase = config.codespeaks_knowledge_folder;

    // If projectName provided, list files in that project's folder
    // Otherwise list all projects that have knowledge

    if (projectName) {
      const projectDir = path.join(knowledgeBase, projectName);
      try {
        const files = await fs.readdir(projectDir);
        const reports = [];

        for (const file of files) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(projectDir, file), 'utf-8');
            reports.push({
              filename: file,
              content,
              // Extract title from filename (timestamp-title.md)
              title: file.substring(25, file.length - 3).replace(/_/g, ' '),
              date: file.substring(0, 24)
            });
          }
        }

        // Sort by date desc
        reports.sort((a, b) => b.filename.localeCompare(a.filename));

        res.json({ success: true, reports });
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.json({ success: true, reports: [] });
        }
        throw err;
      }
    } else {
      // List projects that have knowledge folders
      // ... implementation omitted for brevity, can add if needed
      res.json({ success: true, message: 'Specify projectName to get reports' });
    }

  } catch (error) {
    console.error('Error getting knowledge:', error);
    res.status(500).json({ error: 'Failed to retrieve knowledge' });
  }
});

export default router;
