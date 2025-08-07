import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useSpring, animated, useTrail, config } from '@react-spring/web';
import Lottie from 'lottie-react';
import * as Tone from 'tone';

const QUESTIONS = [
  { A: 'Café', B: 'Chá' },
  { A: 'Pizza', B: 'Hambúrguer' },
  { A: 'Praia', B: 'Montanha' },
  { A: 'Gato', B: 'Cachorro' },
  { A: 'Netflix', B: 'YouTube' },
  { A: 'Verão', B: 'Inverno' },
  { A: 'Doce', B: 'Salgado' },
  { A: 'Marvel', B: 'DC' },
  { A: 'iPhone', B: 'Android' },
  { A: 'Chocolate', B: 'Baunilha' },
  { A: 'Futebol', B: 'Basquete' },
  { A: 'Livro', B: 'Filme' },
  { A: 'Madrugada', B: 'Manhã Cedo' },
  { A: 'Chuva', B: 'Sol' },
  { A: 'Rock', B: 'Pop' },
  { A: 'Aventura', B: 'Conforto' },
  { A: 'Viagem', B: 'Casa' },
  { A: 'Silêncio', B: 'Música' },
  { A: 'Passado', B: 'Futuro' },
  { A: 'Rápido', B: 'Devagar' }
];

const ACHIEVEMENTS = [
  { id: 1, name: "Primeira Escolha", description: "Bem-vindo ao vício!", icon: "⭐", requirement: 1 },
  { id: 2, name: "Aquecendo", description: "5 escolhas feitas", icon: "🔥", requirement: 5 },
  { id: 3, name: "Viciado", description: "15 escolhas feitas", icon: "💊", requirement: 15 },
  { id: 4, name: "Obsessivo", description: "30 escolhas feitas", icon: "🧠", requirement: 30 },
  { id: 5, name: "Dependente", description: "50 escolhas feitas", icon: "💎", requirement: 50 },
  { id: 6, name: "Velocista", description: "5 escolhas rápidas seguidas", icon: "⚡", requirement: 'streak' },
  { id: 7, name: "Flash", description: "10 escolhas ultra-rápidas", icon: "🚀", requirement: 'speed' },
];

const confettiAnimation = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 100,
  "h": 100,
  "nm": "Confetti",
  "ddd": 0,
  "assets": [],
  "layers": [{
    "ddd": 0,
    "ind": 1,
    "ty": 1,
    "nm": "Particle",
    "sr": 1,
    "ks": {
      "o": { "a": 1, "k": [{ "i": { "x": [0.833], "y": [0.833] }, "o": { "x": [0.167], "y": [0.167] }, "t": 0, "s": [100] }, { "t": 60, "s": [0] }] },
      "r": { "a": 1, "k": [{ "i": { "x": [0.833], "y": [0.833] }, "o": { "x": [0.167], "y": [0.167] }, "t": 0, "s": [0] }, { "t": 60, "s": [360] }] },
      "p": { "a": 1, "k": [{ "i": { "x": 0.833, "y": 0.833 }, "o": { "x": 0.167, "y": 0.167 }, "t": 0, "s": [50, 50], "to": [0, -8.333], "ti": [0, 8.333] }, { "t": 60, "s": [50, 0] }] },
      "s": { "a": 0, "k": [100, 100, 100] }
    },
    "ao": 0,
    "sw": 10,
    "sh": 10,
    "sc": "#ff6b6b",
    "ip": 0,
    "op": 60,
    "st": 0
  }]
};

let synth: Tone.Synth;
let clickSynth: Tone.MembraneSynth;
let achievementSynth: Tone.FMSynth;

const initAudio = async () => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }

  synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 1 }
  }).toDestination();

  clickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 10,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
  }).toDestination();

  achievementSynth = new Tone.FMSynth({
    harmonicity: 3,
    modulationIndex: 10,
    detune: 0,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
  }).toDestination();
};

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [option, setOption] = useState<'A' | 'B' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [achievements, setAchievements] = useState<number[]>([]);
  const [newAchievement, setNewAchievement] = useState<any>(null);
  const [lastChoiceTime, setLastChoiceTime] = useState(Date.now());
  const [fastChoices, setFastChoices] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [hoverSide, setHoverSide] = useState<'A' | 'B' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(0);
  const [comboText, setComboText] = useState('');

  const leftControls = useAnimation();
  const rightControls = useAnimation();
  const vsControls = useAnimation();
  const scoreControls = useAnimation();

  const backgroundSpring = useSpring({
    from: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
    to: {
      background: option === 'A'
        ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)'
        : option === 'B'
          ? 'linear-gradient(135deg, #991b1b 0%, #ef4444 50%, #f87171 100%)'
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    },
    config: config.slow
  });

  const scoreSpring = useSpring({
    from: { scale: 1, rotate: 0 },
    to: {
      scale: pulseEffect > 0 ? 1.2 : 1,
      rotate: pulseEffect > 1 ? 360 : 0
    },
    config: config.wobbly
  });

  const vsSpring = useSpring({
    from: { scale: 0.8, rotate: -10 },
    to: { scale: hoverSide ? 1.2 : 1, rotate: hoverSide ? 10 : 0 },
    config: config.wobbly
  });

  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number }>>([]);
  const trail = useTrail(particles.length, {
    from: { opacity: 0, transform: 'translate3d(0,0,0) scale(0)' },
    to: { opacity: 1, transform: 'translate3d(0,-100px,0) scale(1)' },
    config: config.gentle,
  });

  const playClickSound = useCallback((isStreakSound = false) => {
    if (!audioInitialized) return;

    if (isStreakSound) {
      synth?.triggerAttackRelease('C5', '0.1');
      setTimeout(() => synth?.triggerAttackRelease('E5', '0.1'), 100);
      setTimeout(() => synth?.triggerAttackRelease('G5', '0.1'), 200);
    } else {
      clickSynth?.triggerAttackRelease('C2', '0.1');
    }
  }, [audioInitialized]);

  const playAchievementSound = useCallback(() => {
    if (!audioInitialized) return;
    achievementSynth?.triggerAttackRelease('C4', '0.5');
    setTimeout(() => achievementSynth?.triggerAttackRelease('E4', '0.5'), 200);
    setTimeout(() => achievementSynth?.triggerAttackRelease('G4', '0.5'), 400);
    setTimeout(() => achievementSynth?.triggerAttackRelease('C5', '1'), 600);
  }, [audioInitialized]);

  const handleFirstClick = useCallback(async () => {
    if (!audioInitialized) {
      await initAudio();
      setAudioInitialized(true);
    }
  }, [audioInitialized]);

  const createParticleExplosion = useCallback((x: number, y: number) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 200,
      y: y + (Math.random() - 0.5) * 200
    }));

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  }, []);

  const checkAchievements = useCallback((newScore: number, newStreak: number, fastChoiceCount: number) => {
    ACHIEVEMENTS.forEach(achievement => {
      if (achievements.includes(achievement.id)) return;

      let shouldUnlock = false;
      if (typeof achievement.requirement === 'number' && newScore >= achievement.requirement) {
        shouldUnlock = true;
      } else if (achievement.requirement === 'streak' && newStreak >= 5) {
        shouldUnlock = true;
      } else if (achievement.requirement === 'speed' && fastChoiceCount >= 10) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        setAchievements(prev => [...prev, achievement.id]);
        setNewAchievement(achievement);
        setShowConfetti(true);
        playAchievementSound();

        setTimeout(() => {
          setNewAchievement(null);
          setShowConfetti(false);
        }, 3000);
      }
    });
  }, [achievements, playAchievementSound]);

  const updateComboText = useCallback((streak: number) => {
    if (streak >= 10) setComboText('INSANO! 🤯');
    else if (streak >= 7) setComboText('LOUCURA! 🚀');
    else if (streak >= 5) setComboText('COMBO! ⚡');
    else if (streak >= 3) setComboText('STREAK! 🔥');
    else setComboText('');
  }, []);

  const handleVote = useCallback(async (selectedOption: 'A' | 'B', event: React.MouseEvent) => {
    await handleFirstClick();

    const now = Date.now();
    const timeDiff = now - lastChoiceTime;
    const newScore = score + 1;

    setOption(selectedOption);
    setScore(newScore);

    let newStreak = streak;
    let newFastChoices = fastChoices;

    if (timeDiff < 1000) {
      newStreak = streak + 1;
      newFastChoices = fastChoices + 1;
      setPulseEffect(3);
      playClickSound(true);
    } else if (timeDiff < 2000) {
      newStreak = streak + 1;
      newFastChoices = fastChoices + 1;
      setPulseEffect(2);
      playClickSound(true);
    } else {
      newStreak = 0;
      newFastChoices = 0;
      setPulseEffect(1);
      playClickSound(false);
    }

    setStreak(newStreak);
    setFastChoices(newFastChoices);
    updateComboText(newStreak);

    if (newStreak > maxStreak) {
      setMaxStreak(newStreak);
    }

    if (selectedOption === 'A') {
      leftControls.start({
        scale: [1, 1.1, 1.05],
        rotate: [0, 2, 0],
        transition: { duration: 0.5 }
      });
    } else {
      rightControls.start({
        scale: [1, 1.1, 1.05],
        rotate: [0, -2, 0],
        transition: { duration: 0.5 }
      });
    }

    vsControls.start({
      scale: [1, 0, 1.2, 1],
      rotate: [0, 180, 360, 0],
      transition: { duration: 0.8 }
    });

    scoreControls.start({
      scale: [1, 1.5, 1],
      y: [0, -20, 0],
      transition: { duration: 0.6 }
    });

    createParticleExplosion(event.clientX, event.clientY);

    if (navigator.vibrate) {
      navigator.vibrate(newStreak >= 3 ? [50, 50, 50] : [30]);
    }

    checkAchievements(newScore, newStreak, newFastChoices);
    setLastChoiceTime(now);

    const delay = newStreak >= 5 ? 800 : 1200;
    setTimeout(() => {
      setOption(null);
      setPulseEffect(0);
      setCurrentQuestion(prev => (prev + 1) % QUESTIONS.length);
    }, delay);
  }, [
    score, streak, fastChoices, maxStreak, lastChoiceTime,
    handleFirstClick, playClickSound, updateComboText, checkAchievements,
    leftControls, rightControls, vsControls, scoreControls, createParticleExplosion
  ]);

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <animated.div
      style={backgroundSpring}
      className="relative flex min-h-screen overflow-hidden"
    >
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            <Lottie
              animationData={confettiAnimation}
              loop={false}
              className="w-full h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {trail.map((style, index) => {
        const particle = particles[index];
        if (!particle) return null;

        return (
          <animated.div
            key={particle.id}
            style={{
              ...style,
              position: 'absolute',
              left: particle.x,
              top: particle.y,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #ffd700, #ff6b6b)',
              pointerEvents: 'none',
              zIndex: 30
            }}
          />
        );
      })}

      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255, 215, 0, 0.5)',
                  '0 0 40px rgba(255, 215, 0, 0.8)',
                  '0 0 20px rgba(255, 215, 0, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black px-8 py-4 rounded-2xl font-black text-xl border-4 border-white"
            >
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl"
                >
                  {newAchievement.icon}
                </motion.span>
                <div>
                  <div className="font-black">{newAchievement.name}</div>
                  <div className="text-sm opacity-80">{newAchievement.description}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        className="absolute top-4 right-4 z-20"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowStats(!showStats)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl mb-2"
        >
          📊 STATS
        </motion.button>

        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-black/90 backdrop-blur-xl text-white p-6 rounded-2xl space-y-3 border border-purple-500 shadow-2xl"
            >
              <motion.div className="flex justify-between">
                <span>Escolhas:</span>
                <animated.span style={scoreSpring} className="font-bold text-yellow-400 text-lg">
                  {score}
                </animated.span>
              </motion.div>
              <div className="flex justify-between">
                <span>Streak Atual:</span>
                <span className="font-bold text-red-400 text-lg">{streak} 🔥</span>
              </div>
              <div className="flex justify-between">
                <span>Max Streak:</span>
                <span className="font-bold text-blue-400 text-lg">{maxStreak} ⚡</span>
              </div>
              <div className="flex justify-between">
                <span>Conquistas:</span>
                <span className="font-bold text-green-400 text-lg">{achievements.length}/{ACHIEVEMENTS.length}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {achievements.map(id => {
                  const achievement = ACHIEVEMENTS.find(a => a.id === id);
                  return achievement ? (
                    <motion.span
                      key={id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: id * 0.1 }}
                      className="text-2xl"
                    >
                      {achievement.icon}
                    </motion.span>
                  ) : null;
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 z-10 origin-left"
      />

      <motion.div
        animate={scoreControls}
        className="absolute top-8 left-8 text-white z-20 space-y-2"
      >
        <animated.div style={scoreSpring} className="text-6xl font-black text-yellow-400">
          {score}
        </animated.div>
        <AnimatePresence>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className={`font-black ${streak >= 10 ? 'text-4xl text-red-400' :
                  streak >= 5 ? 'text-3xl text-yellow-400' :
                    'text-2xl text-orange-400'
                }`}
            >
              🔥 {streak}x
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {comboText && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500"
            >
              {comboText}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="absolute inset-0 flex">
        <motion.div
          animate={leftControls}
          className={`flex-1 transition-colors duration-300 ${option === 'A'
              ? 'bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800'
              : hoverSide === 'A'
                ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
                : 'bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950'
            }`}
        />
        <motion.div
          animate={rightControls}
          className={`flex-1 transition-colors duration-300 ${option === 'B'
              ? 'bg-gradient-to-bl from-red-400 via-red-600 to-red-800'
              : hoverSide === 'B'
                ? 'bg-gradient-to-bl from-red-600 via-red-700 to-red-800'
                : 'bg-gradient-to-bl from-red-800 via-red-900 to-red-950'
            }`}
        />
      </div>

      <div className="absolute inset-0 flex z-20">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 cursor-pointer"
          onClick={(e) => !option && handleVote('A', e)}
          onMouseEnter={() => setHoverSide('A')}
          onMouseLeave={() => setHoverSide(null)}
        />
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 cursor-pointer"
          onClick={(e) => !option && handleVote('B', e)}
          onMouseEnter={() => setHoverSide('B')}
          onMouseLeave={() => setHoverSide(null)}
        />
      </div>

      <div className="relative z-10 flex flex-col justify-center items-center w-full text-white pointer-events-none">
        <AnimatePresence mode="wait">
          {option ? (
            <motion.div
              key="result"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360, 0]
                }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="text-8xl mb-6"
              >
                {option === 'A' ? '💙' : '❤️'}
              </motion.div>
              <motion.h1
                animate={{
                  scale: streak >= 5 ? [1, 1.1, 1] : 1,
                  color: streak >= 5 ? ['#ffffff', '#ffd700', '#ffffff'] : '#ffffff'
                }}
                transition={{ duration: 0.5, repeat: streak >= 5 ? Infinity : 0 }}
                className="text-6xl font-black mb-4"
              >
                {option === 'A' ? question.A : question.B}!
              </motion.h1>
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl"
              >
                Próxima batalha...
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="question"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-lg opacity-50 mb-6 font-bold"
              >
                BATALHA #{currentQuestion + 1} de {QUESTIONS.length}
              </motion.div>

              <motion.h1
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl font-black mb-8 bg-gradient-to-r from-blue-400 via-white to-red-400 bg-clip-text text-transparent"
                style={{ backgroundSize: '200% 200%' }}
              >
                {question.A} VS {question.B}
              </motion.h1>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xl opacity-60 font-bold"
              >
                ⚡ ESCOLHA SEU LADO ⚡
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!option && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-16 left-0 w-full pointer-events-none"
            >
              <div className="flex justify-between items-end px-16">
                <motion.div
                  animate={{
                    scale: hoverSide === 'A' ? 1.1 : 1,
                    x: hoverSide === 'A' ? 10 : 0
                  }}
                  className="text-left"
                >
                  <motion.div
                    animate={{
                      color: ['#93c5fd', '#60a5fa', '#93c5fd']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl font-black mb-2"
                  >
                    {question.A}
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-blue-300 text-lg font-bold opacity-80"
                  >
                    👈 CLIQUE
                  </motion.div>
                </motion.div>
                <motion.div
                  animate={{
                    scale: hoverSide === 'B' ? 1.1 : 1,
                    x: hoverSide === 'B' ? -10 : 0
                  }}
                  className="text-right"
                >
                  <motion.div
                    animate={{
                      color: ['#fca5a5', '#f87171', '#fca5a5']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl font-black mb-2"
                  >
                    {question.B}
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    className="text-red-300 text-lg font-bold opacity-80"
                  >
                    CLIQUE 👉
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!option && (
          <motion.div
            initial={{ scale: 0, rotate: -360 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 360 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
          >
            <animated.div style={vsSpring}>
              <motion.div
                animate={vsControls}
                className="relative"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-white to-yellow-300 rounded-full blur-xl scale-150"
                />

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 rounded-full blur-lg opacity-60 scale-125"
                />

                <motion.div
                  whileHover={{ scale: 1.1 }}
                  animate={{
                    boxShadow: [
                      '0 0 30px rgba(255, 215, 0, 0.5)',
                      '0 0 50px rgba(255, 215, 0, 0.8)',
                      '0 0 30px rgba(255, 215, 0, 0.5)'
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="relative bg-gradient-to-r from-yellow-400 via-white to-yellow-400 text-black text-5xl font-black px-10 py-5 rounded-2xl border-4 border-yellow-400"
                >
                  <div className="flex items-center gap-3">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-red-600"
                    >
                      ⚔️
                    </motion.span>
                    <motion.span
                      animate={{
                        scale: [1, 1.2, 1],
                        textShadow: [
                          '0 0 10px rgba(0,0,0,0.5)',
                          '0 0 20px rgba(0,0,0,0.8)',
                          '0 0 10px rgba(0,0,0,0.5)'
                        ]
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-purple-600 to-blue-600"
                    >
                      VS
                    </motion.span>
                    <motion.span
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-blue-600"
                    >
                      ⚔️
                    </motion.span>
                  </div>
                </motion.div>

                {[-1, 1, -1, 1].map((direction, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                      rotate: [0, direction * 45, 0]
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: index * 0.4,
                      repeatType: "reverse"
                    }}
                    className={`absolute text-6xl text-yellow-400 ${index === 0 ? '-top-8 -left-8' :
                        index === 1 ? '-top-8 -right-8' :
                          index === 2 ? '-bottom-8 -left-8' :
                            '-bottom-8 -right-8'
                      }`}
                  >
                    ⚡
                  </motion.div>
                ))}
              </motion.div>
            </animated.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 pointer-events-none"
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -100],
              x: [0, (Math.random() - 0.5) * 100],
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut"
            }}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-red-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-20px'
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {pulseEffect > 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              scale: [0.8, 1.2, 0.8]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-white/10 to-yellow-400/20 pointer-events-none z-30"
          />
        )}
      </AnimatePresence>
    </animated.div>
  );
}

export default App;