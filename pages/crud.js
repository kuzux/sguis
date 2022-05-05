import { useState } from 'react';

function Model() {
    let [nextId, setNextId] = useState(0);
    let [data, setData] = useState([]);

    let create = (name, surname) => {
        let record = {id: nextId, name, surname};
        setData([...data, record]);
        setNextId(nextId+1);
    };

    let read = () => data;

    let update = (id, name, surname) => {
        let record = { id, name, surname }
        let newData = data.map((r) => {
            if(r.id === id) return record;
            return r;
        });
        setData(newData);
    };

    let del = (id) => {
        let newData = data.filter((r) => r.id !== id);
        setData(newData);
    }

    return { create, read, update, delete: del };
}

function ViewModel() {
    let model = Model();

    let [name, setName] = useState("");
    let [surname, setSurname] = useState("");

    let [selected, setSelected] = useState(null);
    let [filter, setFilter] = useState("");

    let items = model.read().filter((item) => {
        return item.name.startsWith(filter) || item.surname.startsWith(filter)
    }).map((item) => {
        return {
            id: item.id, 
            value: `${item.surname}, ${item.name}`,
            selected: item.id === selected,
        }
    });

    let select = (id) => {
        let data = model.read();
        let [item] = data.filter((i) => i.id === id);
        if(!item) return;

        if(selected == id) {
            setSelected(null);
            return;
        }

        setSelected(id);
        setName(item.name);
        setSurname(item.surname);
    }

    let deselect = () => {
        setSelected(null);
    }

    let create = () => {
        model.create(name, surname);
    }

    let update = () => {
        if(!selected) return;
        model.update(selected, name, surname);
    }

    let del = () => {
        if(!selected) return;
        model.delete(selected);
        setSelected(null);
    }

    return {
        name: { value: name, set: setName },
        surname: { value: surname, set: setSurname },
        filter: { value: filter, set: setFilter },
        items,
        select,
        hasSelected: selected !== null,
        create,
        update,
        delete: del
    };
}

export default function Crud() {
    let vm = ViewModel();

    let items = vm.items.map((item) => <li 
        key={item.id} 
        style={{backgroundColor: item.selected ? "gray" : "white"}}
        onClick={()=>vm.select(item.id)}>
            {item.value}
        </li>);

    return <div>
        <p>
            <input type="text" value={vm.filter.value} onChange={evt=>vm.filter.set(evt.target.value)} />
        </p>
        <ul>
            {items}
        </ul>
        <p>Name: <input type="text" value={vm.name.value} onChange={evt=>vm.name.set(evt.target.value)} /></p>
        <p>Surname: <input type="text" value={vm.surname.value} onChange={evt=>vm.surname.set(evt.target.value)} /></p>
        <p>
            <button onClick={vm.create}>Create</button>
            <button onClick={vm.update} disabled={!vm.hasSelected}>Update</button>
            <button onClick={vm.delete} disabled={!vm.hasSelected}>Delete</button>
        </p>
    </div>
}