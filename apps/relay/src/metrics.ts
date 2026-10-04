class MetricsManager {
  private totalConnections = 0;
  private activeAgents = 0;
  private activeViewers = 0;
  private messagesRelayed = 0;
  private bytesRelayed = 0;
  
  private startTime = Date.now();

  incrementConnections() { this.totalConnections++; }
  
  setAgents(count: number) { this.activeAgents = count; }
  setViewers(count: number) { this.activeViewers = count; }
  
  addMessage(bytes: number) {
    this.messagesRelayed++;
    this.bytesRelayed += bytes;
  }

  getMetrics() {
    const uptime = (Date.now() - this.startTime) / 1000;
    return {
      uptimeSeconds: uptime,
      totalConnections: this.totalConnections,
      activeAgents: this.activeAgents,
      activeViewers: this.activeViewers,
      messagesRelayed: this.messagesRelayed,
      bytesRelayed: this.bytesRelayed,
      messagesPerSec: uptime > 0 ? this.messagesRelayed / uptime : 0,
      bytesPerSec: uptime > 0 ? this.bytesRelayed / uptime : 0
    };
  }

  getMetricsText() {
    const m = this.getMetrics();
    return `
uptime_seconds ${m.uptimeSeconds.toFixed(2)}
total_connections ${m.totalConnections}
active_agents ${m.activeAgents}
active_viewers ${m.activeViewers}
messages_relayed ${m.messagesRelayed}
bytes_relayed ${m.bytesRelayed}
messages_per_sec ${m.messagesPerSec.toFixed(2)}
bytes_per_sec ${m.bytesPerSec.toFixed(2)}
    `.trim();
  }
}

export const metrics = new MetricsManager();
