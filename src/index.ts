import 'bootstrap/dist/css/bootstrap.min.css';
import 'air-datepicker/dist/css/datepicker.min.css';

import 'air-datepicker';

/* prepare datepicker */

var today: Date = new Date();

var language: AirDatepickerLanguageInstance = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'mm/dd/yyyy',
    timeFormat: 'hh:ii aa',
    firstDay: 1
};

var datePicker = $('#inputDatePicker').datepicker({
    language: language,
    toggleSelected: false,
    todayButton: today,
    minDate: today
}).data('datepicker');

datePicker.selectDate(today);

/* app logic */

let teaserText: JQuery<HTMLElement> = $("#resultTeaserText")!;
let teaserBlock: JQuery<HTMLElement> = $("#resultTeaserBlock");
let message: string = "I found free rooms :)";

teaserText.html(message);
teaserBlock.addClass('bg-success').removeClass('bg-danger');