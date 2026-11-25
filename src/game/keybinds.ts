import type { BindableAction, KeybindMap, Language } from './types';

export const KEYBINDS_STORAGE_KEY = 'negruzino_keybinds_v1';

export const BINDABLE_ACTION_ORDER: BindableAction[] = [
  'reload',
  'interact',
  'patRooster',
  'flashlight',
  'scope',
  'nextTrack',
  'nextWeapon',
  'jump',
  'sprint',
];

export const DEFAULT_KEYBINDS: KeybindMap = {
  reload: 'KeyR',
  interact: 'KeyE',
  patRooster: 'KeyF',
  flashlight: 'KeyL',
  scope: 'Mouse2',
  nextTrack: 'KeyN',
  nextWeapon: 'KeyQ',
  jump: 'Space',
  sprint: 'ShiftLeft',
};

export function isValidBindingCode(code: unknown): code is string {
  if (typeof code !== 'string' || code.length === 0 || code.length > 24) return false;
  if (/^Mouse[0-4]$/.test(code)) return true;
  if (/^(Key[A-Z]|Digit[0-9]|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|Tab|Backquote|BracketLeft|BracketRight|Minus|Equal|Semicolon|Quote|Comma|Period|Slash|Enter|Backspace)$/.test(code)) {
    return true;
  }
  return false;
}

export function loadKeybinds(): KeybindMap {
  const result: KeybindMap = { ...DEFAULT_KEYBINDS };
  try {
    const raw = window.localStorage.getItem(KEYBINDS_STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw) as Partial<Record<BindableAction, unknown>>;
    for (const action of BINDABLE_ACTION_ORDER) {
      const candidate = parsed[action];
      if (isValidBindingCode(candidate)) {
        result[action] = candidate;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return result;
}

export function saveKeybinds(map: KeybindMap): void {
  try {
    window.localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Pure keybind assignment: assigns `code` to `action` and cleanly swaps out any
 * conflicting action that previously held `code` so no two actions collide.
 */
export function applyKeybindUpdate(
  current: KeybindMap,
  action: BindableAction,
  code: string
): KeybindMap {
  if (!isValidBindingCode(code)) return current;
  const next: KeybindMap = { ...current };
  const prevCode = current[action];
  for (const other of BINDABLE_ACTION_ORDER) {
    if (other !== action && next[other] === code) {
      next[other] = prevCode;
    }
  }
  next[action] = code;
  return next;
}

export function mouseButtonToBindingCode(button: number): string | null {
  if (button >= 0 && button <= 4) {
    return `Mouse${button}`;
  }
  return null;
}

export function formatBindingLabel(
  code: string,
  lang: Language,
  compact = false
): string {
  switch (code) {
    case 'Mouse0':
      return lang === 'ru' ? 'ЛКМ' : 'LMB';
    case 'Mouse1':
      return lang === 'ru' ? (compact ? 'СКМ' : 'Колёсико') : 'MMB';
    case 'Mouse2':
      return lang === 'ru' ? 'ПКМ' : 'RMB';
    case 'Mouse3':
      return lang === 'ru' ? (compact ? 'M4' : 'Бок.4 (M4)') : compact ? 'M4' : 'Side 4 (M4)';
    case 'Mouse4':
      return lang === 'ru' ? (compact ? 'M5' : 'Бок.5 (M5)') : compact ? 'M5' : 'Side 5 (M5)';
    case 'Space':
      return lang === 'ru' ? (compact ? 'ПРБ' : 'Пробел') : 'Space';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'Shift';
    case 'ControlLeft':
    case 'ControlRight':
      return 'Ctrl';
    case 'AltLeft':
    case 'AltRight':
      return 'Alt';
    case 'Backquote':
      return '~';
    default:
      if (code.startsWith('Key')) return code.slice(3);
      if (code.startsWith('Digit')) return code.slice(5);
      return code;
  }
}

export function isMouseBinding(code: string): boolean {
  return code.startsWith('Mouse');
}

export function matchesBinding(
  binds: KeybindMap,
  action: BindableAction,
  code: string
): boolean {
  return binds[action] === code;
}
