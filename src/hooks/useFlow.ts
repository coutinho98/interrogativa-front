import { useState, useEffect, useCallback } from 'react';
import { useSpring, animated, useTrail, config } from '@react-spring/web';
import { useAnimation } from 'framer-motion';
import * as Tone from 'tone';

// Definições de som
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

// Dados estáticos de conquistas
const ACHIEVEMENTS = [
  { id: 1, name: "Primeira Escolha", description: "Bem-vindo ao vício!", icon: "⭐", requirement: 1 },
  { id: 2, name: "Aquecendo", description: "5 escolhas feitas", icon: "🔥", requirement: 5 },
  { id: 3, name: "Viciado", description: "15 escolhas feitas", icon: "💊", requirement: 15 },
  { id: 4, name: "Obsessivo", description: "30 escolhas feitas", icon: "🧠", requirement: 30 },
  { id: 5, name: "Dependente", description: "50 escolhas feitas", icon: "💎", requirement: 50 },
  { id: 6, name: "Velocista", description: "5 escolhas rápidas seguidas", icon: "⚡", requirement: 'streak' },
  { id: 7, name: "Flash", description: "10 escolhas ultra-rápidas", icon: "🚀", requirement: 'speed' },
];

// Tipos de dados
type QuestionData = {
  id: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
};

type QuestionResult = QuestionData & {
  percentA: number;
  percentB: number;
};

export function useFlow() {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Controles de animação
  const leftControls = useAnimation();
  const rightControls = useAnimation();
  const vsControls = useAnimation();
  const scoreControls = useAnimation();

  // Efeitos de áudio
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

  // Lógica de busca de perguntas
  const fetchNewQuestion = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/questions/random`);
      const data = await response.json();
      setCurrentQuestion(data);
    } catch (error) {
      console.error("Erro ao buscar a pergunta:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lógica de envio de voto
  const handleVote = useCallback(async (selectedOption: 'A' | 'B', event: React.MouseEvent) => {
    await handleFirstClick();
    if (loading) return;

    const now = Date.now();
    const timeDiff = now - lastChoiceTime;
    const newScore = score + 1;

    setQuestionResult(null); // Limpa o resultado anterior
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

    // TODO: Chamar sua API de backend para registrar o voto
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/questions/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionId: currentQuestion?.id,
          option: selectedOption === 'A' ? 'optionA' : 'optionB' 
        })
      });
      const result = await response.json();
      setQuestionResult(result);
    } catch (error) {
      console.error("Erro ao registrar o voto:", error);
    }
    
    // Lógica para a próxima pergunta
    createParticleExplosion(event.clientX, event.clientY);
    checkAchievements(newScore, newStreak, newFastChoices);
    setLastChoiceTime(now);
    const delay = newStreak >= 5 ? 800 : 1200;
    setTimeout(() => {
      setQuestionResult(null);
      setPulseEffect(0);
      fetchNewQuestion();
    }, delay);
  }, [
    score, streak, fastChoices, maxStreak, lastChoiceTime, currentQuestion, loading,
    handleFirstClick, playClickSound, updateComboText, checkAchievements,
    leftControls, rightControls, vsControls, scoreControls, createParticleExplosion
  ]);
  
  useEffect(() => {
    fetchNewQuestion();
  }, [fetchNewQuestion]);

  return {
    currentQuestion,
    questionResult,
    loading,
    score,
    streak,
    maxStreak,
    achievements,
    newAchievement,
    showStats,
    hoverSide,
    handleVote,
    setHoverSide,
    setShowStats,
    leftControls,
    rightControls,
    vsControls,
    scoreControls,
    backgroundSpring,
    scoreSpring,
    vsSpring,
    particles,
    trail,
    showConfetti,
    comboText,
    ACHIEVEMENTS
  };
}