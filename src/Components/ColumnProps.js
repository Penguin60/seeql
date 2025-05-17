import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";

function ColumnProps(props) {
  const { tables, tempTable, tempColumn, setTempColumn, setTempTable } = props;

  // Column handling
  const handleColumnNameChange = (e) => {
    // Disallow semicolons, numbers, and spaces in column names
    if (/^[^;\d\s]*$/.test(e.target.value)) {
      const newName = e.target.value;
      // Update tempTable.primaryKey if this column is PK
      if (tempColumn.primaryKey) {
        setTempTable((prevTable) => ({
          ...prevTable,
          primaryKey: newName,
        }));
      }
      // Update only the name, keep all other values
      setTempColumn({ ...tempColumn, name: newName });
    }
  };

  const handleColumnTypeChange = (e) => {
    setTempColumn({ ...tempColumn, type: e.target.value });
  };

  const handleColumnTypeLengthChange = (e) => {
    // Allow only numbers in type length
    if (/^\d*$/.test(e.target.value)) {
      setTempColumn({ ...tempColumn, typeLength: e.target.value });
    }
  };

  const handleColumnNullableChange = (e) => {
    setTempColumn({ ...tempColumn, nullable: e.target.checked });
  };

  const handleColumnUniqueChange = (e) => {
    setTempColumn({ ...tempColumn, unique: e.target.checked });
  };
  const handleColumnForeignKeyChange = (e) => {
    const isForeignKey = e.target.checked;

    setTempColumn({
      ...tempColumn,
      foreignKey: isForeignKey,
      // Reset references if turning off foreign key
      references: isForeignKey
        ? tempColumn.references
        : { tableId: "", columnName: "" },
    });
  };

  const handleReferenceTableChange = (e) => {
    setTempColumn({
      ...tempColumn,
      references: {
        ...tempColumn.references,
        tableId: e.target.value,
        columnName: "", // Reset column when table changes
      },
    });
  };

  const handleReferenceColumnChange = (e) => {
    const selectedColumnName = e.target.value;
    const referencedTable = tables.find(
      (t) => t.id === tempColumn.references.tableId
    );
    const referencedColumn = referencedTable?.columns.find(
      (c) => c.name === selectedColumnName
    );

    // Copy properties from the referenced column
    if (referencedColumn) {
      // Generate a suggested name (tableName_columnName format)
      const suggestedName = tempColumn.name || `${selectedColumnName}`;

      setTempColumn({
        ...tempColumn,
        // Auto-populate name if it's empty
        name: tempColumn.name || suggestedName,
        // Copy type from referenced column
        type: referencedColumn.type,
        typeLength: referencedColumn.typeLength || "",
        references: {
          ...tempColumn.references,
          columnName: selectedColumnName,
        },
      });
    } else {
      // Just update the reference if column not found
      setTempColumn({
        ...tempColumn,
        references: {
          ...tempColumn.references,
          columnName: selectedColumnName,
        },
      });
    }
  };

  // When a column's primaryKey is set, update tempTable.primaryKey accordingly
  const handleColumnPrimaryKeyChange = (e) => {
    const isPrimaryKey = e.target.checked;
    // Do NOT use setTempColumn with a function form here, as it breaks controlled input
    const updatedCol = {
      ...tempColumn,
      primaryKey: isPrimaryKey,
      nullable: isPrimaryKey ? false : tempColumn.nullable,
      unique: isPrimaryKey ? true : tempColumn.unique,
    };
    setTempColumn(updatedCol);
    setTempTable((prevTable) => {
      if (isPrimaryKey) {
        return { ...prevTable, primaryKey: updatedCol.name };
      } else {
        const otherPK = prevTable.columns?.find(
          (col) => col.primaryKey && col.name !== updatedCol.name
        );
        if (!otherPK) {
          return { ...prevTable, primaryKey: null };
        }
        return prevTable;
      }
    });
  };

  return (
    <div>
      <Divider sx={{ mx: "auto", width: "98%", mb: 2 }} />
      <div
        style={{
          width: "98%",
          display: "flex",
          gap: "10px",
          marginBottom: "10px",
          justifyContent: "center",
        }}
      >
        <TextField
          label="Column Name"
          value={tempColumn.name}
          onChange={handleColumnNameChange}
          required
          size="small"
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Data Type"
          value={tempColumn.type}
          onChange={handleColumnTypeChange}
          required
          size="small"
          sx={{ flex: 1 }}
          fullWidth
        >
          <MenuItem value="int">int</MenuItem>
          <MenuItem value="char">char</MenuItem>
          <MenuItem value="varchar">varchar</MenuItem>
          <MenuItem value="binary">binary</MenuItem>
          <MenuItem value="varbinary">varbinary</MenuItem>
          <MenuItem value="text">text</MenuItem>
          <MenuItem value="blob">blob</MenuItem>
        </TextField>
        <TextField
          label="Data Type Length"
          value={tempColumn.typeLength}
          onChange={handleColumnTypeLengthChange}
          size="small"
          sx={{ flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={tempColumn.nullable}
              onChange={handleColumnNullableChange}
              disabled={tempColumn.primaryKey} // Primary keys can't be nullable
              sx={{ flex: 1 }}
            />
          }
          label="Nullable"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={tempColumn.unique}
              onChange={handleColumnUniqueChange}
            />
          }
          label="Unique"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={tempColumn.primaryKey}
              onChange={handleColumnPrimaryKeyChange}
              disabled={
                tempTable.primaryKey && tempTable.primaryKey !== tempColumn.name
              }
            />
          }
          label={
            <span>
              Primary Key
              {tempTable.primaryKey && !tempColumn.primaryKey && (
                <Typography
                  variant="caption"
                  sx={{ ml: 1, color: "text.secondary" }}
                >
                  (Already set to: {tempTable.primaryKey})
                </Typography>
              )}
            </span>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={tempColumn.foreignKey}
              onChange={handleColumnForeignKeyChange}
            />
          }
          label="Foreign Key"
        />

        {tempColumn.foreignKey && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              marginBottom: "10px",
              width: "100%",
            }}
          >
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>References Table</InputLabel>
              <Select
                value={tempColumn.references?.tableId || ""}
                label="References Table"
                onChange={handleReferenceTableChange}
              >
                {tables.map((table) => (
                  <MenuItem key={table.id} value={table.id}>
                    {table.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {tempColumn.references && tempColumn.references.tableId && (
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>References Column</InputLabel>
                <Select
                  value={tempColumn.references.columnName || ""}
                  label="References Column"
                  onChange={handleReferenceColumnChange}
                >
                  {tables
                    .find((t) => t.id === tempColumn.references.tableId)
                    ?.columns?.map((column) => (
                      <MenuItem key={column.name} value={column.name}>
                        {column.name} {column.primaryKey ? "(PK)" : ""}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default ColumnProps;
