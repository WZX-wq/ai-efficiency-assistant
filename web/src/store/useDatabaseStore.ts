import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========== Types ==========
export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'redis';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  primary: boolean;
  autoIncrement: boolean;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
  size: string;
  data?: Record<string, unknown>[];
}

export interface Database {
  id: string;
  connectionId: string;
  name: string;
  tables: Table[];
  size: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  status: ConnectionStatus;
  lastConnected?: number;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  duration: number;
  rowsAffected: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
}

interface DatabaseState {
  connections: DatabaseConnection[];
  databases: Database[];
  queryHistory: QueryHistoryItem[];
  activeConnectionId: string | null;
  activeDatabaseId: string | null;
  activeTableId: string | null;
  isExecuting: boolean;
  lastQueryResult: QueryResult | null;
}

interface DatabaseActions {
  // Connection actions
  addConnection: (connection: Omit<DatabaseConnection, 'id' | 'status'>) => string;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, updates: Partial<DatabaseConnection>) => void;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => void;
  setActiveConnection: (id: string | null) => void;

  // Database actions
  setActiveDatabase: (id: string | null) => void;
  refreshDatabases: (connectionId: string) => Promise<void>;

  // Table actions
  setActiveTable: (id: string | null) => void;
  refreshTable: (connectionId: string, databaseId: string, tableId: string) => Promise<void>;

  // Query actions
  executeQuery: (connectionId: string, query: string) => Promise<QueryResult>;
  addToHistory: (item: Omit<QueryHistoryItem, 'id'>) => void;
  clearHistory: () => void;

  // Export/Import
  exportTable: (connectionId: string, databaseId: string, tableId: string, format: 'csv' | 'json') => string;
  importData: (connectionId: string, databaseId: string, tableId: string, data: string) => Promise<number>;

  // Table data operations
  updateTableRow: (connectionId: string, databaseId: string, tableId: string, rowIndex: number, data: Record<string, unknown>) => void;
  deleteTableRow: (connectionId: string, databaseId: string, tableId: string, rowIndex: number) => void;
  addTableRow: (connectionId: string, databaseId: string, tableId: string, data: Record<string, unknown>) => void;
}

// ========== Helper Functions ==========
const generateId = () => Math.random().toString(36).substring(2, 15);

// ========== Mock Data Generators ==========
const createMockColumns = (tableName: string): Column[] => {
  const commonColumns: Column[] = [
    { name: 'id', type: 'INT', nullable: false, primary: true, autoIncrement: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP', primary: false, autoIncrement: false },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true, primary: false, autoIncrement: false },
  ];

  const tableSpecificColumns: Record<string, Column[]> = {
    users: [
      { name: 'username', type: 'VARCHAR(50)', nullable: false, primary: false, autoIncrement: false },
      { name: 'email', type: 'VARCHAR(100)', nullable: false, primary: false, autoIncrement: false },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, primary: false, autoIncrement: false },
      { name: 'status', type: 'ENUM("active","inactive")', nullable: false, default: 'active', primary: false, autoIncrement: false },
    ],
    products: [
      { name: 'name', type: 'VARCHAR(200)', nullable: false, primary: false, autoIncrement: false },
      { name: 'description', type: 'TEXT', nullable: true, primary: false, autoIncrement: false },
      { name: 'price', type: 'DECIMAL(10,2)', nullable: false, primary: false, autoIncrement: false },
      { name: 'stock', type: 'INT', nullable: false, default: '0', primary: false, autoIncrement: false },
      { name: 'category_id', type: 'INT', nullable: true, primary: false, autoIncrement: false },
    ],
    orders: [
      { name: 'user_id', type: 'INT', nullable: false, primary: false, autoIncrement: false },
      { name: 'total_amount', type: 'DECIMAL(12,2)', nullable: false, primary: false, autoIncrement: false },
      { name: 'status', type: 'ENUM("pending","paid","shipped","delivered","cancelled")', nullable: false, default: 'pending', primary: false, autoIncrement: false },
      { name: 'order_date', type: 'DATETIME', nullable: false, primary: false, autoIncrement: false },
    ],
    categories: [
      { name: 'name', type: 'VARCHAR(100)', nullable: false, primary: false, autoIncrement: false },
      { name: 'parent_id', type: 'INT', nullable: true, primary: false, autoIncrement: false },
      { name: 'sort_order', type: 'INT', nullable: false, default: '0', primary: false, autoIncrement: false },
    ],
    order_items: [
      { name: 'order_id', type: 'INT', nullable: false, primary: false, autoIncrement: false },
      { name: 'product_id', type: 'INT', nullable: false, primary: false, autoIncrement: false },
      { name: 'quantity', type: 'INT', nullable: false, primary: false, autoIncrement: false },
      { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false, primary: false, autoIncrement: false },
    ],
    logs: [
      { name: 'level', type: 'ENUM("debug","info","warn","error")', nullable: false, primary: false, autoIncrement: false },
      { name: 'message', type: 'TEXT', nullable: false, primary: false, autoIncrement: false },
      { name: 'context', type: 'JSON', nullable: true, primary: false, autoIncrement: false },
    ],
  };

  return [...(tableSpecificColumns[tableName] || []), ...commonColumns];
};

const createMockTableData = (tableName: string, rowCount: number): Record<string, unknown>[] => {
  const data: Record<string, unknown>[] = [];
  const statuses = ['active', 'inactive', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'];
  const levels = ['debug', 'info', 'warn', 'error'];

  for (let i = 1; i <= rowCount; i++) {
    const row: Record<string, unknown> = {
      id: i,
      created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 5000000000).toISOString(),
    };

    switch (tableName) {
      case 'users':
        row.username = `user${i}`;
        row.email = `user${i}@example.com`;
        row.password_hash = `hash_${Math.random().toString(36).substring(7)}`;
        row.status = i % 10 === 0 ? 'inactive' : 'active';
        break;
      case 'products':
        row.name = `Product ${i}`;
        row.description = `Description for product ${i}`;
        row.price = (Math.random() * 1000 + 10).toFixed(2);
        row.stock = Math.floor(Math.random() * 1000);
        row.category_id = Math.floor(Math.random() * 10) + 1;
        break;
      case 'orders':
        row.user_id = Math.floor(Math.random() * 100) + 1;
        row.total_amount = (Math.random() * 5000 + 50).toFixed(2);
        row.status = statuses[Math.floor(Math.random() * statuses.length)];
        row.order_date = new Date(Date.now() - Math.random() * 10000000000).toISOString();
        break;
      case 'categories':
        row.name = `Category ${i}`;
        row.parent_id = i > 5 ? Math.floor(Math.random() * 5) + 1 : null;
        row.sort_order = i;
        break;
      case 'order_items':
        row.order_id = Math.floor(Math.random() * 200) + 1;
        row.product_id = Math.floor(Math.random() * 100) + 1;
        row.quantity = Math.floor(Math.random() * 10) + 1;
        row.unit_price = (Math.random() * 500 + 10).toFixed(2);
        break;
      case 'logs':
        row.level = levels[Math.floor(Math.random() * levels.length)];
        row.message = `Log message ${i}: ${Math.random().toString(36).substring(7)}`;
        row.context = JSON.stringify({ userId: Math.floor(Math.random() * 100), action: 'test' });
        break;
    }

    data.push(row);
  }

  return data;
};

const createMockTables = (dbName: string): Table[] => {
  const tableConfigs: Record<string, { name: string; rows: number; size: string }[]> = {
    ecommerce: [
      { name: 'users', rows: 100, size: '2.5 MB' },
      { name: 'products', rows: 500, size: '8.2 MB' },
      { name: 'orders', rows: 2000, size: '15.6 MB' },
      { name: 'categories', rows: 20, size: '128 KB' },
      { name: 'order_items', rows: 5000, size: '24.3 MB' },
    ],
    app_db: [
      { name: 'users', rows: 50, size: '1.2 MB' },
      { name: 'logs', rows: 10000, size: '45.8 MB' },
    ],
    analytics: [
      { name: 'events', rows: 50000, size: '128 MB' },
      { name: 'sessions', rows: 15000, size: '64 MB' },
    ],
  };

  const tables = tableConfigs[dbName] || tableConfigs.ecommerce;

  return tables.map((config) => ({
    id: generateId(),
    name: config.name,
    columns: createMockColumns(config.name),
    rowCount: config.rows,
    size: config.size,
    data: createMockTableData(config.name, Math.min(config.rows, 50)),
  }));
};

const createMockDatabases = (connectionId: string): Database[] => {
  const dbConfigs = [
    { name: 'ecommerce', size: '50.7 MB' },
    { name: 'app_db', size: '47.0 MB' },
    { name: 'analytics', size: '192 MB' },
  ];

  return dbConfigs.map((config) => ({
    id: generateId(),
    connectionId,
    name: config.name,
    tables: createMockTables(config.name),
    size: config.size,
  }));
};

// ========== Mock Connections ==========
const createMockConnections = (): DatabaseConnection[] => [
  {
    id: generateId(),
    name: '本地 MySQL',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'ecommerce',
    username: 'root',
    status: 'connected',
    lastConnected: Date.now(),
  },
  {
    id: generateId(),
    name: '生产 PostgreSQL',
    type: 'postgresql',
    host: 'prod.db.example.com',
    port: 5432,
    database: 'app_production',
    username: 'app_user',
    status: 'disconnected',
  },
  {
    id: generateId(),
    name: '开发 SQLite',
    type: 'sqlite',
    host: 'localhost',
    port: 0,
    database: '/data/dev.db',
    username: '',
    status: 'connected',
    lastConnected: Date.now() - 3600000,
  },
  {
    id: generateId(),
    name: 'MongoDB 集群',
    type: 'mongodb',
    host: 'mongo.cluster.example.com',
    port: 27017,
    database: 'analytics',
    username: 'admin',
    status: 'error',
  },
];

// ========== SQL Parser & Executor ==========
const parseSQL = (query: string): { type: string; table?: string; columns?: string[]; where?: string } => {
  const normalizedQuery = query.trim().toUpperCase();

  if (normalizedQuery.startsWith('SELECT')) {
    const match = normalizedQuery.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (match) {
      return {
        type: 'SELECT',
        columns: match[1].split(',').map((c) => c.trim()),
        table: match[2],
        where: match[3],
      };
    }
  } else if (normalizedQuery.startsWith('INSERT')) {
    const match = normalizedQuery.match(/INSERT\s+INTO\s+(\w+)/i);
    return { type: 'INSERT', table: match?.[1] };
  } else if (normalizedQuery.startsWith('UPDATE')) {
    const match = normalizedQuery.match(/UPDATE\s+(\w+)/i);
    return { type: 'UPDATE', table: match?.[1] };
  } else if (normalizedQuery.startsWith('DELETE')) {
    const match = normalizedQuery.match(/DELETE\s+FROM\s+(\w+)/i);
    return { type: 'DELETE', table: match?.[1] };
  } else if (normalizedQuery.startsWith('CREATE TABLE')) {
    const match = normalizedQuery.match(/CREATE\s+TABLE\s+(\w+)/i);
    return { type: 'CREATE_TABLE', table: match?.[1] };
  }

  return { type: 'UNKNOWN' };
};

// ========== Store ==========
const initialConnections = createMockConnections();
const initialDatabases: Database[] = [];

// Generate mock databases for connected connections
initialConnections.forEach((conn) => {
  if (conn.status === 'connected') {
    initialDatabases.push(...createMockDatabases(conn.id));
  }
});

export const useDatabaseStore = create<DatabaseState & DatabaseActions>()(
  persist(
    (set, get) => ({
      // Initial state
      connections: initialConnections,
      databases: initialDatabases,
      queryHistory: [],
      activeConnectionId: initialConnections[0]?.id || null,
      activeDatabaseId: null,
      activeTableId: null,
      isExecuting: false,
      lastQueryResult: null,

      // Connection actions
      addConnection: (connection) => {
        const id = generateId();
        const newConnection: DatabaseConnection = {
          ...connection,
          id,
          status: 'disconnected',
        };
        set((state) => ({
          connections: [...state.connections, newConnection],
        }));
        return id;
      },

      removeConnection: (id) => {
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          databases: state.databases.filter((d) => d.connectionId !== id),
          activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
        }));
      },

      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      connect: async (id) => {
        const connection = get().connections.find((c) => c.id === id);
        if (!connection) return;

        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const isSuccess = Math.random() > 0.1; // 90% success rate

        if (isSuccess) {
          set((state) => ({
            connections: state.connections.map((c) =>
              c.id === id
                ? { ...c, status: 'connected', lastConnected: Date.now() }
                : c
            ),
          }));

          // Generate mock databases for this connection
          const mockDatabases = createMockDatabases(id);
          set((state) => ({
            databases: [...state.databases, ...mockDatabases],
          }));
        } else {
          set((state) => ({
            connections: state.connections.map((c) =>
              c.id === id ? { ...c, status: 'error' } : c
            ),
          }));
          throw new Error('Connection failed');
        }
      },

      disconnect: (id) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, status: 'disconnected' } : c
          ),
          databases: state.databases.filter((d) => d.connectionId !== id),
          activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
          activeDatabaseId: state.activeConnectionId === id ? null : state.activeDatabaseId,
        }));
      },

      setActiveConnection: (id) => {
        set({ activeConnectionId: id, activeDatabaseId: null, activeTableId: null });
      },

      // Database actions
      setActiveDatabase: (id) => {
        set({ activeDatabaseId: id, activeTableId: null });
      },

      refreshDatabases: async (connectionId) => {
        // Simulate refresh delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockDatabases = createMockDatabases(connectionId);
        set((state) => ({
          databases: [
            ...state.databases.filter((d) => d.connectionId !== connectionId),
            ...mockDatabases,
          ],
        }));
      },

      // Table actions
      setActiveTable: (id) => {
        set({ activeTableId: id });
      },

      refreshTable: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        // In a real app, this would fetch fresh data from the database
      },

      // Query actions
      executeQuery: async (connectionId, query) => {
        set({ isExecuting: true });

        // Simulate query execution delay
        const delay = Math.random() * 500 + 100;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const parsed = parseSQL(query);
        const connection = get().connections.find((c) => c.id === connectionId);

        if (!connection || connection.status !== 'connected') {
          set({ isExecuting: false });
          throw new Error('Connection not available');
        }

        let result: QueryResult;

        // Generate mock results based on query type
        if (parsed.type === 'SELECT') {
          const columns = parsed.columns?.[0] === '*' ? ['id', 'name', 'value', 'created_at'] : parsed.columns || ['id', 'name'];
          const rowCount = Math.floor(Math.random() * 50) + 5;
          const rows: Record<string, unknown>[] = [];

          for (let i = 0; i < rowCount; i++) {
            const row: Record<string, unknown> = {};
            columns.forEach((col) => {
              if (col === 'id') row[col] = i + 1;
              else if (col === 'created_at') row[col] = new Date().toISOString();
              else if (col === 'value' || col === 'price' || col === 'amount') row[col] = (Math.random() * 1000).toFixed(2);
              else row[col] = `${col}_${i + 1}`;
            });
            rows.push(row);
          }

          result = { columns, rows, rowCount, duration: delay };
        } else if (parsed.type === 'INSERT') {
          result = { columns: [], rows: [], rowCount: 0, duration: delay };
        } else if (parsed.type === 'UPDATE') {
          result = { columns: [], rows: [], rowCount: Math.floor(Math.random() * 10) + 1, duration: delay };
        } else if (parsed.type === 'DELETE') {
          result = { columns: [], rows: [], rowCount: Math.floor(Math.random() * 5) + 1, duration: delay };
        } else {
          result = { columns: ['message'], rows: [{ message: 'Query executed successfully' }], rowCount: 1, duration: delay };
        }

        // Add to history
        get().addToHistory({
          query,
          timestamp: Date.now(),
          duration: delay,
          rowsAffected: result.rowCount,
        });

        set({ isExecuting: false, lastQueryResult: result });
        return result;
      },

      addToHistory: (item) => {
        const newItem: QueryHistoryItem = { ...item, id: generateId() };
        set((state) => ({
          queryHistory: [newItem, ...state.queryHistory.slice(0, 99)],
        }));
      },

      clearHistory: () => {
        set({ queryHistory: [] });
      },

      // Export/Import
      exportTable: (_connectionId, databaseId, tableId, format) => {
        const database = get().databases.find((d) => d.id === databaseId);
        const table = database?.tables.find((t) => t.id === tableId);

        if (!table) return '';

        if (format === 'csv') {
          const headers = table.columns.map((c) => c.name).join(',');
          const rows = table.data?.map((row) =>
            table.columns.map((c) => `"${String(row[c.name] || '').replace(/"/g, '""')}"`).join(',')
          ) || [];
          return [headers, ...rows].join('\n');
        } else {
          return JSON.stringify(table.data || [], null, 2);
        }
      },

      importData: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return 1;
      },

      // Table data operations
      updateTableRow: (_connectionId, databaseId, tableId, rowIndex, data) => {
        set((state) => ({
          databases: state.databases.map((db) => {
            if (db.id !== databaseId) return db;
            return {
              ...db,
              tables: db.tables.map((table) => {
                if (table.id !== tableId) return table;
                const newData = [...(table.data || [])];
                newData[rowIndex] = { ...newData[rowIndex], ...data };
                return { ...table, data: newData };
              }),
            };
          }),
        }));
      },

      deleteTableRow: (_connectionId, databaseId, tableId, rowIndex) => {
        set((state) => ({
          databases: state.databases.map((db) => {
            if (db.id !== databaseId) return db;
            return {
              ...db,
              tables: db.tables.map((table) => {
                if (table.id !== tableId) return table;
                const newData = [...(table.data || [])];
                newData.splice(rowIndex, 1);
                return { ...table, data: newData, rowCount: table.rowCount - 1 };
              }),
            };
          }),
        }));
      },

      addTableRow: (_connectionId, databaseId, tableId, data) => {
        set((state) => ({
          databases: state.databases.map((db) => {
            if (db.id !== databaseId) return db;
            return {
              ...db,
              tables: db.tables.map((table) => {
                if (table.id !== tableId) return table;
                const newData = [...(table.data || [])];
                newData.push({ ...data, id: newData.length + 1 });
                return { ...table, data: newData, rowCount: table.rowCount + 1 };
              }),
            };
          }),
        }));
      },
    }),
    {
      name: 'database-storage',
      partialize: (state) => ({
        connections: state.connections,
        queryHistory: state.queryHistory,
      }),
    }
  )
);
