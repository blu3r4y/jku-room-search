import { Jku } from "../common/jku";
import { TimeUtils } from "../common/utils";
import { ApiQuery, ApiResponse } from "../common/types";
import { IndexDto, TimeSpanDto, DAY_KEY_FORMAT } from "../common/dto";

export class SearchApi {
  private readonly index: IndexDto;

  constructor(index: IndexDto) {
    this.index = index;
  }

  /**
   * Search the index for free rooms
   *
   * @param query The user query object
   */
  public searchFreeRooms(query: ApiQuery): ApiResponse | null {
    try {
      // get primitives
      const day: string = query.day.format(DAY_KEY_FORMAT);
      const from: number = TimeUtils.toMinutes(query.from);
      const to: number = query.to != null ? TimeUtils.toMinutes(query.to) : -1;

      // booking interval that can be booked
      const book: [number, number] = Jku.getBookingIntervalInMinutes();

      // check if we got any data for the requested day
      if (!(day in this.index.available)) return [];

      // check if the desired interval is bookable
      if (
        from < book[0] ||
        from > book[1] ||
        (query.to !== null && (to < book[0] || to > book[1]))
      )
        return null;

      const result: ApiResponse = [];
      const cursor = this.index.available[day];

      // if this entire day is free, which is indicated by an empty dict, return all rooms
      if (Object.keys(cursor).length == 0) {
        Object.values(this.index.rooms).forEach((room) => {
          result.push({
            available: [Jku.getBookingInterval()],
            room: room.name,
          });
        });
      }

      // otherwise, iterate over the free rooms dict
      Object.keys(cursor).forEach((roomId: string) => {
        let matches: TimeSpanDto[] = [];

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
            room: this.index.rooms[roomId].name,
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
