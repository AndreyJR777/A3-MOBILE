import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'

const CHAPTERS = [
  { id: 1, title: 'Despertar', threshold: 0, text: 'Seus olhos se abrem lentamente. Luzes vermelhas piscam no painel de controle. O alarme ecoa pelos corredores vazios da nave. Você é o único sobrevivente.\n\nOs sistemas estão falhando. O casco está danificado, os motores quase desligados. O suporte de vida opera no mínimo. Você precisa agir — seu corpo é a nave.\n\nCada gole de água restaura o núcleo de refrigeração. Cada alongamento reativa o suporte de vida. Cada pausa recarrega os motores.\n\nSua sobrevivência depende de você.' },
  { id: 2, title: 'Primeiros Reparos', threshold: 5, text: 'Com esforço, você conseguiu estabilizar os sistemas básicos. O casco parou de perder pressão, pelo menos por agora.\n\nNos destroços da sala de engenharia, você encontra um manual de emergência: "Protocolo Fênix — Procedimentos de sobrevivência para tripulação solo."\n\nO manual é claro: manter o corpo hidratado é essencial para operar os sistemas neurais da nave. Sem hidratação, o link neural se degrada.\n\nVocê olha pela escotilha. Estrelas infinitas. Nenhum planeta à vista. Mas há esperança.' },
  { id: 3, title: 'O Sinal', threshold: 15, text: 'O rádio crepita. Entre a estática, você capta algo — um sinal! Fraco, distante, mas definitivamente artificial.\n\n"...base... coordenadas... sobreviventes..."\n\nSeu coração dispara. Alguém está lá fora. Mas o transmissor da nave está danificado. Você precisa manter todos os sistemas acima de 50% para decodificar a mensagem completa.\n\nA cada missão completada, o sinal fica mais claro. Continue se movendo, continue bebendo água, continue vivo.' },
  { id: 4, title: 'A Tempestade Solar', threshold: 30, text: 'ALERTA VERMELHO. Os sensores detectaram uma tempestade solar massiva se aproximando. As radiações vão sobrecarregar todos os sistemas.\n\nVocê tem uma escolha: desviar poder dos motores para os escudos, ou tentar atravessar. De qualquer forma, seu corpo precisa estar em peak performance.\n\nA tempestade chegou. O casco range. As luzes piscam. Mas você está preparado — cada alongamento fortaleceu os estabilizadores, cada copo d\'água refrigerou os sistemas.\n\nVocê sobrevive. E do outro lado, o sinal está mais forte que nunca.' },
  { id: 5, title: 'Terra à Vista', threshold: 50, text: 'Depois de tanto esforço, tanto suor, tanta água... você vê.\n\nUm ponto azul no horizonte estelar. Pequeno no começo, mas crescendo a cada hora. Uma estação espacial, orbitando um planeta verdejante.\n\n"Nave desconhecida, aqui é a Estação Aurora. Recebemos seu sinal de socorro. Preparando docagem de emergência."\n\nLágrimas flutuam em gravidade zero. Você conseguiu. Seu corpo — sua nave — sobreviveu.\n\nMas lembre-se: a jornada da saúde nunca termina. Continue se hidratando. Continue se movendo. Você é o capitão da sua própria nave.' }
]

function generateStars(count) {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      dur: Math.random() * 3 + 2,
      delay: Math.random() * 5
    })
  }
  return stars
}

const STARS = generateStars(80)

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [systems, setSystems] = useState({ hull: 100, engine: 100, lifeSupport: 100, cooling: 100 })
  const [missions, setMissions] = useState({ water: 0, stretch: 0, break: 0 })
  const [totalMissions, setTotalMissions] = useState(0)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [cooldowns, setCooldowns] = useState({ water: 0, stretch: 0, break: 0 })
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioType, setAudioType] = useState('alpha')
  const [volume, setVolume] = useState(0.3)
  const [toast, setToast] = useState(null)
  const [gameOver, setGameOver] = useState(false)

  const audioCtxRef = useRef(null)
  const oscillatorsRef = useRef([])
  const gainRef = useRef(null)
  const decayRef = useRef(null)
  const cooldownRef = useRef(null)
  const saveRef = useRef(null)
  const swPortRef = useRef(null)

  // Channel Messaging API Setup
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          const channel = new MessageChannel();
          swPortRef.current = channel.port1;
          
          channel.port1.onmessage = (event) => {
            if (event.data.type === 'COOLDOWN_FINISHED') {
              const missionType = event.data.payload;
              // Reset local cooldown if it was somehow out of sync
              setCooldowns(prev => ({ ...prev, [missionType]: 0 }));
              showToast(`Comandante, sua missão de ${missionType} está disponível novamente!`, 'warning');
            }
          };

          registration.active.postMessage({ type: 'INIT_PORT' }, [channel.port2]);
        }
      });
    }
  }, []);

  // Request Notifications Permission
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          showToast('Notificações ativadas! Você será alertado sobre missões.', 'success');
        }
      } catch (e) {
        console.error('Error requesting notification permission:', e);
      }
    }
  }

  // Load saved game
  useEffect(() => {
    const saved = localStorage.getItem('naufrago_player_id')
    const savedName = localStorage.getItem('naufrago_player_name')
    if (saved && savedName) {
      setPlayerId(saved)
      setPlayerName(savedName)
      loadPlayer(saved)
      setShowWelcome(false)
    }
  }, [])

  async function loadPlayer(id) {
    try {
      const res = await fetch(`/api/player?id=${id}`)
      if (res.ok) {
        const p = await res.json()
        setSystems({ hull: p.hull_hp, engine: p.engine_hp, lifeSupport: p.life_support_hp, cooling: p.cooling_hp })
        setMissions({ water: p.total_water || 0, stretch: p.total_stretches || 0, break: p.total_breaks || 0 })
        setTotalMissions(p.missions_completed || 0)
        setCurrentChapter(p.current_chapter || 0)
      }
    } catch (e) { console.error(e) }
  }

  async function savePlayer() {
    if (!playerId) return
    try {
      await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save', id: playerId,
          hull_hp: Math.round(systems.hull), engine_hp: Math.round(systems.engine),
          life_support_hp: Math.round(systems.lifeSupport), cooling_hp: Math.round(systems.cooling),
          missions_completed: totalMissions, current_chapter: currentChapter,
          total_water: missions.water, total_stretches: missions.stretch, total_breaks: missions.break
        })
      })
    } catch (e) { console.error(e) }
  }

  // Decay systems
  useEffect(() => {
    if (showWelcome || gameOver) return
    decayRef.current = setInterval(() => {
      const mult = weather?.coolingDamageMultiplier || 1.0
      setSystems(prev => {
        const next = {
          hull: Math.max(0, prev.hull - 0.4),
          engine: Math.max(0, prev.engine - 0.6),
          lifeSupport: Math.max(0, prev.lifeSupport - 0.5),
          cooling: Math.max(0, prev.cooling - 0.5 * mult)
        }
        
        // Push notification if critical
        if (Object.values(next).some(v => v > 0 && v < 20) && 'Notification' in window && Notification.permission === 'granted') {
           // We could trigger a local notification here but we'll stick to toasts to avoid spam, 
           // background notifications are handled by SW cooldowns.
        }

        if (next.hull <= 0 && next.engine <= 0 && next.lifeSupport <= 0 && next.cooling <= 0) {
          setGameOver(true)
        }
        return next
      })
    }, 10000)
    return () => clearInterval(decayRef.current)
  }, [showWelcome, gameOver, weather])

  // Cooldown timer
  useEffect(() => {
    cooldownRef.current = setInterval(() => {
      setCooldowns(prev => ({
        water: Math.max(0, prev.water - 1),
        stretch: Math.max(0, prev.stretch - 1),
        break: Math.max(0, prev.break - 1)
      }))
    }, 1000)
    return () => clearInterval(cooldownRef.current)
  }, [])

  // Auto save every 30s
  useEffect(() => {
    if (!playerId || showWelcome) return
    saveRef.current = setInterval(savePlayer, 30000)
    return () => clearInterval(saveRef.current)
  }, [playerId, showWelcome, systems, missions, totalMissions])

  // Fetch weather
  const fetchWeather = useCallback(async (lat, lon) => {
    setWeatherLoading(true)
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      const data = await res.json()
      setWeather(data)
    } catch (e) { console.error(e) }
    setWeatherLoading(false)
  }, [])

  const fetchWeatherByCity = useCallback(async (city) => {
    if (!city) return
    setWeatherLoading(true)
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
      const data = await res.json()
      if (!data.error) setWeather(data)
    } catch (e) { console.error(e) }
    setWeatherLoading(false)
  }, [])

  useEffect(() => {
    if (showWelcome) return
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeatherByCity('São Paulo')
      )
    } else {
      fetchWeatherByCity('São Paulo')
    }
  }, [showWelcome, fetchWeather, fetchWeatherByCity])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function startGame() {
    if (!playerName.trim()) return
    
    // Request notification permission when user interacts
    await requestNotificationPermission();

    try {
      const res = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: playerName.trim() })
      })
      const data = await res.json()
      if (data.id) {
        setPlayerId(data.id)
        localStorage.setItem('naufrago_player_id', data.id)
        localStorage.setItem('naufrago_player_name', playerName.trim())
        setShowWelcome(false)
        showToast('Sistemas online. Boa sorte, tripulante.')
      }
    } catch (e) {
      // Fallback to local-only mode
      const fakeId = 'local-' + Date.now()
      setPlayerId(fakeId)
      localStorage.setItem('naufrago_player_id', fakeId)
      localStorage.setItem('naufrago_player_name', playerName.trim())
      setShowWelcome(false)
    }
  }

  function completeMission(type) {
    if (cooldowns[type] > 0) return
    if (navigator.vibrate) navigator.vibrate(100)
    const newMissions = { ...missions, [type]: missions[type] + 1 }
    setMissions(newMissions)
    const newTotal = totalMissions + 1
    setTotalMissions(newTotal)

    setSystems(prev => {
      switch (type) {
        case 'water': return { ...prev, cooling: Math.min(100, prev.cooling + 15), hull: Math.min(100, prev.hull + 8) }
        case 'stretch': return { ...prev, lifeSupport: Math.min(100, prev.lifeSupport + 15), hull: Math.min(100, prev.hull + 8) }
        case 'break': return { ...prev, engine: Math.min(100, prev.engine + 20), hull: Math.min(100, prev.hull + 10) }
        default: return prev
      }
    })

    const durationSeconds = type === 'water' ? 90 : type === 'stretch' ? 120 : 180;
    
    setCooldowns(prev => ({
      ...prev,
      [type]: durationSeconds
    }))

    // Notify Service Worker via Channel Messaging API to track cooldown in background
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'START_COOLDOWN',
        payload: { missionType: type, durationSeconds }
      });
    }

    const unlocked = CHAPTERS.filter(c => newTotal >= c.threshold)
    if (unlocked.length > 0) {
      const latest = unlocked[unlocked.length - 1]
      if (latest.id - 1 > currentChapter) {
        setCurrentChapter(latest.id - 1)
        showToast(`Novo capítulo desbloqueado: ${latest.title}!`, 'success')
      }
    }

    const msgs = {
      water: '💧 Hidratação confirmada! Refrigeração +15',
      stretch: '🧘 Alongamento registrado! Suporte de vida +15',
      break: '🚶 Pausa ativa completa! Motor +20'
    }
    showToast(msgs[type])
  }

  // Audio engine
  function toggleAudio() {
    if (audioPlaying) {
      stopAudio()
    } else {
      startAudio(audioType)
    }
  }

  function startAudio(type) {
    stopAudio()
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx
    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)
    gainRef.current = gain

    const freqs = { alpha: [200, 210], beta: [200, 220], gamma: [200, 240] }
    const [f1, f2] = freqs[type] || freqs.alpha

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.value = f1
    osc1.connect(gain)
    osc1.start()

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = f2
    osc2.connect(gain)
    osc2.start()

    // Spaceship drone
    const drone = ctx.createOscillator()
    drone.type = 'sawtooth'
    drone.frequency.value = 55
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.03
    drone.connect(droneGain)
    droneGain.connect(gain)
    drone.start()

    oscillatorsRef.current = [osc1, osc2, drone]
    setAudioPlaying(true)
  }

  function stopAudio() {
    oscillatorsRef.current.forEach(o => { try { o.stop() } catch(e){} })
    oscillatorsRef.current = []
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch(e){}
      audioCtxRef.current = null
    }
    setAudioPlaying(false)
  }

  function changeFreq(type) {
    setAudioType(type)
    if (audioPlaying) startAudio(type)
  }

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  function resetGame() {
    localStorage.removeItem('naufrago_player_id')
    localStorage.removeItem('naufrago_player_name')
    setSystems({ hull: 100, engine: 100, lifeSupport: 100, cooling: 100 })
    setMissions({ water: 0, stretch: 0, break: 0 })
    setTotalMissions(0)
    setCurrentChapter(0)
    setGameOver(false)
    setShowWelcome(true)
    stopAudio()
  }

  function getHpClass(val) {
    if (val > 60) return 'hp-high'
    if (val > 30) return 'hp-medium'
    return 'hp-low'
  }

  function formatCooldown(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const displayChapter = CHAPTERS[currentChapter] || CHAPTERS[0]
  const freqLabels = { alpha: 'Alpha 10Hz — Relaxamento', beta: 'Beta 20Hz — Foco', gamma: 'Gamma 40Hz — Concentração' }

  return (
    <>
      <Head>
        <title>O Náufrago Espacial</title>
      </Head>

      {/* Starfield */}
      <div className="starfield">
        {STARS.map(s => (
          <div key={s.id} className="star" style={{
            left: `${s.left}%`, top: `${s.top}%`,
            width: `${s.size}px`, height: `${s.size}px`,
            '--dur': `${s.dur}s`, animationDelay: `${s.delay}s`
          }} />
        ))}
      </div>

      {/* Welcome */}
      {showWelcome && (
        <div className="welcome-screen">
          <div className="welcome-content">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
            <h1 className="game-title">O Náufrago Espacial</h1>
            <p className="game-subtitle">Sobreviva. Hidrate-se. Conserte a nave.<br/>Seu corpo é a nave. Suas ações são os reparos.</p>
            <input
              className="welcome-input" placeholder="Digite seu nome, tripulante..."
              value={playerName} onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startGame()}
              id="player-name-input"
            />
            <button className="btn-start" onClick={startGame} disabled={!playerName.trim()} id="btn-start-game">
              ▶ INICIAR MISSÃO
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💀</div>
            <h2 className="game-over-title">NAVE PERDIDA</h2>
            <p className="game-over-text">Todos os sistemas falharam. Lembre-se: hidratação e movimento são essenciais.</p>
            <p className="game-over-text">Missões completadas: {totalMissions}</p>
            <button className="btn-start" onClick={resetGame} style={{ marginTop: '1rem', maxWidth: 300 }}>
              🔄 REINICIAR
            </button>
          </div>
        </div>
      )}

      {/* Main Game */}
      {!showWelcome && !gameOver && (
        <div className="game-container fade-in">
          <header className="game-header">
            <h1 className="header-title">🚀 O NÁUFRAGO ESPACIAL</h1>
            <div className="header-right">
              {audioPlaying && (
                <span className="audio-now-playing"><span className="playing-dot" /> ♫ {audioType.toUpperCase()}</span>
              )}
              <span className="player-name">👨‍🚀 {playerName}</span>
            </div>
          </header>

          <div className="game-grid">
            {/* Ship Status */}
            <div className="panel status-panel">
              <h2 className="panel-title"><span className="icon">🛸</span> STATUS DA NAVE</h2>
              <div className="systems-grid">
                {[
                  { key: 'hull', name: 'Casco', icon: '🛡️', val: systems.hull },
                  { key: 'engine', name: 'Motor', icon: '⚙️', val: systems.engine },
                  { key: 'lifeSupport', name: 'Suporte de Vida', icon: '💚', val: systems.lifeSupport },
                  { key: 'cooling', name: 'Refrigeração', icon: '❄️', val: systems.cooling }
                ].map(sys => (
                  <div key={sys.key} className={`system-bar ${getHpClass(sys.val)}`}>
                    <div className="system-header">
                      <span className="system-name">{sys.icon} {sys.name}</span>
                      <span className="system-value">{Math.round(sys.val)}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${sys.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Missions */}
            <div className="panel">
              <h2 className="panel-title"><span className="icon">🎯</span> MISSÕES</h2>
              {[
                { type: 'water', icon: '💧', name: 'Hidratação', desc: 'Beba um copo d\'água agora', btn: 'CONFIRMAR HIDRATAÇÃO', cls: 'btn-water' },
                { type: 'stretch', icon: '🧘', name: 'Alongamento', desc: 'Levante e alongue por 2 minutos', btn: 'CONFIRMAR ALONGAMENTO', cls: 'btn-stretch' },
                { type: 'break', icon: '🚶', name: 'Pausa Ativa', desc: 'Levante e caminhe por 5 minutos', btn: 'CONFIRMAR PAUSA', cls: 'btn-break' }
              ].map(m => (
                <div key={m.type} className="mission-card">
                  <div className="mission-icon">{m.icon}</div>
                  <div className="mission-name">{m.name}</div>
                  <div className="mission-desc">{m.desc}</div>
                  <div className="mission-count">Completadas: {missions[m.type]}x</div>
                  <button
                    className={`btn-mission ${m.cls}`}
                    onClick={() => completeMission(m.type)}
                    disabled={cooldowns[m.type] > 0}
                    id={`btn-${m.type}`}
                  >
                    {cooldowns[m.type] > 0 ? `⏳ ${formatCooldown(cooldowns[m.type])}` : m.btn}
                  </button>
                </div>
              ))}
            </div>

            {/* Weather */}
            <div className="panel">
              <h2 className="panel-title"><span className="icon">🌡️</span> RADAR CLIMÁTICO</h2>
              {weatherLoading ? (
                <div className="spinner-container">
                  <div className="radar-spinner" />
                  <span className="spinner-text">SINCRONIZANDO RADARES...</span>
                </div>
              ) : weather ? (
                <div className="weather-info">
                  <div className="weather-temp">{weather.temperature}°C</div>
                  <div className="weather-condition">{weather.weatherName}</div>
                  <div className="weather-stat">💧 Umidade: {weather.humidity}%</div>
                  <div className={`weather-message ${weather.severity}`}>{weather.message}</div>
                  <div className="weather-multiplier">Multiplicador de dano: {weather.coolingDamageMultiplier}x</div>
                </div>
              ) : (
                <div className="weather-info">
                  <p className="weather-condition">Insira sua cidade para sincronizar os radares:</p>
                </div>
              )}
              <div className="city-input-row">
                <input className="city-input" placeholder="Sua cidade..." value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchWeatherByCity(cityInput)}
                />
                <button className="btn-city" onClick={() => fetchWeatherByCity(cityInput)}>📡</button>
              </div>
            </div>

            {/* Audio */}
            <div className="panel">
              <h2 className="panel-title"><span className="icon">🎵</span> FREQUÊNCIAS DE CONCENTRAÇÃO</h2>
              <div className="audio-controls">
                <div className="audio-freq-buttons">
                  {['alpha', 'beta', 'gamma'].map(f => (
                    <button key={f} className={`btn-freq ${audioType === f ? 'active' : ''}`} onClick={() => changeFreq(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="audio-label">{freqLabels[audioType]}</div>
                <div className="audio-main-controls">
                  <button className="btn-play" onClick={toggleAudio} id="btn-audio-toggle">
                    {audioPlaying ? '⏸' : '▶'}
                  </button>
                  <input type="range" className="volume-slider" min="0" max="1" step="0.05"
                    value={volume} onChange={e => setVolume(parseFloat(e.target.value))}
                  />
                </div>
                {audioPlaying && (
                  <div className="audio-visualizer">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="viz-bar" style={{ '--dur': `${0.3 + Math.random() * 0.7}s`, animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="panel">
              <h2 className="panel-title"><span className="icon">📊</span> ESTATÍSTICAS</h2>
              <div className="stats-grid">
                <div className="stat-item"><div className="stat-value">{missions.water}</div><div className="stat-label">Copos d'água</div></div>
                <div className="stat-item"><div className="stat-value">{missions.stretch}</div><div className="stat-label">Alongamentos</div></div>
                <div className="stat-item"><div className="stat-value">{missions.break}</div><div className="stat-label">Pausas</div></div>
              </div>
              <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{totalMissions}</div>
                <div className="stat-label">Total de missões</div>
              </div>
            </div>

            {/* Story */}
            <div className="panel story-panel">
              <h2 className="panel-title"><span className="icon">📖</span> DIÁRIO DE BORDO</h2>
              <div className="chapter-badge">CAPÍTULO {displayChapter.id}</div>
              <h3 className="story-title">{displayChapter.title}</h3>
              <p className="story-text">{displayChapter.text}</p>
              <div className="chapters-list">
                {CHAPTERS.map((ch, i) => {
                  const unlocked = totalMissions >= ch.threshold
                  const active = i === currentChapter
                  return (
                    <div key={ch.id}
                      className={`chapter-dot ${active ? 'active' : unlocked ? 'unlocked' : 'locked'}`}
                      onClick={() => unlocked && setCurrentChapter(i)}
                      title={unlocked ? ch.title : `Desbloqueie com ${ch.threshold} missões`}
                    >{ch.id}</div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '2rem 0 1rem', opacity: 0.3 }}>
            <button onClick={resetGame} style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}>
              Resetar jogo
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-text">{toast.msg}</span>
        </div>
      )}
    </>
  )
}
