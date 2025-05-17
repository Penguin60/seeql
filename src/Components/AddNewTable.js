import React from 'react';
import './AddNewTable.css';

// Modified to accept onAddTable prop instead of managing tables state
const AddNewTable = ({ onAddTable }) => {
  return (
    <div className="add-new-table-container">
      <button
        className="add-table-button"
        onClick={onAddTable}
      >
        +
      </button>
    </div>
  );
};

export default AddNewTable;