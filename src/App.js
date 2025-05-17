import { useState, useRef, useEffect } from 'react';
import './App.css';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { buttonBaseClasses } from '@mui/material';
import CanvasStatistics from './Components/CanvasStatistics';
import { MenuItem } from '@mui/material';

function App() {
  document.body.style.overflow = 'hidden';
  const canvasRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [scale, setScale] = useState(1);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  
  // Table dragging state
  const [draggedTable, setDraggedTable] = useState(null);
  const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });
  
  // array to hold instances of generated tables
  const [tables, setTables] = useState([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    notes: '',
    columns: [],
    primaryKey: null,
    foreignKeys: [],
    position: { x: 100, y: 100 }
  });
  
  // Temp column state for adding columns
    const [tempColumn, setTempColumn] = useState({
    name: '',
    type: '',
    default: '',
    nullable: true,
    unique: false,
    primaryKey: false,
    foreignKey: false,
    references: {
        tableId: '',
        columnName: ''
    }
    });

  const handleResetCanvasPos = () => {
    setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setScale(1);
  };

  const openNewTableDialog = () => {
    setNewTable({
      name: '',
      notes: '',
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      position: { x: 100, y: 100 }
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const handleTableNameChange = (e) => {
    setNewTable({...newTable, name: e.target.value});
  };

  const handleTableNotesChange = (e) => {
    setNewTable({...newTable, notes: e.target.value});
  };

  // Column handling
  const handleColumnNameChange = (e) => {
    setTempColumn({...tempColumn, name: e.target.value});
  };

  const handleColumnTypeChange = (e) => {
    setTempColumn({...tempColumn, type: e.target.value});
  };

  const handleColumnDefaultChange = (e) => {
    setTempColumn({...tempColumn, default: e.target.value});
  };

  const handleColumnNullableChange = (e) => {
    setTempColumn({...tempColumn, nullable: e.target.checked});
  };

  const handleColumnUniqueChange = (e) => {
    setTempColumn({...tempColumn, unique: e.target.checked});
  };
  const handleColumnForeignKeyChange = (e) => {
  const isForeignKey = e.target.checked;
  
  setTempColumn({
    ...tempColumn,
    foreignKey: isForeignKey,
    // Reset references if turning off foreign key
    references: isForeignKey ? tempColumn.references : { tableId: '', columnName: '' }
  });
};

const handleReferenceTableChange = (e) => {
  setTempColumn({
    ...tempColumn,
    references: {
      ...tempColumn.references,
      tableId: e.target.value,
      columnName: '' // Reset column when table changes
    }
  });
};

const handleReferenceColumnChange = (e) => {
  setTempColumn({
    ...tempColumn,
    references: {
      ...tempColumn.references,
      columnName: e.target.value
    }
  });
};

  const handleColumnPrimaryKeyChange = (e) => {
    const isPrimaryKey = e.target.checked;
    
    setTempColumn({
      ...tempColumn, 
      primaryKey: isPrimaryKey,
      // If setting as primary key, also make it not nullable and unique
      nullable: isPrimaryKey ? false : tempColumn.nullable,
      unique: isPrimaryKey ? true : tempColumn.unique
    });
  };

  const addColumn = () => {
    if (tempColumn.name && tempColumn.type) {
      // If the new column is a primary key, we need to update any existing primary key columns
      let updatedColumns = [...newTable.columns];
      
      if (tempColumn.primaryKey) {
        // Remove primary key designation from any existing columns
        updatedColumns = updatedColumns.map(col => ({
          ...col,
          primaryKey: false
        }));
      }
      
      setNewTable({
        ...newTable,
        columns: [...updatedColumns, {...tempColumn}],
        primaryKey: tempColumn.primaryKey ? tempColumn.name : newTable.primaryKey
      });
      
      // Reset temp column
        setTempColumn({
        name: '',
        type: '',
        default: '',
        nullable: true,
        unique: false,
        primaryKey: false,
        foreignKey: false,
        references: {
            tableId: '',
            columnName: ''
        }
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
      primaryKey: updatedPrimaryKey
    });
  };

  const handleCreateTable = () => {
    if (newTable.name) {
      // If there's data in the temp column fields, add it before creating the table
      let finalColumns = [...newTable.columns];
      let finalPrimaryKey = newTable.primaryKey;
      
      if (tempColumn.name && tempColumn.type) {
        finalColumns = [...finalColumns, {...tempColumn}];
        if (tempColumn.primaryKey) {
          finalPrimaryKey = tempColumn.name;
        }
      }
      
      const newTableId = `table-${Date.now()}`;
      setTables([...tables, { 
        id: newTableId,
        ...newTable,
        columns: finalColumns,
        primaryKey: finalPrimaryKey,
        position: {x: 0, y: 0}
      }]);
      setDialogOpen(false);     
    }
  };

  // mouse down for panning handler
  const handleMouseDown = (e) => {
    // Only pan if we're not on a table
    if (!draggedTable) {
      setIsPanning(true);
      setStartPanPosition({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // mouse move for panning handler
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPosition({
        x: e.clientX - startPanPosition.x,
        y: e.clientY - startPanPosition.y
      });
    }
  };

  // mouse up for panning handler
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Table dragging handlers
  const handleTableMouseDown = (e, tableId) => {
    e.stopPropagation(); // Prevent canvas panning
    setDraggedTable(tableId);
    setStartDragPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleTableMouseMove = (e) => {
    if (draggedTable) {
      e.stopPropagation(); // Prevent canvas panning
      
      const deltaX = (e.clientX - startDragPosition.x) / scale;
      const deltaY = (e.clientY - startDragPosition.y) / scale;
      
      setTables(prevTables => prevTables.map(table => {
        if (table.id === draggedTable) {
          return {
            ...table,
            position: {
              x: table.position.x + deltaX,
              y: table.position.y + deltaY
            }
          };
        }
        return table;
      }));
      
      setStartDragPosition({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleTableMouseUp = () => {
    setDraggedTable(null);
  };

  // scroll wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.003;
    const newScale = Math.min(Math.max(0.1, scale + delta), 10);
    
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
    setDraggedTable(null);
  };
  
  // scroll event listener (prevents default scrolling)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      
      // cleanup
      return () => {
        canvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [scale, position]);

  // canvas drawing
  // Replace the existing useEffect for canvas drawing at line 324
    useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);
    
    // Draw relationship lines between tables
    tables.forEach(table => {
        table.columns.forEach(column => {
        if (column.foreignKey && column.references?.tableId && column.references?.columnName) {
            const targetTable = tables.find(t => t.id === column.references.tableId);
            if (targetTable) {
            // Source coordinates (from child table with FK)
            const sourceX = table.position.x + 150; // Approximate middle of table width
            const sourceY = table.position.y + 30; // Approximate header position
            
            // Target coordinates (to parent table with PK/referenced column)
            const targetX = targetTable.position.x + 150;
            const targetY = targetTable.position.y + 30;
            
            // Draw relationship line
            ctx.beginPath();
            ctx.strokeStyle = "#3182CE";
            ctx.lineWidth = 2 / scale; // Adjust line width for zoom
            ctx.setLineDash([5 / scale, 5 / scale]); // Dashed line adjusted for zoom
            ctx.moveTo(sourceX, sourceY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            ctx.setLineDash([]); // Reset to solid line
            
            // Draw arrow at the target end
            const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
            const arrowSize = 10 / scale;
            
            ctx.beginPath();
            ctx.fillStyle = "#3182CE";
            ctx.moveTo(
                targetX - arrowSize * Math.cos(angle) + arrowSize * Math.sin(angle) / 2,
                targetY - arrowSize * Math.sin(angle) - arrowSize * Math.cos(angle) / 2
            );
            ctx.lineTo(targetX, targetY);
            ctx.lineTo(
                targetX - arrowSize * Math.cos(angle) - arrowSize * Math.sin(angle) / 2,
                targetY - arrowSize * Math.sin(angle) + arrowSize * Math.cos(angle) / 2
            );
            ctx.closePath();
            ctx.fill();
            }
        }
        });
    });
    
    // Your existing shapes
    // blue square
    ctx.fillStyle = 'blue';
    ctx.fillRect(100, 100, 50, 50);
    
    // green circle
    ctx.beginPath();
    ctx.fillStyle = 'green';
    ctx.arc(-150, 150, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // yellow triangle
    ctx.beginPath();
    ctx.fillStyle = 'gold';
    ctx.moveTo(-100, -100);
    ctx.lineTo(-150, -200);
    ctx.lineTo(-50, -200);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    }, [position, scale, tables]);

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
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none' // Allow clicks to pass through to canvas by default
        }}
        onMouseMove={handleTableMouseMove}
        onMouseUp={handleTableMouseUp}
        onMouseLeave={handleTableMouseUp}
      >
        {tables.map(table => (
          <div 
            key={table.id} 
            className="table-component"
            style={{
              left: `${table.position.x}px`,
              top: `${table.position.y}px`,
              pointerEvents: 'auto' // Make tables interactive
            }}
            onMouseDown={(e) => handleTableMouseDown(e, table.id)}
          >
            <div className="table-component-header">{table.name || 'Unnamed Table'}</div>
            <div className="table-placeholder">
              {table.columns.length > 0 ? (
                <div className="table-columns">
                  {table.columns.map((column, index) => (
                    <div key={index} className="table-column">
                      <strong>{column.name}</strong> ({column.type})
                      {column.primaryKey && ' 🔑'}
                      {column.foreignKey && column.references?.tableID && ' 🔗'}
                    </div>
                  ))}
                </div>
              ) : (
                'No columns defined'
              )}
            </div>
            {table.notes && (
              <div className="table-notes">
                <small>{table.notes}</small>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* MUI Floating Action Button */}
      <Fab 
        color="primary" 
        aria-label="add table" 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}
        onClick={openNewTableDialog}
      >
        <AddIcon />
      </Fab>
      
      <CanvasStatistics scale={scale} />
      <button 
        className="resetCanvasButton"
        onClick={handleResetCanvasPos}
      >
        Reset Position
      </button>
      
      {/* Table Creation Dialog */}
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
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Columns</Typography>
          <Divider sx={{ mb: 2 }} />
          
          {/* Column list */}
          <List dense sx={{ mb: 2 }}>
            {newTable.columns.map((column, index) => (
              <ListItem 
                key={index}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => removeColumn(index)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                primary={`${column.name} (${column.type})`}
                secondary={`${column.nullable ? 'Nullable' : 'Not Null'}${column.unique ? ', Unique' : ''}${column.primaryKey ? ', Primary Key' : ''}${column.foreignKey && column.references?.tableId ? `, FK → ${tables.find(t => t.id === column.references.tableId)?.name || ''}` : ''}`}
                />
                <ListItemText
                  primary={`${column.name} (${column.type})`}
                  secondary={`${column.nullable ? 'Nullable' : 'Not Null'}${column.unique ? ', Unique' : ''}${column.primaryKey ? ', Primary Key' : ''}`}
                />
              </ListItem>
            ))}
          </List>
          
          {/* Add new column */}
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Add New Column</Typography>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <TextField
              label="Column Name"
              value={tempColumn.name}
              onChange={handleColumnNameChange}
              size="small"
              sx={{ flex: 1 }}
            />
          <div style = {{ flex: 1 , marginTop: '0px'}}>
           <TextField
            select
            label="Data Type"
            value={tempColumn.type}
            onChange={handleColumnTypeChange}
            size="small"
            fullWidth
          >
            <MenuItem value="INTEGER">INTEGER</MenuItem>
            <MenuItem value="TEXT">TEXT</MenuItem>
            <MenuItem value="REAL">REAL</MenuItem>
            <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
            <MenuItem value="BOOLEAN">BLOB</MenuItem>
            <MenuItem value="BOOLEAN">DATE</MenuItem>
            <MenuItem value="BOOLEAN">TIME</MenuItem>
            {/* Add more types as needed */}
          </TextField>
          </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <TextField
              label="Default Value"
              value={tempColumn.default}
              onChange={handleColumnDefaultChange}
              size="small"
              sx={{ flex: 1 }}
            />
          </div>
          
         <div style={{ display: 'flex', flexWrap: 'wrap' }}>
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
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
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
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '10px', width: '100%' }}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>References Table</InputLabel>
                    <Select
                        value={tempColumn.references.tableId}
                        label="References Table"
                        onChange={handleReferenceTableChange}
                    >
                        {tables.map(table => (
                        <MenuItem key={table.id} value={table.id}>{table.name}</MenuItem>
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
                            .find(t => t.id === tempColumn.references.tableId)?.columns
                            .map(column => (
                            <MenuItem key={column.name} value={column.name}>
                                {column.name} {column.primaryKey ? '(PK)' : ''}
                            </MenuItem>
                            ))
                        }
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
          <Button onClick={handleCreateTable} color="primary" disabled={!newTable.name}>
            Create Table
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default App;