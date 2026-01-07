import React, { useState } from 'react';
import { useSuecaOnline } from './hooks/useSuecaOnline';
import './App.css';

function App() {
  const [userName, setUserName] = useState(localStorage.getItem('sueca_name') || "");
  const { availableTables, roomInfo, inGame, gamePhase, cortador, dealer, totalScores, isSpectator, gameOver, isFinalGame, readyTimer, hand, table, trump, turn, scores, playerIndex, cardCounts, timeLeft, readyList, error, myId, joinTable, startMatch, cutDeck, pickTrump, playCard, toggleReady, leaveTable, sitAtTable } = useSuecaOnline(userName);

  if (!roomInfo.id) {
    return (
      <div className="lobby-screen main-bg">
        <h1 className="main-title">Sueca</h1>
        <div className="menu-header"><input placeholder="Teu Nome" value={userName} onChange={(e) => {setUserName(e.target.value); localStorage.setItem('sueca_name', e.target.value)}} /></div>
        <div className="tables-grid">
          {availableTables.map(t => (
            <div key={t.id} className="table-card" onClick={() => userName && joinTable(t.id, null, userName)}>
              <h3>{t.id}</h3>
              <div className="mini-table">
                {[0, 2, 1, 3].map(i => (
                  <div key={i} className={`chair c-${i} ${t.players[i] ? 'taken' : 'free'}`} onClick={(e) => { e.stopPropagation(); if(userName && !t.players[i]) joinTable(t.id, i, userName); }}>
                    {t.players[i] ? t.players[i].name : 'livre'}
                  </div>
                ))}
              </div>
              {t.started && <span className="tag">EM JOGO (ASSISTIR)</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const myTeam = isSpectator ? 0 : (parseInt(playerIndex) % 2);
  const otherTeam = (myTeam + 1) % 2;
  const getUIPlace = (sIdx) => (playerIndex === null || isSpectator) ? sIdx : (parseInt(sIdx) - parseInt(playerIndex) + 4) % 4;
  const getPlayerName = (sIdx) => roomInfo.players[sIdx]?.name || `Bot ${sIdx + 1}`;

  return (
    <div className="game-container full-screen">
      {error && <div className="error-toast">{error}</div>}
      <button className="btn-exit-top-left" onClick={leaveTable}>SAIR</button>

      <div className="score-table-container">
        <table>
          <thead><tr><th>Equipa</th><th>Partida</th><th>Jogo</th></tr></thead>
          <tbody>
            <tr><td className="team-red-text">Vermelha</td><td>{scores[1]}</td><td>{totalScores[1]}</td></tr>
            <tr><td className="team-blue-text">Azul</td><td>{scores[0]}</td><td>{totalScores[0]}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="poker-table-area">
        <div className="green-felt">
          <div className="table-center-slots">
            {inGame && gamePhase === 'playing' && table.map((c, i) => (
              <img key={i} src={c.image} className={`card-played pos-${getUIPlace(c.playerIndex)}`} alt="C" />
            ))}
            {!inGame && !gameOver && playerIndex !== null && roomInfo.players.filter(p => p && !p.isBot).length >= 1 && (
              <button className="start-match-btn" onClick={startMatch}>INICIAR JOGO</button>
            )}
          </div>
        </div>

        {[0, 1, 2, 3].map((idx) => {
          const uiPos = getUIPlace(idx);
          const isTurn = parseInt(turn) === idx;
          const isVert = uiPos === 1 || uiPos === 3;
          const p = roomInfo.players[idx];

          return (
            <div key={idx} className={`player-container-box ui-pos-${uiPos}`}>
              {p ? (
                <div className={`p-label-v2 ${idx % 2 === 0 ? 'blue-team' : 'red-team'}`}>
                  {p.name} {p.id === myId && "(Tu)"}
                  {isTurn && inGame && gamePhase === 'playing' && <span className="player-timer">⏳ {timeLeft}s</span>}
                </div>
              ) : (
                !inGame && <button className="sit-btn" onClick={() => joinTable(roomInfo.id, idx, userName)}>OCUPAR CADEIRA</button>
              )}
              {idx === dealer && trump && inGame && <div className="trump-side-marker"><small>TRUNFO</small><img src={trump.image} className="trump-card-mini" alt="T" /></div>}
              {inGame && gamePhase === 'playing' && (uiPos !== 0 || isSpectator) && (
                <div className={`opponent-hand-v2 ${isVert ? 'vertical' : 'horizontal'}`}>
                  {[...Array(cardCounts[idx] || 0)].map((_, i) => <img key={i} src="https://deckofcardsapi.com/static/img/back.png" className="back-card-small" style={{ marginLeft: !isVert && i > 0 ? '-32px' : 0, marginTop: (isVert && i > 0) ? '-45px' : 0, zIndex: i }} alt="B" />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(gamePhase === 'cutting' || gamePhase === 'trumpSelection') && inGame && (
        <div className="game-over-full"><div className="modal">
          <h2>{gamePhase === 'cutting' ? "CORTE" : "TRUNFO"} ({timeLeft}s)</h2>
          <div className="deck-visual"><img src="https://deckofcardsapi.com/static/img/back.png" alt="B" /></div>
          {((gamePhase === 'cutting' && parseInt(playerIndex) === cortador) || (gamePhase === 'trumpSelection' && parseInt(playerIndex) === dealer)) ? (
            gamePhase === 'cutting' ? <><input type="range" min="1" max="39" id="cutIn" className="cut-slider" /><button className="start-btn" onClick={() => cutDeck(parseInt(document.getElementById('cutIn').value))}>CORTAR</button></>
            : <div style={{display:'flex', gap:'10px'}}><button className="start-btn" onClick={()=>pickTrump('top')}>CIMA</button><button className="start-btn" onClick={()=>pickTrump('bottom')}>BAIXO</button></div>
          ) : <p>Aguardando oponente...</p>}
        </div></div>
      )}

      {!isSpectator && inGame && gamePhase === 'playing' && (
        <div className="my-hand-container"><div className="hand-flex">
          {hand.map((c, i) => (
            <img key={c.id || i} src={c.image} className={`h-card ${parseInt(turn) === parseInt(playerIndex) && table.length < 4 ? 'active' : ''}`}
                 style={{ marginLeft: i === 0 ? 0 : '-50px', zIndex: i, filter: (parseInt(turn) === parseInt(playerIndex) && table.length < 4) ? 'none' : 'brightness(0.5)', transform: `rotate(${(i - (hand.length-1)/2)*2}deg)` }}
                 onClick={() => parseInt(turn) === parseInt(playerIndex) && playCard(c.id)} alt="C" />
          ))}
        </div></div>
      )}

      {gameOver && (
        <div className="game-over-full">
          <div className="modal">
            <h1 style={{color: scores[myTeam] >= scores[otherTeam] ? '#4caf50' : '#ff5252'}}>FIM DA PARTIDA</h1>
            <p>Resultado: {scores[myTeam]} - {scores[otherTeam]}</p>
            <div style={{margin: '10px 0', color: 'gold'}}>Pedras: Azul {totalScores[0]} - {totalScores[1]} Vermelha</div>
            {!isSpectator ? (
              <button className={`start-btn ${readyList.includes(myId) ? 'ready-active' : ''}`} onClick={toggleReady}>
                {readyList.includes(myId) ? `Aguardando (${readyList.length}/${roomInfo.players.filter(p=>p&&!p.isBot).length})` : (isFinalGame ? "NOVO JOGO" : `CONTINUAR (${readyTimer}s)`)}
              </button>
            ) : (roomInfo.players.some(p => !p || p.isBot)) && <button className="start-btn" style={{backgroundColor: '#2196F3'}} onClick={sitAtTable}>OCUPAR LUGAR</button>}
            <button onClick={leaveTable} className="btn-exit">SAIR</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;