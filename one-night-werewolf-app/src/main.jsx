import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Users, Moon, Sun, Vote, RotateCcw, Eye, Shuffle, Crown } from 'lucide-react';
import './style.css';

const ROLE_INFO = {
  Werewolf: { team: 'Werewolf', text: 'Wake up and look for other Werewolves. If alone, you may look at one center card.' },
  Villager: { team: 'Village', text: 'No night action. Help identify the Werewolf.' },
  Seer: { team: 'Village', text: "Look at one player's card or two center cards." },
  Robber: { team: 'Village', text: "Swap with another player's card, then look at your new card." },
  Troublemaker: { team: 'Village', text: "Swap two other players' cards without looking." },
};

const AVAILABLE_ROLES = ['Werewolf', 'Villager', 'Seer', 'Robber', 'Troublemaker'];
const DEFAULT_PLAYERS = ['Player 1', 'Player 2', 'Player 3'];
const DEFAULT_ROLES = ['Werewolf', 'Villager', 'Villager', 'Seer', 'Robber', 'Troublemaker'];

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function App() {
  const [roomCode, setRoomCode] = useState(makeRoomCode());
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [playerName, setPlayerName] = useState('');
  const [phase, setPhase] = useState('lobby');
  const [startingCards, setStartingCards] = useState({});
  const [finalCards, setFinalCards] = useState({});
  const [centerCards, setCenterCards] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(DEFAULT_PLAYERS[0]);
  const [votes, setVotes] = useState({});
  const [log, setLog] = useState([]);
  const [roleDeck, setRoleDeck] = useState(DEFAULT_ROLES);

  const canStart = players.length >= 3 && roleDeck.length >= players.length + 3;
  const roleCounts = useMemo(() => roleDeck.reduce((a, r) => ({ ...a, [r]: (a[r] || 0) + 1 }), {}), [roleDeck]);

  function addPlayer() {
    const clean = playerName.trim();
    if (!clean || players.includes(clean)) return;
    setPlayers([...players, clean]);
    setPlayerName('');
  }

  function removePlayer(name) {
    const next = players.filter((p) => p !== name);
    setPlayers(next);
    if (selectedPlayer === name) setSelectedPlayer(next[0] || '');
  }

  function startGame() {
    if (!canStart) return;
    const shuffled = shuffleArray(roleDeck);
    const assigned = {};
    const final = {};
    players.forEach((player, index) => {
      assigned[player] = shuffled[index];
      final[player] = shuffled[index];
    });
    setStartingCards(assigned);
    setFinalCards(final);
    setCenterCards(shuffled.slice(players.length, players.length + 3));
    setVotes({});
    setLog(['Cards were assigned secretly.']);
    setSelectedPlayer(players[0]);
    setPhase('cards');
  }

  function swapCards(a, b) {
    if (!a || !b || a === b) return;
    setFinalCards((prev) => ({ ...prev, [a]: prev[b], [b]: prev[a] }));
    setLog((prev) => [`Swapped ${a} and ${b}.`, ...prev]);
  }

  function castVote(voter, target) {
    setVotes((prev) => ({ ...prev, [voter]: target }));
  }

  function resetGame() {
    setRoomCode(makeRoomCode());
    setPlayers(DEFAULT_PLAYERS);
    setPlayerName('');
    setPhase('lobby');
    setStartingCards({});
    setFinalCards({});
    setCenterCards([]);
    setSelectedPlayer(DEFAULT_PLAYERS[0]);
    setVotes({});
    setLog([]);
    setRoleDeck(DEFAULT_ROLES);
  }

  const voteCounts = useMemo(() => {
    const counts = {};
    Object.values(votes).forEach((target) => { counts[target] = (counts[target] || 0) + 1; });
    return counts;
  }, [votes]);

  const eliminated = useMemo(() => {
    const entries = Object.entries(voteCounts);
    if (!entries.length) return [];
    const max = Math.max(...entries.map(([, count]) => count));
    return entries.filter(([, count]) => count === max).map(([name]) => name);
  }, [voteCounts]);

  const result = useMemo(() => {
    if (phase !== 'reveal') return '';
    const killedWerewolf = eliminated.some((name) => finalCards[name] === 'Werewolf');
    const hasWerewolf = Object.values(finalCards).includes('Werewolf');
    if (!hasWerewolf) return 'No Werewolf in play. Village wins only if nobody was killed.';
    return killedWerewolf ? 'Village Team Wins' : 'Werewolf Team Wins';
  }, [phase, eliminated, finalCards]);

  return <div className="app">
    <header>
      <div><h1>One Night Werewolf</h1><p>Private digital card prototype for friends.</p></div>
      <div className="room"><Crown size={18}/><span>Room Code</span><b>{roomCode}</b></div>
    </header>

    <main>
      <aside className="panel">
        <h2><Users size={20}/> Players <small>{players.length}</small></h2>
        <div className="row"><input value={playerName} onChange={e=>setPlayerName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addPlayer()} placeholder="Add player name"/><button onClick={addPlayer}>Add</button></div>
        {players.map(p => <div className="player" key={p}><button className={selectedPlayer===p?'active':''} onClick={()=>setSelectedPlayer(p)}>{p}</button><button onClick={()=>removePlayer(p)}>Remove</button></div>)}
        <button className="primary wide" onClick={startGame} disabled={!canStart}><Shuffle size={16}/> Start / Deal Cards</button>
        <button className="wide" onClick={resetGame}><RotateCcw size={16}/> Reset</button>
        {!canStart && <p className="warn">Need at least 3 players and total cards must be players + 3 center cards.</p>}

        <section className="roles">
          <h3>Role Deck <small>{roleDeck.length} cards</small></h3>
          <p>Pick roles for this game.</p>
          <div className="rolebuttons">{AVAILABLE_ROLES.map(r=><button key={r} onClick={()=>setRoleDeck([...roleDeck,r])}>+ {r}</button>)}</div>
          <div className="chips">{roleDeck.map((r,i)=><button key={r+i} onClick={()=>setRoleDeck(roleDeck.filter((_,x)=>x!==i))}>{r} ×</button>)}</div>
          <button onClick={()=>setRoleDeck(DEFAULT_ROLES)}>Reset default roles</button>
        </section>
      </aside>

      <section className="panel big">
        <nav>{['lobby','cards','night','discussion','voting','reveal'].map(x=><button key={x} className={phase===x?'primary':''} onClick={()=>setPhase(x)}>{x.toUpperCase()}</button>)}</nav>
        {phase==='lobby' && <div><h2>Lobby</h2><p>Add players and choose roles. This first hosted version works best on one shared screen.</p><div className="grid">{Object.entries(roleCounts).map(([r,c])=><div className="card" key={r}><b>{r} × {c}</b><small>{ROLE_INFO[r].team}</small></div>)}</div></div>}
        {phase==='cards' && <div><h2><Eye size={24}/> Secret Card View</h2><p>Select a player on the left. In the full multiplayer version, each player sees only their own card.</p>{startingCards[selectedPlayer]?<div className="feature"><small>{selectedPlayer}'s starting role</small><strong>{startingCards[selectedPlayer]}</strong><p>{ROLE_INFO[startingCards[selectedPlayer]].text}</p></div>:<p>Start the game first.</p>}<button className="primary" onClick={()=>setPhase('night')}><Moon size={16}/> Proceed to Night</button></div>}
        {phase==='night' && <Night players={players} finalCards={finalCards} centerCards={centerCards} swapCards={swapCards} log={log} setPhase={setPhase}/>}        
        {phase==='discussion' && <div><h2><Sun size={24}/> Day Discussion</h2><p>Everyone may now talk, bluff, accuse, or defend.</p><div className="timer">05:00</div><button className="primary" onClick={()=>setPhase('voting')}><Vote size={16}/> Proceed to Voting</button></div>}
        {phase==='voting' && <div><h2>Voting</h2>{players.map(v=><div className="vote" key={v}><b>{v} votes for:</b><div>{players.filter(p=>p!==v).map(t=><button key={t} className={votes[v]===t?'primary':''} onClick={()=>castVote(v,t)}>{t}</button>)}</div></div>)}<button className="primary" onClick={()=>setPhase('reveal')}>Reveal Results</button></div>}
        {phase==='reveal' && <div><h2>Reveal</h2><div className="feature"><small>Result</small><strong>{result}</strong><p>Eliminated: {eliminated.length ? eliminated.join(', ') : 'No votes yet'}</p></div><div className="grid">{players.map(p=><div className="card" key={p}><b>{p}</b><small>Started as: {startingCards[p]}</small><strong>Final: {finalCards[p]}</strong><small>Votes received: {voteCounts[p]||0}</small></div>)}</div></div>}
      </section>
    </main>
  </div>;
}

function Night({ players, finalCards, centerCards, swapCards, log, setPhase }) {
  const [swapA, setSwapA] = useState(players[0] || '');
  const [swapB, setSwapB] = useState(players[1] || '');
  const [viewPlayer, setViewPlayer] = useState(players[0] || '');
  const [viewCenter, setViewCenter] = useState(false);
  return <div><h2><Moon size={24}/> Night Actions</h2><p>Host-controlled prototype for basic night actions.</p><div className="grid two"><div className="card"><h3>Seer View</h3><select value={viewPlayer} onChange={e=>setViewPlayer(e.target.value)}>{players.map(p=><option key={p}>{p}</option>)}</select><button onClick={()=>setViewCenter(false)}>View Player</button><button onClick={()=>setViewCenter(true)}>View Center</button><div className="mini">{viewCenter ? `Center cards: ${centerCards.map((c,i)=>`#${i+1}: ${c}`).join(' | ')}` : `${viewPlayer}'s current card: ${finalCards[viewPlayer]}`}</div></div><div className="card"><h3>Swap Cards</h3><select value={swapA} onChange={e=>setSwapA(e.target.value)}>{players.map(p=><option key={p}>{p}</option>)}</select><select value={swapB} onChange={e=>setSwapB(e.target.value)}>{players.map(p=><option key={p}>{p}</option>)}</select><button className="primary" onClick={()=>swapCards(swapA,swapB)}>Swap Selected Cards</button></div></div><div className="card"><h3>Night Log</h3>{log.map((entry,i)=><p key={i}>• {entry}</p>)}</div><button className="primary" onClick={()=>setPhase('discussion')}><Sun size={16}/> Wake Up / Start Discussion</button></div>;
}

createRoot(document.getElementById('root')).render(<App />);
