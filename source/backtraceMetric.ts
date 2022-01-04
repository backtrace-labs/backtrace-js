import { BacktraceClientOptions } from '.';
import { uuid } from './utils';

declare const __VERSION__: string;

/**
 * Function to create instance of BacktraceMetric and ping.
 */
export default function backtraceMetric(
  configuration: BacktraceClientOptions,
): void {
  new BacktraceMetric(configuration).ping();
}

/**
 * Handles Backtrace Metrics.
 * TODO: Consider converting to a static class since an instance is only created to call a single function once.
 */
export class BacktraceMetric {
  public universe;
  public token;

  /** Seconds since epoch. */
  public readonly CURRENT_TIMESTAMP: number = Math.floor(
    new Date().getTime() / 1000,
  );
  /** Thirty minutes in seconds. */
  public readonly THIRTY_MINUTES = 1800;

  public readonly userAgent = navigator.userAgent;
  public readonly applicationName = 'backtrace-js';
  public readonly applicationVersion = __VERSION__;

  // These fields are stored in localStorage for persistence.
  public sessionId = this.getSessionId();
  public lastActive = this.getLastActive();
  public sessionStart = this.getSessionStart();

  private DIRECTORY = 'events-test'; // api endpoint ex. 'https://<directory>.backtrace.io/api/...'. Should just be 'events'

  constructor(configuration: BacktraceClientOptions) {
    const universe = ''; // get universe name from configuration if possible. If not, pass in / access universe name somewhere.
    const token = configuration?.token || '';
    this.universe = universe;
    this.token = token;
  }

  /**
   * Handle sessions and events. When pinged / called, will create or manage current session and send unique/summed events
   * when appropriate.
   */
  public ping() {
    this.setLastActive(this.CURRENT_TIMESTAMP); // update lastActive since ping was called, user is active

    // Error handling. Send some console warn / error (?)
    // No token
    if (!this.token) {
      return;
    }

    // If sessionId is not set, create new session. Send unique and app launch events.
    if (!this.sessionId) {
      const newSessionId = this.createNewSession();
      this.sendUniqueEvent(newSessionId);
      // An "application launch" loosely / temporarily means first session creation.
      this.sendSummedEvent(newSessionId, 'application-launches');

      // If sessionId is set and lastActive is over 30 minutes ago, create new session only.
    } else if (this.lastActive < this.CURRENT_TIMESTAMP - this.THIRTY_MINUTES) {
      this.createNewSession();
      this.sendUniqueEvent(this.sessionId);
      // can also send "session length" by sending lastActive - sessionStart.
      // This can get a sense of "session length" / "time spent on app", "session free minutes", "avg time per error" etc ?
    }

    // handle summed events
    // ex. page load / event
  }

  /**
   * Send POST to unique-events API endpoint
   */
  private async sendUniqueEvent(sessionId: string): Promise<void> {
    const endpoint = `https://${this.DIRECTORY}.backtrace.io/api/unique-events/submit?universe=${this.universe}&token=${this.token}`;

    const payload = {
      application: this.applicationName,
      appversion: __VERSION__,
      metadata: {
        dropped_events: 0,
      },
      unique_events: [
        {
          timestamp: this.CURRENT_TIMESTAMP,
          unique: sessionId,
          attributes: {
            guid: sessionId,
            'uname.sysname': this.userAgent,
            'application.version': __VERSION__,
            'application.session': '', // Backtrace.getAttribute("application.session"),
          },
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
    sessionId: string,
    metricGroup: string,
  ): Promise<void> {
    const endpoint = `https://${this.DIRECTORY}.backtrace.io/api/summed-events/submit?universe=${this.universe}&token=${this.token}`;

    const payload = {
      application: this.applicationName,
      appversion: __VERSION__,
      metadata: {
        dropped_events: 0,
      },
      summed_events: [
        {
          timestamp: this.CURRENT_TIMESTAMP,
          metric_group: metricGroup,
          attributes: {
            guid: sessionId,
            'uname.sysname': this.userAgent,
            'application.version': __VERSION__,
            'application.session': '',
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
        http.setRequestHeader('Content-type', 'application/json');
        http.timeout = 30000; // thirty seconds in miliseconds
        http.open('POST', url, true);
        http.send(data);
        http.onload = (e) => {
          if (http.readyState === XMLHttpRequest.DONE) {
            if (http.status === 200) {
              res();
            } else if (http.status === 429) {
              rej('Backtrace - reached metric limit.');
            } else {
              rej(
                `Invalid attempt to submit metric to Backtrace. Result: ${http.responseText}`,
              );
            }
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
    localStorage.setItem('sessionStart', this.CURRENT_TIMESTAMP.toString());
    this.sessionId = newSessionId;
    return newSessionId;
  }

  /**
   * Get stored time since last page navigation or current time
   */
  private getSessionStart(): number | undefined {
    const sessionStartStr = localStorage.getItem('sessionStart');
    return sessionStartStr ? Number(sessionStartStr) : undefined;
  }

  /**
   * Get stored time since last session created or current time
   */
  private getLastActive(): number {
    const lastActiveStr = localStorage.getItem('lastActive');
    if (!lastActiveStr) {
      this.setLastActive(this.CURRENT_TIMESTAMP);
      return this.CURRENT_TIMESTAMP;
    }
    return Number(lastActiveStr);
  }

  /**
   * Set time to localStorage "lastActive"
   * @param time Integer seconds since epoch
   */
  private setLastActive(time = this.CURRENT_TIMESTAMP): void {
    localStorage.setItem('lastActive', time.toString());
  }
}
