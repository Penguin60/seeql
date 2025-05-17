//columns - 

Table = {
    notes: null,
    name: '',
    columns: [],
    primaryKey: [],
    foreignKeys: []
};

StandardColumn = {
    name: '',
    type: '',
    default: '',
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
