import $, { Cash } from "cash-dom";
import AirDatepicker from "air-datepicker";

import {
  library,
  findIconDefinition,
  icon,
} from "@fortawesome/fontawesome-svg-core";
import { faUser } from "@fortawesome/free-regular-svg-icons";
library.add(faUser);

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(duration);
dayjs.extend(relativeTime);

import { DATEPICKER_LANGUAGE } from "./language";
import { LogUtils, TimeUtils } from "../../common/utils";
import { ApiQuery, ApiResponse, Day, Time } from "../../common/types";

/**
 * Represents the color of the teaser block
 */
export enum TeaserState {
  Success = "bg-primary",
  NoResult = "bg-secondary",
  Error = "bg-danger",
}

/**
 * Represents the search button states
 */
export enum ButtonState {
  Disabled,
  Enabled,
  Spinning,
}

/**
 * Represents the elements on the frontend
 */
export interface FrontendElements {
  datepicker: HTMLElement;
  fromTime: Cash;
  toTime: Cash;
  results: Cash;
  teaserText: Cash;
  teaserBlock: Cash;
  spinner: Cash;
  buttonText: Cash;
  versionText: Cash;
  cover: Cash;
  button: HTMLInputElement;
  anchor: HTMLElement;
}

export class Frontend {
  private readonly elements: FrontendElements;
  private currentTeaserState: TeaserState;
  private datepicker?: AirDatepicker = undefined;

  /**
   * Pass-through to datepicker.onSelect event
   * without any event parameters
   */
  public datepickerOnSelect: (date: Date | Date[]) => void = () => {
    /* to be set */
  };

  constructor(elements: FrontendElements) {
    this.elements = elements;
    this.currentTeaserState = TeaserState.NoResult;
  }

  /**
   * Initialize the frontend elements by providing valid raster times
   *
   * @param startTimes A set of raster start times
   * @param endTimes A set of raster end times
   */
  public init(startTimes: Time[], endTimes: Time[]): void {
    this.initDatePicker();
    this.initTimePickers(startTimes, endTimes);
    this.render();
  }

  /**
   * Fades out the cover that waited until the whole page got loaded
   */
  public hideCover(): void {
    this.elements.cover.addClass("animate-fade-cover");
    setTimeout(() => this.elements.cover.hide(), 200);
  }

  /**
   * Render query results and the info label
   *
   * @param text Text to be displayed in the teaser or `null` for nothing
   * @param color Color of the teaser text block
   * @param result Result object or `null` for nothing
   * @param animate Whether to animate the result block rendering
   */
  public render(
    text: string | null = null,
    color: TeaserState = TeaserState.NoResult,
    result: ApiResponse | null = null,
    animate = false
  ): void {
    this.renderTeaser(text, color);
    this.renderTable(result, animate);
  }

  /**
   * Render the version tag
   *
   * @param version Version, represented by a `Day` object
   */
  public renderVersion(version: Day): void {
    this.elements.versionText.html(`Index updated ${version.from(dayjs())}`);
  }

  /**
   * Render the button state
   *
   * @param state The desired state of the button
   */
  public renderButton(state: ButtonState): void {
    switch (state) {
      case ButtonState.Disabled:
        this.elements.spinner.hide();
        this.elements.buttonText.show();
        this.elements.button.disabled = true;
        break;
      case ButtonState.Enabled:
        this.elements.spinner.hide();
        this.elements.buttonText.show();
        this.elements.button.disabled = false;
        break;
      case ButtonState.Spinning:
        this.elements.spinner.css("display", "inline-block");
        this.elements.buttonText.hide();
        this.elements.button.disabled = true;
        break;
    }
  }

  /**
   * Retrieve the current form inputs
   */
  public getQuery(): ApiQuery | null {
    try {
      const day = this.getDate();
      const from = this.getTime(this.elements.fromTime);
      const to = this.getTime(this.elements.toTime);

      // sanity checks (toMinutes is allowed to be NULL)
      if (!day || !from || (to && TimeUtils.isAfter(from, to))) return null;
      return { day, from, to };
    } catch (e) {
      LogUtils.error("err::queryFail", (e as Error).message);
      return null;
    }
  }

  /**
   * Retrieve the scroll anchor element
   */
  public getAnchor(): HTMLElement {
    return this.elements.anchor;
  }

  private getDate(): Day | null {
    if (!this.datepicker || this.datepicker.selectedDates.length === 0)
      return null;
    return dayjs(this.datepicker.selectedDates[0]);
  }

  private getTime(element: Cash): Time | null {
    const text = element.val() as string;
    const minutes = parseInt(text, 10);
    return minutes >= 0 ? TimeUtils.fromMinutes(minutes) : null;
  }

  private renderTeaser(text: string | null, color: TeaserState) {
    if (!text) {
      this.elements.teaserBlock.hide();
    } else {
      // switch the color class if necessary
      if (color !== this.currentTeaserState) {
        this.elements.teaserBlock
          .addClass(color)
          .removeClass(this.currentTeaserState);
      }
      this.currentTeaserState = color;

      this.elements.teaserText.html(text);
      this.elements.teaserBlock.show();
    }
  }

  private renderTable(result: ApiResponse | null, animate = false) {
    if (!result || (result as ApiResponse).length === 0) {
      this.elements.results.hide();
      this.elements.results.css("opacity", "0");
      return;
    }

    const doc = document;
    const fragment = doc.createDocumentFragment();

    for (const room of result as ApiResponse) {
      const from = room.match[0];
      const to = room.match[1];

      const tr = doc.createElement("tr");

      // add room name
      const th = doc.createElement("th");
      th.title = "Room name";
      th.innerHTML = room.room;
      th.scope = "row";
      tr.appendChild(th);

      // capacity info
      const tdCapacity = doc.createElement("td");
      tdCapacity.title = "Room capacity";
      if (room.capacity != null) {
        const span = doc.createElement("span");
        span.innerHTML = room.capacity.toString();
        span.className = "capacity small text-muted";

        // append the seat icon svg
        const user = findIconDefinition({ prefix: "far", iconName: "user" });
        const ico = icon(user);
        Array.from(ico.node).map((n) => tdCapacity.appendChild(n));

        tdCapacity.appendChild(span);
      }
      tr.appendChild(tdCapacity);

      // from time
      const tdFrom = doc.createElement("td");
      tdFrom.title = "Free from";
      tdFrom.innerHTML = TimeUtils.toString(from);
      tr.appendChild(tdFrom);

      // to time
      const tdTo = doc.createElement("td");
      tdTo.title = "Free until";
      tdTo.innerHTML = TimeUtils.toString(to);
      tr.appendChild(tdTo);

      fragment.appendChild(tr);
    }

    if (animate) {
      this.animateTable();
    } else {
      this.elements.results.show();
      this.elements.results.css("opacity", "1");
    }

    // update the table body
    const body = this.elements.results
      .children("div")
      .children("table")
      .children("tbody");
    body.empty();
    body.append(fragment);
  }

  private animateTable() {
    const tab = this.elements.results;

    if (tab.css("display") !== "none") {
      // briefly flash the existing table to indicate an update
      tab.addClass("animate-fade-flash");
      setTimeout(() => tab.removeClass("animate-fade-flash"), 400);
    } else {
      // fade in the entire table on the first render
      tab.show();
      tab.addClass("animate-fade-in");
      setTimeout(() => {
        tab.css("opacity", "1");
        tab.removeClass("animate-fade-in");
      }, 400);
    }
  }

  private initDatePicker() {
    const today = new Date();
    this.datepicker = new AirDatepicker(this.elements.datepicker, {
      locale: DATEPICKER_LANGUAGE,
      inline: true,
      minDate: today,
      buttons: {
        content: "Today",
        attrs: { type: "button" },
        onClick: (dp) => dp.selectDate(today),
      },
      toggleSelected: false,
      selectedDates: [today],
      onSelect: (event) => this.datepickerOnSelect(event.date),
    });
  }

  private initTimePickers(startTimes: Time[], endTimes: Time[]) {
    const revStartTimes = startTimes.slice().reverse();

    // event for rolling the to time forwards if the from time gets changed
    function fromTimeChanged(obj: Frontend) {
      const from = obj.getTime(obj.elements.fromTime);
      const to = obj.getTime(obj.elements.toTime);

      if (from == null || to == null || endTimes == null) return;

      if (!TimeUtils.isBefore(from, to)) {
        // find the closest to time that is greater than the new from time (roll-over)
        const newval = endTimes.find((e) => TimeUtils.isAfter(e, from));
        if (newval)
          obj.elements.toTime.val(TimeUtils.toMinutes(newval).toString());
      }
    }

    // event for rolling the from time backwards if the to time gets changed
    function toTimeChanged(obj: Frontend) {
      const from = obj.getTime(obj.elements.fromTime);
      const to = obj.getTime(obj.elements.toTime);

      if (from == null || to == null || startTimes == null) return;

      if (!TimeUtils.isBefore(from, to)) {
        // find the closest from time that is smaller than the new to time (roll-under)
        const newval = revStartTimes.find((e) => TimeUtils.isBefore(e, to));
        if (newval)
          obj.elements.fromTime.val(TimeUtils.toMinutes(newval).toString());
      }
    }

    // add <option> fields to start time <select>
    startTimes.forEach((item) => {
      this.elements.fromTime.append(
        $("<option></option>")
          .val(TimeUtils.toMinutes(item).toString())
          .html(TimeUtils.toString(item))
      );
    });

    // add <option> fields to end time <select>
    endTimes.forEach((item) => {
      this.elements.toTime.append(
        $("<option></option>")
          .val(TimeUtils.toMinutes(item).toString())
          .html(TimeUtils.toString(item))
      );
    });

    const now = dayjs.duration({
      hours: dayjs().hour(),
      minutes: dayjs().minute(),
    });

    // pre-select the closest start time in the past (or one up to 15 minutes in the future)
    const setpoint = revStartTimes.find((e) =>
      TimeUtils.isAfter(now, e.subtract(15, "minutes"))
    );

    if (setpoint) {
      this.elements.fromTime.val(TimeUtils.toMinutes(setpoint).toString());
    }

    // bind the change listeners on the drop downs
    this.elements.fromTime.on("change", () => fromTimeChanged(this));
    this.elements.toTime.on("change", () => toTimeChanged(this));
  }
}
