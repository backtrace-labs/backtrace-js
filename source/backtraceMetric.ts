import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { BacktraceClientOptions } from '.';

/** Current epoch time in seconds. */
const CURRENT_TIME = new Date().getTime() / 1000;

/** Thirty minutes in seconds. */
const THIRTY_MINUTES = 1800;

/**
 * Function to create instance of BacktraceMetric and ping.
 */
export default function backtraceMetric(configuration: BacktraceClientOptions): void {
  new BacktraceMetric(configuration).ping()
}

/**
 * Handles Backtrace Metrics.
 * TODO: Consider converting to a static class since an instance is only created to call a single function once.
 */
export class BacktraceMetric {
  public universe;
  public token;

  // These fields are stored in localStorage for persistence.
  public sessionId = this.getSessionId();
  public lastActive = this.getLastActive();
  public sessionStart = this.getSessionStart();

  private DIRECTORY = 'events-test'; // api endpoint ex. 'https://<directory>.backtrace.io/api/...'. Should just be 'events'

  constructor(configuration: BacktraceClientOptions) {
    const universe = '' // get universe name from configuration if possible. If not, pass in / access universe name somewhere.
    const token = configuration?.token || ''
    this.universe = universe;
    this.token = token;
  }

  /**
   * Handle sessions and events. When pinged / called, will create or manage current session and send unique/summed events
   * when appropriate.
   */
  public ping() {
    this.setLastActive(CURRENT_TIME); // update lastActive since ping was called, user is active

    // Error handling. Send some console warn / error (?)
    // No token
    if(!this.token) {
      return
    }

    // If sessionId is not set, create new session. Send unique and app launch events.
    if (!this.sessionId) {
      const newSessionId = this.createNewSession();
      this.sendUniqueEvent(newSessionId);
      // An "application launch" loosely / temporarily means first session creation.
      this.sendSummedEvent(newSessionId, 'application-launches');

      // If sessionId is set and lastActive is over 30 minutes ago, create new session only.
    } else if (this.lastActive < CURRENT_TIME - THIRTY_MINUTES) {
      this.createNewSession();
      this.sendUniqueEvent(this.sessionId);
      // can also send "session length" by sending lastActive - sessionStart.
      // This can get a sense of "session length" / "time spent on app", "session free minutes", "avg time per error" etc ?
    }

    // handle summed events
    // send tick event, ex. page load / event
  }

  /**
   * Send POST to unique-events API endpoint
   */
  private async sendUniqueEvent(sessionId: string): Promise<void> {
    let endpoint = `https://${this.DIRECTORY}.backtrace.io/api/unique-events/submit?universe=${this.universe}&token=${this.token}`;

    const payload = {
      application: '', // applicationName,
      appversion: '', // Version.version,
      metadata: {
        dropped_events: 0,
      },
      unique_events: [
        {
          timestamp: CURRENT_TIME,
          unique: sessionId,
          attributes: {
            guid: sessionId,
            'uname.sysname': 'string', // user agent
            'application.version': '', // Version.version,
            'application.session': '', // Backtrace.getAttribute("application.session"),
          },
        },
      ],
    };

    await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return;
  }

  /**
   * Send POST to summed-events API endpoint
   */
  private async sendSummedEvent(
    sessionId: string,
    metricGroup: string,
  ): Promise<void> {
    let endpoint = `https://${this.DIRECTORY}.backtrace.io/api/summed-events/submit?universe=${this.universe}&token=${this.token}`;

    const payload = {
      application: '', // applicationName,
      appversion: '', // Version.version,
      metadata: {
        dropped_events: 0,
      },
      summed_events: [
        {
          timestamp: CURRENT_TIME,
          metric_group: metricGroup,
          attributes: {
            guid: sessionId,
            'uname.sysname': 'string', // user agent
            'application.version': '', // Version.version,
            'application.session': sessionId,
          },
        },
      ],
    };

    await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return;
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
    const newSessionId = uuidv4();
    localStorage.setItem('ssessionId', newSessionId);
    localStorage.setItem('sessionStart', CURRENT_TIME.toString());
    this.sessionId = newSessionId;
    return newSessionId;
  }
  /**
   * Get stored time since last page navigation or current time
   */
  private getSessionStart(): number | undefined {
    const sessionStartStr = localStorage.getItem('sessionStart');
    return sessionStartStr ? parseInt(sessionStartStr) : undefined;
  }
  /**
   * Get stored time since last session created or current time
   */
  private getLastActive(): number {
    const lastActiveStr = localStorage.getItem('lastActive');
    if (!lastActiveStr) {
      this.setLastActive(CURRENT_TIME);
      return CURRENT_TIME;
    }
    return parseInt(lastActiveStr);
  }
  /**
   * Set time to localStorage "lastActive"
   * @param time Integer seconds since epoch
   */
  private setLastActive(time = CURRENT_TIME): void {
    localStorage.setItem('lastActive', time.toString());
  }
}
