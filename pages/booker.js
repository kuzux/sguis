import { useState } from 'react';
import moment from 'moment';

function ViewModel() {
    let [type, setType] = useState("one-way");
    let [date1, setDate1] = useState(moment().format('DD.MM.YYYY'));
    let [date2, setDate2] = useState("");

    let date1Valid = moment(date1).isValid() && moment(date1).isSameOrAfter(moment(), 'day');
    let date2Valid = type == "one-way" || moment(date2).isValid() &&
        moment(date2).isSameOrAfter(moment(), 'day') &&
        moment(date1).isBefore(date2);

    let date = { 
        available: true,
        valid: date1Valid, 
        value: date1, 
        set: setDate1
    };

    let returnDate = {
        available: type === "return",
        valid: date2Valid,
        value: date2,
        set: setDate2
    };

    // is the booking available
    let available = type === "one-way" && date1Valid || date1Valid && date2Valid

    return { date, returnDate, available, type, setType };
}

export default function FlightBooker() {
    let booking = ViewModel();

    return <div>
        <p>
            <select value={booking.type} onChange={(evt) => {
                booking.setType(evt.target.value);
            }}>
                <option value="one-way">One-Way</option>
                <option value="return">Return</option>
            </select>
        </p>
        <p>
            <input type="text" 
                value={booking.date.value} 
                disabled={!booking.date.available}
                style={{backgroundColor: booking.date.valid ? "white" : "red"}}
                onChange={(evt) => {
                    booking.date.set(evt.target.value);
                }}/>
        </p>
        <p>
            <input type="text" 
                value={booking.returnDate.value} 
                disabled={!booking.returnDate.available} 
                style={{backgroundColor: booking.returnDate.valid ? "white" : "red"}}
                onChange={(evt) => {
                    booking.returnDate.set(evt.target.value);
                }} />
        </p>
        <p>
            <button disabled={!booking.available}>Book</button>
        </p>
    </div>
}