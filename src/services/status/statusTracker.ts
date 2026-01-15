import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export interface StatusEvent {
  type: 'document' | 'query' | 'system';
  id: string;
  status: string;
  message?: string;
  progress?: number;
  data?: any;
  timestamp: string;
}

class StatusTracker extends EventEmitter {
  private events: Map<string, StatusEvent> = new Map();

  /**
   * Emit a status event
   */
  emitStatus(event: Omit<StatusEvent, 'timestamp'>): void {
    const statusEvent: StatusEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.set(event.id, statusEvent);
    this.emit('status', statusEvent);
    
    logger.debug('Status event emitted', {
      type: event.type,
      id: event.id,
      status: event.status,
    });
  }

  /**
   * Get current status for an ID
   */
  getStatus(id: string): StatusEvent | undefined {
    return this.events.get(id);
  }

  /**
   * Get all recent events
   */
  getRecentEvents(limit: number = 50): StatusEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Clear old events (keep only recent ones)
   */
  clearOldEvents(keepCount: number = 100): void {
    const events = Array.from(this.events.entries())
      .sort((a, b) => new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime())
      .slice(0, keepCount);

    this.events.clear();
    events.forEach(([id, event]) => this.events.set(id, event));
  }
}

export const statusTracker = new StatusTracker();
