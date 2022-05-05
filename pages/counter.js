import { useState } from 'react';

export default function Counter() {
    let [count, setCount] = useState(0);

    let increment = () => {
        setCount((count) => count + 1);
    }

    return <div>
        <p>{count}</p>
        <p><button onClick={increment}>Count</button></p>
    </div>
}