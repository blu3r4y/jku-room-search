import "air-datepicker";

import { IQuery, IResults } from "./api";
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
    Okay = "bg-success",
    Info = "bg-info",
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

    private currentColorStatus: ColorStatus;

    constructor(datepicker: JQuery<HTMLElement>, fromTime: JQuery<HTMLElement>, toTime: JQuery<HTMLElement>,
        results: JQuery<HTMLElement>, teaserText: JQuery<HTMLElement>, teaserBlock: JQuery<HTMLElement>) {

        this.jqDatepicker = datepicker;
        this.jqFromTime = fromTime;
        this.jqToTime = toTime;
        this.jqResults = results;
        this.jqTeaserText = teaserText;
        this.jqTeaserBlock = teaserBlock;

        this.currentColorStatus = ColorStatus.Error;
    }

    /**
     * Initialize the frontend elements by providing valid raster times
     *
     * @param startTimes A set of raster start times
     * @param endTimes A set of raster end times
     */
    public init(startTimes: number[], endTimes: number[]) {
        this.initDatePicker();
        this.initTimePickers(startTimes, endTimes);
    }

    /**
     * Retrieve the current form inputs
     */
    public getQuery(): IQuery | null {
        if (!this.datepicker || this.datepicker.selectedDates.length === 0) {
            return null;
        }

        const day: Date = this.datepicker.selectedDates[0];
        const fromMinutes = parseInt(this.jqFromTime.children("option:selected").val() as string, 10);
        const toMinutes = parseInt(this.jqToTime.children("option:selected").val() as string, 10);

        return { day, from: fromMinutes, to: toMinutes };
    }

    /**
     * Render query results and the info label
     *
     * @param text Text to be displayed in the teaser or `null` for nothing
     * @param results Result object or `null` for nothing
     * @param color Color of the teaser text block
     */
    public render(text: string | null = null, results: IResults | null = null, color: ColorStatus = ColorStatus.Info) {
        this.renderTeaser(text, color);
        this.renderTable(results);
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

    private renderTable(results: IResults | null) {
        if (!results) {
            this.jqResults.hide();
        } else {
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

    private initTimePickers(startTimes: number[], endTimes: number[]) {
        // add <option> fields to start time <select>
        startTimes.forEach((item) => {
            this.jqFromTime.append(
                $("<option></option>").val(item).html(Utils.fromMinutes(item)),
            );
        });

        // add <option> fields to end time <select>
        endTimes.forEach((item) => {
            this.jqToTime.append(
                $("<option></option>").val(item).html(Utils.fromMinutes(item)),
            );
        });
    }

}