import "air-datepicker";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(duration);
dayjs.extend(relativeTime);

import { TimeUtils } from "./utils";
import { IDate, ITime } from "./types";
import { IQuery, IResult } from "./api";

const language: AirDatepickerLanguageInstance = {
  clear: "Clear",
  dateFormat: "dd.mm.yyyy",
  days: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  firstDay: 1,
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthsShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
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
  private jqCover: JQuery<HTMLElement>;

  private currentColorStatus: ColorStatus;
  private startTimes?: ITime[] = undefined;
  private endTimes?: ITime[] = undefined;

  constructor(
    datepicker: JQuery<HTMLElement>,
    fromTime: JQuery<HTMLElement>,
    toTime: JQuery<HTMLElement>,
    results: JQuery<HTMLElement>,
    teaserText: JQuery<HTMLElement>,
    teaserBlock: JQuery<HTMLElement>,
    button: JQuery<HTMLElement>,
    spinner: JQuery<HTMLElement>,
    buttonText: JQuery<HTMLElement>,
    versionText: JQuery<HTMLElement>,
    cover: JQuery<HTMLElement>
  ) {
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
    this.jqCover = cover;

    this.currentColorStatus = ColorStatus.Error;
  }

  /**
   * Initialize the frontend elements by providing valid raster times
   *
   * @param startTimes A set of raster start times
   * @param endTimes A set of raster end times
   */
  public init(startTimes: ITime[], endTimes: ITime[]): void {
    this.startTimes = startTimes;
    this.endTimes = endTimes;

    this.initDatePicker();
    this.initTimePickers();
  }

  /**
   * Hides the cover that waited until the whole page got loaded
   */
  public hideCover(): void {
    this.jqCover.addClass("animate-fade-cover");
    setTimeout(() => this.jqCover.hide(), 200);
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
      if (!day || !from || (to && TimeUtils.isAfter(from, to))) {
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
  public render(
    text: string | null = null,
    result: IResult | null = null,
    color: ColorStatus = ColorStatus.NoResult
  ): void {
    this.renderTeaser(text, color);
    this.renderTable(result);
  }

  /**
   * Render the version tag
   *
   * @param version Version, represented by a `LocalDateTime`
   */
  public renderVersion(version: IDate): void {
    this.jqVersionText.html(`Index updated ${version.from(dayjs())}`);
  }

  /**
   * Render the button enabled or disabled with an additional loading spinner
   *
   * @param enabled Disable or enable the button
   * @param spinning Show a spinning animation
   */
  public renderButton(enabled: boolean, spinning: boolean | null = null): void {
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

  private getDate(): IDate | null {
    if (!this.datepicker || this.datepicker.selectedDates.length === 0) {
      return null;
    }

    const nativeDate: Date = this.datepicker.selectedDates[0];
    return dayjs(nativeDate);
  }

  private getFromTime(): ITime | null {
    const minutes = parseInt(
      this.jqFromTime.children("option:selected").val() as string,
      10
    );
    return minutes >= 0 ? TimeUtils.fromMinutes(minutes) : null;
  }

  private getToTime(): ITime | null {
    const minutes = parseInt(
      this.jqToTime.children("option:selected").val() as string,
      10
    );
    return minutes >= 0 ? TimeUtils.fromMinutes(minutes) : null;
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
      this.jqResults.css("opacity", "0");
    } else {
      const d = document;
      const fragment = d.createDocumentFragment();

      for (const room of result as IResult) {
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
          tdFrom.innerHTML = TimeUtils.toString(from);
          tr.appendChild(tdFrom);

          // to time
          const tdTo = d.createElement("td");
          tdTo.innerHTML = TimeUtils.toString(to);
          tr.appendChild(tdTo);

          fragment.appendChild(tr);
        }
      }

      if (this.jqResults.is(":visible")) {
        // flash the table to indicate an update
        this.jqResults.addClass("animate-fade-flash");
        setTimeout(() => this.jqResults.removeClass(), 400);
      } else {
        // animate initial show
        this.jqResults.show();
        this.jqResults.addClass("animate-fade-in");
        setTimeout(() => {
          this.jqResults.css("opacity", "1");
          this.jqResults.removeClass();
        }, 400);
      }

      // update the table body
      const body = this.jqResults.children("table").children("tbody");
      body.empty();
      body.append(fragment);
    }
  }

  private initDatePicker() {
    const today = new Date();
    const instance = this.jqDatepicker
      .datepicker({
        language,
        minDate: today,
        todayButton: today,
        toggleSelected: false,
      })
      .data("datepicker");

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

      if (!TimeUtils.isBefore(from, to)) {
        // find the closest to time that is greater than the new from time
        const rollover = obj.endTimes.find((e) => TimeUtils.isAfter(e, from));
        if (rollover) {
          obj.jqToTime.val(TimeUtils.toMinutes(rollover));
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

      if (!TimeUtils.isBefore(from, to)) {
        // find the closest from time that is smaller than the new to time
        const rollunder = obj.startTimes
          .slice()
          .reverse()
          .find((e) => TimeUtils.isBefore(e, to));
        if (rollunder) {
          obj.jqFromTime.val(TimeUtils.toMinutes(rollunder));
        }
      }
    }

    // add <option> fields to start time <select>
    this.startTimes.forEach((item) => {
      this.jqFromTime.append(
        $("<option></option>")
          .val(TimeUtils.toMinutes(item))
          .html(TimeUtils.toString(item))
      );
    });

    // add <option> fields to end time <select>
    this.endTimes.forEach((item) => {
      this.jqToTime.append(
        $("<option></option>")
          .val(TimeUtils.toMinutes(item))
          .html(TimeUtils.toString(item))
      );
    });

    // pre-select the closest start time in the past (or one up to 15 minutes in the future)
    const now = dayjs.duration({
      hours: dayjs().hour(),
      minutes: dayjs().minute(),
    });
    const setpoint = this.startTimes
      .slice()
      .reverse()
      .find((e) => TimeUtils.isAfter(now, e.subtract(15, "minutes")));
    if (setpoint) {
      this.jqFromTime.val(TimeUtils.toMinutes(setpoint));
    }

    // bind change listeners
    this.jqFromTime.change(() => fromTimeChanged(this));
    this.jqToTime.change(() => toTimeChanged(this));
  }
}
