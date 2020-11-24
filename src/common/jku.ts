import { Time } from "./types";
import { TimeUtils } from "./utils";

export class Jku {
  private static readonly COURSE_DURATION: number = 45;
  private static readonly PAUSE_DURATION: number = 15;

  public static readonly FIRST_COURSE_START = TimeUtils.fromString("08:30");
  public static readonly FIRST_COURSE_END = Jku.FIRST_COURSE_START.add(
    Jku.COURSE_DURATION,
    "minutes"
  );

  public static readonly LAST_COURSE_START = TimeUtils.fromString("21:30");
  public static readonly LAST_COURSE_END = Jku.LAST_COURSE_START.add(
    Jku.COURSE_DURATION,
    "minutes"
  );

  public static readonly FIRST_PAUSE_START = TimeUtils.fromString("10:00");
  public static readonly FIRST_PAUSE_END = Jku.FIRST_PAUSE_START.add(
    Jku.PAUSE_DURATION,
    "minutes"
  );

  public static readonly LAST_PAUSE_START = TimeUtils.fromString("20:30");
  public static readonly LAST_PAUSE_END = Jku.LAST_PAUSE_START.add(
    Jku.PAUSE_DURATION,
    "minutes"
  );

  /**
   * The interval between which courses can be booked (as `Time` objects)
   */
  public static getBookingInterval(): [Time, Time] {
    return [Jku.FIRST_COURSE_START, Jku.LAST_COURSE_END];
  }

  /**
   * The interval between which courses can be booked (in minutes)
   */
  public static getBookingIntervalInMinutes(): [number, number] {
    return [
      TimeUtils.toMinutes(Jku.FIRST_COURSE_START),
      TimeUtils.toMinutes(Jku.LAST_COURSE_END),
    ];
  }

  public static getCourseStartTimes(): Time[] {
    return Jku.getCourseTimes(Jku.FIRST_COURSE_START, Jku.LAST_COURSE_START);
  }

  public static getCourseEndTimes(): Time[] {
    return Jku.getCourseTimes(Jku.FIRST_COURSE_END, Jku.LAST_COURSE_END);
  }

  public static getPauseStartTimes(): Time[] {
    return Jku.getPauseTimes(Jku.FIRST_PAUSE_START, Jku.LAST_PAUSE_START);
  }

  public static getPauseEndTimes(): Time[] {
    return Jku.getPauseTimes(Jku.FIRST_PAUSE_END, Jku.LAST_PAUSE_END);
  }

  /**
   * Returns the well-known raster times of the JKU
   *
   * @param start The inclusive start time
   * @param stop The inclusive stop time
   */
  private static getCourseTimes(start: Time, stop: Time): Time[] {
    return Jku.iterateAndMapToTime(start, stop, Jku.iterateCourseTimes);
  }

  /**
   * Returns the well-known pause times of the JKU
   *
   * @param start The inclusive start time
   * @param stop The inclusive stop time
   */
  private static getPauseTimes(start: Time, stop: Time): Time[] {
    return Jku.iterateAndMapToTime(start, stop, Jku.iteratePauseTimes);
  }

  private static iterateAndMapToTime(
    start: Time,
    stop: Time,
    iterator: (start: number, stop: number) => Generator<number>
  ): Time[] {
    const minutes = iterator(
      TimeUtils.toMinutes(start),
      TimeUtils.toMinutes(stop)
    );
    const times = Array.from(minutes).map(TimeUtils.fromMinutes);
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
