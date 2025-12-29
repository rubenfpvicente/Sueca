import React from 'react';
import Menu from './components/Menu';
import { useSuecaOnline } from './hooks/useSuecaOnline';
import './App.css';

function App() {
  const { 
    roomInfo, inGame, isSpectator, specOffer, gameOver, hand, table, trump, turn, scores, 
    playerIndex, allPlayers, cardCounts, timeLeft, readyList, error, myId,
    joinTable, confirmSpectate, sitAtTable, startMatch, playCard, toggleReady, leaveTable, setSpecOffer 
  } = useSuecaOnline();

  // --- LÓGICA DE APOIO ---
  const myTeam = isSpectator ? 0 : (playerIndex !== null ? playerIndex % 2 : 0);
  const otherTeam = myTeam === 0 ? 1 : 0;
  
  const getUIPlace = (serverIdx) => {
    if (isSpectator) return serverIdx; 
    return (serverIdx - playerIndex + 4) % 4;
  };

  const getPlayerName = (serverIdx) => {
    const p = allPlayers.find(player => player.index === serverIdx);
    if (!p) return `Jogador ${serverIdx}`;
    return p.id === myId ? `${p.name} (Tu)` : p.name;
  };

  // 1. MENU INICIAL (Se não houver sala selecionada)
  if (!roomInfo.id && !specOffer) {
    return <Menu onJoin={joinTable} />;
  }

  // 2. AVISO DE MESA CHEIA / JOGO EM CURSO (OFERTA PARA ASSISTIR)
  if (specOffer) {
    return (
      <div className="game-over-full">
        <div className="modal">
          <h2>Mesa {specOffer.isStarted ? "em Jogo" : "Cheia"}</h2>
          <p>Deseja assistir à partida na Mesa {specOffer.roomID}?</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
            <button className="start-btn" onClick={() => confirmSpectate(specOffer.roomID)}>
              ASSISTIR
            </button>
            <button className="btn-exit" onClick={() => setSpecOffer(null)}>
              VOLTAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container full-screen">
      {error && <div className="error-toast">{error}</div>}

      {/* --- CAMADA 1: JOGO ATIVO --- */}
      {inGame && (
        <>
          <div className="hud-overlay">
            <div className="score-badge">
              <span style={{color: '#4fc3f7'}}>Equipa A:</span> {scores[0]} | 
              <span style={{color: '#ff8a65', marginLeft: '10px'}}>Equipa B:</span> {scores[1]}
            </div>
            
            <div className="timer-badge">
              ⏳ {timeLeft}s 
              {isSpectator && <span className="spec-tag">ESPETADOR</span>}
              {/* BOTÃO SAIR DURANTE O JOGO */}
              <button className="btn-quit-game" onClick={leaveTable} style={{marginLeft: '15px'}}>
                SAIR
              </button>
            </div>

            {trump && (
              <div className="trump-container">
                <img src={trump.image} className="trump-icon" alt="T" />
              </div>
            )}
          </div>

          <div className="poker-table-area">
            <div className="green-felt">
              {[0, 1, 2, 3].map(idx => {
                const uiPos = getUIPlace(idx);
                const p = allPlayers.find(pl => pl.index === idx);
                return (
                  <div key={idx} className={`player-info ui-pos-${uiPos}`}>
                    <span className={`p-name ${idx % 2 === 0 ? 'team-a-border' : 'team-b-border'}`}>
                      {getPlayerName(idx)} {turn === idx && "⭐"}
                    </span>
                    {(uiPos !== 0 || isSpectator) && (
                      <div className="mini-hand">
                        {[...Array(cardCounts[idx] || 0)].map((_, i) => (
                          <img key={i} src="https://deckofcardsapi.com/static/img/back.png" className="back-card" alt="B" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="table-center-slots">
                {table.map((c, i) => (
                  <img key={i} src={c.image} className={`card-played pos-${getUIPlace(c.playerIndex)}`} alt="C" />
                ))}
                {table.length === 0 && !gameOver && (
                  <div className="turn-indicator" style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', opacity:0.5}}>
                    {turn === playerIndex ? "TUA VEZ!" : `Vez de ${getPlayerName(turn)}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isSpectator && (
            <div className="my-hand-container">
              <div className="hand-flex">
                {hand.map((c, i) => (
                  <img 
                    key={c.id || i} 
                    src={c.image} 
                    className={`h-card ${turn === playerIndex && table.length < 4 ? 'active' : ''}`} 
                    style={{ 
                      marginLeft: i === 0 ? 0 : '-50px', 
                      zIndex: i, 
                      filter: (turn !== playerIndex || table.length >= 4) ? 'brightness(0.5)' : 'none', 
                      transform: `rotate(${(i - hand.length/2)*2}deg)` 
                    }}
                    onClick={() => playCard(c.id)} 
                    alt="C"
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- CAMADA 2: LOBBY (MENU DA MESA) --- */}
      {!inGame && (
        <div className="lobby-screen" style={{ background: gameOver ? 'transparent' : 'inherit' }}>
          <div className="lobby-card">
            <h1>Mesa: {roomInfo.id}</h1>
            <div className="players-list">
              <h3>Jogadores ({roomInfo.players.length}/4)</h3>
              {roomInfo.players.map(p => (
                <div key={p.id} className={`p-tag ${p.id === myId ? 'me' : ''}`}>
                  {p.name} {p.id === myId && " (Tu)"}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {!isSpectator ? (
                <button className="start-btn" onClick={startMatch}>INICIAR JOGO</button>
              ) : (
                (roomInfo.players.length < 4 || roomInfo.players.some(p => p.isBot)) && (
                  <button className="start-btn" style={{backgroundColor: '#2196F3'}} onClick={sitAtTable}>
                    SENTAR NA MESA
                  </button>
                )
              )}
              <button className="btn-exit" onClick={leaveTable}>SAIR</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CAMADA 3: MODAL FIM DE JOGO --- */}
      {gameOver && (
        <div className="game-over-full">
          <div className="modal">
            <h1>
              {isSpectator 
                ? "FIM DE JOGO 🏁" 
                : (scores[myTeam] > scores[otherTeam] ? "VITÓRIA! 🎉" : scores[myTeam] === scores[otherTeam] ? "EMPATE! 🤝" : "DERROTA! 😢")
              }
            </h1>
            <p>Resultado Final: Equipa A {scores[0]} - {scores[1]} Equipa B</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {!isSpectator ? (
                <button 
                  className={`start-btn ${readyList.includes(myId) ? 'ready-active' : ''}`} 
                  onClick={toggleReady}
                >
                  {readyList.includes(myId) ? "AGUARDANDO OUTROS..." : "JOGAR NOVAMENTE"}
                </button>
              ) : (
                (roomInfo.players.length < 4 || roomInfo.players.some(p => p.isBot)) && (
                  <button className="start-btn" style={{backgroundColor: '#2196F3'}} onClick={sitAtTable}>
                    OCUPAR LUGAR NA MESA
                  </button>
                )
              )}
              <button onClick={leaveTable} className="btn-exit">SAIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;