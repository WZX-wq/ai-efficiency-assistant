import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Server,
  Table2,
  Columns,
  Play,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  FileJson,
  FileSpreadsheet,
  LayoutGrid,
  Code2,
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  History,
  Copy,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDatabaseStore, DatabaseType, ConnectionStatus, QueryResult } from '../store/useDatabaseStore';

// ========== Types ==========
type TabType = 'query' | 'data' | 'schema' | 'er';
type ExportFormat = 'csv' | 'json';

interface ConnectionFormData {
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// ========== Constants ==========
const DATABASE_TYPES: { value: DatabaseType; label: string; icon: string; defaultPort: number }[] = [
  { value: 'mysql', label: 'MySQL', icon: 'mysql', defaultPort: 3306 },
  { value: 'postgresql', label: 'PostgreSQL', icon: 'postgresql', defaultPort: 5432 },
  { value: 'sqlite', label: 'SQLite', icon: 'sqlite', defaultPort: 0 },
  { value: 'mongodb', label: 'MongoDB', icon: 'mongodb', defaultPort: 27017 },
  { value: 'redis', label: 'Redis', icon: 'redis', defaultPort: 6379 },
];

// ========== Helper Components ==========
const StatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const colors = {
    connected: 'bg-emerald-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };

  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]} ${status === 'connected' ? 'animate-pulse' : ''}`} />
  );
};

const DatabaseIcon: React.FC<{ type: DatabaseType; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  const icons: Record<DatabaseType, React.ReactNode> = {
    mysql: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.5 2C7.25 2 3 6.25 3 11.5c0 2.36.94 4.5 2.47 6.08L3 21l3.5-2.42A9.46 9.46 0 0012.5 21c5.25 0 9.5-4.25 9.5-9.5S17.75 2 12.5 2zm0 17a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"/>
      </svg>
    ),
    postgresql: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    ),
    sqlite: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
      </svg>
    ),
    mongodb: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    redis: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    ),
  };

  return <>{icons[type] || <Database className={className} />}</>;
};

// ========== Main Component ==========
const DatabaseManager: React.FC = () => {
  const { t } = useTranslation();
  const store = useDatabaseStore();

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [erZoom, setErZoom] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId?: string; tableName?: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get active connection and database
  const activeConnection = useMemo(() =>
    store.connections.find((c) => c.id === store.activeConnectionId),
    [store.connections, store.activeConnectionId]
  );

  const activeDatabase = useMemo(() =>
    store.databases.find((d) => d.id === store.activeDatabaseId),
    [store.databases, store.activeDatabaseId]
  );

  const activeTable = useMemo(() =>
    activeDatabase?.tables.find((t) => t.id === store.activeTableId),
    [activeDatabase, store.activeTableId]
  );

  // Filter connections
  const filteredConnections = useMemo(() =>
    store.connections.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.host.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [store.connections, searchTerm]
  );

  // Toggle expand/collapse
  const toggleDatabase = (dbId: string) => {
    setExpandedDatabases((prev) => {
      const next = new Set(prev);
      if (next.has(dbId)) {
        next.delete(dbId);
      } else {
        next.add(dbId);
      }
      return next;
    });
  };

  // Handle connection form submit
  const handleAddConnection = async () => {
    const id = store.addConnection(formData);
    setShowNewConnectionModal(false);
    try {
      await store.connect(id);
    } catch {
      // Connection failed, but connection is saved
    }
  };

  // Execute query
  const handleExecuteQuery = async () => {
    if (!activeConnection || !query.trim()) return;

    setIsExecuting(true);
    try {
      const result = await store.executeQuery(activeConnection.id, query);
      setQueryResult(result);
    } catch (error) {
      console.error('Query execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Export table
  const handleExport = (format: ExportFormat) => {
    if (!activeConnection || !activeDatabase || !activeTable) return;

    const data = store.exportTable(activeConnection.id, activeDatabase.id, activeTable.id, format);
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTable.name}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Table data operations
  const handleEditRow = (index: number, row: Record<string, unknown>) => {
    setEditingRow(index);
    setEditData({ ...row });
  };

  const handleSaveRow = () => {
    if (activeConnection && activeDatabase && activeTable && editingRow !== null) {
      store.updateTableRow(activeConnection.id, activeDatabase.id, activeTable.id, editingRow, editData);
      setEditingRow(null);
      setEditData({});
    }
  };

  const handleDeleteRow = (index: number) => {
    if (activeConnection && activeDatabase && activeTable) {
      store.deleteTableRow(activeConnection.id, activeDatabase.id, activeTable.id, index);
    }
  };

  const handleAddRow = () => {
    if (activeConnection && activeDatabase && activeTable) {
      const newRow: Record<string, unknown> = {};
      activeTable.columns.forEach((col) => {
        if (!col.primary && !col.autoIncrement) {
          newRow[col.name] = col.default || '';
        }
      });
      store.addTableRow(activeConnection.id, activeDatabase.id, activeTable.id, newRow);
    }
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, tableId: string, tableName: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tableId, tableName });
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Get paginated table data
  const paginatedData = useMemo(() => {
    if (!activeTable?.data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return activeTable.data.slice(start, start + itemsPerPage);
  }, [activeTable, currentPage]);

  const totalPages = Math.ceil((activeTable?.data?.length || 0) / itemsPerPage);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar */}
      <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-600" />
              {t('databaseManager.title')}
            </h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.search')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Connection List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredConnections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('databaseManager.noConnections')}</p>
            </div>
          ) : (
            filteredConnections.map((conn) => (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-2 rounded-lg border ${store.activeConnectionId === conn.id
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
              >
                {/* Connection Header */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => store.setActiveConnection(conn.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DatabaseIcon type={conn.type} className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {conn.name}
                      </span>
                    </div>
                    <StatusIndicator status={conn.status} />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {conn.host}:{conn.port}
                  </div>
                </div>

                {/* Database Tree */}
                <AnimatePresence>
                  {store.activeConnectionId === conn.id && conn.status === 'connected' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {store.databases
                        .filter((d) => d.connectionId === conn.id)
                        .map((db) => (
                          <div key={db.id} className="ml-2">
                            {/* Database */}
                            <div
                              className="flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              onClick={() => toggleDatabase(db.id)}
                            >
                              {expandedDatabases.has(db.id) ? (
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                              )}
                              <Database className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {db.name}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">{db.size}</span>
                            </div>

                            {/* Tables */}
                            <AnimatePresence>
                              {expandedDatabases.has(db.id) && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="ml-4 overflow-hidden"
                                >
                                  {db.tables.map((table) => (
                                    <div key={table.id}>
                                      <div
                                        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${store.activeTableId === table.id ? 'bg-cyan-100 dark:bg-cyan-900/30' : ''
                                          }`}
                                        onClick={() => {
                                          store.setActiveDatabase(db.id);
                                          store.setActiveTable(table.id);
                                          setActiveTab('data');
                                        }}
                                        onContextMenu={(e) => handleContextMenu(e, table.id, table.name)}
                                      >
                                        <Table2 className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {table.name}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-auto">
                                          {table.rowCount}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Connection Actions */}
                {store.activeConnectionId === conn.id && (
                  <div className="px-3 pb-2 flex gap-1">
                    {conn.status === 'connected' ? (
                      <button
                        onClick={() => store.disconnect(conn.id)}
                        className="flex-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        {t('databaseManager.disconnect')}
                      </button>
                    ) : (
                      <button
                        onClick={() => store.connect(conn.id)}
                        className="flex-1 px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        {t('databaseManager.connect')}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => setShowNewConnectionModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-lg hover:from-cyan-700 hover:to-blue-800 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('databaseManager.newConnection')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => activeConnection && store.refreshDatabases(activeConnection.id)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('databaseManager.refresh')}
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <Code2 className="w-3.5 h-3.5" />
              {t('databaseManager.query')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {activeConnection ? (
              <>
                <div className="flex items-center gap-2">
                  <DatabaseIcon type={activeConnection.type} className="w-5 h-5 text-cyan-600" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {activeConnection.name}
                  </span>
                  <StatusIndicator status={activeConnection.status} />
                </div>
                {activeDatabase && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-1">
                      <Database className="w-4 h-4 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">{activeDatabase.name}</span>
                    </div>
                  </>
                )}
                {activeTable && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-1">
                      <Table2 className="w-4 h-4 text-amber-500" />
                      <span className="text-gray-700 dark:text-gray-300">{activeTable.name}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-500">{t('databaseManager.noConnections')}</span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {[
              { key: 'query' as TabType, label: t('databaseManager.query'), icon: Code2 },
              { key: 'data' as TabType, label: t('databaseManager.tableData'), icon: LayoutGrid },
              { key: 'schema' as TabType, label: t('databaseManager.schema'), icon: Columns },
              { key: 'er' as TabType, label: t('databaseManager.erDiagram'), icon: Network },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                  ? 'bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Query Tab */}
          {activeTab === 'query' && (
            <div className="h-full flex flex-col">
              {/* SQL Editor */}
              <div className="flex-1 p-4">
                <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      SQL Editor
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <History className="w-3.5 h-3.5" />
                        {t('databaseManager.queryHistory')}
                      </button>
                      <button
                        onClick={handleExecuteQuery}
                        disabled={isExecuting || !activeConnection || activeConnection.status !== 'connected'}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-xs font-medium rounded hover:from-cyan-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isExecuting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {t('databaseManager.execute')}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
                      placeholder="SELECT * FROM table_name WHERE condition;"
                      spellCheck={false}
                    />
                    {/* Query History Sidebar */}
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 250, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          className="border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden"
                        >
                          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {t('databaseManager.queryHistory')}
                            </span>
                            <button
                              onClick={() => store.clearHistory()}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                          <div className="overflow-y-auto h-[calc(100%-40px)]">
                            {store.queryHistory.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setQuery(item.query)}
                                className="p-2 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <div className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                                  {item.query}
                                </div>
                                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                                  <span>{item.duration.toFixed(0)}ms</span>
                                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="h-1/2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('databaseManager.results')}
                  </span>
                  <div className="flex items-center gap-2">
                    {queryResult && (
                      <>
                        <span className="text-xs text-gray-500">
                          {queryResult.rowCount} {t('databaseManager.rowsAffected')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {queryResult.duration.toFixed(0)}ms
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      JSON
                    </button>
                  </div>
                </div>
                <div className="overflow-auto h-[calc(100%-48px)]">
                  {queryResult ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          {queryResult.columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {queryResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            {queryResult.columns.map((col) => (
                              <td
                                key={col}
                                className="px-4 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap"
                              >
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      {t('databaseManager.noResults')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Table Data Tab */}
          {activeTab === 'data' && activeTable && (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddRow}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t('databaseManager.addRow')}
                  </button>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('databaseManager.search')}
                      className="pl-7 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('databaseManager.export')}
                  </button>
                </div>
              </div>

              {/* Data Grid */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 w-10"></th>
                      {activeTable.columns.map((col) => (
                        <th
                          key={col.name}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-1">
                            {col.name}
                            {col.primary && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1 rounded">
                                PK
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-normal">{col.type}</div>
                        </th>
                      ))}
                      <th className="px-4 py-2 w-20">{t('databaseManager.edit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {paginatedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 py-2 text-center text-xs text-gray-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        {activeTable.columns.map((col) => (
                          <td key={col.name} className="px-4 py-2">
                            {editingRow === idx ? (
                              <input
                                type="text"
                                value={String(editData[col.name] ?? '')}
                                onChange={(e) =>
                                  setEditData({ ...editData, [col.name]: e.target.value })
                                }
                                className="w-full px-2 py-1 text-sm border border-cyan-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            ) : (
                              <span className="text-gray-900 dark:text-gray-100">
                                {String(row[col.name] ?? '')}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            {editingRow === idx ? (
                              <>
                                <button
                                  onClick={handleSaveRow}
                                  className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingRow(null)}
                                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditRow(idx, row)}
                                  className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(idx)}
                                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('databaseManager.pagination.page')} {currentPage} {t('databaseManager.pagination.of')} {totalPages || 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('databaseManager.pagination.prev')}
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
                    disabled={currentPage === (totalPages || 1)}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('databaseManager.pagination.next')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schema Tab */}
          {activeTab === 'schema' && activeTable && (
            <div className="h-full overflow-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Table Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {activeTable.name}
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('databaseManager.rowsAffected')}:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{activeTable.rowCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('databaseManager.columns')}:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{activeTable.columns.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('common.size')}:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{activeTable.size}</span>
                    </div>
                  </div>
                </div>

                {/* Columns */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('databaseManager.columns')}
                    </h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('databaseManager.columns')}</th>
                        <th className="px-4 py-2 text-left">{t('databaseManager.databaseType')}</th>
                        <th className="px-4 py-2 text-left">Nullable</th>
                        <th className="px-4 py-2 text-left">Default</th>
                        <th className="px-4 py-2 text-left">Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {activeTable.columns.map((col) => (
                        <tr key={col.name}>
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                            {col.name}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{col.type}</td>
                          <td className="px-4 py-2">
                            {col.nullable ? (
                              <span className="text-emerald-600">YES</span>
                            ) : (
                              <span className="text-red-600">NO</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {col.default || '-'}
                          </td>
                          <td className="px-4 py-2">
                            {col.primary && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                PRI
                              </span>
                            )}
                            {col.autoIncrement && (
                              <span className="ml-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                AI
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ER Diagram Tab */}
          {activeTab === 'er' && activeDatabase && (
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ER {t('databaseManager.schema')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setErZoom((z) => Math.max(0.5, z - 0.1))}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-center">
                    {Math.round(erZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setErZoom((z) => Math.min(2, z + 0.1))}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setErZoom(1)}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Diagram Canvas */}
              <div className="flex-1 overflow-auto p-8">
                <div
                  className="relative min-w-[800px] min-h-[600px]"
                  style={{ transform: `scale(${erZoom})`, transformOrigin: 'top left' }}
                >
                  {/* Tables */}
                  {activeDatabase.tables.map((table, index) => {
                    const row = Math.floor(index / 3);
                    const col = index % 3;
                    const x = col * 280 + 50;
                    const y = row * 200 + 50;

                    return (
                      <motion.div
                        key={table.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="absolute bg-white dark:bg-gray-800 rounded-lg border-2 border-cyan-500 shadow-lg w-64"
                        style={{ left: x, top: y }}
                      >
                        {/* Table Header */}
                        <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-t-md">
                          <div className="flex items-center gap-2">
                            <Table2 className="w-4 h-4" />
                            <span className="font-medium text-sm">{table.name}</span>
                          </div>
                        </div>

                        {/* Columns */}
                        <div className="p-2">
                          {table.columns.slice(0, 5).map((col) => (
                            <div
                              key={col.name}
                              className="flex items-center justify-between py-1 text-xs"
                            >
                              <div className="flex items-center gap-1">
                                {col.primary && (
                                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                                )}
                                <span className="text-gray-700 dark:text-gray-300">{col.name}</span>
                              </div>
                              <span className="text-gray-400">{col.type}</span>
                            </div>
                          ))}
                          {table.columns.length > 5 && (
                            <div className="text-xs text-gray-400 text-center py-1">
                              +{table.columns.length - 5} more
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Relationship Lines (simplified) */}
                  <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                    {activeDatabase.tables.length > 1 && (
                      <>
                        <line
                          x1="190"
                          y1="100"
                          x2="330"
                          y2="100"
                          stroke="#06b6d4"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                        <line
                          x1="190"
                          y1="300"
                          x2="330"
                          y2="250"
                          stroke="#06b6d4"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel - Query Stats */}
        {activeTab === 'query' && queryResult && (
          <div className="h-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              {t('databaseManager.executionTime')}: <span className="text-cyan-600 font-medium">{queryResult.duration.toFixed(2)}ms</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {t('databaseManager.rowsAffected')}: <span className="text-cyan-600 font-medium">{queryResult.rowCount}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Status: <span className="text-emerald-600 font-medium">OK</span>
            </span>
          </div>
        )}
      </div>

      {/* New Connection Modal */}
      <AnimatePresence>
        {showNewConnectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowNewConnectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('databaseManager.newConnection')}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('databaseManager.connections')} {t('common.name')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="My Database"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('databaseManager.databaseType')}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = e.target.value as DatabaseType;
                      const defaultPort = DATABASE_TYPES.find((t) => t.value === type)?.defaultPort || 3306;
                      setFormData({ ...formData, type, port: defaultPort });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    {DATABASE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('databaseManager.host')}
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('databaseManager.port')}
                    </label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('databaseManager.database')}
                  </label>
                  <input
                    type="text"
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="database_name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('databaseManager.username')}
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="root"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('databaseManager.password')}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewConnectionModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAddConnection}
                  disabled={!formData.name || !formData.host}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-lg hover:from-cyan-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('databaseManager.connect')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setQuery(`SELECT * FROM ${contextMenu.tableName} LIMIT 10`);
              setActiveTab('query');
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Code2 className="w-4 h-4" />
            {t('databaseManager.query')} {t('databaseManager.tables')}
          </button>
          <button
            onClick={() => {
              handleExport('csv');
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('databaseManager.export')} CSV
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.tableName || '');
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {t('common.copy')} {t('common.name')}
          </button>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager;
