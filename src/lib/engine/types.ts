export type LocalDate = string;
export type LocalTime = string;

export interface ShiftInterval {
  start: LocalTime;
  end: LocalTime;
}

export interface ShiftTypeDefinition {
  id: string;
  intervals: ShiftInterval[];
  breaks?: ShiftInterval[];
  breakPaid?: boolean;
}

export type PatternType = "weekly" | "rotating";

export interface PatternDefinition {
  id: string;
  type: PatternType;
  cycleLength: number;
  anchorDate: LocalDate;
  startDate: LocalDate;
  endDate?: LocalDate;
  archivedAt?: number;
}

export interface PatternDayDefinition {
  patternId: string;
  dayIndex: number;
  isRestDay: boolean;
  shiftTypeId?: string;
}

export type OverrideKind = "shift" | "rest" | "extra";

export interface OverrideDefinition {
  date: LocalDate;
  kind: OverrideKind;
  shiftTypeId?: string;
  intervals?: ShiftInterval[];
}

export type ResolvedDaySource = "override" | "pattern" | "default";

export interface ResolvedDay {
  date: LocalDate;
  kind: "shift" | "rest";
  source: ResolvedDaySource;
  shiftTypeId?: string;
  intervals: ShiftInterval[];
  startInstant?: number;
  endInstant?: number;
  plannedMinutes: number;
}

export interface EngineInput {
  timezone: string;
  date: LocalDate;
  shiftTypes: Record<string, ShiftTypeDefinition>;
  pattern?: PatternDefinition;
  patternDays?: PatternDayDefinition[];
  override?: OverrideDefinition;
}

export interface EngineRangeInput {
  timezone: string;
  startDate: LocalDate;
  endDate: LocalDate;
  shiftTypes: Record<string, ShiftTypeDefinition>;
  patterns?: PatternDefinition[];
  patternDays?: PatternDayDefinition[];
  overrides?: OverrideDefinition[];
}
