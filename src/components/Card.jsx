import React from 'react';

const Card = ({ card, onClick, disabled, isHidden }) => {
  if (!card) return null;

  return (
    <div 
      className={`card ${disabled ? 'disabled' : ''}`} 
      onClick={!disabled ? onClick : undefined}
      style={{
        width: '80px',
        height: '115px',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer'
      }}
    >
      <img 
        src={isHidden ? 'https://deckofcardsapi.com/static/img/back.png' : card.image} 
        alt={card.id} 
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

export default Card;