import { useState, useRef, useEffect } from 'react';
import './App.css';
import AddNewTable from './Components/AddNewTable';
import { buttonBaseClasses } from '@mui/material';
import CanvasStatistics from './Components/CanvasStatistics';

function App() {
  const canvasRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  
  // Table dragging state
  const [draggedTable, setDraggedTable] = useState(null);
  const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });
  
  // array to hold instances of generated tables
  const [tables, setTables] = useState([]);

  const handleResetCanvasPos = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  };

  const handleAddTable = () => {
    const newTableId = `table-${Date.now()}`;
    // Add position information when creating a new table
    setTables([...tables, { 
      id: newTableId,
      position: { x: 100, y: 100 } // Default position
    }]);
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
    const delta = e.deltaY * -0.01;
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
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);
    
    // shapes for reference
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
    
  }, [position, scale]);

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
            <div className="table-component-header">Table</div>
            <div className="table-placeholder">
              SQL Table Schema (To be implemented)
            </div>
          </div>
        ))}
      </div>
      <AddNewTable onAddTable={handleAddTable}/>
      <CanvasStatistics scale={scale} />
      <button 
        className="resetCanvasButton"
        onClick={handleResetCanvasPos}
      >
        Reset Position
      </button>
    </div>
  );
}

export default App;