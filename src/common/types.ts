import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";

/**
 * Calendar date, but will also always hold some time, because it is backed by `dayjs.Dayjs`
 */
export type Day = Dayjs;

/**
 * Time of day, but is backed by a `dayjs.Duration`
 */
export type Time = Duration;

/**
 * Query for requesting free rooms
 */
export declare interface ApiQuery {
  day: Day;
  from: Time;
  to: Time | null;
}

/**
 * Array of free rooms
 */
export type ApiResponse = FreeRoom[];

/**
 * Single free room entry
 */
export declare interface FreeRoom {
  /** The full room name that is free */
  room: string;
  /** The capacity of this room, if available */
  capacity: number | null;
  /** The full building name of this room, if available */
  building: string | null;
  /** The interval that matches the query exactly */
  match: [Time, Time];
  /** Availability data of this room for the rest of the day */
  available: [Time, Time][];
}
