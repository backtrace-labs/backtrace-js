import { BacktraceClientOptions } from '.';
import { currentTimestamp, getBacktraceGUID, uuid } from './utils';

declare const __VERSION__: string;

/**
 * Handles Backtrace Metrics.
 */
export class BacktraceMetrics {
  private readonly universe: string;
  private readonly token: string;
  private readonly timeout: number  = 15000; // Fifteen seconds in milliseconds.
  private readonly persistenceInterval: number  = 1800000; // Thirty minutes in milliseconds.
  private readonly heartbeatInterval: number  = 60000; // One minutes in milliseconds.

  /** Seconds since epoch. */
  private readonly timestamp = currentTimestamp()

  // TODO: get values from common location, also in BacktraceReport
  private readonly userAgent = navigator.userAgent;
  private readonly applicationName = 'backtrace-js';
  private readonly applicationVersion = __VERSION__;

  private readonly guid = getBacktraceGUID();

  public hostname = 'https://events.backtrace.io';

  constructor(configuration: BacktraceClientOptions) {
    // TODO: HARDCODED VALUE, MUST CHANGE
    const universe = 'cd03'; // get universe name from configuration if possible. If not, pass in / access universe name somewhere.

    if (!configuration.endpoint) {
      throw new Error(`Backtrace: missing 'endpoint' option.`);
    }
    if (!configuration.token) {
      throw new Error(`Backtrace: missing 'token' option.`);
    }

    this.universe = universe;
    this.token = configuration.token;
    this.timeout = configuration.timeout;

    this.persistSession(); // Create/persist session on construction.
    // Persist session if page is focused on heartbeat interval
    setInterval(() => this.persistIfFocused(), this.heartbeatInterval);
  }

  /**
   * Handle persisting of session. When called, will create or manage current session.
   * when appropriate.
   */
  private persistSession(): void {
    const sessionId = this.getSessionId();
    // If sessionId is not set, create new session. Send unique and app launch events.
    if (!sessionId) {
      const newSessionId = this.createNewSession();
      this.sendUniqueEvent(this.guid, newSessionId);
      // An "application launch" loosely / temporarily means first session creation.
      this.sendSummedEvent(this.guid, newSessionId, 'application-launches');

      // If sessionId is set and lastActive is over persistenceInterval, create new session and send unique event.
    } else if (this.getLastActive() + 10000 < (this.timestamp * 1000) - this.persistenceInterval) {
      this.createNewSession();
      this.sendUniqueEvent(this.guid, sessionId);
    }
    // Can add else clause to send interval summed events.
    // ex. "session length" by sending lastActive - sessionStart.
    // This can get a sense of "session length" / "time spent on app", "error free minutes", "avg time per error" etc.

    this.setLastActive(this.timestamp); // update lastActive. If this function is called, user is active.
  }

  /**
   * Persist session if page is focused.
   */
  private persistIfFocused() : void {
    if(!document.hidden) {
      this.persistSession()
    }
  }

  /**
   * Send POST to unique-events API endpoint
   */
  private async sendUniqueEvent(guid: string, sessionId: string): Promise<void> {
    const endpoint = `${this.hostname}/api/unique-events/submit?universe=${this.universe}&token=${this.token}`;

    const payload = {
      application: this.applicationName,
      appversion: this.applicationVersion,
      metadata: {
        dropped_events: 0,
      },
      unique_events: [
        {
          timestamp: this.timestamp,
          attributes: {
            guid,
            'application.version': this.applicationVersion,
            'application.session': sessionId, // application session ?
            'uname.sysname': this.userAgent,
          },
          unique: ['guid'],
        },
      ],
    };

    await this.post(endpoint, JSON.stringify(payload));
    return;
  }

  /**
   * Send POST to summed-events API endpoint
   */
  private async sendSummedEvent(
    guid: string,
    sessionId: string,
    metricGroup: string,
  ): Promise<void> {
    const endpoint = `${this.hostname}/api/summed-events/submit?universe=${this.universe}&token=${this.token}`;

    const payload = {
      application: this.applicationName,
      appversion: this.applicationVersion,
      metadata: {
        dropped_events: 0,
      },
      summed_events: [
        {
          timestamp: this.timestamp,
          metric_group: metricGroup,
          attributes: {
            guid,
            'uname.sysname': this.userAgent,
            'application.version': this.applicationVersion,
            'application.session': sessionId, // application session ?
          },
        },
      ],
    };

    await this.post(endpoint, JSON.stringify(payload));
    return;
  }

  /**
   * Send POST request.
   * @param url - string endpoint
   * @param data - stringified JSON object
   */
  private async post(url: string, data: string): Promise<void> {
    try {
      return new Promise<void>((res, rej) => {
        const http = new XMLHttpRequest();
        http.timeout = this.timeout;
        http.open('POST', url, true);
        http.setRequestHeader('Content-type', 'application/json');
        http.send(data);
        http.onload = (e) => {
          if (http.readyState !== XMLHttpRequest.DONE){
            return
          }

          if (http.status === 200) {
            res();
          } else if (http.status === 429) {
            rej('Backtrace - reached metric limit.');
          } else {
            rej(
              `Invalid attempt to submit metric to Backtrace. HTTP Error ${http.status}. Result: ${http.responseText}`,
            );
          }
        };
        http.onerror = (e) => {
          rej(e);
        };
      });
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Get stored sessionId
   */
  private getSessionId(): string | undefined {
    return localStorage.getItem('sessionId') || undefined;
  }

  /**
   * Create new sessionId and set local sessionId and sessionStart.
   */
  private createNewSession(): string {
    const newSessionId = uuid();
    localStorage.setItem('sessionId', newSessionId);
    localStorage.setItem('sessionStart', this.timestamp.toString());
    return newSessionId;
  }

  /**
   * Get stored time since last page navigation or current time
   */
  private getSessionStart(): number | undefined {
    const sessionStartStr = localStorage.getItem('sessionStart');
    return sessionStartStr ? parseInt(sessionStartStr, 10) : undefined;
  }

  /**
   * Get stored time since last session created or current time
   */
  private getLastActive(): number {
    const lastActiveStr = localStorage.getItem('lastActive');
    if (!lastActiveStr) {
      this.setLastActive(this.timestamp);
      return this.timestamp;
    }
    return parseInt(lastActiveStr, 10);
  }

  /**
   * Set time to localStorage "lastActive"
   * @param time Integer seconds since epoch
   */
  private setLastActive(time = this.timestamp): void {
    localStorage.setItem('lastActive', time.toString());
  }
}
