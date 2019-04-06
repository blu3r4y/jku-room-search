import numeral from 'numeral'

export module Utils {

    /**
     * Converts the string-based minute representation to a number-based representation,
     * e.g., converts `510` to `"08:30"` since `8 x 60 + 30 = 510`
     * 
     * @param timeString A time string, formatted like `"08:30"`
     */
    export function fromTimeString(timeString: string): number {
        let s: string[] = timeString.split(":")
        let hours = parseInt(s[0])
        let mins = parseInt(s[1])

        return hours * 60 + mins
    }

    /**
     * Converts the number-based minute representation to a string-based representation,
     * e.g., converts `510` to `"08:30"` since `8 x 60 + 30 = 510`
     * 
     * @param minutes The amount of minutes from the start of the day.
     */
    export function fromMinutes(minutes: number): string {
        let quo = Math.floor(minutes / 60)
        let rem = minutes % 60

        return numeral(quo).format('00') + ":" + numeral(rem).format('00')
    }

}