import { Jku } from "../common/jku";
import { Duration } from "dayjs/plugin/duration";
import { LogUtils, TimeUtils } from "../common/utils";
import { IndexDto, TimeSpanDto, DAY_KEY_FORMAT } from "../common/dto";
import { ApiQuery, ApiResponse, FreeRoom, Time } from "../common/types";

export class SearchApi {
  private readonly index: IndexDto;
  private readonly bookable: [number, number];

  constructor(index: IndexDto) {
    this.index = index;
    this.bookable = Jku.getBookingIntervalInMinutes();
  }

  /**
   * Search the index for free rooms
   *
   * @param query The user query object
   */
  public searchFreeRooms(query: ApiQuery): ApiResponse | null {
    try {
      const atLeastUntil = query.to != null;
      const day: string = query.day.format(DAY_KEY_FORMAT);
      const from: number = TimeUtils.toMinutes(query.from);
      const to: number = atLeastUntil
        ? TimeUtils.toMinutes(query.to as Duration)
        : -1;

      // check if we got any data for the requested day
      if (!(day in this.index.available)) return [];

      // check if the desired interval is bookable
      if (
        from < this.bookable[0] ||
        from > this.bookable[1] ||
        (atLeastUntil && (to < this.bookable[0] || to > this.bookable[1]))
      ) {
        LogUtils.error(
          "err::unbookableInterval",
          "tried to query an unbookable interval",
        );
        return null;
      }

      const result: ApiResponse = [];
      const cursor = this.index.available[day];

      // if this entire day is free (which is indicated by an empty dict)
      // then return a result set with all rooms
      if (Object.keys(cursor).length == 0) {
        Object.keys(this.index.rooms).forEach((rid: string) => {
          result.push(this.buildFreeRoomEntry(rid, 0, [this.bookable]));
        });
      }

      // otherwise, iterate over the free rooms dict
      Object.keys(cursor).forEach((rid: string) => {
        const timespans = cursor[rid];
        let match = -1;

        if (atLeastUntil) {
          match = timespans.findIndex((d) => from >= d[0] && to <= d[1]);
        } else {
          match = timespans.findIndex((d) => from >= d[0] && from < d[1]);
        }

        if (match != -1)
          result.push(this.buildFreeRoomEntry(rid, match, timespans));
      });

      // show rooms that are available for the longest time first
      // then, sort by those that are already available for a long time
      result.sort((e, f) => e.match[0].subtract(f.match[0]).asMilliseconds());
      result.sort((e, f) => f.match[1].subtract(e.match[1]).asMilliseconds());

      return result;
    } catch (e) {
      LogUtils.error("err::searchFail", (e as Error).message);
      return null;
    }
  }

  private buildFreeRoomEntry(
    rid: string,
    match: number,
    timespans: TimeSpanDto[],
  ): FreeRoom {
    const room = this.index.rooms[rid];
    // map the raw minute-based timespans to `Time` objects
    const durations: [Time, Time][] = timespans.map((t) => [
      TimeUtils.fromMinutes(t[0]),
      TimeUtils.fromMinutes(t[1]),
    ]);

    // retrieve capacity or building info, if available
    const capacity = room.capacity !== -1 ? room.capacity : null;
    const building =
      room.building !== -1 ? this.index.buildings[room.building].name : null;

    return {
      room: room.name,
      capacity: capacity,
      building: building,
      match: durations[match],
      available: durations,
    };
  }
}
