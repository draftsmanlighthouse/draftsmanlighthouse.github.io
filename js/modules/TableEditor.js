document.addEventListener('alpine:init', () => {
    Alpine.data('tableEditor', () => ({
        init(){
            this.readonly ??= false;
        },
        get_cell(row,col) {
            // Zoek bestaande cel
            let cell = this.section.data.find(x => x.row === row && x.col === col);

            // Bestaat niet? Maak lege default cel
            if (!cell) {
                cell = { row, col, value: '', bold: false, italic:false,bg: null, color: null};
                section.data.push(cell);
            }
            return cell;
        },

        updateCell(row,col,value) {
            const cell = this.get_cell(row,col);
            cell.value = value;
            this.$dispatch('change');
        },

        openCellMenu(row,col,evt) {
            this.contextCell = { row, col };
            this.showContextMenu(evt.pageX, evt.pageY);
        },
        cellClass(row, col) {
            const cell = this.get_cell(row, col);

            const isHeader =
                (col === 0 && this.section.header?.row) ||
                (row === 0 && this.section.header?.col);

            return {
                // statisch
                'border border-base-200': true,

                // headers
                'bg-base-200 font-semibold text-base-content/80 border-base-300 text-lg': isHeader,

                // tekststijl
                'font-bold': cell.bold === true,
                'italic': cell.italic === true,
            };
        },
        cellStyle(row, col) {
            const cell = this.get_cell(row, col);

            let style = {};

            if (cell.bg) {
                style['background-color'] = cell.bg;
            }
            if (cell.fg) {
                style['color'] = cell.fg;
            }

            return style;
        },
        contextMenu: {
            visible: false,
            x: 0,
            y: 0
        },

        showContextMenu(x,y){
            this.contextMenu.visible = true;
            this.contextMenu.x = x;
            this.contextMenu.y = y;
        },

        hideContextMenu(){
            this.contextMenu.visible = false;
        },

        toggleBold(){
            let cell = this.get_cell(this.contextCell.row,this.contextCell.col);
            cell.bold = !cell.bold;
            this.hideContextMenu();
            this.$dispatch('change');
        },

        toggleItalic(){
            let cell = this.get_cell(this.contextCell.row,this.contextCell.col);
            cell.italic = !cell.italic;
            this.hideContextMenu();
            this.$dispatch('change');
        },

        setBg(color){
            let cell = this.get_cell(this.contextCell.row,this.contextCell.col);
            cell.bg = color;
            this.$dispatch('change');
        },

        setColor(color){
            let cell = this.get_cell(this.contextCell.row,this.contextCell.col);
            cell.color = color;
            this.$dispatch('change');
        },

        resetCell(){
            let cell = this.get_cell(this.contextCell.row,this.contextCell.col);
            delete cell.bold;
            delete cell.italic;
            delete cell.bg;
            delete cell.color;
            this.hideContextMenu();
            this.$dispatch('change');
        }
    }));
});