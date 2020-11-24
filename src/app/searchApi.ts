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

      // check if we got any data for the requested day
      if (!(day in this.index.available)) return [];

      const result: ApiResponse = [];
      const cursor = this.index.available[day];

      //TODO: missing entries shall mean that stuff is always available

      // iterate over free rooms
      Object.keys(cursor).forEach((roomId: string) => {
        let matches: TimeSpanDto[] = [];

        if (query.to == null) {
          matches = cursor[roomId].filter(
            // TODO: we should be able to remove the second expression here, right?
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
