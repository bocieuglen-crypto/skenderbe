import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TowerType, 
  Tower, 
  Enemy, 
  Projectile, 
  GameState, 
  AdvisorComment,
  Position,
  TargetingMode
} from './types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  TOWER_CONFIGS, 
  LEVELS 
} from './constants';
import { getTacticalAdvice, getWaveDescription } from './services/geminiService';

// --- Icons ---
const TargetingIcons = {
  [TargetingMode.FIRST]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14M15 8l4 4-4 4" />
      <path d="M19 5v14" strokeWidth="3" />
    </svg>
  ),
  [TargetingMode.LAST]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M19 12H5M9 16l-4-4 4-4" />
      <path d="M5 5v14" strokeWidth="3" />
    </svg>
  ),
  [TargetingMode.STRONG]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 19V5M5 12l7-7 7 7" />
      <circle cx="12" cy="16" r="2" fill="currentColor" />
    </svg>
  ),
  [TargetingMode.WEAK]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 5v14M19 12l-7 7-7-7" />
      <path d="M8 8h8" />
    </svg>
  ),
  [TargetingMode.CLOSE]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  )
};

const getEnemyFactionInfo = (type: Enemy['type']): { faction: string, unit: string, color: string } => {
  switch (type) {
    case 'SCOUT': return { faction: 'Serbian Kingdom', unit: 'Border Raider', color: '#3b82f6' };
    case 'TANK': return { faction: 'Greek Despotate', unit: 'Heavy Phalanx', color: '#0ea5e9' };
    case 'BOSS': return { faction: 'Osman Empire', unit: 'Janissary Agha', color: '#ef4444' };
    case 'RECON': return { faction: 'Montenegro', unit: 'Mountain Spy', color: '#f59e0b' };
    case 'LEGIONARY': return { faction: 'Osman Empire', unit: 'Janissary Infantry', color: '#ef4444' };
    case 'HORSE_ARCHER': return { faction: 'Osman Empire', unit: 'Sipahi Cavalry', color: '#ef4444' };
    default: return { faction: 'Unknown Invader', unit: 'Soldier', color: '#71717a' };
  }
};

const getTargetingModeLabel = (mode: TargetingMode): string => {
  switch (mode) {
    case TargetingMode.FIRST: return "Vanguard Focus";
    case TargetingMode.LAST: return "Rearguard Strike";
    case TargetingMode.STRONG: return "Slay the Mightiest";
    case TargetingMode.WEAK: return "Finish the Wounded";
    case TargetingMode.CLOSE: return "Closest Proximity";
    default: return "";
  }
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  
  const [view, setView] = useState<'menu' | 'playing'>('menu');
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);
  const [gameState, setGameState] = useState<GameState & { gameSpeed: number }>({
    gold: 550,
    lives: 100,
    wave: 0,
    isGameOver: false,
    isPaused: true,
    currentLevelIndex: 0,
    isVictory: false,
    gameSpeed: 1
  });
  
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>(TowerType.BASIC);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [advisorLogs, setAdvisorLogs] = useState<AdvisorComment[]>([]);
  const [scale, setScale] = useState(1);
  const [mousePos, setMousePos] = useState<Position | null>(null);

  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const waveInProgressRef = useRef<boolean>(false);
  const isRequestingAdviceRef = useRef<boolean>(false);

  const levelConfig = LEVELS[gameState.currentLevelIndex];
  const primaryPath = levelConfig.path;
  const secondaryPath = levelConfig.secondaryPath || primaryPath;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'playing') return;
      
      switch (e.key) {
        case '1': setSelectedTowerType(TowerType.BASIC); break;
        case '2': setSelectedTowerType(TowerType.SNIPER); break;
        case '3': setSelectedTowerType(TowerType.PULSE); break;
        case '4': setSelectedTowerType(TowerType.FROST); break;
        case '5': setSelectedTowerType(TowerType.STUN); break;
        case ' ':
          e.preventDefault();
          if (gameState.isPaused && !gameState.isGameOver) startWave();
          break;
        case 'p':
        case 'P':
          setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
          break;
        case 's':
        case 'S':
          setGameSpeed(prev => prev === 1 ? 2 : 1);
          break;
        case 'Escape':
          setSelectedTowerId(null);
          setSelectedEnemyId(null);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, gameState.isPaused, gameState.isGameOver]);

  // Scaling logic
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleW = (clientWidth - 60) / CANVAS_WIDTH;
      const scaleH = (clientHeight - 80) / CANVAS_HEIGHT;
      const newScale = Math.min(scaleW, scaleH, 1.4);
      setScale(newScale);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    handleResize();
    return () => resizeObserver.disconnect();
  }, [view]);

  const revealFogAt = useCallback((x: number, y: number, radius: number) => {
    const fogCtx = fogCanvasRef.current?.getContext('2d');
    if (!fogCtx) return;
    fogCtx.globalCompositeOperation = 'destination-out';
    const g = fogCtx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    fogCtx.fillStyle = g;
    fogCtx.beginPath(); fogCtx.arc(x, y, radius, 0, Math.PI * 2); fogCtx.fill();
  }, []);

  useEffect(() => {
    if (view === 'playing' && !fogCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#020204'; 
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        for(let i=0; i<4000; i++) {
          const x = Math.random() * CANVAS_WIDTH;
          const y = Math.random() * CANVAS_HEIGHT;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08})`;
          ctx.fillRect(x, y, 1, 1);
        }
        revealFogAt(primaryPath[0].x, primaryPath[0].y, 130);
        revealFogAt(primaryPath[primaryPath.length - 1].x, primaryPath[primaryPath.length - 1].y, 160);
      }
      fogCanvasRef.current = canvas;
    }
  }, [view, primaryPath, revealFogAt]);

  const spawnEnemy = useCallback((type: Enemy['type'], pathType: 'primary' | 'secondary' = 'primary', isReinforcement: boolean = false) => {
    const configs = { SCOUT: { hp: 45, speed: 2.2 }, TANK: { hp: 180, speed: 1.0 }, BOSS: { hp: 1200, speed: 0.7 }, RECON: { hp: 35, speed: 4.0 }, LEGIONARY: { hp: 300, speed: 1.2 }, HORSE_ARCHER: { hp: 80, speed: 3.2 } };
    const config = configs[type];
    const scaledHp = config.hp * (1 + (gameState.wave - 1) * 0.6) * (1 + (gameState.currentLevelIndex * 0.4));
    const path = pathType === 'primary' ? primaryPath : secondaryPath;
    enemiesRef.current.push({
      id: Math.random().toString(36).substr(2, 9), type, hp: scaledHp, maxHp: scaledHp, speed: config.speed, progress: 0,
      pathIndex: 0, x: path[0].x, y: path[0].y, isDead: false, isReinforcement, pathType
    });
  }, [gameState.wave, gameState.currentLevelIndex, primaryPath, secondaryPath]);

  const startWave = async () => {
    if (waveInProgressRef.current) return;
    waveInProgressRef.current = true;
    const nextWaveNum = gameState.wave + 1;
    setGameState(prev => ({ ...prev, wave: nextWaveNum, isPaused: false }));
    
    // Non-blocking description request
    getWaveDescription(nextWaveNum).then(desc => {
      setAdvisorLogs(prev => [{ role: 'AI', text: desc, timestamp: Date.now() }, ...prev]);
    });

    let spawnCount = 10 + (nextWaveNum * 3);
    const mainInterval = setInterval(() => {
      if (spawnCount <= 0 || !waveInProgressRef.current || gameState.isGameOver) { clearInterval(mainInterval); return; }
      let type: Enemy['type'] = 'SCOUT';
      if (nextWaveNum % 5 === 0 && spawnCount === 1) type = 'BOSS';
      else if (spawnCount % 5 === 0) type = 'LEGIONARY';
      else if (spawnCount % 4 === 0) type = 'TANK';
      spawnEnemy(type, 'primary', false);
      spawnCount--;
    }, 850 / gameSpeed);
  };

  const checkOnPath = (x: number, y: number) => {
    return [...primaryPath, ...secondaryPath].some((p, i, arr) => i > 0 && Math.sqrt(Math.pow(((arr[i-1].x+p.x)/2)-x,2) + Math.pow(((arr[i-1].y+p.y)/2)-y,2)) < 35);
  };

  const update = useCallback((time: number) => {
    if (view !== 'playing' || gameState.isPaused || gameState.isGameOver) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const effectiveSpeed = gameSpeed;

    // Fog recession
    const fogCtx = fogCanvasRef.current?.getContext('2d');
    if (fogCtx) {
      fogCtx.globalCompositeOperation = 'source-over';
      fogCtx.fillStyle = `rgba(2, 2, 4, ${0.005 * effectiveSpeed})`; 
      fogCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      fogCtx.globalCompositeOperation = 'destination-out';
      towersRef.current.forEach(t => {
        const v = t.range + 90;
        const g = fogCtx.createRadialGradient(t.x, t.y, 0, t.x, t.y, v);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        fogCtx.fillStyle = g;
        fogCtx.beginPath(); fogCtx.arc(t.x, t.y, v, 0, Math.PI * 2); fogCtx.fill();
      });
    }

    // Enemy movement
    enemiesRef.current.forEach(e => {
      if (e.isDead) return;
      const path = e.pathType === 'primary' ? primaryPath : secondaryPath;
      const target = path[e.pathIndex + 1];
      if (!target) {
        e.isDead = true;
        setGameState(prev => ({ ...prev, lives: Math.max(0, prev.lives - (e.type === 'BOSS' ? 30 : 5)), isGameOver: prev.lives <= 5 }));
        return;
      }
      const dx = target.x - e.x, dy = target.y - e.y, d = Math.sqrt(dx*dx + dy*dy);
      const moveAmount = e.speed * effectiveSpeed;
      if (d < moveAmount) e.pathIndex++;
      else { e.x += (dx/d)*moveAmount; e.y += (dy/d)*moveAmount; }
      e.progress = (e.pathIndex / (path.length - 1)) * 100;
    });

    // Tower firing
    towersRef.current.forEach(t => {
      if (time - t.lastFired < t.cooldown / effectiveSpeed) return;
      const inRange = enemiesRef.current.filter(e => !e.isDead && Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2)) <= t.range);
      if (inRange.length) {
        let target = inRange[0];
        if (t.targetingMode === TargetingMode.FIRST) target = inRange.sort((a,b) => b.progress - a.progress)[0];
        else if (t.targetingMode === TargetingMode.STRONG) target = inRange.sort((a,b) => b.hp - a.hp)[0];
        t.lastFired = time; target.hp -= t.damage;
        projectilesRef.current.push({ id: Math.random().toString(), x: t.x, y: t.y, targetId: target.id, speed: 15 * effectiveSpeed, damage: t.damage });
        if (target.hp <= 0) { target.isDead = true; setGameState(prev => ({ ...prev, gold: prev.gold + (target.isReinforcement ? 45 : 30) })); }
      }
    });

    projectilesRef.current = projectilesRef.current.filter(p => {
      const target = enemiesRef.current.find(e => e.id === p.targetId);
      if (!target) return false;
      const dx = target.x - p.x, dy = target.y - p.y, dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < p.speed) return false;
      p.x += (dx/dist)*p.speed; p.y += (dy/dist)*p.speed;
      return true;
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);
    
    // Wave End Handling
    if (waveInProgressRef.current && enemiesRef.current.length === 0) {
      waveInProgressRef.current = false; 
      setGameState(prev => ({ ...prev, isPaused: true }));
      
      // Request advice only once per wave completion
      if (!isRequestingAdviceRef.current) {
        isRequestingAdviceRef.current = true;
        getTacticalAdvice(gameState).then(advice => {
          setAdvisorLogs(p => [{ role: 'AI', text: advice, timestamp: Date.now() }, ...p].slice(0,3));
          isRequestingAdviceRef.current = false;
        }).catch(() => {
          isRequestingAdviceRef.current = false;
        });
      }
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0d'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const drawPath = (p: Position[], c: string, isSec: boolean) => {
        ctx.strokeStyle = c; ctx.lineWidth = isSec ? 35 : 45; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); p.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
        ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 2; ctx.setLineDash([8, 12]); ctx.stroke(); ctx.setLineDash([]);
      };
      drawPath(primaryPath, '#121218', false); 
      if (levelConfig.secondaryPath) drawPath(secondaryPath, '#0d0d12', true);
      
      enemiesRef.current.forEach(e => {
        ctx.fillStyle = getEnemyFactionInfo(e.type).color; ctx.beginPath(); ctx.arc(e.x, e.y, 11, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#450a0a'; ctx.fillRect(e.x - 14, e.y - 20, 28, 4);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(e.x - 14, e.y - 20, 28 * (e.hp / e.maxHp), 4);
      });

      towersRef.current.forEach(t => {
        ctx.fillStyle = '#1c1c24'; ctx.fillRect(t.x - 17, t.y - 17, 34, 34);
        ctx.fillStyle = t.color; ctx.fillRect(t.x - 13, t.y - 13, 26, 26);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px cinzel'; ctx.textAlign = 'center'; ctx.fillText(t.level.toString(), t.x, t.y + 4);
      });

      if (fogCanvasRef.current) ctx.drawImage(fogCanvasRef.current, 0, 0);

      projectilesRef.current.forEach(p => {
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 10; ctx.shadowColor = '#eab308'; ctx.stroke(); ctx.shadowBlur = 0;
      });

      if (selectedTowerId) {
        const t = towersRef.current.find(t => t.id === selectedTowerId);
        if (t) {
          ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI*2); ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)'; ctx.setLineDash([6,6]); ctx.stroke(); ctx.setLineDash([]);
        }
      }

      if (mousePos && !selectedTowerId && !selectedEnemyId) {
        const config = TOWER_CONFIGS[selectedTowerType];
        const onPath = checkOnPath(mousePos.x, mousePos.y);
        const canAfford = gameState.gold >= config.cost;
        
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = onPath || !canAfford ? '#450a0a' : config.color;
        ctx.fillRect(mousePos.x - 17, mousePos.y - 17, 34, 34);
        
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, config.range, 0, Math.PI*2);
        ctx.strokeStyle = onPath || !canAfford ? '#ef4444' : '#ffffff';
        ctx.setLineDash([5,5]);
        ctx.stroke();
        ctx.restore();
      }
    }
    requestRef.current = requestAnimationFrame(update);
  }, [view, gameState.isPaused, gameState.isGameOver, gameSpeed, primaryPath, secondaryPath, levelConfig, selectedTowerId, selectedEnemyId, mousePos, revealFogAt, selectedTowerType]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  const upgradeTower = useCallback((id: string) => {
    const t = towersRef.current.find(t => t.id === id);
    if (!t) return;
    const config = TOWER_CONFIGS[t.type];
    const cost = Math.floor(config.cost * (t.level * 1.5));
    if (gameState.gold >= cost && t.level < 5) {
      t.level++; t.damage = Math.floor(t.damage * 1.3); t.range += 20; t.cooldown = Math.max(100, Math.floor(t.cooldown * 0.9)); t.totalInvested += cost;
      setGameState(prev => ({ ...prev, gold: prev.gold - cost })); revealFogAt(t.x, t.y, t.range + 90);
    }
  }, [gameState.gold, revealFogAt]);

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    });
  };

  const activeTower = towersRef.current.find(t => t.id === selectedTowerId);
  const activeEnemy = enemiesRef.current.find(e => e.id === selectedEnemyId);

  if (view === 'menu') {
    return (
      <div className="h-screen w-screen bg-[#020205] text-white font-serif flex flex-col items-center justify-center p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-900/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-yellow-900/5 blur-[120px] rounded-full" />
        <div className="max-w-4xl w-full text-center z-10 animate-in fade-in zoom-in-95 duration-1000">
          <div className="mb-4 inline-block">
             <div className="h-px w-32 bg-gradient-to-r from-transparent via-red-800 to-transparent mx-auto mb-2" />
             <span className="text-red-600 font-cinzel text-xs tracking-[0.5em] font-black uppercase">Kingdom of Albania</span>
             <div className="h-px w-32 bg-gradient-to-r from-transparent via-red-800 to-transparent mx-auto mt-2" />
          </div>
          <h1 className="font-cinzel text-8xl font-black tracking-tighter mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,1)] text-white">
            SKANDERBEG'S<br/>
            <span className="text-red-700">BASTION</span>
          </h1>
          <p className="font-cinzel text-stone-400 text-sm tracking-[0.3em] uppercase mb-12">The Lion of Krujë Defies the Coalition</p>
          <div className="grid grid-cols-3 gap-8 mb-16 px-12">
            <div className="stone-slab p-6 border-stone-800/50 rounded-sm">
               <h3 className="font-cinzel text-yellow-600 text-[10px] font-black tracking-widest uppercase mb-2">The Mission</h3>
               <p className="text-[11px] text-stone-500 leading-relaxed italic">Defend the mountain passes of Albania from invading phalanxes and raiders.</p>
            </div>
            <div className="stone-slab p-6 border-stone-800/50 rounded-sm scale-110 shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-red-900/5 animate-pulse" />
               <h3 className="font-cinzel text-red-600 text-[10px] font-black tracking-widest uppercase mb-2">The Resistance</h3>
               <p className="text-[11px] text-stone-200 leading-relaxed font-medium">Mount an iron defense using elite arbalests, longbows, and boiling pitch.</p>
            </div>
            <div className="stone-slab p-6 border-stone-800/50 rounded-sm">
               <h3 className="font-cinzel text-yellow-600 text-[10px] font-black tracking-widest uppercase mb-2">The Honor</h3>
               <p className="text-[11px] text-stone-500 leading-relaxed italic">Build your legend wave by wave until the invaders retreat in shame.</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={() => setView('playing')}
              className="px-24 py-6 bg-red-900 hover:bg-red-800 text-white font-cinzel text-2xl font-black gold-border shadow-[0_0_50px_rgba(153,27,27,0.4)] transition-all hover:scale-105 active:scale-95 group relative"
            >
              <span className="relative z-10">START THE RESISTANCE</span>
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <span className="text-[10px] text-stone-600 font-bold tracking-[0.2em] uppercase">V 1.4 • Quota Optimized</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#050508] text-stone-100 font-serif flex flex-col overflow-hidden select-none">
      <div className="h-24 stone-slab border-b-2 border-red-900 flex items-center justify-between px-10 shadow-2xl z-30 shrink-0">
        <div className="flex gap-12">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold mb-1">Gate Health</span>
            <div className="relative w-24 h-6 bg-stone-900 border border-stone-800 rounded-sm p-0.5 overflow-hidden">
               <div className="h-full bg-red-800 transition-all" style={{ width: `${gameState.lives}%` }} />
               <span className="absolute inset-0 flex items-center justify-center font-cinzel text-[11px] font-black">{gameState.lives}%</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold mb-1">Treasury</span>
            <span className="text-2xl font-cinzel text-yellow-500 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">₵{gameState.gold}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold mb-1">Resistance Wave</span>
            <span className="text-2xl font-cinzel text-white font-black">{gameState.wave} / {levelConfig.wavesToUnlock}</span>
          </div>
        </div>
        <div className="text-center relative">
          <h1 className="font-cinzel text-xl font-black text-white tracking-[0.3em] drop-shadow-lg uppercase">{levelConfig.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
             <div className="h-[1px] w-8 bg-gradient-to-l from-red-800 to-transparent" />
             <span className="text-[9px] text-red-600 uppercase font-black tracking-widest italic">Shield of Europe</span>
             <div className="h-[1px] w-8 bg-gradient-to-r from-red-800 to-transparent" />
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setGameSpeed(prev => prev === 1 ? 2 : 1)}
             className={`px-4 py-2 border font-cinzel text-[10px] tracking-widest uppercase transition-all ${gameSpeed === 2 ? 'bg-red-900 border-red-500 text-white' : 'bg-stone-900/50 border-stone-700 text-stone-500'}`}
           >
              {gameSpeed}x Speed
           </button>
           <button onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))} className="px-6 py-2 border border-stone-700 bg-stone-900/50 hover:bg-stone-800 transition-all font-cinzel text-[10px] tracking-widest uppercase">
              {gameState.isPaused ? "Unseal Orders [P]" : "Halt War [P]"}
           </button>
           <button onClick={() => setView('menu')} className="w-10 h-10 flex items-center justify-center border border-stone-800 text-stone-500 hover:text-white transition-all">
             <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
           </button>
        </div>
      </div>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-72 stone-slab border-r border-stone-800 p-5 flex flex-col shrink-0">
          <div className="mb-6 flex items-center justify-between border-b border-stone-800 pb-2">
            <h2 className="font-cinzel text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Garrison Registry</h2>
            <span className="text-[9px] text-stone-700 font-bold uppercase">[Keys 1-5]</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {(Object.keys(TOWER_CONFIGS) as TowerType[]).map((type, idx) => {
              const config = TOWER_CONFIGS[type];
              const active = selectedTowerType === type;
              const canAfford = gameState.gold >= config.cost;
              return (
                <button 
                  key={type}
                  onClick={() => setSelectedTowerType(type)}
                  disabled={!canAfford}
                  className={`w-full p-4 rounded-sm border transition-all text-left flex flex-col relative group ${active ? 'bg-red-950/20 border-red-700 shadow-xl' : 'bg-stone-900/30 border-stone-800 hover:border-stone-600'} ${!canAfford && 'opacity-30 grayscale'}`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-stone-600 font-black px-1 border border-stone-800">{idx + 1}</span>
                      <span className="text-[11px] font-bold text-stone-200 uppercase tracking-wider">{config.name}</span>
                    </div>
                    <span className="text-[10px] text-yellow-500 font-black">₵{config.cost}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-tight italic line-clamp-2">{config.description}</p>
                  {active && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-red-600 rounded-r-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />}
                </button>
              );
            })}
          </div>
          <div className="mt-8 pt-5 border-t border-stone-800 bg-black/20 -mx-5 px-5 py-4">
            <h2 className="font-cinzel text-[9px] font-bold mb-4 uppercase text-stone-600 tracking-widest flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-red-800 rounded-full" />
               Battle Intelligence
            </h2>
            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar">
              {advisorLogs.map((l, i) => (
                <div key={i} className="text-[10px] text-stone-400 italic leading-relaxed border-l-2 border-red-900/50 pl-3 animate-in fade-in slide-in-from-left-2">"{l.text}"</div>
              ))}
            </div>
          </div>
        </div>
        <div ref={containerRef} className="flex-1 bg-black relative flex items-center justify-center p-6 overflow-hidden">
          <div style={{ transform: `scale(${scale})`, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transition: 'transform 0.2s ease-out', transformOrigin: 'center center' }} className="relative shrink-0 glow-red">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onMouseMove={handleCanvasMouseMove} onMouseLeave={() => setMousePos(null)} onClick={(e) => {
                const canvas = canvasRef.current; if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / scale; const y = (e.clientY - rect.top) / scale;
                const en = enemiesRef.current.find(e => Math.sqrt(Math.pow(e.x - x, 2) + Math.pow(e.y - y, 2)) < 25);
                if (en) { setSelectedEnemyId(en.id); setSelectedTowerId(null); return; }
                const tw = towersRef.current.find(t => Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2)) < 25);
                if (tw) { setSelectedTowerId(tw.id); setSelectedEnemyId(null); return; }
                const config = TOWER_CONFIGS[selectedTowerType];
                const onPath = checkOnPath(x, y);
                if (!onPath && gameState.gold >= config.cost) {
                   const nt: Tower = { id: Math.random().toString(), type: selectedTowerType, x, y, range: config.range, damage: config.damage, hp: config.hp, maxHp: config.hp, cooldown: config.cooldown, lastFired: 0, level: 1, cost: config.cost, totalInvested: config.cost, color: config.color, targetingMode: TargetingMode.FIRST };
                   towersRef.current.push(nt); setGameState(prev => ({ ...prev, gold: prev.gold - config.cost }));
                   revealFogAt(x, y, config.range + 90); setSelectedTowerId(nt.id);
                }
              }} className="bg-[#050508] block cursor-crosshair rounded-sm" />
          </div>
          {(gameState.isPaused || gameState.isGameOver) && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
              <div className="p-16 border-4 border-double border-red-900 bg-[#0a0a0f] text-center max-w-xl shadow-[0_0_150px_rgba(153,27,27,0.3)] animate-in zoom-in-95 duration-500">
                <h2 className="font-cinzel text-6xl text-red-700 font-black mb-4 tracking-tighter drop-shadow-2xl">{gameState.isGameOver ? "BASTION OVERRUN" : "HOLD THE LINE"}</h2>
                <p className="text-stone-400 mb-12 uppercase tracking-[0.5em] text-[11px] font-black border-t border-b border-stone-800 py-4 mx-8">{gameState.isGameOver ? "Krujë has fallen to the coalition" : "Skanderbeg's Eagles await your orders"}</p>
                {gameState.isGameOver ? (
                  <button onClick={() => window.location.reload()} className="px-20 py-5 bg-red-900 hover:bg-red-800 text-white font-cinzel text-2xl gold-border shadow-2xl transition-all">RESTORE HONOR</button>
                ) : (
                  <button onClick={startWave} className="group relative px-20 py-5 bg-red-900 hover:bg-red-800 text-white font-cinzel text-2xl gold-border shadow-2xl transition-all active:translate-y-1">
                    <span className="relative z-10">SOUND THE HORN [Space]</span>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-80 stone-slab border-l border-stone-800 p-8 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          {activeTower ? (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <span className="text-[9px] text-red-600 font-black uppercase tracking-[0.3em] block mb-3 border-l-4 border-red-700 pl-3">Sentry Status • Rank {activeTower.level}</span>
              <h2 className="font-cinzel text-3xl text-stone-100 mb-6 font-black tracking-tight leading-none">{TOWER_CONFIGS[activeTower.type].name}</h2>
              <div className="space-y-4 mb-8 text-xs font-medium">
                <div className="flex justify-between border-b border-stone-900 pb-2"><span className="text-stone-500 uppercase">Impact</span><span className="font-black text-red-500">{activeTower.damage} DMG</span></div>
                <div className="flex justify-between border-b border-stone-900 pb-2"><span className="text-stone-500 uppercase">Sentry Radius</span><span className="font-black text-stone-300">{activeTower.range}px</span></div>
                <div className="flex justify-between border-b border-stone-900 pb-2"><span className="text-stone-500 uppercase">Cadence</span><span className="font-black text-stone-300">{(1000/activeTower.cooldown).toFixed(1)}/s</span></div>
              </div>
              {activeTower.level < 5 && (() => {
                const config = TOWER_CONFIGS[activeTower.type];
                const cost = Math.floor(config.cost * (activeTower.level * 1.5));
                const afford = gameState.gold >= cost;
                return (
                  <div className="mb-8 p-4 bg-stone-900/50 border border-stone-800 rounded-sm">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest mb-3 block font-bold">Reinforcement</span>
                    <div className="space-y-2 mb-4">
                       <div className="flex justify-between text-[10px]"><span className="text-stone-400">Next Dmg:</span><span className="text-red-500 font-bold">{Math.floor(activeTower.damage * 1.3)}</span></div>
                       <div className="flex justify-between text-[10px]"><span className="text-stone-400">Next Range:</span><span className="text-stone-200 font-bold">{activeTower.range + 20}</span></div>
                    </div>
                    <button onClick={() => upgradeTower(activeTower.id)} disabled={!afford} className={`w-full py-3 font-cinzel text-[11px] font-black uppercase tracking-widest border transition-all ${afford ? 'bg-yellow-900/20 border-yellow-700 text-yellow-500 hover:bg-yellow-800/40' : 'bg-stone-900 border-stone-800 text-stone-600 grayscale'}`}>UPGRADE • ₵{cost}</button>
                  </div>
                );
              })()}
              <div className="mb-8">
                <span className="text-[9px] text-stone-600 uppercase mb-4 block tracking-[0.2em] font-bold">Combat Doctrine</span>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {[TargetingMode.FIRST, TargetingMode.LAST, TargetingMode.STRONG, TargetingMode.WEAK, TargetingMode.CLOSE].map(m => (
                    <button key={m} onClick={() => { activeTower.targetingMode = m; setGameState(p => ({ ...p })); }} className={`h-11 rounded-sm flex items-center justify-center border transition-all ${activeTower.targetingMode === m ? 'bg-red-800 text-white border-red-500 shadow-xl' : 'bg-stone-900 text-stone-600 border-stone-800'}`}>{TargetingIcons[m]}</button>
                  ))}
                </div>
                <div className="text-center bg-black/40 p-3 rounded-sm border border-stone-900"><span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{getTargetingModeLabel(activeTower.targetingMode)}</span></div>
              </div>
              <button onClick={() => { towersRef.current = towersRef.current.filter(t => t.id !== activeTower.id); setGameState(p => ({ ...p, gold: p.gold + Math.floor(activeTower.totalInvested * 0.75) })); setSelectedTowerId(null); }} className="w-full py-4 bg-transparent border border-red-950 text-red-900 hover:bg-red-950/20 hover:text-red-600 transition-all font-cinzel text-[11px] font-black uppercase tracking-widest">Abandon Post</button>
            </div>
          ) : activeEnemy ? (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <div className="p-5 bg-red-950/20 border-l-4 border-red-700 mb-8 shadow-inner">
                <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.3em] mb-2 block">Unit Threat Profile</span>
                <h2 className="font-cinzel text-2xl mt-1 tracking-tight font-black leading-none">{getEnemyFactionInfo(activeEnemy.type).unit}</h2>
                <span className="text-[10px] italic text-stone-500 font-cinzel uppercase tracking-widest mt-1 block">{getEnemyFactionInfo(activeEnemy.type).faction}</span>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] uppercase mb-3 text-stone-400 font-bold tracking-widest"><span>Endurance</span><span>{Math.ceil(activeEnemy.hp)} HP</span></div>
                  <div className="h-2 bg-stone-950 border border-stone-800 overflow-hidden"><div className="h-full bg-red-700 transition-all duration-300" style={{ width: `${(activeEnemy.hp/activeEnemy.maxHp)*100}%` }} /></div>
                </div>
                <div className="bg-stone-900/50 p-5 border-t border-b border-stone-800/50 text-[11px] text-stone-400 leading-relaxed italic">"Interrogated prisoners suggest this unit is part of the {getEnemyFactionInfo(activeEnemy.type).faction} main spearhead. Do not let them breach the gate."</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-8 opacity-20 transition-all">
              <div className="relative"><svg viewBox="0 0 24 24" className="w-20 h-20 text-stone-600" fill="none" stroke="currentColor" strokeWidth="0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><circle cx="12" cy="11" r="3" /></svg></div>
              <div className="space-y-3">
                <h3 className="font-cinzel text-[12px] uppercase tracking-[0.4em] font-black text-stone-500">Tactical Map View</h3>
                <p className="text-[10px] italic text-stone-600 px-4">Select an outpost or enemy soldier to gather battle intelligence. Use [1-5] to select towers, [P] to pause, and [S] for speed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;