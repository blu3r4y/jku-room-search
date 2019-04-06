import 'air-datepicker'

import { Utils } from './utils'
import { Query, Results } from './api'

const language: AirDatepickerLanguageInstance = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'dd.mm.yyyy',
    timeFormat: 'hh:ii aa',
    firstDay: 1
}

export enum ColorStatus {
    Okay = "bg-success",
    Info = "bg-info",
    Error = "bg-danger"
}

/**
 * Wraps the frontend elements and provides methods to manipulate them
 */
export class RoomSearchFrontend {

    /**
     * The current air datepicker instance
     */
    public datepicker?: AirDatepickerInstance = undefined

    private jq_datepicker: JQuery<HTMLElement>
    private jq_fromTime: JQuery<HTMLElement>
    private jq_toTime: JQuery<HTMLElement>
    private jq_results: JQuery<HTMLElement>
    private jq_teaserText: JQuery<HTMLElement>
    private jq_teaserBlock: JQuery<HTMLElement>

    private currentColorStatus: ColorStatus

    constructor(datepicker: JQuery<HTMLElement>, fromTime: JQuery<HTMLElement>, toTime: JQuery<HTMLElement>,
        results: JQuery<HTMLElement>, teaserText: JQuery<HTMLElement>, teaserBlock: JQuery<HTMLElement>) {
        this.jq_datepicker = datepicker
        this.jq_fromTime = fromTime
        this.jq_toTime = toTime
        this.jq_results = results
        this.jq_teaserText = teaserText
        this.jq_teaserBlock = teaserBlock

        this.currentColorStatus = ColorStatus.Error
    }

    /**
     * Initialize the frontend elements by providing valid raster times
     * 
     * @param startTimes A set of raster start times
     * @param endTimes A set of raster end times
     */
    public init(startTimes: number[], endTimes: number[]) {
        this.initDatePicker()
        this.initTimePickers(startTimes, endTimes)
    }

    /**
     * Retrieve the current form inputs
     */
    public getQuery(): Query | null {
        if (!this.datepicker || this.datepicker.selectedDates.length == 0) {
            return null
        }

        let day: Date = this.datepicker.selectedDates[0]
        let fromMinutes = parseInt(<string>this.jq_fromTime.children("option:selected").val())
        let toMinutes = parseInt(<string>this.jq_toTime.children("option:selected").val())

        return { "day": day, "from": fromMinutes, "to": toMinutes }
    }

    /**
     * Render query results and the info label
     * 
     * @param text Text to be displayed in the teaser or `null` for nothing
     * @param results Result object or `null` for nothing
     * @param color Color of the teaser text block
     */
    public render(text: string | null = null, results: Results | null = null, color: ColorStatus = ColorStatus.Info) {
        this.renderTeaser(text, color)
        this.renderTable(results)
    }

    private renderTeaser(text: string | null, color: ColorStatus) {
        if (!text) {
            this.jq_teaserBlock.hide()
        } else {
            this.jq_teaserText.html(text)

            // switch the color class
            if (color != this.currentColorStatus) {
                this.jq_teaserBlock.addClass(color).removeClass(this.currentColorStatus)
            }
            this.currentColorStatus = color

            this.jq_teaserBlock.show()
        }
    }

    private renderTable(results: Results | null) {
        if (!results) {
            this.jq_results.hide()
        } else {
            this.jq_results.show()
        }
    }

    private initDatePicker() {
        let today = new Date()
        let instance = this.jq_datepicker.datepicker({
            toggleSelected: false,
            language: language,
            todayButton: today,
            minDate: today
        }).data('datepicker')

        instance.selectDate(today)

        this.datepicker = instance
    }

    private initTimePickers(startTimes: number[], endTimes: number[]) {
        // add <option> fields to start time <select>
        startTimes.forEach(item => {
            this.jq_fromTime.append(
                $('<option></option>').val(item).html(Utils.fromMinutes(item))
            )
        })

        // add <option> fields to end time <select>
        endTimes.forEach(item => {
            this.jq_toTime.append(
                $('<option></option>').val(item).html(Utils.fromMinutes(item))
            )
        })
    }

}

