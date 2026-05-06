import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========== Types ==========

export interface Partition {
  name: string;
  mount: string;
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

export interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'sleeping' | 'zombie' | 'stopped';
  user: string;
}

export interface Service {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  autoStart: boolean;
}

export interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'service';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  acknowledged: boolean;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
    history: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    history: number[];
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    partitions: Partition[];
  };
  network: {
    upload: number;
    download: number;
    latency: number;
    history: {
      up: number[];
      down: number[];
    };
  };
  processes: Process[];
  services: Service[];
}

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '24h';

interface SystemMonitorState {
  // State
  metrics: SystemMetrics;
  alerts: Alert[];
  timeRange: TimeRange;
  isSimulating: boolean;
  systemInfo: {
    osVersion: string;
    hostname: string;
    kernel: string;
    uptime: string;
  };

  // Actions
  refreshMetrics: () => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  setTimeRange: (range: TimeRange) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  killProcess: (pid: number) => void;
  toggleService: (name: string) => void;
  restartService: (name: string) => void;
}

// ========== Mock Data Generators ==========

const HISTORY_LENGTH = 60;

const generateInitialHistory = (length: number, baseValue: number, variance: number): number[] => {
  return Array.from({ length }, () => {
    const value = baseValue + (Math.random() - 0.5) * variance;
    return Math.max(0, Math.min(100, value));
  });
};

const generateNetworkHistory = (length: number): { up: number[]; down: number[] } => {
  return {
    up: Array.from({ length }, () => Math.random() * 50 + 10),
    down: Array.from({ length }, () => Math.random() * 100 + 50),
  };
};

const processNames = [
  'nginx', 'mysql', 'redis-server', 'node', 'python3', 'dockerd',
  'systemd', 'sshd', 'postgres', 'mongodb', 'elasticsearch', 'kafka',
  'prometheus', 'grafana', 'jenkins', 'gitlab-runner', 'kubelet',
  'containerd', 'fluentd', 'consul', 'vault', 'etcd', 'haproxy',
  'memcached', 'rabbitmq', 'celery', 'uwsgi', 'gunicorn', 'supervisord',
];

const serviceNames = [
  'nginx', 'mysql', 'redis', 'docker', 'ssh', 'postgresql',
  'mongodb', 'elasticsearch', 'prometheus', 'grafana', 'jenkins',
  'gitlab', 'kubernetes', 'consul', 'vault', 'etcd', 'haproxy',
  'rabbitmq', 'memcached', 'supervisor',
];

const users = ['root', 'www-data', 'mysql', 'redis', 'app', 'system'];

const generateProcesses = (count: number): Process[] => {
  return Array.from({ length: count }, (_, i) => ({
    pid: 1000 + i * 23,
    name: processNames[Math.floor(Math.random() * processNames.length)],
    cpu: Math.random() * 30,
    memory: Math.random() * 500 + 50,
    status: Math.random() > 0.1 ? 'running' : 'sleeping',
    user: users[Math.floor(Math.random() * users.length)],
  }));
};

const generateServices = (): Service[] => {
  return serviceNames.map((name) => ({
    name,
    status: Math.random() > 0.15 ? 'running' : Math.random() > 0.5 ? 'stopped' : 'error',
    uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
    autoStart: Math.random() > 0.3,
  }));
};

const generatePartitions = (): Partition[] => [
  { name: '/', mount: '/', total: 500, used: 320, free: 180, usagePercent: 64 },
  { name: '/home', mount: '/home', total: 1000, used: 450, free: 550, usagePercent: 45 },
  { name: '/var', mount: '/var', total: 200, used: 120, free: 80, usagePercent: 60 },
  { name: '/tmp', mount: '/tmp', total: 50, used: 15, free: 35, usagePercent: 30 },
];

const generateInitialMetrics = (): SystemMetrics => ({
  cpu: {
    usage: 45,
    cores: 8,
    temperature: 55,
    history: generateInitialHistory(HISTORY_LENGTH, 45, 20),
  },
  memory: {
    total: 32,
    used: 18,
    free: 14,
    usagePercent: 56,
    history: generateInitialHistory(HISTORY_LENGTH, 56, 15),
  },
  disk: {
    total: 1750,
    used: 905,
    free: 845,
    usagePercent: 52,
    partitions: generatePartitions(),
  },
  network: {
    upload: 25,
    download: 120,
    latency: 15,
    history: generateNetworkHistory(HISTORY_LENGTH),
  },
  processes: generateProcesses(20),
  services: generateServices(),
});

const generateAlert = (_metrics: SystemMetrics): Alert | null => {
  const rand = Math.random();
  if (rand > 0.95) {
    const types: Alert['type'][] = ['cpu', 'memory', 'disk', 'network', 'service'];
    const type = types[Math.floor(Math.random() * types.length)];
    const severities: Alert['severity'][] = ['info', 'warning', 'critical'];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const messages: Record<Alert['type'], string[]> = {
      cpu: ['CPU usage spike detected', 'High CPU temperature', 'CPU throttling active'],
      memory: ['Memory usage above 80%', 'Low memory warning', 'Memory leak detected'],
      disk: ['Disk space running low', 'High disk I/O', 'Disk error detected'],
      network: ['High network latency', 'Packet loss detected', 'Network congestion'],
      service: ['Service stopped unexpectedly', 'Service health check failed', 'Service restart required'],
    };

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: messages[type][Math.floor(Math.random() * messages[type].length)],
      severity,
      timestamp: Date.now(),
      acknowledged: false,
    };
  }
  return null;
};

// ========== Store ==========

let simulationInterval: ReturnType<typeof setInterval> | null = null;

export const useSystemMonitorStore = create<SystemMonitorState>()(
  persist(
    (set, get) => ({
      metrics: generateInitialMetrics(),
      alerts: [],
      timeRange: '5m',
      isSimulating: false,
      systemInfo: {
        osVersion: 'Ubuntu 22.04.3 LTS',
        hostname: 'ai-assistant-server-01',
        kernel: '5.15.0-91-generic',
        uptime: '15d 7h 32m',
      },

      refreshMetrics: () => {
        set((state) => {
          const newCpuUsage = Math.max(5, Math.min(95, state.metrics.cpu.usage + (Math.random() - 0.5) * 10));
          const newCpuTemp = Math.max(40, Math.min(85, state.metrics.cpu.temperature + (Math.random() - 0.5) * 3));
          const newMemUsage = Math.max(20, Math.min(90, state.metrics.memory.usagePercent + (Math.random() - 0.5) * 5));
          const newMemUsed = (state.metrics.memory.total * newMemUsage) / 100;

          const newMetrics: SystemMetrics = {
            cpu: {
              ...state.metrics.cpu,
              usage: newCpuUsage,
              temperature: newCpuTemp,
              history: [...state.metrics.cpu.history.slice(1), newCpuUsage],
            },
            memory: {
              ...state.metrics.memory,
              used: newMemUsed,
              free: state.metrics.memory.total - newMemUsed,
              usagePercent: newMemUsage,
              history: [...state.metrics.memory.history.slice(1), newMemUsage],
            },
            disk: {
              ...state.metrics.disk,
              usagePercent: state.metrics.disk.usagePercent + (Math.random() - 0.5) * 0.1,
            },
            network: {
              upload: Math.max(5, Math.random() * 50 + 10),
              download: Math.max(20, Math.random() * 150 + 50),
              latency: Math.max(5, Math.min(100, state.metrics.network.latency + (Math.random() - 0.5) * 5)),
              history: {
                up: [...state.metrics.network.history.up.slice(1), Math.random() * 50 + 10],
                down: [...state.metrics.network.history.down.slice(1), Math.random() * 150 + 50],
              },
            },
            processes: state.metrics.processes.map((p) => ({
              ...p,
              cpu: Math.max(0, p.cpu + (Math.random() - 0.5) * 5),
              memory: Math.max(10, p.memory + (Math.random() - 0.5) * 20),
            })),
            services: state.metrics.services,
          };

          const newAlert = generateAlert(newMetrics);
          const newAlerts = newAlert ? [newAlert, ...state.alerts].slice(0, 50) : state.alerts;

          return { metrics: newMetrics, alerts: newAlerts };
        });
      },

      acknowledgeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, acknowledged: true } : alert
          ),
        }));
      },

      clearAlerts: () => {
        set({ alerts: [] });
      },

      setTimeRange: (range) => {
        set({ timeRange: range });
      },

      startSimulation: () => {
        if (simulationInterval) return;
        simulationInterval = setInterval(() => {
          get().refreshMetrics();
        }, 2500);
        set({ isSimulating: true });
      },

      stopSimulation: () => {
        if (simulationInterval) {
          clearInterval(simulationInterval);
          simulationInterval = null;
        }
        set({ isSimulating: false });
      },

      killProcess: (pid) => {
        set((state) => ({
          metrics: {
            ...state.metrics,
            processes: state.metrics.processes.filter((p) => p.pid !== pid),
          },
        }));
      },

      toggleService: (name) => {
        set((state) => ({
          metrics: {
            ...state.metrics,
            services: state.metrics.services.map((s) =>
              s.name === name
                ? { ...s, status: s.status === 'running' ? 'stopped' : 'running' as Service['status'] }
                : s
            ),
          },
        }));
      },

      restartService: (name) => {
        set((state) => ({
          metrics: {
            ...state.metrics,
            services: state.metrics.services.map((s) =>
              s.name === name ? { ...s, status: 'running' as const, uptime: '0d 0h 1m' } : s
            ),
          },
        }));
      },
    }),
    {
      name: 'ai-assistant-system-monitor',
      partialize: (state) => ({
        timeRange: state.timeRange,
        alerts: state.alerts,
      }),
    }
  )
);

export default useSystemMonitorStore;
