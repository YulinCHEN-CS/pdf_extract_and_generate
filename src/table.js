module.exports = class Table {
    constructor(name) {
        this.name = name;
        this.keys = [];
        this.values = [];
    }

    addCells(cells) {
        // console.log(this.keys.length, this.values.length);
        if (this.keys.length <= this.values.length) {
            this.keys = this.keys.concat(cells);
        } else {
            this.values = this.values.concat(cells);
        }
    }

    toString() {
        return `Table {
    name: ${this.name},
    
    keys: ${JSON.stringify(this.keys)},

    values: ${JSON.stringify(this.values)}
}`;
    }
}