import { useState, useRef, useEffect } from 'react';
import moment from 'moment';

class Observable {
    #value;

    constructor(init) {
        this.#value = init;
        this.observers = [];
    }

    get() {
        return this.#value;
    }

    set(v) {
        this.#value = v;
        this.observers.forEach(obs => {
            obs(v);
        });
    }

    modify(fn) {
        let v = fn(this.#value);
        this.#value = v;
        this.observers.forEach(obs => {
            obs(v);
        });
    }

    observe(fn) {
        this.observers.push(fn);
    }
}

class UndoStack {
    constructor() {
        this.stack = [];
    }

    // each action has an action id (such that 2 actions are merge-able if they have same id)
    // the data for action to go back to previous state
    // and the data for the action that was just done
    push(id, before, after) {
        let last = null;
        if(this.stack.length !== 0) last = this.stack[this.stack.length-1];
        if(last?.id === id) {
            this.stack[this.stack.length-1].after = after;
        } else {
            this.stack.push({id, before, after});
        }
    }

    canUndo() {
        this.stack.length !== 0;
    }

    undo(fn) {
        if(!this.canUndo()) return false;
        fn(this.stack.pop());
        return true;
    }

    redo(fn) {
        return false;
    }
}

class Model {
    constructor() {
        this.circles = new Observable([]);
        this.nextId = 1;
    }

    addCircle(center) {
        let circle = { id: this.nextId, center: center, radius: 20 };
        this.nextId++;
        this.circles.modify((cs) => [...cs, circle]);
        return circle;
    }

    getCircles() {
        return this.circles.get();
    }

    modifyEach(fn) {
        this.circles.modify((cs) => cs.map(fn));
    }

    onCircles(fn) {
        this.circles.observe(fn);
    }
}

class ViewModel {
    constructor() {
        this.draw = null;
        this.model = new Model();
        this.radius = 20;

        this.model.onCircles((cs) => {
            if(this.draw) this.draw(cs);
        });

        // for testing
        setTimeout(() => {
            this.model.addCircle({ x: 50, y: 50 });
            this.model.addCircle({ x: 100, y: 100 });
        }, 100);
    }

    select(id) {
        let selectedCircle = this.model.getCircles().find(circle => circle.id === id);
        if(!selectedCircle) return;

        this.model.modifyEach(circle => {
            return {...circle, selected: circle.id === id};
        });
        this.selected = id;
        this.radius = selectedCircle.radius;
        if(this.rerender) this.rerender();
    }

    deselect() {
        this.model.modifyEach(circle => {
            return { ...circle, selected: false };
        });
        this.selected = null;
        if(this.rerender) this.rerender();
    }

    setRadius(id, radius) {
        this.model.modifyEach(circle => {
            let newRadius = circle.radius;
            if(circle.id === this.selected) newRadius = radius;
            return { ...circle, radius: newRadius };
        });

        if(this.rerender) this.rerender();
    }

    setSelectedRadius(radius) {
        this.radius = radius;
        if(!this.selected) return;

        this.setRadius(this.selected, radius);

        // TODO: Add undo point here
    }

    click(point) {
        // debouncing for 20 ms
        let nowMs = moment().valueOf();
        if(this.lastCall && nowMs - this.lastCall < 20) return;
        this.lastCall = nowMs;

        let clicked = this.model.getCircles().find((circle) => {
            let dx = (point.x-circle.center.x);
            let dy = (point.y-circle.center.y);
            let sqdist = dx*dx+dy*dy;
            let sqr = circle.radius * circle.radius;

            return sqdist <= sqr;
        });

        if(clicked === undefined) {
            let circle = this.model.addCircle(point);
            if(this.rerender) this.rerender();
            this.select(circle.id);
            // TODO: Add undo poimt here as well
            return;
        }

        if(clicked && clicked.id === this.selected) {
            this.deselect();
            return;
        }

        this.select(clicked.id);
    }
}

export default function Circles() {
    let vm = useRef(new ViewModel());
    let canvasRef = useRef();

    let [_renderTick, setRenderTick] = useState(0);
    let forceRerender = () => setRenderTick(tick => tick+1);

    useEffect(() => {
        vm.current.draw = (circles) => {
            if(!canvasRef.current) return;
            let ctx = canvasRef.current.getContext('2d');

            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
            circles.forEach((circle) => {
                ctx.fillStyle = 'grey';
                ctx.strokeStyle = 'black';
                ctx.beginPath();
                ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, 2* Math.PI);
                ctx.stroke();
                if(circle.selected) ctx.fill();
            });
        };

        vm.current.rerender = () => {
            forceRerender();
        }

        canvasRef.current.addEventListener("click", (evt) => {
            vm.current.click({ x: evt.x, y: evt.y });
            forceRerender();
        });
    }, []);

    let slider;
    if(vm.current.selected) {
        slider = <input type="range" min="5" max="200" value={vm.current.radius} onChange={evt => {
            vm.current.setSelectedRadius(parseInt(evt.target.value));
        }} />;
    }

    return <div>
        <canvas width={800} heigh={600} ref={canvasRef}></canvas>
        <p>{slider}</p>
    </div>
}
