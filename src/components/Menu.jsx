import React, { useState } from 'react';

const Menu = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  return (
    <div className="menu-container">
      <div className="menu-card">
        <h1>SUECA ONLINE</h1>
        <input 
          type="text" 
          placeholder="Nome do Jogador" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <input 
          type="text" 
          placeholder="Código da Mesa" 
          value={room} 
          onChange={(e) => setRoom(e.target.value)} 
        />
        <button className="start-btn" onClick={() => name && room && onJoin(name, room)}>
          ENTRAR NA MESA
        </button>
      </div>
    </div>
  );
};

export default Menu;