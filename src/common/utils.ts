import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

import { ITime } from "./types";

export class TimeUtils {
  /**
   * Converts a time string to a `ITime` object
   *
   * @param str A time string, formatted like `"08:30"`
   */
  public static fromString(text: string): ITime {
    const parts = text.split(":");
    return dayjs.duration({
      hours: parseInt(parts[0]),
      minutes: parseInt(parts[1]),
    });
  }

  /**
   * Formats the `Time` object to a human-readable string, e.g. `"08:30"`
   *
   * @param time A `Time` object
   */
  public static toString(time: ITime): string {
    // change this ugly hack once https://github.com/iamkun/dayjs/pull/1202 got merged
    const hours = ("00" + time.hours().toString()).substr(-2, 2);
    const mins = ("00" + time.minutes().toString()).substr(-2, 2);
    return `${hours}:${mins}`;
  }

  /**
   * Converts the minute-based representation to a `Time` object,
   * e.g. converts `510` to `Time("08:30")` since `8 x 60 + 30 = 510`
   *
   * @param minutes The amount of minutes from the start of the day
   */
  public static fromMinutes(minutes: number): ITime {
    return dayjs.duration(minutes, "minutes");
  }

  /**
   * Converts the `ITime` object to a minute-based representation,
   * e.g. converts `ITime("08:30")` to `510` since `8 x 60 + 30 = 510`
   *
   * @param time A `ITime` object
   */
  public static toMinutes(time: ITime): number {
    return time.as("minutes");
  }

  /**
   * Checks if a happened before b
   * (returns false if both are equal)
   *
   * @param a The time that shall be before b
   * @param b The time that shall be after a
   */
  public static isBefore(a: ITime, b: ITime): boolean {
    return a.asMilliseconds() < b.asMilliseconds();
  }

  /**
   * Checks if a happened after b
   * (returns false if both are equal)
   *
   * @param a The time that shall be after b
   * @param b The time that shall be before a
   */
  public static isAfter(a: ITime, b: ITime): boolean {
    return a.asMilliseconds() > b.asMilliseconds();
  }
}
