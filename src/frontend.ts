import "air-datepicker";
import { Duration, LocalDate, LocalDateTime, LocalTime } from "js-joda";

import { IQuery, IResult } from "./api";
import { DateUtils } from "./utils";

const language: AirDatepickerLanguageInstance = {
    clear: "Clear",
    dateFormat: "dd.mm.yyyy",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    firstDay: 1,
    months: ["January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    timeFormat: "hh:ii aa",
    today: "Today",
};

export enum ColorStatus {
    Success = "bg-info",
    NoResult = "bg-secondary",
    Error = "bg-danger",
}

/**
 * Wraps the frontend elements and provides methods to manipulate them
 */
export class RoomSearchFrontend {

    /**
     * The current air datepicker instance
     */
    public datepicker?: AirDatepickerInstance = undefined;

    private jqDatepicker: JQuery<HTMLElement>;
    private jqFromTime: JQuery<HTMLElement>;
    private jqToTime: JQuery<HTMLElement>;
    private jqResults: JQuery<HTMLElement>;
    private jqTeaserText: JQuery<HTMLElement>;
    private jqTeaserBlock: JQuery<HTMLElement>;
    private jqResultsInfo: JQuery<HTMLElement>;
    private jqButton: HTMLInputElement;
    private jqSpinner: JQuery<HTMLElement>;
    private jqButtonText: JQuery<HTMLElement>;
    private jqVersionText: JQuery<HTMLElement>;

    private currentColorStatus: ColorStatus;
    private startTimes?: LocalTime[] = undefined;
    private endTimes?: LocalTime[] = undefined;

    constructor(datepicker: JQuery<HTMLElement>, fromTime: JQuery<HTMLElement>, toTime: JQuery<HTMLElement>,
        results: JQuery<HTMLElement>, teaserText: JQuery<HTMLElement>, teaserBlock: JQuery<HTMLElement>,
        resultsInfo: JQuery<HTMLElement>, button: JQuery<HTMLElement>, spinner: JQuery<HTMLElement>,
        buttonText: JQuery<HTMLElement>, versionText: JQuery<HTMLElement>) {

        this.jqDatepicker = datepicker;
        this.jqFromTime = fromTime;
        this.jqToTime = toTime;
        this.jqResults = results;
        this.jqTeaserText = teaserText;
        this.jqTeaserBlock = teaserBlock;
        this.jqResultsInfo = resultsInfo;
        this.jqButton = button[0] as HTMLInputElement;
        this.jqSpinner = spinner;
        this.jqButtonText = buttonText;
        this.jqVersionText = versionText;

        this.currentColorStatus = ColorStatus.Error;
    }

    /**
     * Initialize the frontend elements by providing valid raster times
     *
     * @param startTimes A set of raster start times
     * @param endTimes A set of raster end times
     */
    public init(startTimes: LocalTime[], endTimes: LocalTime[]) {
        this.startTimes = startTimes;
        this.endTimes = endTimes;

        this.initDatePicker();
        this.initTimePickers();
    }

    /**
     * Retrieve the current form inputs
     */
    public getQuery(): IQuery | null {
        try {
            const day = this.getDate();
            const from = this.getFromTime();
            const to = this.getToTime();

            // sanity checks (toMinutes is allowed to be NULL)
            if (!day || !from || (to && from.isAfter(to))) {
                return null;
            } else {
                return { day, from, to };
            }
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    /**
     * Render query results and the info label
     *
     * @param text Text to be displayed in the teaser or `null` for nothing
     * @param result Result object or `null` for nothing
     * @param color Color of the teaser text block
     */
    public render(text: string | null = null, result: IResult | null = null,
        color: ColorStatus = ColorStatus.NoResult) {
        this.renderTeaser(text, color);
        this.renderTable(result);
    }

    /**
     * Render the version tag
     *
     * @param version Version, represented by a `LocalDateTime`
     */
    public renderVersion(version: LocalDateTime) {
        const duration = Duration.between(version, LocalDateTime.now());
        let readableDuration: string = "just now";
        if (duration.toDays() >= 7) {
            readableDuration = `${Math.floor(duration.toDays() / 7)} weeks ago`;
        } else if (duration.toDays() > 0) {
            readableDuration = `${duration.toDays()} days ago`;
        } else if (duration.toHours() > 0) {
            readableDuration = `${duration.toHours()} hours ago`;
        } else if (duration.toMinutes() > 0) {
            readableDuration = `${duration.toMinutes()} minutes ago`;
        }

        this.jqVersionText.html(`Index updated ${readableDuration}`);
    }

    /**
     * Render the button enabled or disabled with an additional loading spinner
     *
     * @param enabled Disable or enable the button
     * @param spinning Show a spinning animation
     */
    public renderButton(enabled: boolean, spinning: boolean | null = null) {
        if (spinning == null) {
            spinning = !enabled;
        }

        if (enabled) {
            if (!spinning) {
                this.jqSpinner.hide();
                this.jqButtonText.show();
            }
            this.jqButton.disabled = false;
        } else {
            this.jqButton.disabled = true;
            if (spinning) {
                this.jqButtonText.hide();
                this.jqSpinner.show();
            }
        }
    }

    private getDate(): LocalDate | null {
        if (!this.datepicker || this.datepicker.selectedDates.length === 0) {
            return null;
        }

        const nativeDate: Date = this.datepicker.selectedDates[0];
        return LocalDate.of(nativeDate.getFullYear(), nativeDate.getMonth() + 1, nativeDate.getDate());
    }

    private getFromTime(): LocalTime | null {
        const minutes = parseInt(this.jqFromTime.children("option:selected").val() as string, 10);
        return minutes >= 0 ? DateUtils.fromMinutes(minutes) : null;
    }

    private getToTime(): LocalTime | null {
        const minutes = parseInt(this.jqToTime.children("option:selected").val() as string, 10);
        return minutes >= 0 ? DateUtils.fromMinutes(minutes) : null;
    }

    private renderTeaser(text: string | null, color: ColorStatus) {
        if (!text) {
            this.jqTeaserBlock.hide();
        } else {

            this.jqTeaserText.html(text);

            // switch the color class
            if (color !== this.currentColorStatus) {
                this.jqTeaserBlock.addClass(color).removeClass(this.currentColorStatus);
            }
            this.currentColorStatus = color;

            this.jqTeaserBlock.show();
        }
    }

    private renderTable(result: IResult | null) {
        if (!result || (result as IResult).length === 0) {
            this.jqResults.hide();
            this.jqResultsInfo.hide();
        } else {

            const d = document;
            const fragment = d.createDocumentFragment();

            for (const room of (result as IResult)) {
                for (const [index, [from, to]] of room.available.entries()) {
                    const tr = d.createElement("tr");

                    // add room name only on first row
                    if (index === 0) {
                        const th = d.createElement("th");
                        th.scope = "row";
                        th.innerHTML = room.room;

                        // set the row span property
                        if (room.available.length > 1) {
                            th.rowSpan = room.available.length;
                        }

                        tr.appendChild(th);
                    }

                    // from time
                    const tdFrom = d.createElement("td");
                    tdFrom.innerHTML = DateUtils.toString(from);
                    tr.appendChild(tdFrom);

                    // to time
                    const tdTo = d.createElement("td");
                    tdTo.innerHTML = DateUtils.toString(to);
                    tr.appendChild(tdTo);

                    fragment.appendChild(tr);
                }
            }

            // update the table body
            const body = this.jqResults.children("tbody");
            body.empty();
            body.append(fragment);

            this.jqResultsInfo.show();
            this.jqResults.show();
        }
    }

    private initDatePicker() {
        const today = new Date();
        const instance = this.jqDatepicker.datepicker({
            language,
            minDate: today,
            todayButton: today,
            toggleSelected: false,
        }).data("datepicker");

        instance.selectDate(today);

        this.datepicker = instance;
    }

    private initTimePickers() {

        if (!this.startTimes || !this.endTimes) {
            return;
        }

        // event for rolling the to time forwards if the from time gets changed
        function fromTimeChanged(obj: RoomSearchFrontend) {
            const from = obj.getFromTime();
            const to = obj.getToTime();

            if (from == null || to == null || obj.endTimes == null) {
                return;
            }

            if (!from.isBefore(to)) {
                // find the closest to time that is greater than the new from time
                const rollover = obj.endTimes.find((e) => e.isAfter(from));
                if (rollover) {
                    obj.jqToTime.val(DateUtils.toMinutes(rollover));
                }
            }
        }

        // event for rolling the from time backwards if the to time gets changed
        function toTimeChanged(obj: RoomSearchFrontend) {
            const from = obj.getFromTime();
            const to = obj.getToTime();

            if (from == null || to == null || obj.startTimes == null) {
                return;
            }

            if (!from.isBefore(to)) {
                // find the closest from time that is smaller than the new to time
                const rollunder = obj.startTimes.slice().reverse().find((e) => e.isBefore(to));
                if (rollunder) {
                    obj.jqFromTime.val(DateUtils.toMinutes(rollunder));
                }
            }
        }

        // add <option> fields to start time <select>
        this.startTimes.forEach((item) => {
            this.jqFromTime.append(
                $("<option></option>").val(DateUtils.toMinutes(item)).html(DateUtils.toString(item)),
            );
        });

        // add <option> fields to end time <select>
        this.endTimes.forEach((item) => {
            this.jqToTime.append(
                $("<option></option>").val(DateUtils.toMinutes(item)).html(DateUtils.toString(item)),
            );
        });

        // pre-select the closest start time in the past (or one up to 15 minutes in the future)
        const now = LocalTime.now();
        const setpoint = this.startTimes.slice().reverse().find((e) => now.isAfter(e.minusMinutes(15)));
        if (setpoint) {
            this.jqFromTime.val(DateUtils.toMinutes(setpoint));
        }

        // bind change listeners
        this.jqFromTime.change(() => fromTimeChanged(this));
        this.jqToTime.change(() => toTimeChanged(this));
    }

}
