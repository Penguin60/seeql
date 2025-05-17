import { useState, useRef, useEffect } from "react";
import "./App.css";
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
  InputLabel
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CanvasStatistics from "./Components/CanvasStatistics";
import { convertToDrizzle, convertToPrisma, convertToSpring } from "./Components/ConvertToCode";

function App() {
  document.body.style.overflow = "hidden";
  const canvasRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [scale, setScale] = useState(1);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  const [lastZoomTime, setLastZoomTime] = useState(Date.now());

  // Table dragging state
  const [draggedTable, setDraggedTable] = useState(null);
  // const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });

  // array to hold instances of generated tables
  const [tables, setTables] = useState([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState(null);
  const [newTable, setNewTable] = useState({
    name: "",
    notes: "",
    columns: [],
    primaryKey: null,
    foreignKeys: [],
    position: { x: 100, y: 100 },
  });

  // Temp column state for adding columns
  const [tempColumn, setTempColumn] = useState({
    name: "",
    type: "",
    typeLength: "",
    nullable: true,
    unique: false,
    primaryKey: false,
    foreignKey: false,
    references: {
      tableId: "",
      columnName: "",
    },
  });

  // SQL dialog state
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [sqlCode, setSqlCode] = useState("");
  const [sqlCodeType, setSqlCodeType] = useState("sql");

  const handleTableDoubleClick = (e, tableId) => {
    e.stopPropagation();
    resetFormFields();
    const tableEdit = tables.find((t) => t.id === tableId);
    if (!tableEdit) return;

    setNewTable({
      ...tableEdit,
    });
    setEditingTableId(tableId);
    setDialogOpen(true);
  };

  const handleUpdateTable = () => {
    if (newTable.name) {
      // If there's data in the temp column fields, add it before updating
      let finalColumns = [...newTable.columns];
      let finalPrimaryKey = newTable.primaryKey;

      if (tempColumn.name && tempColumn.type) {
        finalColumns = [...finalColumns, { ...tempColumn }];
        if (tempColumn.primaryKey) {
          finalPrimaryKey = tempColumn.name;
        }
      }

      // Find the original table to compare columns
      const originalTable = tables.find((t) => t.id === editingTableId);

      // Find removed columns by comparing original with updated columns
      const removedColumns = originalTable.columns.filter(
        (origCol) =>
          !finalColumns.some((newCol) => newCol.name === origCol.name)
      );

      // Create a copy of tables to update
      let updatedTables = [...tables];

      // Process cascade deletion for removed columns
      // Replace the existing updateReferences function in handleUpdateTable

      // Process cascade deletion for removed columns
      if (removedColumns.length > 0) {
        // Track processed columns to avoid duplicates
        const processedPairs = new Set();

        // Function to update direct references only
        const updateReferences = (tableId, columnName) => {
          // Find the original column's properties before it's removed
          const originalColumn = originalTable.columns.find(
            (col) => col.name === columnName
          );
          if (!originalColumn) return;

          // Prevent duplicate processing
          const pairKey = `${tableId}-${columnName}`;
          if (processedPairs.has(pairKey)) return;
          processedPairs.add(pairKey);

          // Update all tables with direct references to this column
          updatedTables = updatedTables.map((table) => {
            // Skip the table being edited
            if (table.id === editingTableId) return table;

            const updatedColumns = table.columns.map((column) => {
              if (
                column.foreignKey &&
                column.references &&
                column.references.tableId === tableId &&
                column.references.columnName === columnName
              ) {
                // Convert foreign key to a standalone column with inherited properties
                return {
                  ...column,
                  // Copy properties from the original column
                  nullable: originalColumn.nullable,
                  unique: true, // Make it unique
                  foreignKey: false, // Remove foreign key status
                  references: { tableId: "", columnName: "" },
                };
              }
              return column;
            });

            return { ...table, columns: updatedColumns };
          });
        };

        // Process each removed column
        removedColumns.forEach((column) => {
          updateReferences(editingTableId, column.name);
        });
      }
      // Update the edited table itself
      updatedTables = updatedTables.map((table) =>
        table.id === editingTableId
          ? {
              ...table,
              name: newTable.name,
              notes: newTable.notes,
              columns: finalColumns,
              primaryKey: finalPrimaryKey,
            }
          : table
      );

      setTables(updatedTables);
      setDialogOpen(false);
      resetFormFields();
    }
  };

  const handleResetCanvasPos = () => {
    setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setScale(1);
  };

  const openNewTableDialog = () => {
    resetFormFields();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    resetFormFields();
    setDialogOpen(false);
  };

  const handleTableNameChange = (e) => {
    setNewTable({ ...newTable, name: e.target.value });
  };

  const handleTableNotesChange = (e) => {
    setNewTable({ ...newTable, notes: e.target.value });
  };

  // Column handling
  const handleColumnNameChange = (e) => {
    setTempColumn({ ...tempColumn, name: e.target.value });
  };

  const handleColumnTypeChange = (e) => {
    setTempColumn({ ...tempColumn, type: e.target.value });
  };

  const handleColumnTypeLengthChange = (e) => {
    setTempColumn({ ...tempColumn, typeLength: e.target.value });
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

  const resetFormFields = () => {
    // Reset main table form
    setNewTable({
      name: "",
      notes: "",
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      position: { x: 100, y: 100 },
    });

    // Reset temp column form
    setTempColumn({
      name: "",
      type: "",
      typeLength: "",
      nullable: true,
      unique: false,
      primaryKey: false,
      foreignKey: false,
      references: {
        tableId: "",
        columnName: "",
      },
    });

    // Reset editing state
    setEditingTableId(null);
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

  const handleColumnPrimaryKeyChange = (e) => {
    const isPrimaryKey = e.target.checked;

    setTempColumn({
      ...tempColumn,
      primaryKey: isPrimaryKey,
      // If setting as primary key, also make it not nullable and unique
      nullable: isPrimaryKey ? false : tempColumn.nullable,
      unique: isPrimaryKey ? true : tempColumn.unique,
    });
  };

  const addColumn = () => {
    if (tempColumn.name && tempColumn.type) {
      // If the new column is a primary key, we need to update any existing primary key columns
      let updatedColumns = [...newTable.columns];

      if (tempColumn.primaryKey) {
        // Remove primary key designation from any existing columns
        updatedColumns = updatedColumns.map((col) => ({
          ...col,
          primaryKey: false,
        }));
      }

      setNewTable({
        ...newTable,
        columns: [...updatedColumns, { ...tempColumn }],
        primaryKey: tempColumn.primaryKey
          ? tempColumn.name
          : newTable.primaryKey,
      });

      // Reset temp column
      setTempColumn({
        name: "",
        type: "",
        typeLength: "",
        nullable: true,
        unique: false,
        primaryKey: false,
        foreignKey: false,
        references: {
          tableId: "",
          columnName: "",
        },
      });
    }
  };

  const removeColumn = (index) => {
    const updatedColumns = [...newTable.columns];
    const removedColumn = updatedColumns[index];

    updatedColumns.splice(index, 1);

    // If removing primary key column, reset the primary key
    let updatedPrimaryKey = newTable.primaryKey;
    if (removedColumn.primaryKey) {
      updatedPrimaryKey = null;
    }

    setNewTable({
      ...newTable,
      columns: updatedColumns,
      primaryKey: updatedPrimaryKey,
    });
  };

  const handleCreateTable = () => {
    if (newTable.name) {
      // If there's data in the temp column fields, add it before creating the table
      let finalColumns = [...newTable.columns];
      let finalPrimaryKey = newTable.primaryKey;

      if (tempColumn.name && tempColumn.type) {
        finalColumns = [...finalColumns, { ...tempColumn }];
        if (tempColumn.primaryKey) {
          finalPrimaryKey = tempColumn.name;
        }
      }

      const newTableId = `table-${Date.now()}`;
      setTables([
        ...tables,
        {
          id: newTableId,
          ...newTable,
          columns: finalColumns,
          primaryKey: finalPrimaryKey,
          position: { x: 0, y: 0 },
        },
      ]);
      setDialogOpen(false);
      resetFormFields();
    }
  };

  // mouse down for panning handler
  const handleMouseDown = (e) => {
    // Only pan if we're not on a table
    if (!draggedTable) {
      setIsPanning(true);
      setStartPanPosition({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  // mouse move for panning handler
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPosition({
        x: e.clientX - startPanPosition.x,
        y: e.clientY - startPanPosition.y,
      });
    }
  };

  // mouse up for panning handler
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Only add document handlers when we're dragging a table
    if (draggedTable) {
      // Document-level mouse move handler for table dragging
      const handleDocumentMouseMove = (e) => {
        // Calculate the table position directly from cursor position
        // maintaining the initial offset
        const newX = (e.clientX - position.x) / scale - dragOffset.x;
        const newY = (e.clientY - position.y) / scale - dragOffset.y;

        setTables((prevTables) =>
          prevTables.map((table) => {
            if (table.id === draggedTable) {
              return {
                ...table,
                position: {
                  x: newX,
                  y: newY,
                },
              };
            }
            return table;
          })
        );
      };

      // Document-level mouse up handler
      const handleDocumentMouseUp = () => {
        setDraggedTable(null);
      };

      // Add document-level event listeners
      document.addEventListener("mousemove", handleDocumentMouseMove);
      document.addEventListener("mouseup", handleDocumentMouseUp);

      // Clean up
      return () => {
        document.removeEventListener("mousemove", handleDocumentMouseMove);
        document.removeEventListener("mouseup", handleDocumentMouseUp);
      };
    }
  }, [draggedTable, dragOffset, position, scale]);

  // Add this function after your other handlers (around line 290)
  const handleTableMouseDown = (e, tableId) => {
    e.stopPropagation(); // Prevent canvas panning
    e.preventDefault(); // Prevent text selection

    // Find the table being dragged
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    // Calculate the offset between mouse position and table position
    const offsetX = (e.clientX - position.x) / scale - table.position.x;
    const offsetY = (e.clientY - position.y) / scale - table.position.y;

    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedTable(tableId);
  };
  // scroll wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    setLastZoomTime(Date.now());

    const delta = e.deltaY * -0.003;
    const newScale = Math.min(Math.max(0.1, scale + delta), 2.5);

    // get cursor position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // zoom to cursor position
    const newX = position.x - (x - position.x) * (newScale / scale - 1);
    const newY = position.y - (y - position.y) * (newScale / scale - 1);

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  // cursor exit handler
  const handleMouseLeave = () => {
    setIsPanning(false);
    // setDraggedTable(null);
  };

  const handleFormatChange = (e) => {
    const format = e.target.value;
    setSqlCodeType(format);
    let generatedCode = "";
    if(format === "SQL") {
      generatedCode += `-- ${format} Schema generated by SeeQL\n`;
      generatedCode += `-- Generated on ${new Date().toLocaleString()}\n\n`;
    } else {
      generatedCode += `// ${format} Schema generated by SeeQL\n`;
      generatedCode += `// Generated on ${new Date().toLocaleString()}\n\n`;
    }
    switch(format) {
      case "Drizzle":
        generatedCode += convertToDrizzle(tables);
        break;
      case "Prisma":
        generatedCode += convertToPrisma(tables);
        break;
      case "Spring":
        generatedCode += convertToSpring(tables);
        break;
      case "SQL":
      default:
        generatedCode += generateSQL(tables);
    }
    setSqlCode(generatedCode);
  }
  // no idea wtf is going on here
  const generateSQL = () => {
    let sql = "";

    // Add SQL header comment
    // sql += "-- SQL Schema generated by SeeQL\n";
    // sql += `-- Generated on ${new Date().toLocaleString()}\n\n`;

    // Generate CREATE TABLE statements for each table
    tables.forEach((table) => {
      sql += `CREATE TABLE ${table.name} (\n`;

      // Add column definitions
      const columnDefinitions = table.columns.map((column) => {
        let def = `  ${column.name} ${column.type.toLowerCase()}`;
        if (column.typeLength) {
          def += `(${column.typeLength})`;
        }

        // Add constraints
        if (!column.nullable) def += " NOT NULL";
        if (column.unique && !column.primaryKey) def += " UNIQUE";

        return def;
      });

      // Add primary key constraint if exists
      if (table.primaryKey) {
        columnDefinitions.push(`  PRIMARY KEY (${table.primaryKey})`);
      }

      table.columns.forEach((column) => {
        if (
          column.foreignKey &&
          column.references &&
          column.references.tableId &&
          column.references.columnName
        ) {
          // Find the referenced table's name
          const refTable = tables.find(
            (t) => t.id === column.references.tableId
          );
          if (refTable) {
            columnDefinitions.push(
              `  FOREIGN KEY (${column.name}) REFERENCES ${refTable.name}(${column.references.columnName})`
            );
          }
        }
      });

      // Join all column definitions with commas
      sql += columnDefinitions.join(",\n");

      // Close the CREATE TABLE statement
      sql += "\n);\n\n";
    });

    return sql;
  };

  // Function to open SQL dialog with generated code
  const openSQLDialog = () => {
    if (tables.length === 0) {
      alert("Create at least one table before exporting");
      return;
    }
    handleFormatChange({ target: { value: sqlCodeType } });
    setSqlDialogOpen(true);
  };

  const closeSQLDialog = () => {
    setSqlDialogOpen(false);
  };

  // scroll event listener (prevents default scrolling)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });

      // cleanup
      return () => {
        canvas.removeEventListener("wheel", handleWheel);
      };
    }
  }, [scale, position]);

  // canvas drawing
  // Replace the existing useEffect for canvas drawing at line 324

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);

    // node edge lines
    tables.forEach((sourceTable) => {
      sourceTable.columns.forEach((column, columnIndex) => {
        if (
          column.foreignKey &&
          column.references?.tableId &&
          column.references?.columnName
        ) {
          const targetTable = tables.find(
            (t) => t.id === column.references.tableId
          );
          if (targetTable) {
            const targetColumnIndex = targetTable.columns.findIndex(
              (col) => col.name === column.references.columnName
            );

            if (targetColumnIndex === -1) return;

            // dimensions
            // TODO: Update to be dynamic or update with new ui
            const tableWidth = 215;
            const headerHeight = 50;
            const rowHeight = 30;

            const verticalOffset = 8;

            const sourceRowY =
              sourceTable.position.y +
              headerHeight +
              columnIndex * rowHeight +
              rowHeight / 2 +
              verticalOffset;

            const targetRowY =
              targetTable.position.y +
              headerHeight +
              targetColumnIndex * rowHeight +
              rowHeight / 2 +
              verticalOffset;

            const getTableWidth = (tableObj) => {
              const tableElements =
                document.querySelectorAll(".table-component");
              const tableElement = Array.from(tableElements).find((el) => {
                const left = parseInt(el.style.left);
                const top = parseInt(el.style.top);
                return (
                  Math.abs(left - tableObj.position.x) < 5 &&
                  Math.abs(top - tableObj.position.y) < 5
                );
              });
              return tableElement ? tableElement.offsetWidth : tableWidth; // fallback to default if not found
            };

            const sourceTableWidth = getTableWidth(sourceTable);
            const targetTableWidth = getTableWidth(targetTable);

            const sourceTableCenterX =
              sourceTable.position.x + sourceTableWidth / 2;
            const targetTableCenterX =
              targetTable.position.x + targetTableWidth / 2;

            // target position
            const dx = targetTableCenterX - sourceTableCenterX;

            let sourceX, targetX;
            const sourceY = sourceRowY;
            const targetY = targetRowY;

            if (dx > 0) {
              // target left
              sourceX = sourceTable.position.x + sourceTableWidth;
              targetX = targetTable.position.x + 10;
            } else {
              // target right
              sourceX = sourceTable.position.x + 20;
              targetX = targetTable.position.x + targetTableWidth + 10;
            }

            const distance = Math.sqrt(
              Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
            );
            const controlPointDistance = Math.min(80, distance / 3);

            const sourceIsRightSide = dx > 0;
            const controlPoint1X =
              sourceX + (sourceIsRightSide ? 1 : -1) * controlPointDistance;
            const controlPoint1Y = sourceY;
            const controlPoint2X =
              targetX + (sourceIsRightSide ? -1 : 1) * controlPointDistance;
            const controlPoint2Y = targetY;

            // line draw
            ctx.beginPath();
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2 / scale;
            ctx.setLineDash([0]);

            // curve draw
            ctx.moveTo(sourceX, sourceY);
            ctx.bezierCurveTo(
              controlPoint1X,
              controlPoint1Y,
              controlPoint2X,
              controlPoint2Y,
              targetX,
              targetY
            );
            ctx.stroke();

            // arrow draw
            const arrowSize = 8 / scale;

            const endPointDirection = calculateCurveEndDirection(
              controlPoint2X,
              controlPoint2Y,
              targetX,
              targetY
            );

            drawArrow(
              ctx,
              targetX,
              targetY,
              endPointDirection,
              arrowSize,
              "#000000"
            );
          }
        }
      });
    });

    ctx.restore();
  }, [position, scale, tables]);

  const calculateCurveEndDirection = (cpX, cpY, endX, endY) => {
    return Math.atan2(endY - cpY, endX - cpX);
  };

  const drawArrow = (ctx, x, y, angle, size, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size / 2);
    ctx.lineTo(-size, -size / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  return (
    <div className="App">
      <canvas
        ref={canvasRef}
        className="InteractiveCanvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        width={window.innerWidth}
        height={window.innerHeight}
      />
      <div
        className="tables-area"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          pointerEvents: "none",
        }}
      >
        {tables.map((table) => (
          <div
            key={table.id}
            className="table-component"
            style={{
              left: `${table.position.x}px`,
              top: `${table.position.y}px`,
              pointerEvents: "auto",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              cursor: "move",
            }}
            onMouseDown={(e) => handleTableMouseDown(e, table.id)}
            onDoubleClick={(e) => handleTableDoubleClick(e, table.id)}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th colSpan="2" className="table-component-header">
                    {table.name || "Unnamed Table"}
                  </th>
                </tr>
                {table.columns.length > 0 && (
                  <tr className="column-headers">
                    <th className="col-name">Name</th>
                    <th className="col-type">Type</th>
                    <th className="col-props">Properties</th>
                  </tr>
                )}
              </thead>
              <tbody className="table-body">
                {table.columns.length > 0 ? (
                  table.columns.map((column, index) => (
                    <tr key={index} className="table-column">
                      <td
                        className={`col-name ${
                          column.primaryKey ? "primary-key" : ""
                        }`}
                      >
                        {column.name} {column.primaryKey && "🔑"}
                      </td>
                      <td className="col-type">
                        {column.type}
                        {column.typeLength ? `(${column.typeLength})` : ""}
                      </td>
                      <td className="col-props">
                        {!column.nullable && (
                          <span className="prop-item">NOT NULL</span>
                        )}
                        {column.unique && !column.primaryKey && (
                          <span className="prop-item">UNIQUE</span>
                        )}
                        {column.foreignKey && column.references?.tableId && (
                          <span className="foreign-key prop-item">
                            {"🔗 "}
                            {tables.find(
                              (t) => t.id === column.references.tableId
                            )?.name || ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-columns">
                      No columns defined
                    </td>
                  </tr>
                )}
              </tbody>
              {table.notes && (
                <tfoot>
                  <tr>
                    <td colSpan="3" className="table-notes">
                      <small>{table.notes}</small>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ))}
      </div>

      <Fab
        color="primary"
        aria-label="add table"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
        }}
        onClick={openNewTableDialog}
      >
        <AddIcon />
      </Fab>

      {Date.now() - lastZoomTime < 2000 && <CanvasStatistics scale={scale} />}
      <button className="resetCanvasButton" onClick={handleResetCanvasPos}>
        Reset Position
      </button>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Table</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Table Name"
            fullWidth
            variant="outlined"
            value={newTable.name}
            onChange={handleTableNameChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Notes"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={newTable.notes}
            onChange={handleTableNotesChange}
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Columns
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List dense sx={{ mb: 2 }}>
            {newTable.columns.map((column, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => removeColumn(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${column.name} (${column.type})`}
                  secondary={`${column.nullable ? "Nullable" : "Not Null"}${
                    column.unique ? ", Unique" : ""
                  }${column.primaryKey ? ", Primary Key" : ""}${
                    column.foreignKey && column.references?.tableId
                      ? `, FK → ${
                          tables.find((t) => t.id === column.references.tableId)
                            ?.name || ""
                        }`
                      : ""
                  }`}
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Add New Column
          </Typography>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <TextField
              label="Column Name"
              value={tempColumn.name}
              onChange={handleColumnNameChange}
              size="small"
              sx={{ flex: 1 }}
            />
            <div style={{ flex: 1, marginTop: "0px" }}>
              <TextField
                select
                label="Data Type"
                value={tempColumn.type}
                onChange={handleColumnTypeChange}
                size="small"
                fullWidth
              >
                <MenuItem value="int">int</MenuItem>
                <MenuItem value="varchar">varchar</MenuItem>
                <MenuItem value="boolean">boolean</MenuItem>
              </TextField>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
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
                  disabled={newTable.primaryKey && !tempColumn.primaryKey} // Disable if another column is already PK
                />
              }
              label={
                <span>
                  Primary Key
                  {newTable.primaryKey && !tempColumn.primaryKey && (
                    <Typography
                      variant="caption"
                      sx={{ ml: 1, color: "text.secondary" }}
                    >
                      (Already set to: {newTable.primaryKey})
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
                    value={tempColumn.references.tableId}
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

                {tempColumn.references.tableId && (
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>References Column</InputLabel>
                    <Select
                      value={tempColumn.references.columnName}
                      label="References Column"
                      onChange={handleReferenceColumnChange}
                    >
                      {tables
                        .find((t) => t.id === tempColumn.references.tableId)
                        ?.columns.map((column) => (
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
          <Button
            variant="outlined"
            onClick={addColumn}
            sx={{ mt: 1 }}
            disabled={!tempColumn.name || !tempColumn.type}
          >
            Add Column
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            onClick={editingTableId ? handleUpdateTable : handleCreateTable}
            color="primary"
            disabled={!newTable.name}
          >
            {editingTableId ? "Update Table" : "Create Table"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SQL Export Dialog */}
      <Dialog
        open={sqlDialogOpen}
        onClose={closeSQLDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Exported SQL Schema</DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="formatSelectorLabel">Format</InputLabel>
            <Select
              labelId="formatSelectorLabel"
              value={sqlCodeType}
              label="Format"
              onChange={handleFormatChange}
            >
              <MenuItem value="SQL">SQL</MenuItem>
              <MenuItem value="Drizzle">Drizzle ORM</MenuItem>
              <MenuItem value="Prisma">Prisma</MenuItem>
              <MenuItem value="Spring">Spring JPA</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={30}
            value={sqlCode}
            variant="outlined"
            InputProps={{ readOnly: true }}
            sx={{ fontFamily: "monospace", fontSize: "1rem" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSQLDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      <div
        style={{
          position: "fixed",
          top: "1.78%",
          left: "1%",
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          color="secondary"
          onClick={openSQLDialog}
          startIcon={<i className="material-icons" />}
          style={{ marginRight: "10px" }}
        >
          Export SQL
        </Button>
      </div>
    </div>
  );
}

export default App;
