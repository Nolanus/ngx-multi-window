/**
 * A representation of a strategy on how to save the window id in the native window.name property.
 */
export enum WindowSaveStrategy {
  /**
   * Default behaviour. Window data will not be saved.
   */
  NONE,
  /**
   * Only save the window data when the storage (native window.name property) is empty/undefined, meaning nothing else is
   * probably utilizing it
   */
  SAVE_WHEN_EMPTY,
  /**
   * Save the window data without checking whether the storage might be used by another script
   */
  SAVE_FORCE,
  /**
   * Save window data, but backup probable existing data in the storage and restore the original data after reading the window data.
   * Restoring the original data might not happen "on time" for the script using it, which would require delaying it's execution.
   */
  SAVE_BACKUP,
}
