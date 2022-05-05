import { useState } from 'react';

function ViewModel() {
    let cToF = (c) => c * 1.8 + 32;
    let fToC = (f) => (f - 32) / 1.8;

    let [celsius, setCelsius] = useState(0.0);
    let fahrenheit = cToF(celsius);

    let setFahrenheit = (f) => setCelsius(fToC(f));

    return {celsius, fahrenheit, setCelsius, setFahrenheit};
}

export default function TemperatureConverter() {
    let temp = ViewModel();

    return <div>
        <p>Celsius: <input type="text" value={temp.celsius} onChange={(evt) => {
            temp.setCelsius(evt.target.value);
        }} /></p>
        <p>Celsius: <input type="text" value={temp.fahrenheit} onChange={(evt) => {
            temp.setFahrenheit(evt.target.value);
        }} /></p>
    </div>
}