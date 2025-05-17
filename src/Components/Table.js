//columns - 

Table = {
    notes: null,
    name: '',
    columns: [],
    primaryKey: null,
    foreignKeys: []
};

StandardColumn = {
    name: '',
    type: '',
    typeLength: '',
    nullable: true,
    unique: false,
    primaryKey: false,
    foreignKey: false
};

ForeignKey = {
    name: '',
    referenceTable: '',
    referenceColumn: ''
}
    // mouse move for dragging handler
//   const handleTableMouseUp = () => {                                 