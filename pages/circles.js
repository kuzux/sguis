import { useState, useRef, useEffect } from 'react';
import moment from 'moment';

class Observable {
    #value;

    constructor(init) {
        this.#value = init;
        this.observers = [];
    }

    get value() {
        return this.#value;
    }

    set value(v) {
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
        // we don't pop the elements immediately so that we can redo
        // when undid = 0, we can not redo
        this.undid = 0;

        // we cannot simply use stack = new Observable([]) since we use destructive updates on the stack
        // but using immutable.js is an option (Similarly in the model)
        this.observers = [];
    }

    // each action has an action id (such that 2 actions are merge-able if they have same id)
    // the data for action to go back to previous state
    // and the data for the action that was just done
    push(id, before, after) {
        let last = null;
        if(this.stack.length !== this.undid) last = this.stack[this.stack.length-1-this.undid];
        if(last?.id === id) {
            this.stack[this.stack.length-1-this.undid].after = after;
            return;
        }

        // adding a new one
        if(this.undid !== 0) {
            this.stack.splice(this.stack.length-this.undid, this.undid);
            this.undid = 0;
        }

        let data = { id, before, after };

        this.observers.forEach(obs => {
            obs({ action: "push", data });
        });

        this.stack.push(data);
    }

    canUndo() {
        return this.stack.length !== this.undid;
    }

    undo(fn) {
        if(!this.canUndo()) return false;

        let last = this.stack[this.stack.length-1-this.undid];
        fn(last.before);
        this.undid++;

        this.observers.forEach(obs => {
            obs({ action: "undo", data: last.before });
        });

        return true;
    }

    canRedo() {
        return this.undid !== 0;
    }

    redo(fn) {
        if(!this.canRedo()) return false;

        let last = this.stack[this.stack.length-this.undid];
        fn(last.after);
        this.undid--;

        this.observers.forEach(obs => {
            obs({ action: "redo", data: last.after });
        });

        return true;
    }

    observe(fn) {
        this.observers.push(fn);
    }
}

class Model {
    constructor() {
        this.circles = new Observable([]);
        this.nextId = 1;
    }

    // second argument is optional, you can specify an id
    addCircle(center, id = null) {
        if(!id) {
            id = this.nextId;
            this.nextId++;
        }

        let circle = { id: id, center: center, radius: 10 };
        this.circles.modify((cs) => [...cs, circle]);

        return circle;
    }

    removeCircle(id) {
        this.circles.modify(circles => {
            return circles.filter(circle => circle.id !== id);
        });
    }

    getCircles() {
        return this.circles.value;
    }

    // if argument is a function, filters by it
    // if it is a value, finds a circle with that id
    // returns null on not found
    findCircle(idOrFn) {
        let fn;
        if(typeof idOrFn === 'function') {
            fn = idOrFn;
        } else {
            fn = (circle) => circle.id === idOrFn;
        }
        let res = this.circles.value.find(fn);
        return res || null;
    }

    modifyEach(fn) {
        this.circles.modify((cs) => cs.map(fn));
    }

    observe(fn) {
        this.circles.observe(fn);
    }

    // returns the old and new radii
    setRadius(id, radius) {
        let oldRadius = null;
        this.modifyEach(circle => {
            let newRadius = circle.radius;
            if(circle.id === id) {
                oldRadius = circle.radius;
                newRadius = radius;
            }
            return { ...circle, radius: newRadius };
        });

        return { old: oldRadius, new: radius };
    }
}

class ViewModel {
    constructor() {
        this.rerender = null;

        this.model = new Model();
        this.undoStack = new UndoStack();
        this.radius = new Observable(20);
        this.selected = new Observable(null);
        
        this.selectionId = 0;

        this.model.observe(() => {
            if(this.rerender) this.rerender();
        });
        this.undoStack.observe(() => {
            if(this.rerender) this.rerender();
        });

        this.radius.observe(() => {
            if(this.rerender) this.rerender();
        });
        this.selected.observe(() => {
            if(this.rerender) this.rerender();
        });
    }

    select(id) {
        let selectedCircle = this.model.findCircle(id);
        if(!selectedCircle) return;

        this.model.modifyEach(circle => {
            return {...circle, selected: circle.id === id};
        });
        this.selectionId++;
        this.selected.value = id;
        this.radius.value = selectedCircle.radius;
    }

    deselect() {
        this.model.modifyEach(circle => {
            return { ...circle, selected: false };
        });
        this.selected.value = null;
    }

    setSelectedRadius(radius) {
        if(!this.selected.value) return;
        this.radius.value = radius;

        let radii = this.model.setRadius(this.selected.value, radius);
        this.undoStack.push(`radius-${this.selectionId}`, 
            { action: 'set-radius', id: this.selected.value, radius: radii.old }, 
            { action: 'set-radius', id: this.selected.value, radius: radii.new });
    }

    click(point) {
        // debouncing for 20 ms
        let nowMs = moment().valueOf();
        if(this.lastCall && nowMs - this.lastCall < 20) return;
        this.lastCall = nowMs;

        let clicked = this.model.findCircle(circle => {
            let dx = (point.x-circle.center.x);
            let dy = (point.y-circle.center.y);
            let sqdist = dx*dx+dy*dy;
            let sqr = circle.radius * circle.radius;

            return sqdist <= sqr;
        });

        if(clicked === null) {
            let circle = this.model.addCircle(point);
            this.select(circle.id);

            this.undoStack.push(`circle-${circle.id}`, 
                { action: 'remove-circle', id: circle.id }, 
                { action: 'add-circle', id: circle.id, center: point });

            return;
        }

        if(clicked && clicked.id === this.selected.value) {
            this.deselect();
            return;
        }

        this.select(clicked.id);
    }

    getCircles() {
        return this.model.getCircles();
    }

    canUndo() {
        return this.undoStack.canUndo();
    }

    undo() {
        this.undoStack.undo((data) => {
            if(data.action === 'set-radius') {
                this.model.setRadius(data.id, data.radius);
            } else if(data.action === 'remove-circle') {
                this.model.removeCircle(data.id);
            }
        });
    }

    canRedo() {
        return this.undoStack.canRedo();
    }

    redo() {
        this.undoStack.redo((data) => {
            if(data.action === 'set-radius') {
                this.model.setRadius(data.id, data.radius);
            } else if(data.action === 'add-circle') {
                this.model.addCircle(data.center, data.id);
            }
        });
    }
}

export default function Circles() {
    // the main architecture is that the view model is a react-agnostic, stateful object
    // it has a re-render callback that both redraws the canvas and re-renders the gui
    // we can call methods on it to mutate state and (possibly) force a re-render
    let vm = useRef(new ViewModel());
    let canvasRef = useRef();

    // we achieve re-rendering by holding on to an integer and incrementing it every time we want to rerender
    let [_renderTick, setRenderTick] = useState(0);

    // we need to set up the callbacks (and the event listener) only once
    useEffect(() => {
        vm.current.rerender = () => {
            // rerender ui first, then redraw the canvas
            setRenderTick(tick => tick+1);

            if(!canvasRef.current) return;
            let ctx = canvasRef.current.getContext('2d');
            let circles = vm.current.getCircles();

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

        canvasRef.current.addEventListener("click", (evt) => {
            vm.current.click({ x: evt.x, y: evt.y });
        });
    }, []);

    let slider;
    if(vm.current.selected) {
        slider = <input type="range" min="5" max="50" value={vm.current.radius.value} onChange={evt => {
            vm.current.setSelectedRadius(parseInt(evt.target.value));
        }} />;
    }

    return <div>
        <canvas width={800} heigh={600} ref={canvasRef}></canvas>
        <p>{slider}</p>
        <p>
            <button disabled={!vm.current.canUndo()} onClick={()=>vm.current.undo()}>Undo</button>
            <button disabled={!vm.current.canRedo()} onClick={()=>vm.current.redo()}>Redo</button>
        </p>
    </div>
}
