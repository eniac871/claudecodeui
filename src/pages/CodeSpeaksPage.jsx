import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';
import { Folder, FileText, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import ReactMarkdown from 'react-markdown';

function CodeSpeaksPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [question, setQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [report, setReport] = useState(null);
  const [knowledgeReports, setKnowledgeReports] = useState([]);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'knowledge'

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchKnowledge(selectedProject.name);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await authenticatedFetch('/api/codespeaks/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  const fetchKnowledge = async (projectName) => {
    try {
      const response = await authenticatedFetch(`/api/codespeaks/knowledge?projectName=${projectName}`);
      if (response.ok) {
        const data = await response.json();
        setKnowledgeReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge:', err);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!selectedProject || !question.trim()) return;

    setIsProcessing(true);
    setStatusUpdates([]);
    setReport(null);
    setError(null);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/codespeaks/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectPath: selectedProject.path,
          question: question
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6));
              if (event.type === 'status' || event.type === 'agent_result') {
                setStatusUpdates(prev => [...prev, event.data]);
              } else if (event.type === 'result') {
                setReport(event.data);
                fetchKnowledge(selectedProject.name); // Refresh knowledge list
              } else if (event.type === 'error') {
                setError(event.message);
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/10 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            Projects
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">
              No projects found. Configure your project folder in Settings.
            </div>
          ) : (
            projects.map(project => (
              <button
                key={project.path}
                onClick={() => {
                  setSelectedProject(project);
                  setReport(null);
                  setStatusUpdates([]);
                  setQuestion('');
                  setViewMode('chat');
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 flex items-center gap-2 transition-colors ${
                  selectedProject?.path === project.path
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-muted'
                }`}
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedProject?.path === project.path ? 'rotate-90' : ''}`} />
                {project.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedProject ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a project to start analyzing
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
              <h1 className="font-semibold text-lg truncate">
                {selectedProject.name}
              </h1>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'chat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('chat')}
                >
                  Analysis
                </Button>
                <Button
                  variant={viewMode === 'knowledge' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('knowledge')}
                >
                  Knowledge Base
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {viewMode === 'chat' ? (
                <div className="flex-1 flex flex-col h-full">
                  {/* Report/Status Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center gap-3 text-red-800 dark:text-red-200">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                      </div>
                    )}

                    {/* Status Updates */}
                    {statusUpdates.length > 0 && !report && (
                      <div className="space-y-4">
                        {statusUpdates.map((update, i) => (
                          <div key={i} className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              update.level === 'L1' ? 'bg-purple-100 text-purple-700' :
                              update.level === 'L2' ? 'bg-blue-100 text-blue-700' :
                              update.level === 'L3' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {update.level}
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 text-sm w-full overflow-hidden">
                              {update.type === 'agent_result' ? (
                                <div className="prose dark:prose-invert max-w-none text-xs bg-background p-2 rounded border border-border mt-1">
                                  <ReactMarkdown>{update.content}</ReactMarkdown>
                                </div>
                              ) : (
                                update.message
                              )}
                            </div>
                          </div>
                        ))}
                        {isProcessing && (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm pl-11">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Agents are working...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Final Report */}
                    {report && (
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{report}</ReactMarkdown>
                      </div>
                    )}

                    {!isProcessing && !report && statusUpdates.length === 0 && (
                      <div className="text-center text-muted-foreground py-20">
                        <h3 className="text-lg font-medium mb-2">Ask CodeSpeaks</h3>
                        <p>Ask a question about this project and our multi-agent team will analyze it.</p>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-border bg-background">
                    <form onSubmit={handleAsk} className="flex gap-2 max-w-4xl mx-auto">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question about the codebase..."
                        disabled={isProcessing}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isProcessing || !question.trim()}>
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                // Knowledge Base View
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid gap-4 max-w-4xl mx-auto">
                    {knowledgeReports.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">
                        No reports found for this project.
                      </div>
                    ) : (
                      knowledgeReports.map((item, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => {
                          setReport(item.content);
                          setViewMode('chat');
                        }}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-lg flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              {item.title}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {new Date(item.date).toLocaleDateString()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.content.substring(0, 200)}...
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CodeSpeaksPage;
