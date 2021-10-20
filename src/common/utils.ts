import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

import { Time } from "./types";

export class TimeUtils {
  /**
   * Converts a time string to a `Time` object
   *
   * @param str A time string, formatted like `"08:30"`
   */
  public static fromString(text: string): Time {
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
  public static toString(time: Time): string {
    return time.format("HH:mm");
  }

  /**
   * Converts the minute-based representation to a `Time` object,
   * e.g. converts `510` to `Time("08:30")` since `8 x 60 + 30 = 510`
   *
   * @param minutes The amount of minutes from the start of the day
   */
  public static fromMinutes(minutes: number): Time {
    return dayjs.duration(minutes, "minutes");
  }

  /**
   * Converts the `Time` object to a minute-based representation,
   * e.g. converts `Time("08:30")` to `510` since `8 x 60 + 30 = 510`
   *
   * @param time A `Time` object
   */
  public static toMinutes(time: Time): number {
    return time.as("minutes");
  }

  /**
   * Checks if a happened before b.
   * Returns false if both are equal.
   *
   * @param a The time that shall be before b
   * @param b The time that shall be after a
   */
  public static isBefore(a: Time, b: Time): boolean {
    return a.asMilliseconds() < b.asMilliseconds();
  }

  /**
   * Checks if a happened after b.
   * Returns false if both are equal.
   *
   * @param a The time that shall be after b
   * @param b The time that shall be before a
   */
  public static isAfter(a: Time, b: Time): boolean {
    return a.asMilliseconds() > b.asMilliseconds();
  }
}

export class LogUtils {
  /**
   * Reports an error to the console and possibly to some monitoring tool
   *
   * @param key A key that uniquely identifies the error location
   * @param value A value that describes the error
   */
  public static error(key: string, value: string): void {
    console.error(`${key} - ${value}`);
    window.dtrum?.reportCustomError(key, value);
  }
}
