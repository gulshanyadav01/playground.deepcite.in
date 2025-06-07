export interface MetricData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PerformanceMetrics {
  responseTime: {
    current: number;
    p50: number;
    p95: number;
    p99: number;
    trend: MetricData[];
  };
  throughput: {
    current: number;
    peak: number;
    trend: MetricData[];
  };
  errorRate: {
    current: number;
    trend: MetricData[];
  };
  cost: {
    current: number;
    daily: number;
    monthly: number;
    trend: MetricData[];
  };
  systemHealth: {
    cpu: number;
    memory: number;
    gpu: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

class MonitoringService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate the connection
      console.log('Connecting to monitoring WebSocket...');
      
      // Simulate connection success
      setTimeout(() => {
        this.onOpen();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to connect to monitoring service:', error);
      this.scheduleReconnect();
    }
  }

  private onOpen() {
    console.log('Connected to monitoring service');
    this.reconnectAttempts = 0;
    this.startSimulation();
  }

  private onMessage(data: any) {
    const event = JSON.parse(data);
    this.emit(event.type, event.data);
  }

  private onClose() {
    console.log('Monitoring connection closed');
    this.scheduleReconnect();
  }

  private onError(error: any) {
    console.error('Monitoring connection error:', error);
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Simulate real-time data for demo purposes
  private startSimulation() {
    const generateMetrics = (): PerformanceMetrics => {
      const now = Date.now();
      const baseResponseTime = 85 + Math.random() * 30;
      const baseThroughput = 1200 + Math.random() * 400;
      const baseErrorRate = 0.1 + Math.random() * 0.3;
      const baseCost = 24 + Math.random() * 8;

      return {
        responseTime: {
          current: Math.round(baseResponseTime),
          p50: Math.round(baseResponseTime * 0.8),
          p95: Math.round(baseResponseTime * 1.5),
          p99: Math.round(baseResponseTime * 2.2),
          trend: this.generateTrendData(baseResponseTime, 20),
        },
        throughput: {
          current: Math.round(baseThroughput),
          peak: Math.round(baseThroughput * 1.3),
          trend: this.generateTrendData(baseThroughput, 20),
        },
        errorRate: {
          current: Number(baseErrorRate.toFixed(2)),
          trend: this.generateTrendData(baseErrorRate, 20),
        },
        cost: {
          current: Number(baseCost.toFixed(2)),
          daily: Number((baseCost * 24).toFixed(2)),
          monthly: Number((baseCost * 24 * 30).toFixed(2)),
          trend: this.generateTrendData(baseCost, 20),
        },
        systemHealth: {
          cpu: Math.round(45 + Math.random() * 30),
          memory: Math.round(60 + Math.random() * 25),
          gpu: Math.round(70 + Math.random() * 20),
          status: Math.random() > 0.8 ? 'warning' : 'healthy',
        },
      };
    };

    // Emit initial data
    this.emit('metrics', generateMetrics());

    // Update metrics every 2 seconds
    setInterval(() => {
      this.emit('metrics', generateMetrics());
    }, 2000);

    // Simulate alerts
    this.simulateAlerts();
  }

  private generateTrendData(baseValue: number, points: number): MetricData[] {
    const data: MetricData[] = [];
    const now = Date.now();
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = now - (i * 30000); // 30 seconds apart
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      const value = baseValue * (1 + variation);
      data.push({
        timestamp,
        value: Number(value.toFixed(2)),
      });
    }
    
    return data;
  }

  private simulateAlerts() {
    const alertTypes = ['info', 'warning', 'error', 'success'] as const;
    const alertMessages = [
      { type: 'success', title: 'Model Deployed', message: 'Mistral-7B-custom successfully deployed to production' },
      { type: 'warning', title: 'High Response Time', message: 'Average response time exceeded 150ms threshold' },
      { type: 'info', title: 'Training Complete', message: 'Fine-tuning job #1234 completed successfully' },
      { type: 'error', title: 'API Error', message: 'Increased error rate detected in model inference' },
      { type: 'info', title: 'Cost Alert', message: 'Monthly usage approaching budget limit' },
    ];

    // Generate random alerts
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every interval
        const randomAlert = alertMessages[Math.floor(Math.random() * alertMessages.length)];
        const alert: Alert = {
          id: `alert-${Date.now()}`,
          type: randomAlert.type as 'info' | 'warning' | 'error' | 'success',
          title: randomAlert.title,
          message: randomAlert.message,
          timestamp: Date.now(),
          isRead: false,
        };
        this.emit('alert', alert);
      }
    }, 10000); // Check every 10 seconds
  }

  public async getHistoricalMetrics(timeRange: '1h' | '6h' | '24h' | '7d'): Promise<PerformanceMetrics> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock historical data
    const points = timeRange === '1h' ? 60 : timeRange === '6h' ? 72 : timeRange === '24h' ? 96 : 168;
    const baseResponseTime = 92;
    const baseThroughput = 1350;
    const baseErrorRate = 0.15;
    const baseCost = 28;

    return {
      responseTime: {
        current: baseResponseTime,
        p50: Math.round(baseResponseTime * 0.8),
        p95: Math.round(baseResponseTime * 1.5),
        p99: Math.round(baseResponseTime * 2.2),
        trend: this.generateTrendData(baseResponseTime, points),
      },
      throughput: {
        current: baseThroughput,
        peak: Math.round(baseThroughput * 1.3),
        trend: this.generateTrendData(baseThroughput, points),
      },
      errorRate: {
        current: baseErrorRate,
        trend: this.generateTrendData(baseErrorRate, points),
      },
      cost: {
        current: baseCost,
        daily: baseCost * 24,
        monthly: baseCost * 24 * 30,
        trend: this.generateTrendData(baseCost, points),
      },
      systemHealth: {
        cpu: 52,
        memory: 68,
        gpu: 75,
        status: 'healthy',
      },
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const monitoringService = new MonitoringService();
