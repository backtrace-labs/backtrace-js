import { BacktraceClientOptions } from '..';
import { BacktraceReport } from './backtraceReport'
import {
  currentTimestamp,
  getBacktraceGUID,
  getEndpointParams,
  post,
  uuid,
} from '../utils';
import { APP_NAME, USER_AGENT, VERSION } from '../consts/application';
import { SEC_TO_MILLIS } from '../consts';

/**
 * Handles Backtrace Metrics.
 */
export class BacktraceMetrics {
  private readonly universe: string;
  private readonly token: string;
  private readonly hostname: string;

  private readonly timeout: number = 15000; // Fifteen seconds in milliseconds.
  private readonly persistenceInterval: number = 1800000; // Thirty minutes in milliseconds.
  private readonly heartbeatInterval: number = 60000; // One minutes in milliseconds.

  private readonly timestamp = currentTimestamp();
  private readonly userAgent = USER_AGENT;
  private readonly applicationName = APP_NAME;
  private readonly applicationVersion = VERSION;

  private readonly eventAttributes = this.getEventAttributes()

  private summedEndpoint: string;
  private uniqueEndpoint: string;

  private readonly guid;
  private sessionId;
  private lastActive;

  constructor(
    configuration: BacktraceClientOptions,
    hostname = 'https://events.backtrace.io',
  ) {
    if (!configuration.endpoint) {
      throw new Error(`Backtrace: missing 'endpoint' option.`);
    }
    const { universe, token } = getEndpointParams(configuration.endpoint);

    if (!universe) {
      throw new Error(
        `Backtrace: 'universe' could not be parsed from the endpoint.`,
      );
    }

    if (!token && !configuration.token) {
      throw new Error(
        `Backtrace: missing 'token' option or it could not be parsed from the endpoint.`,
      );
    }

    this.universe = universe;
    this.token = (configuration.token || token) as string;
    this.timeout = configuration.timeout;
    this.hostname = hostname;

    this.summedEndpoint = `${this.hostname}/api/unique-events/submit?universe=${this.universe}&token=${this.token}`;
    this.uniqueEndpoint = `${this.hostname}/api/summed-events/submit?universe=${this.universe}&token=${this.token}`;

    this.guid = getBacktraceGUID();
    this.sessionId = this.getSessionId();
    this.lastActive = this.getLastActive();

    this.persistSession(); // Create/persist session on construction.

    // Get current session interval. If one is set or running, clear it.
    const currentIntervalId = this.getActiveSessionIntervalId();
    if (currentIntervalId) {
      clearInterval(currentIntervalId);
    }
    // Start new interval.
    // Persist session if page is focused on heartbeat interval
    const intervalId = setInterval(
      () => this.persistIfFocused(),
      this.heartbeatInterval,
    );
    this.setActiveSessionIntervalId(intervalId);
  }

  /**
   * Handle persisting of session. When called, will create or manage current session.
   * when appropriate.
   */
  private persistSession(): void {
    // If sessionId is not set, create new session. Send unique and app launch events.
    if (!this.sessionId) {
      this.createNewSession();
      this.sendUniqueEvent();
      // An "application launch" loosely / temporarily means first session creation.
      this.sendSummedEvent('Application Launches');

      // If sessionId is set and lastActive is over persistenceInterval, create new session and send unique event.
      // if lastActive is not defined, the page was just launched; use current timestamp as lastActive.
    } else if (
      (this.lastActive || this.timestamp) <
      this.timestamp * SEC_TO_MILLIS - this.persistenceInterval
    ) {
      this.createNewSession();
      this.sendUniqueEvent();
    }

    this.setLastActive(this.timestamp); // update lastActive. User is active.
  }

  /**
   * Persist session if page is focused.
   */
  private persistIfFocused(): void {
    if (!document.hidden) {
      this.persistSession();
    }
  }

  /**
   * Send POST to unique-events API endpoint
   */
  public async sendUniqueEvent(): Promise<void> {
    const payload = {
      application: this.applicationName,
      appversion: this.applicationVersion,
      metadata: {
        dropped_events: 0,
      },
      unique_events: [
        {
          timestamp: currentTimestamp(),
          attributes: this.eventAttributes,
          unique: ['guid'],
        },
      ],
    };

    await post(this.summedEndpoint, payload);
  }

  /**
   * Send POST to summed-events API endpoint
   */
  public async sendSummedEvent(metricGroup: string): Promise<void> {
    const payload = {
      application: this.applicationName,
      appversion: this.applicationVersion,
      metadata: {
        dropped_events: 0,
      },
      summed_events: [
        {
          timestamp: currentTimestamp(),
          metric_group: metricGroup,
          attributes: this.eventAttributes,
        },
      ],
    };

    await post(this.summedEndpoint, payload);
  }

  private getEventAttributes(): {[index: string]: any} {
    const reportAttributes = new BacktraceReport().toJson();
    return {
      guid: this.guid,
      'application.version': this.applicationVersion,
      'application.session': this.sessionId,
      'uname.sysname': this.userAgent,
      annotations: reportAttributes.annotations,
      classifiers: reportAttributes.classifiers,
      lang: reportAttributes.lang,
      langVersion: reportAttributes.langVersion,
      mainThread: reportAttributes.mainThread,
      threads: reportAttributes.threads,
      uuid: reportAttributes.uuid,
    }
  }

  /**
   * Create new sessionId and set local sessionId and sessionStart.
   */
  private createNewSession(): string {
    const newSessionId = uuid();
    this.sessionId = newSessionId;
    this.lastActive = this.timestamp;
    localStorage.setItem('sessionId', newSessionId);
    localStorage.setItem('sessionStart', this.timestamp.toString());
    this.setLastActive(this.timestamp);
    return newSessionId;
  }

  /**
   * Get stored sessionId
   */
  private getSessionId(): string | undefined {
    return localStorage.getItem('sessionId') || undefined;
  }

  /**
   * Get stored time since last session created or current time
   */
  private getSessionStart(): number | undefined {
    const sessionStartStr = localStorage.getItem('sessionStart');
    return sessionStartStr ? parseInt(sessionStartStr, 10) : undefined;
  }

  /**
   * Get stored time since last page navigation or current time
   */
  private getLastActive(): number | undefined {
    const lastActiveStr = localStorage.getItem('lastActive');
    return lastActiveStr ? parseInt(lastActiveStr, 10) : undefined;
  }

  /**
   * Get stored session active interval id.
   */
  private getActiveSessionIntervalId(): number | undefined {
    const lastActiveStr = localStorage.getItem('activeSessionIntervalId');
    return lastActiveStr ? parseInt(lastActiveStr, 10) : undefined;
  }

  /**
   * Set time to localStorage "lastActive" and class variable `lastActive`.
   * @param time Integer seconds since epoch
   */
  private setLastActive(time = this.timestamp): void {
    this.lastActive = time;
    localStorage.setItem('lastActive', time.toString());
  }

  /**
   * Set session active interval id to localStorage.
   */
  private setActiveSessionIntervalId(intervalId: number): void {
    localStorage.setItem('activeSessionIntervalId', intervalId.toString());
  }
}
