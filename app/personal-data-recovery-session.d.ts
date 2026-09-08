import type { PersonalDataAppState } from "./personal-data-migration.mjs";
import type { RecoveryStore } from "./personal-data-recovery.mjs";

export const MAX_UNDO_STEPS: 20;
export interface UndoEntry { description: string; state: PersonalDataAppState; recovery: RecoveryStore }
export function createUndoEntry(description: string, state: PersonalDataAppState, recovery: RecoveryStore): UndoEntry;
export function pushUndoEntry(stack: UndoEntry[], entry: UndoEntry): UndoEntry[];
export function takeUndoEntry(stack: UndoEntry[]): { entry: UndoEntry | null; stack: UndoEntry[] };
export function isUndoShortcut(event: { key?: string; ctrlKey?: boolean; metaKey?: boolean; modalOpen?: boolean; target?: { isContentEditable?: boolean; tagName?: string } }): boolean;
