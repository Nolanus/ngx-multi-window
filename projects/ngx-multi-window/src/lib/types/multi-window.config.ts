import { NameSafeStrategy } from 'ngx-multi-window/lib/types/name-safe-strategy.enum';
/**
 * Object representing the configuration options for the MultiWindow Module
 */
export interface MultiWindowConfig {
  /**
   * String to be used as prefix when storing data in the localstorage
   */
  keyPrefix?: string;

  /**
   * Time in milliseconds how often a heartbeat should be performed. During a heartbeat a window
   * looks for new messages from other windows and processes these messages.
   */
  heartbeat?: number;

  /**
   * Time in milliseconds how often a scan for new windows should be performed.
   */
  newWindowScan?: number;

  /**
   * Time in milliseconds after which a message delivery is considered to have failed.
   * If no "message_received" confirmation has arrived during the specified duration,
   * the message will be removed from the outbox.
   */
  messageTimeout?: number;

  /**
   * Time in milliseconds after which a window is considered dead.
   *
   * Should be a multiple of {@link MultiWindowConfig#newWindowScan}
   */
  windowTimeout?: number;

  nameSafeStrategy?: NameSafeStrategy;
}
