import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

import { FolderOpen, Folder, Plus, MessageSquare, Clock, ChevronDown, ChevronRight, Edit3, Check, X, Trash2, Settings, FolderPlus, RefreshCw, Sparkles, Edit2, Star, Search, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import ClaudeLogo from './ClaudeLogo';
import CursorLogo from './CursorLogo.jsx';
import TaskIndicator from './TaskIndicator';
import ProjectCreationWizard from './ProjectCreationWizard';
import { api } from '../utils/api';
import { useTaskMaster } from '../contexts/TaskMasterContext';
import { useTasksSettings } from '../contexts/TasksSettingsContext';

// Move formatTimeAgo outside component to avoid recreation on every render
const formatTimeAgo = (dateString, currentTime) => {
  const date = new Date(dateString);
  const now = currentTime;

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }

  const diffInMs = now - date;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInSeconds < 60) return 'Just now';
  if (diffInMinutes === 1) return '1 min ago';
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return date.toLocaleDateString();
};

// Extracted ProjectItem component
const ProjectItem = ({
  project,
  isExpanded,
  isSelected,
  isStarred,
  editingProject,
  editingName,
  setEditingName,
  saveProjectName,
  cancelEditing,
  startEditing,
  toggleProject,
  toggleStarProject,
  deleteProject,
  handleProjectSelect,
  handleSessionClick,
  handleTouchClick,
  getAllSessions,
  initialSessionsLoaded,
  loadingSessions,
  loadMoreSessions,
  onNewSession,
  deleteSession,
  editingSession,
  setEditingSession,
  editingSessionName,
  setEditingSessionName,
  currentTime,
  selectedSession,
  tasksEnabled,
  mcpServerStatus
}) => {
  const sessions = getAllSessions(project);
  const hasSessions = sessions.length > 0;
  const isEditing = editingProject === project.name;

  // Calculate task status for this project
  const taskStatus = project.taskmaster?.metadata;
  const hasActiveTasks = taskStatus && (taskStatus.inProgress > 0 || taskStatus.pending > 0);

  return (
    <div className="mb-1">
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors relative",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-foreground"
        )}
        onClick={() => handleProjectSelect(project)}
      >
        {/* Expand/Collapse Button */}
        <button
          className={cn(
            "p-0.5 rounded-sm hover:bg-background/50 transition-colors",
            !hasSessions && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleProject(project.name);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        {/* Project Icon */}
        <div className="relative">
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500" />
          )}
          {/* Task Status Indicator Dot */}
          {tasksEnabled && hasActiveTasks && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-card" title={`${taskStatus.inProgress} active tasks`} />
          )}
        </div>

        {/* Project Name (Editable) */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-6 text-xs py-0 px-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveProjectName(project.name);
                  if (e.key === 'Escape') cancelEditing();
                }}
              />
              <button onClick={() => saveProjectName(project.name)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={cancelEditing} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="truncate text-sm font-medium">
              {project.displayName}
            </span>
          )}

          {/* Task Progress Badge */}
          {tasksEnabled && taskStatus && (
            <div className="hidden group-hover:flex items-center gap-1 ml-auto mr-2">
              <TaskIndicator
                status={taskStatus}
                mini={true}
                mcpStatus={project.taskmaster?.status === 'configured' ? 'connected' : 'disconnected'}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          (isExpanded || isSelected) && "opacity-100"
        )}>
          {/* Star Button */}
          <button
            className={cn(
              "p-1 rounded hover:bg-background/50 transition-colors",
              isStarred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleStarProject(project.name);
            }}
            title={isStarred ? "Remove from favorites" : "Add to favorites"}
          >
            <Star className={cn("w-3.5 h-3.5", isStarred && "fill-current")} />
          </button>

          {/* Edit Name Button */}
          <button
            className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              startEditing(project);
            }}
            title="Rename project"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* New Session Button */}
          <button
            className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onNewSession(project);
            }}
            title="New session"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Delete Project Button (only if empty) */}
          {!hasSessions && (
            <button
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                deleteProject(project.name);
              }}
              title="Delete empty project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {isExpanded && (
        <div className="ml-4 pl-2 border-l border-border/50 mt-1 space-y-0.5">
          {sessions.map(session => (
            <div
              key={session.id}
              className={cn(
                "group/session flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors relative",
                selectedSession?.id === session.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleSessionClick(session, project.name)}
            >
              {/* Session Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {session.__provider === 'cursor' ? (
                  <CursorLogo className="w-3 h-3 opacity-70" />
                ) : (
                  <MessageSquare className="w-3 h-3 opacity-70" />
                )}
              </div>

              {/* Session Info */}
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">
                  {session.summary || 'New Session'}
                </div>
                <div className="flex items-center gap-2 text-[10px] opacity-70">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimeAgo(session.__provider === 'cursor' ? session.createdAt : session.lastActivity, currentTime)}
                  </span>
                  <span>•</span>
                  <span>{session.messageCount} msgs</span>
                </div>
              </div>

              {/* Delete Session Button */}
              <button
                className="opacity-0 group-hover/session:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(project.name, session.id);
                }}
                title="Delete session"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Load More Button */}
          {project.sessionMeta?.hasMore !== false && (
            <button
              className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                loadMoreSessions(project);
              }}
              disabled={loadingSessions[project.name]}
            >
              {loadingSessions[project.name] ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Load more sessions
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

function Sidebar({
  projects,
  selectedProject,
  selectedSession,
  onProjectSelect,
  onSessionSelect,
  onNewSession,
  onSessionDelete,
  onProjectDelete,
  isLoading,
  onRefresh,
  onShowSettings,
  updateAvailable,
  latestVersion,
  currentVersion,
  releaseInfo,
  onShowVersionModal,
  isPWA,
  isMobile,
  onToggleSidebar
}) {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [editingProject, setEditingProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [loadingSessions, setLoadingSessions] = useState({});
  const [additionalSessions, setAdditionalSessions] = useState({});
  const [initialSessionsLoaded, setInitialSessionsLoaded] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [projectSortOrder, setProjectSortOrder] = useState('name');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // TaskMaster context
  const { setCurrentProject, mcpServerStatus } = useTaskMaster();
  const { tasksEnabled } = useTasksSettings();


  // Starred projects state - now synced with server
  const [starredProjects, setStarredProjects] = useState(new Set());

  // Sync starred projects from server data
  useEffect(() => {
    if (projects) {
      const newStarred = new Set();
      projects.forEach(project => {
        if (project.isFavorite) {
          newStarred.add(project.name);
        }
      });
      setStarredProjects(newStarred);
    }
  }, [projects]);

  // Touch handler to prevent double-tap issues on iPad (only for buttons, not scroll areas)
  const handleTouchClick = (callback) => {
    return (e) => {
      // Only prevent default for buttons/clickable elements, not scrollable areas
      if (e.target.closest('.overflow-y-auto') || e.target.closest('[data-scroll-container]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      callback();
    };
  };

  // Auto-update timestamps every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(timer);
  }, []);

  // Clear additional sessions when projects list changes (e.g., after refresh)
  useEffect(() => {
    setAdditionalSessions({});
    setInitialSessionsLoaded(new Set());
  }, [projects]);

  // Auto-expand project folder when a session is selected
  useEffect(() => {
    if (selectedSession && selectedProject) {
      setExpandedProjects(prev => new Set([...prev, selectedProject.name]));
    }
  }, [selectedSession, selectedProject]);

  // Mark sessions as loaded when projects come in
  useEffect(() => {
    if (projects.length > 0 && !isLoading) {
      const newLoaded = new Set();
      projects.forEach(project => {
        if (project.sessions && project.sessions.length >= 0) {
          newLoaded.add(project.name);
        }
      });
      setInitialSessionsLoaded(newLoaded);
    }
  }, [projects, isLoading]);

  // Load project sort order from settings
  useEffect(() => {
    const loadSortOrder = () => {
      try {
        const savedSettings = localStorage.getItem('claude-settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setProjectSortOrder(settings.projectSortOrder || 'name');
        }
      } catch (error) {
        console.error('Error loading sort order:', error);
      }
    };

    // Load initially
    loadSortOrder();

    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'claude-settings') {
        loadSortOrder();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically when component is focused (for same-tab changes)
    const checkInterval = setInterval(() => {
      if (document.hasFocus()) {
        loadSortOrder();
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, []);


  const toggleProject = (projectName) => {
    const newExpanded = new Set();
    // If clicking the already-expanded project, collapse it (newExpanded stays empty)
    // If clicking a different project, expand only that one
    if (!expandedProjects.has(projectName)) {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  // Wrapper to attach project context when session is clicked
  const handleSessionClick = (session, projectName) => {
    onSessionSelect({ ...session, __projectName: projectName });
  };

  // Starred projects utility functions
  const toggleStarProject = async (projectName) => {
    const isCurrentlyStarred = starredProjects.has(projectName);
    const newStarred = new Set(starredProjects);

    if (isCurrentlyStarred) {
      newStarred.delete(projectName);
    } else {
      newStarred.add(projectName);
    }
    setStarredProjects(newStarred);

    try {
      await api.toggleFavorite(projectName, !isCurrentlyStarred);
      // Refresh projects to ensure sync
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setStarredProjects(prev => {
        const reverted = new Set(prev);
        if (isCurrentlyStarred) reverted.add(projectName);
        else reverted.delete(projectName);
        return reverted;
      });
    }
  };

  const isProjectStarred = (projectName) => {
    return starredProjects.has(projectName);
  };

  // Helper function to get all sessions for a project (initial + additional)
  const getAllSessions = (project) => {
    // Combine Claude and Cursor sessions; Sidebar will display icon per row
    const claudeSessions = [...(project.sessions || []), ...(additionalSessions[project.name] || [])].map(s => ({ ...s, __provider: 'claude' }));
    const cursorSessions = (project.cursorSessions || []).map(s => ({ ...s, __provider: 'cursor' }));
    // Sort by most recent activity/date
    const normalizeDate = (s) => new Date(s.__provider === 'cursor' ? s.createdAt : s.lastActivity);
    return [...claudeSessions, ...cursorSessions].sort((a, b) => normalizeDate(b) - normalizeDate(a));
  };

  // Helper function to get the last activity date for a project
  const getProjectLastActivity = (project) => {
    const allSessions = getAllSessions(project);
    if (allSessions.length === 0) {
      return new Date(0); // Return epoch date for projects with no sessions
    }

    // Find the most recent session activity
    const mostRecentDate = allSessions.reduce((latest, session) => {
      const sessionDate = new Date(session.lastActivity);
      return sessionDate > latest ? sessionDate : latest;
    }, new Date(0));

    return mostRecentDate;
  };

  // Sort projects based on selected order
  const sortProjects = (projectsToSort) => {
    return [...projectsToSort].sort((a, b) => {
      if (projectSortOrder === 'date') {
        // Sort by most recent activity (descending)
        return getProjectLastActivity(b) - getProjectLastActivity(a);
      } else {
        // Sort by display name (user-defined) or fallback to name (ascending)
        const nameA = a.displayName || a.name;
        const nameB = b.displayName || b.name;
        return nameA.localeCompare(nameB);
      }
    });
  };

  // Split projects into favorites and others
  const favoriteProjects = sortProjects(projects.filter(p => isProjectStarred(p.name)));
  const otherProjects = sortProjects(projects.filter(p => !isProjectStarred(p.name)));

  // State for toggling visibility of other projects
  const [showOtherProjects, setShowOtherProjects] = useState(false);

  const startEditing = (project) => {
    setEditingProject(project.name);
    setEditingName(project.displayName);
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditingName('');
  };

  const saveProjectName = async (projectName) => {
    try {
      const response = await api.renameProject(projectName, editingName);

      if (response.ok) {
        // Refresh projects to get updated data
        if (window.refreshProjects) {
          window.refreshProjects();
        } else {
          window.location.reload();
        }
      } else {
        console.error('Failed to rename project');
      }
    } catch (error) {
      console.error('Error renaming project:', error);
    }

    setEditingProject(null);
    setEditingName('');
  };

  const deleteSession = async (projectName, sessionId) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('[Sidebar] Deleting session:', { projectName, sessionId });
      const response = await api.deleteSession(projectName, sessionId);
      console.log('[Sidebar] Delete response:', { ok: response.ok, status: response.status });

      if (response.ok) {
        console.log('[Sidebar] Session deleted successfully, calling callback');
        // Call parent callback if provided
        if (onSessionDelete) {
          onSessionDelete(sessionId);
        } else {
          console.warn('[Sidebar] No onSessionDelete callback provided');
        }
      } else {
        const errorText = await response.text();
        console.error('[Sidebar] Failed to delete session:', { status: response.status, error: errorText });
        alert('Failed to delete session. Please try again.');
      }
    } catch (error) {
      console.error('[Sidebar] Error deleting session:', error);
      alert('Error deleting session. Please try again.');
    }
  };

  const deleteProject = async (projectName) => {
    if (!confirm('Are you sure you want to delete this empty project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.deleteProject(projectName);

      if (response.ok) {
        // Call parent callback if provided
        if (onProjectDelete) {
          onProjectDelete(projectName);
        }
      } else {
        const error = await response.json();
        console.error('Failed to delete project');
        alert(error.error || 'Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    }
  };

  const createNewProject = async () => {
    if (!newProjectPath.trim()) {
      alert('Please enter a project path');
      return;
    }

    setCreatingProject(true);

    try {
      const response = await api.createProject(newProjectPath.trim());

      if (response.ok) {
        const result = await response.json();

        // Save the path to recent paths before clearing
        // saveToRecentPaths(newProjectPath.trim()); // Function not available in scope

        setShowNewProject(false);
        setNewProjectPath('');

        // Refresh projects to show the new one
        if (window.refreshProjects) {
          window.refreshProjects();
        } else {
          window.location.reload();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project. Please try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  const cancelNewProject = () => {
    setShowNewProject(false);
    setNewProjectPath('');
  };

  const loadMoreSessions = async (project) => {
    // Check if we can load more sessions
    const canLoadMore = project.sessionMeta?.hasMore !== false;

    if (!canLoadMore || loadingSessions[project.name]) {
      return;
    }

    setLoadingSessions(prev => ({ ...prev, [project.name]: true }));

    try {
      const currentSessionCount = (project.sessions?.length || 0) + (additionalSessions[project.name]?.length || 0);
      const response = await api.sessions(project.name, 5, currentSessionCount);

      if (response.ok) {
        const result = await response.json();

        // Store additional sessions locally
        setAdditionalSessions(prev => ({
          ...prev,
          [project.name]: [
            ...(prev[project.name] || []),
            ...result.sessions
          ]
        }));

        // Update project metadata if needed
        if (result.hasMore === false) {
          // Mark that there are no more sessions to load
          project.sessionMeta = { ...project.sessionMeta, hasMore: false };
        }
      }
    } catch (error) {
      console.error('Error loading more sessions:', error);
    } finally {
      setLoadingSessions(prev => ({ ...prev, [project.name]: false }));
    }
  };

  // Filter projects based on search input
  const filterProject = (project) => {
    if (!searchFilter.trim()) return true;

    const searchLower = searchFilter.toLowerCase();
    const displayName = (project.displayName || project.name).toLowerCase();
    const projectName = project.name.toLowerCase();

    // Search in both display name and actual project name/path
    return displayName.includes(searchLower) || projectName.includes(searchLower);
  };

  const filteredFavorites = favoriteProjects.filter(filterProject);
  const filteredOthers = otherProjects.filter(filterProject);

  // Enhanced project selection that updates both the main UI and TaskMaster context
  const handleProjectSelect = (project) => {
    // Call the original project select handler
    onProjectSelect(project);

    // Update TaskMaster context with the selected project
    setCurrentProject(project);
  };

  return (
    <>
      {/* Project Creation Wizard Modal - Rendered via Portal at document root for full-screen on mobile */}
      {showNewProject && ReactDOM.createPortal(
        <ProjectCreationWizard
          onClose={() => setShowNewProject(false)}
          onProjectCreated={(project) => {
            // Refresh projects list after creation
            if (window.refreshProjects) {
              window.refreshProjects();
            } else {
              window.location.reload();
            }
          }}
        />,
        document.body
      )}

      <div
        className="h-full flex flex-col bg-card md:select-none"
        style={isPWA && isMobile ? { paddingTop: '44px' } : {}}
      >
      {/* Header */}
      <div className="md:p-4 md:border-b md:border-border">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          {import.meta.env.VITE_IS_PLATFORM === 'true' ? (
            <a
              href="https://cloudcli.ai/dashboard"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
              title="View Environments"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Claude Code UI</h1>
                <p className="text-sm text-muted-foreground">AI coding assistant interface</p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Claude Code UI</h1>
                <p className="text-sm text-muted-foreground">AI coding assistant interface</p>
              </div>
            </div>
          )}
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0 hover:bg-accent transition-colors duration-200"
              onClick={onToggleSidebar}
              title="Hide sidebar"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          )}
        </div>

        {/* Mobile Header */}
        <div
          className="md:hidden p-3 border-b border-border"
          style={isPWA && isMobile ? { paddingTop: '16px' } : {}}
        >
          <div className="flex items-center justify-between">
            {import.meta.env.VITE_IS_PLATFORM === 'true' ? (
              <a
                href="https://cloudcli.ai/dashboard"
                className="flex items-center gap-3 active:opacity-70 transition-opacity"
                title="View Environments"
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Claude Code UI</h1>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Claude Code UI</h1>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center active:scale-95 transition-all duration-150"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await onRefresh();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-all duration-150"
                onClick={() => setShowNewProject(true)}
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter and Actions */}
      {projects.length > 0 && !isLoading && (
        <div className="px-3 md:px-4 py-2 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-0 focus:bg-background focus:ring-1 focus:ring-primary/20"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Action Buttons - Desktop only */}
          {!isMobile && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 transition-all duration-200"
                onClick={() => setShowNewProject(true)}
                title="Create new project (Ctrl+N)"
              >
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                New Project
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 px-0 hover:bg-accent transition-colors duration-200 group"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await onRefresh();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                title="Refresh projects and sessions (Ctrl+R)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-300`} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Projects List */}
      <ScrollArea className="flex-1 md:px-2 md:py-3 overflow-y-auto overscroll-contain">
        <div className="md:space-y-1 pb-safe-area-inset-bottom">
          {isLoading ? (
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">Loading projects...</h3>
              <p className="text-sm text-muted-foreground">
                Fetching your Claude projects and sessions
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <Folder className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">No projects found</h3>
              <p className="text-sm text-muted-foreground">
                Run Claude CLI in a project directory to get started
              </p>
            </div>
          ) : filteredFavorites.length === 0 && filteredOthers.length === 0 ? (
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">No matching projects</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search term
              </p>
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {filteredFavorites.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Favorites
                  </div>
                  {filteredFavorites.map(project => (
                    <ProjectItem
                      key={project.name}
                      project={project}
                      isExpanded={expandedProjects.has(project.name)}
                      isSelected={selectedProject?.name === project.name}
                      isStarred={true}
                      editingProject={editingProject}
                      editingName={editingName}
                      setEditingName={setEditingName}
                      saveProjectName={saveProjectName}
                      cancelEditing={cancelEditing}
                      startEditing={startEditing}
                      toggleProject={toggleProject}
                      toggleStarProject={toggleStarProject}
                      deleteProject={deleteProject}
                      handleProjectSelect={handleProjectSelect}
                      handleSessionClick={handleSessionClick}
                      handleTouchClick={handleTouchClick}
                      getAllSessions={getAllSessions}
                      initialSessionsLoaded={initialSessionsLoaded}
                      loadingSessions={loadingSessions}
                      loadMoreSessions={loadMoreSessions}
                      onNewSession={onNewSession}
                      deleteSession={deleteSession}
                      editingSession={editingSession}
                      setEditingSession={setEditingSession}
                      editingSessionName={editingSessionName}
                      setEditingSessionName={setEditingSessionName}
                      currentTime={currentTime}
                      selectedSession={selectedSession}
                      tasksEnabled={tasksEnabled}
                      mcpServerStatus={mcpServerStatus}
                    />
                  ))}
                </div>
              )}

              {/* Other Projects Section */}
              {filteredOthers.length > 0 && (
                <div>
                  {filteredFavorites.length > 0 ? (
                    <div
                      className="px-3 py-1 flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded-md transition-colors"
                      onClick={() => setShowOtherProjects(!showOtherProjects)}
                    >
                      {showOtherProjects ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Other Projects ({filteredOthers.length})
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                      All Projects
                    </div>
                  )}

                  {(showOtherProjects || filteredFavorites.length === 0) && filteredOthers.map(project => (
                    <ProjectItem
                      key={project.name}
                      project={project}
                      isExpanded={expandedProjects.has(project.name)}
                      isSelected={selectedProject?.name === project.name}
                      isStarred={false}
                      editingProject={editingProject}
                      editingName={editingName}
                      setEditingName={setEditingName}
                      saveProjectName={saveProjectName}
                      cancelEditing={cancelEditing}
                      startEditing={startEditing}
                      toggleProject={toggleProject}
                      toggleStarProject={toggleStarProject}
                      deleteProject={deleteProject}
                      handleProjectSelect={handleProjectSelect}
                      handleSessionClick={handleSessionClick}
                      handleTouchClick={handleTouchClick}
                      getAllSessions={getAllSessions}
                      initialSessionsLoaded={initialSessionsLoaded}
                      loadingSessions={loadingSessions}
                      loadMoreSessions={loadMoreSessions}
                      onNewSession={onNewSession}
                      deleteSession={deleteSession}
                      editingSession={editingSession}
                      setEditingSession={setEditingSession}
                      editingSessionName={editingSessionName}
                      setEditingSessionName={setEditingSessionName}
                      currentTime={currentTime}
                      selectedSession={selectedSession}
                      tasksEnabled={tasksEnabled}
                      mcpServerStatus={mcpServerStatus}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Version Update Notification */}
      {updateAvailable && (
        <div className="md:p-2 border-t border-border/50 flex-shrink-0">
          {/* Desktop Version Notification */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 p-3 h-auto font-normal text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 border border-blue-200 dark:border-blue-700 rounded-lg mb-2"
              onClick={onShowVersionModal}
            >
              <div className="relative">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {releaseInfo?.title || `Version ${latestVersion}`}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Update available</div>
              </div>
            </Button>
          </div>

          {/* Mobile Version Notification */}
          <div className="md:hidden p-3 pb-2">
            <button
              className="w-full h-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl flex items-center justify-start gap-3 px-4 active:scale-[0.98] transition-all duration-150"
              onClick={onShowVersionModal}
            >
              <div className="relative">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {releaseInfo?.title || `Version ${latestVersion}`}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Update available</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Settings Section */}
      <div className="md:p-2 md:border-t md:border-border flex-shrink-0">
        {/* Mobile Settings */}
        <div className="md:hidden p-4 pb-20 border-t border-border/50 space-y-2">
          {/* CodeSpeaks Link */}
          <a
            href="/codespeaks"
            className="w-full h-14 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 border border-purple-200/50 dark:border-purple-700/50 rounded-2xl flex items-center justify-start gap-4 px-4 active:scale-[0.98] transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-medium text-foreground">CodeSpeaks</span>
          </a>
          {/* Settings */}
          <button
            className="w-full h-14 bg-muted/50 hover:bg-muted/70 rounded-2xl flex items-center justify-start gap-4 px-4 active:scale-[0.98] transition-all duration-150"
            onClick={onShowSettings}
          >
            <div className="w-10 h-10 rounded-2xl bg-background/80 flex items-center justify-center">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-lg font-medium text-foreground">Settings</span>
          </button>
        </div>

        {/* Desktop Settings */}
        <div className="hidden md:block space-y-1">
          {/* CodeSpeaks Link */}
          <a
            href="/codespeaks"
            className="flex w-full justify-start gap-2 p-2 h-auto font-normal text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors duration-200 rounded-md"
          >
            <Brain className="w-3 h-3" />
            <span className="text-xs">CodeSpeaks</span>
          </a>
          {/* Settings */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 p-2 h-auto font-normal text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
            onClick={onShowSettings}
          >
            <Settings className="w-3 h-3" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}

export default Sidebar;