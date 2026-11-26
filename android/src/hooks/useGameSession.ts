import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { GameBoard } from "../types/board";
import type { Player, GameStatus } from "../types/game";
import type { Coord } from "../types/box";
import type { TurnState, PlayerState, SessionSnapshot } from "../types/session";
import type { PowerId } from "../types/powers";
import type { CampaignLevel } from "../types/level";
import {
  createBoardFromLevel,
  checkWinCondition,
  computeExtrusionScores,
  executeExtrusionAction,
  getExtrusionMoveOptions,
  getExtrusionTurn,
  type ExtrusionAction,
  type ExtrudeDirection,
} from "../engine/gameEngine";
import { planExtrusionTurn } from "../engine/ai/extrusionAi";
import { createInitialPlayerState } from "../engine/rewards/rewardEngine";
import { getCampaignLevel, getVisibleCampaignLevelByNumber } from "../registries/campaignLevels";
import { getBotThinkDelayMs } from "../constants/levels";
import { PLAYER_CAPTURE_COLORS } from "../constants/theme";
import { createTurnState } from "./useTurnState";
import { useGameTimer } from "./useGameTimer";
import { useUndoHistory } from "./useUndoHistory";
import { useGameHistory } from "./useGameHistory";
import { useGameConfig } from "./useGameConfig";
import { useCampaignProgress } from "./useCampaignProgress";
import { playMoveSounds, playGameSound } from "../audio/gameSounds";
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  clearSessionSnapshot,
} from "../services/sessionStorage";
import { getTurnHighlightCoords } from "../utils/lastMove";

export function useGameSession(options?: {
  isResume?: boolean;
  startupLevelId?: string;
  startupGameMode?: "bot" | "pvp";
}) {
  const { stats, saveMatch, clearStats } = useGameHistory();
  const { config, updateConfig, loading: configLoading } = useGameConfig();
  const { completeCampaignLevel } = useCampaignProgress();

  const [activeLevelId, setActiveLevelId] = useState<string>(
    () => options?.startupLevelId ?? config.campaignLevelId ?? "campaign-1"
  );
  const [activeGameMode, setActiveGameMode] = useState<"bot" | "pvp">(
    () => options?.startupGameMode ?? config.gameMode ?? "bot"
  );
  const level = getCampaignLevel(activeLevelId);

  const prevStartupLevelIdRef = useRef(options?.startupLevelId);

  useEffect(() => {
    if (options?.startupLevelId !== prevStartupLevelIdRef.current) {
      prevStartupLevelIdRef.current = options?.startupLevelId;
      if (options?.startupLevelId && options.startupLevelId !== activeLevelId) {
        setActiveLevelId(options.startupLevelId);
      }
      return;
    }
    if (configLoading) return;
    if (!options?.startupLevelId && config.campaignLevelId !== activeLevelId) {
      setActiveLevelId(config.campaignLevelId);
    }
  }, [options?.startupLevelId, configLoading, config.campaignLevelId, activeLevelId]);

  useEffect(() => {
    if (options?.startupGameMode) return;
    if (configLoading) return;
    if (config.gameMode !== activeGameMode) {
      setActiveGameMode(config.gameMode);
    }
  }, [options?.startupGameMode, configLoading, config.gameMode, activeGameMode]);

  const [board, setBoard] = useState<GameBoard | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player>(1);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [turn, setTurn] = useState<TurnState>(() => createTurnState(2));
  const [players, setPlayers] = useState<{
    player1: PlayerState;
    player2: PlayerState;
  }>({
    player1: createInitialPlayerState(),
    player2: createInitialPlayerState(),
  });
  const [selectedPower, setSelectedPower] = useState<PowerId | null>(null);
  const [targetingMode, setTargetingMode] = useState(false);
  const [powerMessage, setPowerMessage] = useState<string | null>(null);
  const [lastPlayer1Moves, setLastPlayer1Moves] = useState<Coord[]>([]);
  const [lastPlayer2Moves, setLastPlayer2Moves] = useState<Coord[]>([]);
  const [currentTurnMoves, setCurrentTurnMoves] = useState<Coord[]>([]);

  const boardRef = useRef<GameBoard | null>(null);
  const activePlayerRef = useRef(activePlayer);
  const turnRef = useRef(turn);
  const playersRef = useRef(players);
  const botPlanRef = useRef<{ board: GameBoard; moves: ExtrusionAction[] } | null>(null);
  const loadedSessionKeyRef = useRef<string | null>(null);
  const winnerRef = useRef<Player | "draw" | null>(null);
  const currentTurnMovesRef = useRef<Coord[]>([]);
  const [initCheckToken, setInitCheckToken] = useState(0);

  const { timer, resetTimer } = useGameTimer(gameStatus);
  const { pushSnapshot, popSnapshot, clearHistory, canUndo } = useUndoHistory();

  const initializeFromLevel = useCallback(
    (lvl: CampaignLevel) => {
      const activeP1Color =
        config.player1Color === "black"
          ? PLAYER_CAPTURE_COLORS.player2
          : PLAYER_CAPTURE_COLORS.player1;
      const activeP2Color =
        config.player1Color === "black"
          ? PLAYER_CAPTURE_COLORS.player1
          : PLAYER_CAPTURE_COLORS.player2;
      const newBoard = createBoardFromLevel(lvl, {
        reservedColors: [activeP1Color, activeP2Color],
      });
      boardRef.current = newBoard;
      setBoard(newBoard);
      setActivePlayer(1);
      activePlayerRef.current = 1;
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
      winnerRef.current = null;
      setGameStatus("playing");
      const freshTurn = createTurnState(lvl.defaultTapsPerTurn);
      setTurn(freshTurn);
      turnRef.current = freshTurn;
      const freshPlayers = {
        player1: createInitialPlayerState(),
        player2: createInitialPlayerState(),
      };
      setPlayers(freshPlayers);
      playersRef.current = freshPlayers;
      setSelectedPower(null);
      setTargetingMode(false);
      setPowerMessage(null);
      setLastPlayer1Moves([]);
      setLastPlayer2Moves([]);
      currentTurnMovesRef.current = [];
      setCurrentTurnMoves([]);
      botPlanRef.current = null;
      clearHistory();
      resetTimer();
      loadedSessionKeyRef.current = `${lvl.id}:${activeGameMode}`;
      void clearSessionSnapshot();
      setInitCheckToken((token) => token + 1);
    },
    [clearHistory, resetTimer, config.player1Color, activeGameMode]
  );

  const restoreActiveSession = useCallback(async () => {
    const sessionKey = `${activeLevelId}:${activeGameMode}`;
    const pendingBoard = boardRef.current;
    const snap = await loadSessionSnapshot();
    if (loadedSessionKeyRef.current !== sessionKey || boardRef.current !== pendingBoard) return;
    const targetLevel = getCampaignLevel(activeLevelId);
    const canRestore =
      snap &&
      snap.winner === null &&
      snap.levelId === activeLevelId &&
      snap.gameMode === activeGameMode;

    if (!canRestore) {
      if (snap) await clearSessionSnapshot();
      if (loadedSessionKeyRef.current === sessionKey && boardRef.current === pendingBoard) {
        initializeFromLevel(targetLevel);
      }
      return;
    }

    boardRef.current = snap.board;
    setBoard(snap.board);
    setActivePlayer(snap.activePlayer);
    activePlayerRef.current = snap.activePlayer;
    setScores(snap.scores);
    winnerRef.current = snap.winner;
    setWinner(snap.winner);
    setGameStatus("playing");
    setTurn(snap.turn);
    turnRef.current = snap.turn;
    setPlayers(snap.players);
    playersRef.current = snap.players;
    setLastPlayer1Moves(getTurnHighlightCoords(snap.lastPlayer1Moves || []));
    setLastPlayer2Moves(getTurnHighlightCoords(snap.lastPlayer2Moves || []));
    currentTurnMovesRef.current = snap.currentTurnMoves ?? [];
    setCurrentTurnMoves(currentTurnMovesRef.current);
    clearHistory();
    resetTimer();
    loadedSessionKeyRef.current = `${activeLevelId}:${activeGameMode}`;
    setInitCheckToken((token) => token + 1);
  }, [
    activeLevelId,
    activeGameMode,
    initializeFromLevel,
    clearHistory,
    resetTimer,
  ]);

  const startFreshGame = useCallback(() => {
    const targetLevel = getCampaignLevel(activeLevelId);
    initializeFromLevel(targetLevel);
  }, [activeLevelId, initializeFromLevel]);

  // Session load effect
  useEffect(() => {
    if (configLoading) return;
    const sessionKey = `${activeLevelId}:${activeGameMode}`;
    if (loadedSessionKeyRef.current === sessionKey) return;
    loadedSessionKeyRef.current = sessionKey;

    if (options?.isResume) {
      void restoreActiveSession();
    } else {
      startFreshGame();
    }
  }, [
    activeLevelId,
    activeGameMode,
    configLoading,
    options?.isResume,
    restoreActiveSession,
    startFreshGame,
  ]);

  // Move-based Auto Save effect
  useEffect(() => {
    if (!board || winner !== null) return;
    void saveSessionSnapshot({
      timestamp: Date.now(),
      levelId: activeLevelId,
      gameMode: activeGameMode,
      player1Color: config.player1Color,
      board,
      activePlayer,
      scores,
      winner,
      turn,
      players,
      lastPlayer1Moves,
      lastPlayer2Moves,
      currentTurnMoves,
    });
  }, [
    board,
    activePlayer,
    scores,
    winner,
    turn,
    players,
    lastPlayer1Moves,
    lastPlayer2Moves,
    currentTurnMoves,
    activeLevelId,
    activeGameMode,
    config.player1Color,
  ]);

  const makeSnapshot = useCallback((): SessionSnapshot => {
    const currentBoard = boardRef.current!;
    const { player1Score, player2Score } = computeExtrusionScores(currentBoard);
    return {
      board: currentBoard,
      activePlayer: activePlayerRef.current,
      scores: { player1: player1Score, player2: player2Score },
      winner: winnerRef.current,
      turn: turnRef.current,
      players: playersRef.current,
      lastBotMoves: activePlayerRef.current === 1 ? lastPlayer2Moves : lastPlayer1Moves,
      currentTurnMoves: currentTurnMovesRef.current,
    };
  }, [lastPlayer1Moves, lastPlayer2Moves]);

  const restoreSnapshot = useCallback((snap: SessionSnapshot) => {
    botPlanRef.current = null;
    boardRef.current = snap.board;
    activePlayerRef.current = snap.activePlayer;
    winnerRef.current = snap.winner;
    turnRef.current = snap.turn;
    playersRef.current = snap.players;
    currentTurnMovesRef.current = snap.currentTurnMoves ?? [];

    setBoard(snap.board);
    setActivePlayer(snap.activePlayer);
    setScores(snap.scores);
    setWinner(snap.winner);
    setTurn(snap.turn);
    setPlayers(snap.players);
    if (snap.activePlayer === 1) {
      setLastPlayer2Moves(getTurnHighlightCoords(snap.lastBotMoves));
      setLastPlayer1Moves([]);
    } else {
      setLastPlayer1Moves(getTurnHighlightCoords(snap.lastBotMoves));
      setLastPlayer2Moves([]);
    }
    setCurrentTurnMoves(currentTurnMovesRef.current);
    setGameStatus(snap.winner === null ? "playing" : "game_over");
  }, []);

  const handleWinCheck = useCallback(async (nextBoard: GameBoard) => {
    if (winnerRef.current !== null) return;
    const outcome = checkWinCondition(nextBoard);
    setScores((previous) =>
      previous.player1 === outcome.player1Score && previous.player2 === outcome.player2Score
        ? previous
        : { player1: outcome.player1Score, player2: outcome.player2Score }
    );
    if (!outcome.isOver) return;

    winnerRef.current = outcome.winner;
    setWinner(outcome.winner);
    setGameStatus("game_over");
    await saveMatch({
      winner: outcome.winner ?? "draw",
      levelId: activeLevelId,
      levelName: level.name,
      gameMode: activeGameMode,
      player1Score: outcome.player1Score,
      player2Score: outcome.player2Score,
      totalBoardPoints: outcome.totalBoxes,
    });
    await clearSessionSnapshot();
    if (
      activeGameMode === "bot" && outcome.winner === 1 &&
      level.campaignNumber > 0 && !level.hidden
    ) {
      await completeCampaignLevel(level.id);
      const nextLevel = getVisibleCampaignLevelByNumber(level.campaignNumber + 1);
      if (nextLevel) updateConfig({ campaignLevelId: nextLevel.id });
    }
  }, [saveMatch, activeLevelId, level, activeGameMode, completeCampaignLevel, updateConfig]);

  const handleWinCheckRef = useRef(handleWinCheck);
  handleWinCheckRef.current = handleWinCheck;

  useEffect(() => {
    if (initCheckToken > 0 && boardRef.current) {
      void handleWinCheckRef.current(boardRef.current);
    }
  }, [initCheckToken]);

  const playAction = useCallback((action: ExtrusionAction, player: Player): GameBoard | null => {
    const currentBoard = boardRef.current;
    const currentTurn = turnRef.current;
    if (
      !currentBoard || winnerRef.current !== null ||
      player !== activePlayerRef.current || currentTurn.tapsRemaining <= 0
    ) return null;

    const { mode } = getExtrusionTurn(
      getExtrusionMoveOptions(currentBoard), player, currentTurn.forcedOpponentPlay
    );
    const result = executeExtrusionAction(currentBoard, action, player, mode);
    if (!result) return null;

    if (
      activeGameMode === "pvp" ||
      (player === 1 && currentTurn.tapsRemaining === currentTurn.tapsPerTurn)
    ) {
      pushSnapshot(makeSnapshot());
    }
    playMoveSounds(true);
    const moves = [...currentTurnMovesRef.current, ...result.changedCells];
    const remaining = currentTurn.tapsRemaining - 1;
    if (remaining > 0) {
      turnRef.current = {
        ...currentTurn,
        tapsRemaining: remaining,
        normalTapUsedThisTurn: true,
        forcedOpponentPlay: !!currentTurn.forcedOpponentPlay || mode !== "own",
      };
      currentTurnMovesRef.current = moves;
    } else {
      const highlights = getTurnHighlightCoords(moves);
      setLastPlayer1Moves(player === 1 ? highlights : []);
      setLastPlayer2Moves(player === 2 ? highlights : []);
      activePlayerRef.current = player === 1 ? 2 : 1;
      setActivePlayer(activePlayerRef.current);
      turnRef.current = createTurnState(currentTurn.tapsPerTurn);
      currentTurnMovesRef.current = [];
    }

    boardRef.current = result.board;
    setBoard(result.board);
    setTurn(turnRef.current);
    setCurrentTurnMoves(currentTurnMovesRef.current);
    void handleWinCheckRef.current(result.board);
    return result.board;
  }, [activeGameMode, pushSnapshot, makeSnapshot]);

  const isBotThinking = activeGameMode === "bot" && activePlayer === 2 &&
    winner === null && gameStatus === "playing";

  useEffect(() => {
    if (configLoading || !isBotThinking || !board || turn.tapsRemaining <= 0) {
      botPlanRef.current = null;
      return;
    }

    let cancelled = false;
    const isStale = () => cancelled || boardRef.current !== board ||
      activePlayerRef.current !== 2 || winnerRef.current !== null;

    const scheduleBotTurn = async () => {
      if (isStale()) return;
      let plan: ExtrusionAction[] = [];
      try {
        const retained = botPlanRef.current;
        plan = retained?.board === board
          ? retained.moves
          : await planExtrusionTurn(board, 2, {
              tapsRemaining: turn.tapsRemaining,
              tapsPerTurn: turn.tapsPerTurn,
              difficulty: level.botDifficulty,
              forcedOpponentPlay: turn.forcedOpponentPlay,
              isCancelled: isStale,
            });
      } catch (error) {
        console.error("Bot search failed:", error);
      }
      if (isStale()) return;

      const chosen = plan[0];
      let nextBoard = chosen ? playAction(chosen, 2) : null;
      if (!nextBoard) {
        const { moves } = getExtrusionTurn(
          getExtrusionMoveOptions(board), 2, turn.forcedOpponentPlay
        );
        nextBoard = moves[0] ? playAction(moves[0], 2) : null;
        plan = [];
      }
      botPlanRef.current = nextBoard && plan.length > 1 && activePlayerRef.current === 2
        ? { board: nextBoard, moves: plan.slice(1) }
        : null;
      if (!nextBoard) void handleWinCheckRef.current(board);
    };

    const timeout = setTimeout(() => void scheduleBotTurn(), getBotThinkDelayMs(level.botDifficulty));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [board, turn, isBotThinking, configLoading, level.botDifficulty, playAction]);

  const playHumanAction = (action: ExtrusionAction): boolean => {
    const player = activePlayerRef.current;
    if (gameStatus !== "playing" || (activeGameMode === "bot" && player !== 1)) return false;
    const played = !!playAction(action, player);
    if (!played) playGameSound("invalid");
    return played;
  };

  const handleTileTap = (row: number, col: number) => playHumanAction({ type: "spawn", row, col });
  const handleSpawn = handleTileTap;
  const handleTileLongPress = (row: number, col: number) =>
    playHumanAction({ type: "spawn_green", row, col });

  const handleExtrude = (boxId: string, direction: ExtrudeDirection) =>
    playHumanAction({ type: "extrude", boxId, direction });

  const handleMoveBlock = (boxId: string, direction: ExtrudeDirection) =>
    playHumanAction({ type: "slide", boxId, direction });

  const availableTurn = useMemo(() =>
    board && winner === null && turn.tapsRemaining > 0
      ? getExtrusionTurn(getExtrusionMoveOptions(board), activePlayer, turn.forcedOpponentPlay)
      : null,
  [board, activePlayer, turn, winner]);

  const activatePower = (powerId: PowerId) => {};
  const cancelPowerTargeting = () => {};

  const handleUndo = () => {
    if (!canUndo || isBotThinking) return;
    const snap = popSnapshot();
    if (snap) restoreSnapshot(snap);
  };

  const resetGame = () => {
    loadedSessionKeyRef.current = null;
    initializeFromLevel(getCampaignLevel(activeLevelId));
  };

  const loadLevel = (newLevelId: string) => {
    prevStartupLevelIdRef.current = newLevelId;
    setActiveLevelId(newLevelId);
    updateConfig({ campaignLevelId: newLevelId });
    loadedSessionKeyRef.current = null;
    initializeFromLevel(getCampaignLevel(newLevelId));
  };

  return {
    board,
    activePlayer,
    scores,
    winner,
    gameStatus,
    gameMode: activeGameMode,
    turn,
    players,
    selectedPower,
    targetingMode,
    powerMessage,
    lastBotMoves: activePlayer === 1 ? lastPlayer2Moves : lastPlayer1Moves,
    isBotThinking,
    timer,
    level,
    handleTileTap,
    handleSpawn,
    handleExtrude,
    handleMoveBlock,
    legalMoves: availableTurn?.moves ?? [],
    isForcedOpponentPlay: availableTurn !== null && availableTurn.mode !== "own",
    handleTileLongPress,
    activatePower,
    cancelPowerTargeting,
    resetGame,
    loadLevel,
    handleUndo,
    canUndo: canUndo && !isBotThinking,
    config,
    updateConfig,
    configLoading: configLoading || board === null,
    historyStats: stats,
    clearHistory: clearStats,
    totalBoxes: board ? computeExtrusionScores(board).totalCells : 0,
    player1ColorHex: PLAYER_CAPTURE_COLORS.player1,
    player2ColorHex: PLAYER_CAPTURE_COLORS.player2,
  };
}
