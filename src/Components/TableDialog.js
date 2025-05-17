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
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ColumnProps from "./ColumnProps";
import Accordion from "@mui/joy/Accordion";
import AccordionSummary from "@mui/joy/AccordionSummary";
import AccordionDetails from "@mui/joy/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useEffect } from "react";

function TableDialog(props) {
  const {
    isOpen,
    handleClose,
    tables,
    tempTableId,
    tempTable,
    setTempTable,
    tempColumns,
    setTempColumns,
    handleAddColumn,
    handleColumnChange,
    handleRemoveColumn,
    handleTableDialogSubmit,
    handleUpdateTable,
    handleCreateTable,
  } = props;

  // Sync tempColumns with newTable.columns when dialog opens or columns change
  useEffect(() => {
    setTempColumns(tempTable.columns.map((col) => ({ ...col })));
  }, [isOpen, tempTable.columns]);

  const isColumnValid = (col) => {
    return col.name && col.type && /^[^;\d\s]*$/.test(col.name);
  };

  const allColumnsValid =
    tempColumns.length > 0 && tempColumns.every(isColumnValid);

  const handleSubmit = () => {
    if (!allColumnsValid) return;
    // Assign tempColumns to the final table's columns, then call the handler
    const updatedTable = { ...tempTable, columns: tempColumns };
    setTempTable(updatedTable);
    setTimeout(() => {
      if (tempTableId) {
        handleUpdateTable(updatedTable);
      } else {
        handleCreateTable(updatedTable);
      }
    }, 0);
  };

  const handleTableNameChange = (e) => {
    if (/^[a-zA-Z]*$/.test(e.target.value)) {
      setTempTable({ ...tempTable, name: e.target.value });
    }
  };

  const handleTableNotesChange = (e) => {
    setTempTable({ ...tempTable, notes: e.target.value });
  };

  // Wrap the passed-in handleRemoveColumn to add PK clearing logic
  const handleRemoveColumnWithPK = (index) => {
    const removedCol = tempColumns[index];
    handleRemoveColumn(index);
    // If the removed column was the primary key, reset tempTable.primaryKey to null
    if (removedCol.primaryKey && tempTable.primaryKey === removedCol.name) {
      setTempTable({ ...tempTable, primaryKey: null });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {tempTableId ? "Editing Table" : "Create New Table"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Table Name"
            fullWidth
            variant="outlined"
            value={tempTable.name}
            onChange={handleTableNameChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Notes"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={tempTable.notes}
            onChange={handleTableNotesChange}
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Columns
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddColumn}
            sx={{ mb: 2 }}
          >
            Add Column
          </Button>
          <List dense sx={{ my: 0, pointerEvents: "auto" }}>
            {tempColumns.map((column, index) => (
              <Accordion
                key={index}
                sx={{ width: "100%", boxShadow: "none", my: 0 }}
              >
                <Divider sx={{ mx: "auto", width: "98%", my: 0 }} />
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <span style={{ fontWeight: 500, padding: 10 }}>
                    {column.name || <em style={{ color: "#aaa" }}>Unnamed</em>}{" "}
                    <span style={{ color: "gray", fontStyle: "italic" }}>
                      {column.type}
                      {column.typeLength ? `(${column.typeLength})` : ""}
                    </span>
                  </span>
                </AccordionSummary>
                <AccordionDetails>
                  <ColumnProps
                    tables={tables}
                    tempTable={tempTable}
                    tempColumn={column}
                    setTempTable={setTempTable}
                    setTempColumn={(updatedCol) =>
                      handleColumnChange(index, updatedCol)
                    }
                  />
                  <ListItem
                    disableGutters
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveColumnWithPK(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={null}
                      secondary={`${column.nullable ? "Nullable" : "Not Null"}${
                        column.unique ? ", Unique" : ""
                      }${column.primaryKey ? ", Primary Key" : ""}${
                        column.foreignKey && column.references?.tableId
                          ? `, FK → ${
                              tables.find(
                                (t) => t.id === column.references.tableId
                              )?.name || ""
                            }`
                          : ""
                      }`}
                    />
                  </ListItem>
                </AccordionDetails>
              </Accordion>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            disabled={!tempTable.name || !allColumnsValid}
          >
            {tempTableId ? "Update Table" : "Create Table"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TableDialog;
