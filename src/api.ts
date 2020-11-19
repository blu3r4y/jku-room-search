import { TimeUtils } from "./utils";
import { IDate, ITime } from "./types";

/**
 * API query for requesting free rooms
 */
export declare interface IQuery {
  day: IDate;
  from: ITime;
  to: ITime | null;
}

/**
 * API result object with free rooms
 */
export type IResult = IFreeRoom[];

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

/**
 * Endpoint for performing queries on free rooms
 */
export class RoomSearch {
  private data: IRoomData;

  // TODO: use the same format in scraper and api
  private apiDateFormat = "YYYY-MM-DD";

  constructor(data: IRoomData) {
    this.data = data;
  }

  /**
   * Search the index for free rooms
   *
   * @param query The user query object
   */
  public searchFreeRooms(query: IQuery): IResult | null {
    try {
      // check if we got any data on this day
      if (!(query.day.format(this.apiDateFormat) in this.data.available)) {
        return [];
      }

      const result: IResult = [];
      const cursor = this.data.available[query.day.format(this.apiDateFormat)];

      const from: number = TimeUtils.toMinutes(query.from);
      const to: number = query.to != null ? TimeUtils.toMinutes(query.to) : -1;

      // iterate over free rooms
      Object.keys(cursor).forEach((roomId: string) => {
        let matches: number[][] = [];

        if (query.to == null) {
          matches = cursor[roomId].filter(
            (duration) => from >= duration[0] && from < duration[1]
          );
        } else {
          matches = cursor[roomId].filter(
            (duration) => from >= duration[0] && to <= duration[1]
          );
        }

        // append the result if we found some matches
        if (matches.length > 0) {
          result.push({
            available: matches.map((duration) => [
              TimeUtils.fromMinutes(duration[0]),
              TimeUtils.fromMinutes(duration[1]),
            ]),
            room: this.data.rooms[roomId].name,
          });
        }
      });

      return result;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
