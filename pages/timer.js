import { useState, useEffect, useRef } from 'react';

export default function Timer() {
    let startTimeRef = useRef(null);
    let [elapsed, setElapsed] = useState(0.0);
    let [timer, setTimer] = useState(10.0);
    // the runTimer function closes over the timer value
    // so when we change it, it does not take effect in that comparison
    // so, we chanhge it twice. One for re-rendering, one for the runTimer function
    let timerRef = useRef(timer);

    let ratio = elapsed / timer;

    let runTimer = () => {
        window.requestAnimationFrame((timestamp) => {
            if(startTimeRef.current == null) startTimeRef.current = timestamp;
            let newElapsed = (timestamp - startTimeRef.current) / 1000;
            if(newElapsed >= timerRef.current) {
                startTimeRef.current = timestamp;
                newElapsed = 0.0
            }
            setElapsed(newElapsed);
            runTimer();
        })
    }

    useEffect(() => runTimer(), []);

    return <div>
        <p><progress value={ratio*100} max={100} />{elapsed.toFixed(1)}s</p>
        <p><input type="range" min={2} max={20} value={timer} onChange={(evt) => {
            setTimer(evt.target.value);
            timerRef.current = evt.target.value;
        }}/> </p>
    </div>
}