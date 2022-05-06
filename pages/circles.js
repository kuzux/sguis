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

class Model {
    constructor() {
        this.circles = new Observable([]);
        this.nextId = 0;
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
        let selectedCircle = this.model.circles.find(circle => circle.id === id);
        if(!selectedCircle) return;

        this.model.modifyEach(circle => {
            return {...circle, selected: circle.id === id};
        });
        this.selected = id;
        this.radius = selectedCircle.radius;
    }

    deselect() {
        this.model.modifyEach(circle => {
            return { ...circle, selected: false };
        });
        this.selected = null;
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

        if(clicked === undefined || clicked.id === this.selected) {
            console.log("deselecting");
            this.deselect();
            return;
        }

        this.select(clicked.id);
        console.log("clicked", clicked);
    }

    setSelectedRadius() {
        this.model.modifyEach(circle => {
            let newRadius = circle.radius;
            if(circle.id === this.selected) newRadius = this.radius;
        });

        // TODO: Add undo point here
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

        canvasRef.current.addEventListener("click", (evt) => {
            vm.current.click({ x: evt.x, y: evt.y });
            forceRerender();
        });
    }, []);

    let slider;
    // how do we make sure that this is updated every time 
    if(vm.current.selected) {
    }

    return <div>
        <canvas width={800} heigh={600} ref={canvasRef}></canvas>
        <p>{slider}</p>
    </div>
}
