module.exports = class Table {
    constructor(name, pageNumber) {
        this.name = name;
        this.pageNumber = pageNumber;
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
    
    page number: ${this.pageNumber},

    keys: ${this.keys.join('\n')},

    values: ${this.values.join('\n')}
}`;
    }
}