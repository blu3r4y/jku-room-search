import { Utils } from "./utils";

export class Jku {

    /**
     * Returns the well-known raster times of the JKU
     *
     * @param start A start time string, e.g. `"08:30"`
     * @param stop A stop time string, e.g. `"21:30"`
     */
    public static getRasterTimes(start: string, stop: string): number[] {
        const minutes = Array.from(this.iterateRasterTimes(Utils.fromTimeString(start), Utils.fromTimeString(stop)));
        return minutes;
    }

    /**
     * Yields raster times, starting with `start`, adding `inc` on every step and adding `pause` on every second step.
     * The sequence will not exceed the `stop` value.
     *
     * @param start Iteration start point
     * @param stop Iteration stop point
     * @param inc Default increment between raster times
     * @param pause Additional pause increment on every second raster time
     */
    private static * iterateRasterTimes(start: number, stop: number, inc: number = 45, pause: number = 15) {
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

}
