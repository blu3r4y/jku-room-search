import dayjs from "dayjs";
import { Duration } from "dayjs/plugin/duration";

/**
 * Represents a date, but will also always hold some time, because it is backed by IDate
 */
export type IDate = dayjs.Dayjs;

/**
 * Represents a time of day, but is backed by a dayjs.ITime
 */
export type ITime = Duration;

/**
 * API query for requesting free rooms
 */
export declare interface IApiQuery {
  day: IDate;
  from: ITime;
  to: ITime | null;
}

/**
 * API result object with free rooms
 */
export type IApiResult = IFreeRoom[];

/**
 * A single free room entry
 */
export declare interface IFreeRoom {
  room: string;
  available: [ITime, ITime][];
}

/**
 * The structure of the room data index
 */
export declare interface IRoomData {
  version: string;
  range: { start: string; end: string };
  // { room identifier -> (room name, building identifier) }
  rooms: { [id: string]: { name: string; building: number } };
  // { building identifier -> building name }
  buildings: { [id: string]: string };
  // { day identifier -> {room identifier -> [ (free from, free until) ]} }
  available: { [id: string]: { [id: string]: [number, number][] } };
}
