import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import "./App.css";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Fab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import { MyLocation } from "@mui/icons-material";
import TrashIcon from "@mui/icons-material/Delete";
import MenuIcon from "@mui/icons-material/Menu";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CanvasStatistics from "./Components/CanvasStatistics";
import { Add } from "@mui/icons-material";
import TableDialog from "./Components/TableDialog";
import {
  convertToDrizzle,
  convertToPrisma,
  convertToSpring,
} from "./Components/ConvertToCode";
import Menu from "@mui/joy/Menu";
import MenuButton from "@mui/joy/MenuButton";
import Dropdown from "@mui/joy/Dropdown";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};
const app = initializeApp(firebaseConfig);

const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_API_KEY });

function App() {
  document.body.style.overflow = "hidden";
  const STATS_FADE_OUT_TIME = 2000; // 2 seconds
  const canvasRef = useRef(null);
  const [showLogo, setShowLogo] = useState(true);
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

  const [editingTableId, setEditingTableId] = useState(null);

  const handleTableMouseMove = () => {};
  const handleTableMouseUp = () => {};

  const [isOverTrash, setIsOverTrash] = useState(false);

  // Table dialog state
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tempTableId, setTempTableId] = useState(null);
  const [tempTable, setTempTable] = useState({
    name: "",
    notes: "",
    columns: [],
    primaryKey: null,
    foreignKeys: [],
    position: { x: 100, y: 100 },
  });

  // Temp columns state for editing columns in parallel
  const [tempColumns, setTempColumns] = useState([]);

  // SQL dialog state
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [sqlCode, setSqlCode] = useState("");
  const [sqlCodeType, setSqlCodeType] = useState("SQL");

  async function callGeminiAPI() {
    if (tables.length === 0) {
      alert("Create at least one table before normalizing");
      return;
    }

    const SQLCODE = generateSQL();

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents:
        "Fix the SQL code below by using normalizing form IF APPLICABLE. The output should only be pure code with no comments. SQL CODE:" +
        SQLCODE,
    });

    const text = response.text;
    console.log(text);
    renderSQL(text);
  }

  async function renderSQL(PromptCode) {
    const newTables = generateTablesFromSQL(PromptCode);
    console.log(newTables);
    setTables([...tables, ...newTables]);
  }

  const [copyStatus, setCopyStatus] = useState(0);

  const handleTableDoubleClick = (e, tableId) => {
    e.stopPropagation();
    resetFormFields();
    const tableEdit = tables.find((t) => t.id === tableId);
    if (!tableEdit) return;

    setTempTable({
      ...tableEdit,
    });
    setTempTableId(tableId);
    setTableDialogOpen(true);
  };
  // Add this near your other state declarations
  const sampleSQL = `CREATE TABLE customers (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP
  );

  CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10,2),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    inventory_count INT NOT NULL
  );

  CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );`;

  const handleImportTemplate = () => {
    setYourTextState(sampleSQL);
  }

  const handleResetCanvasPos = () => {
    setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setScale(1);
  };

  const openNewTableDialog = () => {
    resetFormFields();
    setTableDialogOpen(true);
  };

  const resetFormFields = () => {
    // Reset main table form
    setTempTable({
      name: "",
      notes: "",
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      position: { x: 100, y: 100 },
    });

    // Reset editing state
    setTempTableId(null);
  };

  // Sync tempColumns with tempTable.columns when dialog opens or table changes
  useEffect(() => {
    setTempColumns(tempTable.columns.map((col) => ({ ...col })));
  }, [tableDialogOpen, tempTable.columns]);

  // Shows logo when no tables are present
  useEffect(() => {
    setShowLogo(tables.length === 0);
  }, [tables.length]);
  
  const addColumn = () => {
    const emptyCol = {
      name: "",
      type: "",
      typeLength: "",
      nullable: true,
      unique: false,
      primaryKey: false,
      foreignKey: false,
      references: { tableId: "", columnName: "" },
    };
    setTempColumns((cols) => [...cols, emptyCol]);
  };

  const handleTempColumnChange = (index, updatedCol) => {
    setTempColumns((cols) =>
      cols.map((col, i) => (i === index ? updatedCol : col))
    );
  };

  const handleTempRemoveColumn = (index) => {
    setTempColumns((cols) => cols.filter((_, i) => i !== index));
  };

  const isColumnValid = (col) => {
    return col.name && col.type && /^[^;\d\s]*$/.test(col.name);
  };

  const allColumnsValid =
    tempColumns.length > 0 && tempColumns.every(isColumnValid);

  const handleTableDialogSubmit = () => {
    if (!tempTable.name || !allColumnsValid) return;
    // Save tempColumns to tempTable and then to tables
    const updatedTable = { ...tempTable, columns: tempColumns };
    if (tempTableId) {
      // Editing existing table
      handleUpdateTable(updatedTable);
    } else {
      // Creating new table
      handleCreateTable(updatedTable);
      setShowLogo(false);
    }
    setTableDialogOpen(false);
    resetFormFields();
  };

  const handleUpdateTable = (updatedTable) => {
    // updatedTable.columns is already set to tempColumns by the dialog
    if (updatedTable.name) {
      // Find the original table to compare columns
      const originalTable = tables.find((t) => t.id === tempTableId);
      const removedColumns = originalTable.columns.filter(
        (origCol) =>
          !updatedTable.columns.some((newCol) => newCol.name === origCol.name)
      );
      let updatedTables = [...tables];
      if (removedColumns.length > 0) {
        const processedPairs = new Set();
        const updateReferences = (tableId, columnName) => {
          const originalColumn = originalTable.columns.find(
            (col) => col.name === columnName
          );
          if (!originalColumn) return;
          const pairKey = `${tableId}-${columnName}`;
          if (processedPairs.has(pairKey)) return;
          processedPairs.add(pairKey);
          updatedTables = updatedTables.map((table) => {
            if (table.id === tempTableId) return table;
            const updatedColumns = table.columns.map((column) => {
              if (
                column.foreignKey &&
                column.references &&
                column.references.tableId === tableId &&
                column.references.columnName === columnName
              ) {
                return {
                  ...column,
                  nullable: originalColumn.nullable,
                  unique: true,
                  foreignKey: false,
                  references: { tableId: "", columnName: "" },
                };
              }
              return column;
            });
            return { ...table, columns: updatedColumns };
          });
        };
        removedColumns.forEach((column) => {
          updateReferences(tempTableId, column.name);
        });
      }
      updatedTables = updatedTables.map((table) =>
        table.id === tempTableId
          ? {
              ...table,
              name: updatedTable.name,
              notes: updatedTable.notes,
              columns: updatedTable.columns,
              primaryKey: updatedTable.primaryKey,
            }
          : table
      );
      setTables(updatedTables);
      setTableDialogOpen(false);
      resetFormFields();
    }
  };
  const [yourTextState, setYourTextState] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const importSQLDialog = () => {
    return (
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import SQL</DialogTitle>
        <Button 
            variant="text"
            onClick={handleImportTemplate}
            sx={{ width: "120px", position: "absolute", right: "23px", top: "15px", color: "black", textTransform: "none", fontWeight: 500 }}
          >
            Use template
          </Button>
        <DialogContent>
          <TextField
            label="Import SQL"
            variant="outlined"
            fullWidth
            multiline
            minRows={24}
            maxRows={24}
            value={yourTextState}
            onChange={(e) => setYourTextState(e.target.value)}
            sx={{ mt: 1, height: "72vh", mb: 0 }} // Add top margin to prevent cutting into the dialog
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setImportDialogOpen(false)}
            sx={{ color: "black", fontWeight: "bold", textTransform: "none" }}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            variant="text"
            color="primary"
            onClick={() => {
              handleTextSubmit();
              setImportDialogOpen(false);
            }}
            sx={{
              color: "black",
              fontWeight: "bold",
              textTransform: "none",
              background: "white",
              "&:hover": { background: "#f0f0f0" },
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleTextSubmit = () => {
    const tablesFromSQL = generateTablesFromSQL(yourTextState);
    setTables([...tables, ...tablesFromSQL]);
  };

  const handleCreateTable = (newTable) => {
    if (newTable.name) {
      const newTableId = `table-${Date.now()}`;
      setTables([
        ...tables,
        {
          id: newTableId,
          ...newTable,
          position: { x: 0, y: 0 },
        },
      ]);
      setShowLogo(false);
      setTableDialogOpen(false);
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

        const trashRect = document
          .querySelector('[aria-label="delete table"]')
          .getBoundingClientRect();
        if (
          e.clientX >= trashRect.left &&
          e.clientX <= trashRect.right &&
          e.clientY >= trashRect.top &&
          e.clientY <= trashRect.bottom
        ) {
          setIsOverTrash(true);
          console.log("over trash");
        } else {
          setIsOverTrash(false);
        }
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

        const trashRect = document
          .querySelector('[aria-label="delete table"]')
          .getBoundingClientRect();
        if (
          e.clientX >= trashRect.left &&
          e.clientX <= trashRect.right &&
          e.clientY >= trashRect.top &&
          e.clientY <= trashRect.bottom
        ) {
          setIsOverTrash(true);
          console.log("over trash");
        } else {
          setIsOverTrash(false);
        }
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

  /**
   * Parses CREATE TABLE SQL and extracts columns with:
   * name, type, typeLength, nullable, unique, primaryKey, foreignKey, references
   */
  const generateTablesFromSQL = (sql) => {
    console.log(sql);
    const tableRegex = /CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(([^;]*?)\);/gi;
    const columnLineRegex =
      /^\s*([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)(?:\((\d+)\))?([\s\S]*)$/m;
    const pkRegex = /PRIMARY\s+KEY/i;
    const uniqueRegex = /UNIQUE/i;
    const notNullRegex = /NOT\s+NULL/i;
    const fkRegex =
      /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i;
    const tableLevelPKRegex = /^PRIMARY\s+KEY\s*\(([^)]+)\)/i;

    let match;
    const tablesArr = [];

    // First pass: parse tables and columns
    while ((match = tableRegex.exec(sql)) !== null) {
      const [, tableName, columnsBlock] = match;
      const columnsLines = columnsBlock
        .split(/,(?![^()]*\))/)
        .map((line) => line.trim());
      const columns = [];
      const foreignKeys = [];
      let primaryKeyName = null;

      columnsLines.forEach((line) => {
        // Handle table-level primary key constraint
        const tablePKMatch = tableLevelPKRegex.exec(line);
        if (tablePKMatch) {
          primaryKeyName = tablePKMatch[1].trim();
          return;
        }
        // Handle table-level foreign key constraints
        const fkMatch = fkRegex.exec(line);
        if (fkMatch) {
          foreignKeys.push({
            columnName: fkMatch[1].trim(),
            references: {
              table: fkMatch[2].trim(),
              column: fkMatch[3].trim(),
            },
          });
          return;
        }
        // Handle regular column definitions
        const colMatch = columnLineRegex.exec(line);
        if (colMatch) {
          columns.push({
            name: colMatch[1],
            type: colMatch[2].toLowerCase(), // Store type as lowercase
            typeLength: colMatch[3] || "",
            nullable: !notNullRegex.test(line),
            unique: uniqueRegex.test(line),
            primaryKey: pkRegex.test(line),
            foreignKey: false, // will be set below if matched
            references: { tableId: "", columnName: "" },
          });
        }
      });

      // Attach foreign key info to columns (table name for now)
      foreignKeys.forEach((fk) => {
        const col = columns.find((c) => c.name === fk.columnName);
        if (col) {
          col.foreignKey = true;
          col.references = {
            tableId: fk.references.table, // will resolve to id later
            columnName: fk.references.column,
          };
        }
      });

      // Attach table-level primary key to the correct column
      if (primaryKeyName) {
        const pkCol = columns.find((c) => c.name === primaryKeyName);
        if (pkCol) pkCol.primaryKey = true;
      }

      tablesArr.push({
        id: `table-${Date.now()}-${Math.random()}`,
        name: tableName,
        notes: "",
        columns,
        primaryKey: columns.find((c) => c.primaryKey)?.name || null,
        foreignKeys,
        position: { x: 100, y: 100 },
      });
    }

    // Second pass: resolve references.tableId from table name to table id
    tablesArr.forEach((table) => {
      table.columns.forEach((col) => {
        if (col.foreignKey && col.references.tableId) {
          const refTable = tablesArr.find(
            (t) => t.name === col.references.tableId
          );
          if (refTable) {
            col.references.tableId = refTable.id;
          } else {
            col.references.tableId = ""; // fallback if not found
          }
        }
      });
    });

    return tablesArr;
  };

  const handleFormatChange = (e) => {
    const format = e.target.value;
    setSqlCodeType(format);
    let generatedCode = "";
    if (format === "SQL") {
      generatedCode += `-- ${format} schema generated by SeeQL\n`;
      generatedCode += `-- Generated on ${new Date().toLocaleString()}\n\n`;
    } else {
      generatedCode += `// ${format} schema generated by SeeQL\n`;
      generatedCode += `// Generated on ${new Date().toLocaleString()}\n\n`;
    }
    switch (format) {
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
  };
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

  const handleCloseTableDialog = () => {
    resetFormFields();
    setTableDialogOpen(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard
      .writeText(sqlCode)
      .then(() => {
        setCopyStatus(1);
        setTimeout(() => {
          setCopyStatus(0);
        }, 2500);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        setCopyStatus(-1);
        setTimeout(() => {
          setCopyStatus(0);
        }, 2500);
      });
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
            ctx.lineTo(targetX, targetY);
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

  // Dummy state to force re-render for CanvasStatistics fade-out
  const [statsTick, setStatsTick] = useState(0);
  useEffect(() => {
    // Only set interval if stats are visible
    if (Date.now() - lastZoomTime < STATS_FADE_OUT_TIME) {
      const interval = setInterval(() => {
        setStatsTick((tick) => tick + 1);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [lastZoomTime, statsTick]);

  useEffect(() => {
    document.body.style.opacity = "1";
  }, []);

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
      <div style={{ display: (showLogo) ? "block" : "none", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000 }}>
        <img src="logo.png" alt="SeeQL" style={{ width: "250px", height: "auto"}} />
      </div>
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

      {/* Show CanvasStatistics with fade-out */}
      <CanvasStatistics
        scale={scale}
        visible={Date.now() - lastZoomTime < STATS_FADE_OUT_TIME}
      />

      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          color={isOverTrash ? "error" : "primary"}
          aria-label="delete table"
          style={{
            transition: "background 0.2s",
            borderRadius: "10px 0 0 10px",
            background: "#141414",
            color: "white",
          }}
          onMouseUp={() => {
            if (draggedTable && isOverTrash) {
              setTables((prevTables) =>
                prevTables.filter((table) => table.id !== draggedTable)
              );
              if (tables)
              setDraggedTable(null);
              setIsOverTrash(false);
            }
          }}
          onMouseEnter={() => {
            if (draggedTable) setIsOverTrash(true);
          }}
          onMouseLeave={() => setIsOverTrash(false)}
        >
          <TrashIcon />
        </Button>

        <Fab
          color="primary"
          aria-label="add table"
          style={{
            zIndex: 1001,
            width: "64px",
            margin: "0 -8px",
            background: "black",
            color: "white",
            borderRadius: "10px",
          }}
          onClick={openNewTableDialog}
        >
          <AddIcon style={{ fontSize: "32px" }} />
        </Fab>
        <Button
          variant="contained"
          color="primary"
          onClick={handleResetCanvasPos}
          style={{
            borderRadius: "0 10px 10px 0",
            background: "#141414",
            color: "white",
          }}
        >
          <MyLocation />
        </Button>
      </div>

      {Date.now() - lastZoomTime < 2000 && <CanvasStatistics scale={scale} />}

      <TableDialog
        isOpen={tableDialogOpen}
        handleClose={handleCloseTableDialog}
        tables={tables}
        tempTableId={tempTableId}
        tempTable={tempTable}
        setTempTable={setTempTable}
        handleUpdateTable={handleUpdateTable}
        handleCreateTable={handleCreateTable}
        tempColumns={tempColumns}
        setTempColumns={setTempColumns}
        handleAddColumn={addColumn}
        handleColumnChange={handleTempColumnChange}
        handleRemoveColumn={handleTempRemoveColumn}
        handleTableDialogSubmit={handleTableDialogSubmit}
      />

      <Dialog
        open={sqlDialogOpen}
        onClose={closeSQLDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxWidth: "60%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            mb: 0,
          },
        }}
      >
        <DialogTitle>Exported Database Schema</DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 0, overflow: "visible" }}>
          <FormControl fullWidth sx={{ mt: 1, mb: 0 }}>
            <InputLabel id="formatSelectorLabel">Format</InputLabel>
            <Select
              labelId="formatSelectorLabel"
              value={sqlCodeType}
              label="Format"
              onChange={handleFormatChange}
              MenuProps={{
                PaperProps: {
                  sx: {
                    my: 0,
                    boxShadow: 3,
                    borderRadius: 2,
                    maxHeight: 300,
                    overflowY: "auto",
                  },
                },
                MenuListProps: {
                  sx: {
                    p: 0,
                    m: 0,
                    overflow: "auto",
                  },
                },
              }}
              sx={{
                background: "white",
                my: 0,
              }}
            >
              <MenuItem value="SQL">SQL</MenuItem>
              <MenuItem value="Drizzle">Drizzle ORM</MenuItem>
              <MenuItem value="Prisma">Prisma</MenuItem>
              <MenuItem value="Spring">Spring JPA</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogContent
          sx={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <TextField
            multiline
            fullWidth
            minRows={20}
            maxRows={20}
            value={sqlCode}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: {
                maxHeight: "80vh",
                fontFamily: "monospace",
                fontSize: "0.9rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxSizing: "border-box",
                display: "block",
                overflow: "auto",
                resize: "none",
              },
            }}
          />
          <IconButton
            variant="contained"
            onClick={handleCopyToClipboard}
            sx={{
              backgroundColor: "black",
              color: "white",
              position: "absolute",
              width: "40px",
              height: "40px",
              right: "29px",
              bottom: "80px",
              "&:hover": {
                backgroundColor: "gray",
                color: "black",
              },
            }}
          >
            <ContentCopyIcon sx={{ color: "white" }} />
          </IconButton>
          <Alert
            severity={
              copyStatus === 1
                ? "success"
                : copyStatus === -1
                ? "error"
                : "info"
            }
            sx={{
              position: "absolute",
              top: "10px",
              right: "10px",
              transition: "opacity 0.5s",
              opacity: copyStatus === 0 ? 0 : 1,
            }}
          >
            {copyStatus === 1 ? "Copied to clipboard!" : "Failed to copy"}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeSQLDialog}
            sx={{ color: "black", fontWeight: "bold", textTransform: "none" }}
            variant="text"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dropdown
        placement="bottom-start"
        sx={{
          position: "fixed",
          top: "1.78%",
          left: "1%",
          zIndex: 500,
        }}
      >
        <MenuButton
          variant="solid"
          color="primary"
          sx={{
            position: "fixed",
            top: "1.78%",
            left: "1%",
            minWidth: 36,
            minHeight: 36,
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 0,
            background: "black",
            "&:hover, &:active, &.Mui-focusVisible, &:focus": {
              backgroundColor: "black",
            },
          }}
        >
          <MenuIcon fontSize="small" />
        </MenuButton>
        <Menu
          sx={{
            top: "10 !important",
            left: "10 !important",
            minWidth: 120,
            boxShadow: 3,
            borderRadius: 10,
          }}
          slotProps={{
            listbox: {
              sx: {
                marginLeft: 10,
                minWidth: 120,
              },
            },
          }}
          placement="bottom-start"
          disablePortal
          keepMounted
        >
          <MenuItem onClick={openSQLDialog}>Export as...</MenuItem>
          <MenuItem onClick={() => setImportDialogOpen(true)}>
            Import SQL
          </MenuItem>
          <MenuItem onClick={callGeminiAPI}>Normalize</MenuItem>
        </Menu>
      </Dropdown>
      <div
        style={{
          position: "fixed",
          bottom: "1.78%",
          left: "1%",
          zIndex: 1000,
        }}
      ></div>
      {importSQLDialog()}
    </div>
  );
}

export default App;
