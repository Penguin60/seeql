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
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { width: "50%", maxWidth: "50%", minWidth: "300px" },
        }}
      >
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

          {/* Columns header and Add button in a row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            <Typography variant="h6">Columns</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddColumn}
              sx={{
                background: "black",
                minWidth: 0,
                padding: "6px",
                borderRadius: 2.5,
                "&:hover, &:active, &.Mui-focusVisible, &:focus": {
                  backgroundColor: "black",
                },
              }}
            >
              <AddIcon />
            </Button>
          </div>

          <List dense sx={{ my: 0, pointerEvents: "auto" }}>
            {tempColumns.map((column, index) => (
              <Accordion
                key={index}
                sx={{
                  width: "100%",
                  boxShadow: "none",
                  my: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "background 0s",
                  "&:hover, &:focus-within": {
                    backgroundColor: "rgba(0,0,0,0.06)",
                  },
                  "&:hover .AccordionDetails-highlight, &:focus-within .AccordionDetails-highlight":
                    {
                      backgroundColor: "rgba(0,0,0,0.06)",
                    },
                }}
              >
                <Divider sx={{ mx: "auto", width: "98%", my: 0 }} />
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    background: "unset",
                    transition: "background 0s",
                    "&:hover, &.Mui-focused, &.Mui-expanded": {
                      background: "unset",
                    },
                    "&.MuiAccordionSummary-root.Mui-expanded": {
                      background: "unset",
                    },
                    "&.MuiAccordionSummary-root:focus-visible": {
                      background: "unset",
                    },
                  }}
                >
                  <span style={{ fontWeight: 500, padding: 10 }}>
                    {column.name || <em style={{ color: "#aaa" }}>Unnamed</em>}{" "}
                    <span style={{ color: "gray", fontStyle: "italic" }}>
                      {column.type}
                      {column.typeLength ? `(${column.typeLength})` : ""}
                    </span>
                  </span>
                </AccordionSummary>
                <AccordionDetails
                  className="AccordionDetails-highlight"
                  sx={{ px: 2, background: "unset !important" }}
                >
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
                        sx={{
                          color: "black",
                          transition: "color 0.1s",
                          "&:hover": {
                            color: "red",
                          },
                        }}
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
          <Button
            onClick={handleClose}
            sx={{ color: "black", fontWeight: "bold", textTransform: "none" }}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            color="black"
            disabled={!tempTable.name || !allColumnsValid}
            sx={{ color: "black", fontWeight: "bold", textTransform: "none" }}
            variant="text"
          >
            {tempTableId ? "Update Table" : "Create Table"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TableDialog;
