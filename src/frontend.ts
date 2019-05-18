import "air-datepicker";

import { IFreeRoom, IQuery, IResult } from "./api";
import { Utils } from "./utils";

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
    private jqButton: HTMLInputElement;
    private jqSpinner: JQuery<HTMLElement>;
    private jqButtonText: JQuery<HTMLElement>;
    private jqVersionText: JQuery<HTMLElement>;

    private currentColorStatus: ColorStatus;
    private startTimes?: number[] = undefined;
    private endTimes?: number[] = undefined;

    constructor(datepicker: JQuery<HTMLElement>, fromTime: JQuery<HTMLElement>, toTime: JQuery<HTMLElement>,
        results: JQuery<HTMLElement>, teaserText: JQuery<HTMLElement>, teaserBlock: JQuery<HTMLElement>,
        button: JQuery<HTMLElement>, spinner: JQuery<HTMLElement>, buttonText: JQuery<HTMLElement>,
        versionText: JQuery<HTMLElement>) {

        this.jqDatepicker = datepicker;
        this.jqFromTime = fromTime;
        this.jqToTime = toTime;
        this.jqResults = results;
        this.jqTeaserText = teaserText;
        this.jqTeaserBlock = teaserBlock;
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
    public init(startTimes: number[], endTimes: number[]) {
        this.startTimes = startTimes;
        this.endTimes = endTimes;

        this.initDatePicker();
        this.initTimePickers();
    }

    /**
     * Retrieve the current form inputs
     */
    public getQuery(): IQuery | null {
        if (!this.datepicker || this.datepicker.selectedDates.length === 0) {
            return null;
        }

        const day: Date = this.datepicker.selectedDates[0];
        const fromMinutes = this.getFromMinutes();
        const toMinutes = this.getToMinutes();

        // sanity checks
        if (!day || (toMinutes !== -1 && fromMinutes >= toMinutes)) {
            return null;
        } else {
            return { day, from: fromMinutes, to: toMinutes };
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
     * Render the version string
     *
     * @param version Version string
     */
    public renderVersion(version: string) {
        this.jqVersionText.html(`Last refreshed: ${version}`);
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

    private getFromMinutes(): number {
        return parseInt(this.jqFromTime.children("option:selected").val() as string, 10);
    }

    private getToMinutes(): number {
        return parseInt(this.jqToTime.children("option:selected").val() as string, 10);
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
                    tdFrom.innerHTML = Utils.fromMinutes(from);
                    tr.appendChild(tdFrom);

                    // to time
                    const tdTo = d.createElement("td");
                    tdTo.innerHTML = Utils.fromMinutes(to);
                    tr.appendChild(tdTo);

                    fragment.appendChild(tr);
                }
            }

            // update the table body
            const body = this.jqResults.children("tbody");
            body.empty();
            body.append(fragment);

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
            const from = obj.getFromMinutes();
            const to = obj.getToMinutes();

            if (to !== -1 && from >= to && obj.endTimes) {
                // find the closest to time that is greater than the new from time
                const rollover = obj.endTimes.find((e) => e > from);
                if (rollover) {
                    obj.jqToTime.val(rollover.toString());
                }
            }
        }

        // event for rolling the from time backwards if the to time gets changed
        function toTimeChanged(obj: RoomSearchFrontend) {
            const from = obj.getFromMinutes();
            const to = obj.getToMinutes();

            if (to !== -1 && to <= from && obj.startTimes) {
                // find the closest from time that is smaller than the new to time
                const rollunder = obj.startTimes.slice().reverse().find((e) => e < to);
                if (rollunder) {
                    obj.jqFromTime.val(rollunder.toString());
                }
            }
        }

        // add <option> fields to start time <select>
        this.startTimes.forEach((item) => {
            this.jqFromTime.append(
                $("<option></option>").val(item).html(Utils.fromMinutes(item)),
            );
        });

        // add <option> fields to end time <select>
        this.endTimes.forEach((item) => {
            this.jqToTime.append(
                $("<option></option>").val(item).html(Utils.fromMinutes(item)),
            );
        });

        // pre-select the closest start time in the past (or one up to 15 minutes in the future)
        const today = new Date();
        const currentMinutes = today.getHours() * 60 + today.getMinutes();
        const setpoint = this.startTimes.slice().reverse().find((e) => currentMinutes >= e - 15);
        if (setpoint) {
            this.jqFromTime.val(setpoint.toString());
        }

        // bind change listeners
        this.jqFromTime.change(() => fromTimeChanged(this));
        this.jqToTime.change(() => toTimeChanged(this));
    }

}
