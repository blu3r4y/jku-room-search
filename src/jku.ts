import { LocalTime } from "@js-joda/core";

import { DateUtils } from "./utils";

export class Jku {
  private static readonly COURSE_DURATION: number = 45;
  private static readonly PAUSE_DURATION: number = 15;

  public static readonly FIRST_COURSE_START = DateUtils.fromString("08:30");
  public static readonly FIRST_COURSE_END = Jku.FIRST_COURSE_START.plusMinutes(
    Jku.COURSE_DURATION
  );

  public static readonly LAST_COURSE_START = DateUtils.fromString("21:30");
  public static readonly LAST_COURSE_END = Jku.LAST_COURSE_START.plusMinutes(
    Jku.COURSE_DURATION
  );

  public static readonly FIRST_PAUSE_START = DateUtils.fromString("10:00");
  public static readonly FIRST_PAUSE_END = Jku.FIRST_PAUSE_START.plusMinutes(
    Jku.PAUSE_DURATION
  );

  public static readonly LAST_PAUSE_START = DateUtils.fromString("20:30");
  public static readonly LAST_PAUSE_END = Jku.LAST_PAUSE_START.plusMinutes(
    Jku.PAUSE_DURATION
  );

  /**
   * Returns the well-known raster times of the JKU
   *
   * @param start A start time `LocalTime` object
   * @param stop A stop time `LocalTime` object
   */
  public static getCourseTimes(start: LocalTime, stop: LocalTime): LocalTime[] {
    return Jku.mapToLocalTime(start, stop, Jku.iterateCourseTimes);
  }

  /**
   * Returns the well-known break times of the JKU
   *
   * @param start A start time `LocalTime` object
   * @param stop A stop time `LocalTime` object
   */
  public static getPauseTimes(start: LocalTime, stop: LocalTime): LocalTime[] {
    return Jku.mapToLocalTime(start, stop, Jku.iteratePauseTimes);
  }

  private static mapToLocalTime(
    start: LocalTime,
    stop: LocalTime,
    iterator: (start: number, stop: number) => Generator<number>
  ): LocalTime[] {
    const minutes = Array.from(
      iterator(DateUtils.toMinutes(start), DateUtils.toMinutes(stop))
    );
    const times = minutes.map(DateUtils.fromMinutes);
    return times;
  }

  /**
   * Yields raster times, starting with `start`, adding `inc` on every step
   * and adding `pause` on every second step.
   * The sequence will not exceed the `stop` value.
   *
   * @param start Iteration start point (inclusive)
   * @param stop Iteration stop point (inclusive)
   * @param inc Default increment between raster times
   * @param pause Additional pause increment on every second raster time
   */
  private static *iterateCourseTimes(
    start: number,
    stop: number,
    inc: number = Jku.COURSE_DURATION,
    pause: number = Jku.PAUSE_DURATION
  ): Generator<number> {
    let curr = start;
    yield curr;

    while (curr + inc <= stop) {
      curr += inc;
      yield curr;

      curr += inc + pause;
      if (curr <= stop) {
        yield curr;
      }
    }
  }

  /**
   * Yields break times, starting with `start`, adding `inc` on every step.
   * The sequence will not exceed the `stop` value.
   *
   * @param start Iteration start point (inclusive)
   * @param stop Iteration stop point (inclusive)
   * @param inc Default increment between break times
   */
  private static *iteratePauseTimes(
    start: number,
    stop: number,
    inc: number = 2 * Jku.COURSE_DURATION + Jku.PAUSE_DURATION
  ): Generator<number> {
    let curr = start;
    yield curr;

    while (curr + inc <= stop) {
      curr += inc;
      yield curr;
    }
  }
}
