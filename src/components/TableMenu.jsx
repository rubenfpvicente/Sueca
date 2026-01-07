// src/components/TableMenu.jsx
import React, { useState } from 'react';

const TableMenu = ({ tables, onPickSeat }) => {
  const [name, setName] = useState(localStorage.getItem('sueca_name') || '');

  return (
    <div className="table-menu-container">
      <div className="user-settings">
        <input 
          placeholder="Teu Nome" 
          value={name} 
          onChange={(e) => { setName(e.target.value); localStorage.setItem('sueca_name', e.target.value); }} 
        />
      </div>

      <div className="tables-grid">
        {tables.map(table => (
          <div key={table.id} className="table-card">
            <span className="table-id">{table.id}</span>
            <div className="mini-table-visual">
              {/* Representação das 4 cadeiras */}
              {[0, 2, 1, 3].map(i => ( // Ordem: Cima, Baixo, Direita, Esquerda
                <div 
                  key={i} 
                  className={`chair pos-${i} ${table.players[i] ? 'occupied' : 'free'}`}
                  onClick={() => name && onPickSeat(table.id, i, name)}
                >
                  {table.players[i] ? table.players[i].name : 'livre'}
                </div>
              ))}
              <div className="table-center-wood"></div>
            </div>
            {table.started && <span className="in-game-tag">EM JOGO</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableMenu;