import { useState, useRef, useEffect, useCallback } from "react";
import { GameBoard, getTotalBoardPoints } from "../types/board";
import { Player, GameStatus } from "../types/game";
import { Coord } from "../types/box";
import { TurnState, PlayerState, SessionSnapshot } from "../types/session";
import { PowerId } from "../types/powers";
import { CampaignLevel } from "../types/level";
import {
  createBoardFromLevel,
  checkWinCondition,
  getBoxAt,
  hasPlayerAnyLegalMove,
  canSpawnAt,
  canExpandBlock,
  executeSpawn,
  executeExtrusion,
  computeExtrusionScores,
  getBotExtrusionMove,
  ExtrudeDirection,
} from "../engine/gameEngine";
import { applyCaptureRewards, createInitialPlayerState } from "../engine/rewards/rewardEngine";
import { executePower, getPowerDefinition } from "../registries/powerRegistry";
import { getCampaignLevel } from "../registries/campaignLevels";
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
import { getTurnHighlightCoords, resolveTurnHighlightCoords } from "../utils/lastMove";
import type { TurnMoveRecord } from "../utils/lastMove";

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
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedSessionKeyRef = useRef<string | null>(null);
  const winnerRef = useRef<Player | "draw" | null>(null);
  const currentTurnMovesRef = useRef<Coord[]>([]);
  const currentTurnMoveRecordsRef = useRef<TurnMoveRecord[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
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
      const freshTurn = createTurnState(2);
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
      currentTurnMoveRecordsRef.current = [];
      setCurrentTurnMoves([]);
      setIsBotThinking(false);
      clearHistory();
      resetTimer();
      loadedSessionKeyRef.current = `${lvl.id}:${activeGameMode}`;
      void clearSessionSnapshot();
      setInitCheckToken((token) => token + 1);
    },
    [clearHistory, resetTimer, config.player1Color, activeGameMode]
  );

  const restoreActiveSession = useCallback(async () => {
    const snap = await loadSessionSnapshot();
    const targetLevel = getCampaignLevel(activeLevelId);
    const canRestore =
      snap &&
      snap.winner === null &&
      snap.levelId === activeLevelId &&
      snap.gameMode === activeGameMode;

    if (!canRestore) {
      if (snap) await clearSessionSnapshot();
      initializeFromLevel(targetLevel);
      return;
    }

    boardRef.current = snap.board;
    setBoard(snap.board);
    setActivePlayer(snap.activePlayer);
    activePlayerRef.current = snap.activePlayer;
    setScores(snap.scores);
    setWinner(snap.winner);
    setGameStatus("playing");
    setTurn(snap.turn);
    turnRef.current = snap.turn;
    setPlayers(snap.players);
    playersRef.current = snap.players;
    setLastPlayer1Moves(getTurnHighlightCoords(snap.lastPlayer1Moves || []));
    setLastPlayer2Moves(getTurnHighlightCoords(snap.lastPlayer2Moves || []));
    setCurrentTurnMoves(snap.currentTurnMoves || []);
    setIsBotThinking(false);
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

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { activePlayerRef.current = activePlayer; }, [activePlayer]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  const makeSnapshot = useCallback(
    (): SessionSnapshot => ({
      board: boardRef.current!,
      activePlayer: activePlayerRef.current,
      scores,
      winner,
      turn: turnRef.current,
      players: playersRef.current,
      lastBotMoves: activePlayerRef.current === 1 ? lastPlayer2Moves : lastPlayer1Moves,
    }),
    [scores, winner, lastPlayer1Moves, lastPlayer2Moves]
  );

  const restoreSnapshot = useCallback((snap: SessionSnapshot) => {
    boardRef.current = snap.board;
    setBoard(snap.board);
    setActivePlayer(snap.activePlayer);
    setScores(snap.scores);
    setWinner(snap.winner);
    setTurn(snap.turn);
    turnRef.current = snap.turn;
    setPlayers(snap.players);
    if (snap.activePlayer === 1) {
      setLastPlayer2Moves(getTurnHighlightCoords(snap.lastBotMoves));
      setLastPlayer1Moves([]);
    } else {
      setLastPlayer1Moves(getTurnHighlightCoords(snap.lastBotMoves));
      setLastPlayer2Moves([]);
    }
    setCurrentTurnMoves([]);
    if (snap.winner === null) setGameStatus("playing");
  }, []);

  const handleWinCheck = useCallback(
    async (
      nextBoard: GameBoard,
      playerToCheck?: Player,
      turnToCheck?: TurnState
    ) => {
      if (winnerRef.current !== null) return true;

      const winState = checkWinCondition(nextBoard, playerToCheck);
      setScores((prev) =>
        prev.player1 === winState.player1Score && prev.player2 === winState.player2Score
          ? prev
          : { player1: winState.player1Score, player2: winState.player2Score }
      );

      let outcome = winState;

      if (
        !outcome.isOver &&
        playerToCheck !== undefined &&
        !hasPlayerAnyLegalMove(nextBoard, playerToCheck, nextBoard.unlockedWhiteRows ?? [])
      ) {
        const opponent: Player = playerToCheck === 1 ? 2 : 1;
        const opponentCanMove = hasPlayerAnyLegalMove(
          nextBoard,
          opponent,
          nextBoard.unlockedWhiteRows ?? []
        );
        if (!opponentCanMove) {
          let textWinner: Player | "draw" = "draw";
          if (winState.player1Score > winState.player2Score) textWinner = 1;
          else if (winState.player2Score > winState.player1Score) textWinner = 2;
          outcome = { ...winState, isOver: true, winner: textWinner };
        }
      }

      if (outcome.isOver) {
        if (winnerRef.current !== null) return true;
        winnerRef.current = outcome.winner;
        setWinner(outcome.winner);
        setGameStatus("game_over");
        const totalBoardPoints = nextBoard.rows * nextBoard.cols;
        await saveMatch({
          winner: outcome.winner ?? "draw",
          levelId: activeLevelId,
          levelName: level.name || `Level ${level.campaignNumber}`,
          gameMode: activeGameMode,
          player1Score: outcome.player1Score,
          player2Score: outcome.player2Score,
          totalBoardPoints,
        });
        await clearSessionSnapshot();
        if (
          activeGameMode === "bot" &&
          outcome.winner === 1 &&
          level.campaignNumber > 0 &&
          !level.hidden
        ) {
          await completeCampaignLevel(level.id);
          const nextLevelNumber = level.campaignNumber + 1;
          const nextLevelId = `campaign-${nextLevelNumber}`;
          updateConfig({ campaignLevelId: nextLevelId });
        }
        return true;
      }
      return false;
    },
    [
      saveMatch,
      activeGameMode,
      level.id,
      level.campaignNumber,
      level.hidden,
      completeCampaignLevel,
      updateConfig,
    ]
  );

  const handleWinCheckRef = useRef(handleWinCheck);
  handleWinCheckRef.current = handleWinCheck;

  useEffect(() => {
    if (initCheckToken === 0) return;
    const currentBoard = boardRef.current;
    if (!currentBoard) return;
    void handleWinCheckRef.current(
      currentBoard,
      activePlayerRef.current,
      turnRef.current
    );
  }, [initCheckToken]);

  const finishPlayerAction = async (
    nextBoard: GameBoard,
    player: Player
  ): Promise<boolean> => {
    let nextActive = activePlayerRef.current;
    const remaining = turnRef.current.tapsRemaining - 1;
    let nextTurn: TurnState;

    if (remaining <= 0) {
      nextActive = player === 1 ? 2 : 1;
      const completedTurnMoves = resolveTurnHighlightCoords(
        currentTurnMoveRecordsRef.current
      );
      if (player === 1) {
        setLastPlayer1Moves(completedTurnMoves);
        setLastPlayer2Moves([]);
      } else {
        setLastPlayer2Moves(completedTurnMoves);
        setLastPlayer1Moves([]);
      }
      currentTurnMovesRef.current = [];
      currentTurnMoveRecordsRef.current = [];
      setCurrentTurnMoves([]);

      nextTurn = createTurnState(2);
      setActivePlayer(nextActive);
      activePlayerRef.current = nextActive;
      setTurn(nextTurn);
      turnRef.current = nextTurn;
    } else {
      nextTurn = {
        ...turnRef.current,
        tapsRemaining: remaining,
        normalTapUsedThisTurn: true,
      };
      setTurn(nextTurn);
      turnRef.current = nextTurn;
    }

    const playerToCheck = remaining <= 0 ? nextActive : player;
    const isOver = await handleWinCheck(nextBoard, playerToCheck, nextTurn);
    if (isOver) return false;

    if (activeGameMode === "bot" && nextActive === 2) {
      if (turnRef.current.tapsRemaining === turnRef.current.tapsPerTurn) {
        setLastPlayer2Moves([]);
        pushSnapshot(makeSnapshot());
      }
      return true;
    }

    return false;
  };

  const executeSpawnInternal = async (
    row: number,
    col: number,
    player: Player
  ): Promise<boolean> => {
    const currentBoard = boardRef.current;
    if (!currentBoard) return false;

    const whiteRows = currentBoard.unlockedWhiteRows ?? [];
    if (!canSpawnAt(currentBoard, row, col, player, whiteRows)) {
      return false;
    }

    const spawnResult = executeSpawn(currentBoard, row, col, player, whiteRows);
    if (!spawnResult) return false;

    playMoveSounds(true);

    const moveRecord: TurnMoveRecord = { row, col, tapCost: 1, kind: "tap" };
    currentTurnMovesRef.current = [...currentTurnMovesRef.current, { row, col }];
    currentTurnMoveRecordsRef.current = [
      ...currentTurnMoveRecordsRef.current,
      moveRecord,
    ];
    setCurrentTurnMoves(currentTurnMovesRef.current);

    boardRef.current = spawnResult.board;
    setBoard(spawnResult.board);

    const newScores = computeExtrusionScores(spawnResult.board);
    setScores({ player1: newScores.player1Score, player2: newScores.player2Score });

    return await finishPlayerAction(spawnResult.board, player);
  };

  const executeExtrusionInternal = async (
    boxId: string,
    direction: ExtrudeDirection,
    player: Player
  ): Promise<boolean> => {
    const currentBoard = boardRef.current;
    if (!currentBoard) return false;

    const box = currentBoard.boxes[boxId];
    if (!box || box.owner !== player) return false;

    const whiteRows = currentBoard.unlockedWhiteRows ?? [];
    if (!canExpandBlock(currentBoard, box, direction)) {
      return false;
    }

    const result = executeExtrusion(currentBoard, boxId, direction, player, whiteRows);
    if (!result) return false;

    playMoveSounds(true);

    for (const cell of result.addedCells) {
      const moveRecord: TurnMoveRecord = { row: cell.row, col: cell.col, tapCost: 1, kind: "tap" };
      currentTurnMovesRef.current = [...currentTurnMovesRef.current, cell];
      currentTurnMoveRecordsRef.current = [
        ...currentTurnMoveRecordsRef.current,
        moveRecord,
      ];
    }
    setCurrentTurnMoves(currentTurnMovesRef.current);

    boardRef.current = result.board;
    setBoard(result.board);

    const newScores = computeExtrusionScores(result.board);
    setScores({ player1: newScores.player1Score, player2: newScores.player2Score });

    return await finishPlayerAction(result.board, player);
  };

  const scheduleBotTurn = useCallback(() => {
    if (activeGameMode !== "bot") return;

    const thinkDelayMs = getBotThinkDelayMs(level.botDifficulty);
    setIsBotThinking(true);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

    botTimeoutRef.current = setTimeout(async () => {
      let keepThinking = false;
      try {
        if (activePlayerRef.current !== 2 || winnerRef.current !== null) {
          return;
        }

        const currentBoard = boardRef.current;
        if (!currentBoard) return;

        const botMove = getBotExtrusionMove(
          currentBoard,
          2,
          currentBoard.unlockedWhiteRows ?? [],
          level.botDifficulty
        );

        if (botMove) {
          const shouldContinue =
            botMove.type === "spawn"
              ? await executeSpawnInternal(botMove.row, botMove.col, 2)
              : await executeExtrusionInternal(botMove.boxId, botMove.direction, 2);

          if (shouldContinue) {
            keepThinking = true;
            scheduleBotTurn();
          } else if (
            activePlayerRef.current === 2 &&
            turnRef.current.tapsRemaining > 0
          ) {
            keepThinking = true;
            scheduleBotTurn();
          }
        } else {
          // If bot has no moves, check if game is over or pass turn
          const blocked = await handleWinCheck(
            currentBoard,
            2,
            turnRef.current
          );
          if (!blocked) {
            setActivePlayer(1);
            activePlayerRef.current = 1;
            const freshTurn = createTurnState(2);
            setTurn(freshTurn);
            turnRef.current = freshTurn;
          }
        }
      } catch (e) {
        console.error("Bot failed:", e);
      } finally {
        if (!keepThinking) setIsBotThinking(false);
      }
    }, thinkDelayMs);
  }, [activeGameMode, level.botDifficulty, handleWinCheck]);

  useEffect(() => {
    if (configLoading || !board || activeGameMode !== "bot") return;
    if (gameStatus !== "playing" || winner !== null) return;
    if (activePlayer !== 2 || isBotThinking) return;

    const kickTimer = setTimeout(() => {
      if (activePlayerRef.current !== 2) return;
      if (winnerRef.current !== null) return;
      scheduleBotTurn();
    }, 150);

    return () => clearTimeout(kickTimer);
  }, [
    activePlayer,
    isBotThinking,
    gameStatus,
    winner,
    board,
    activeGameMode,
    configLoading,
    scheduleBotTurn,
  ]);

  const handleTileTap = async (row: number, col: number) => {
    if (gameStatus !== "playing" || isBotThinking || !boardRef.current) return;
    if (activeGameMode === "bot" && activePlayerRef.current !== 1) return;

    const currentBoard = boardRef.current;
    const currentTurn = turnRef.current;
    const whiteRows = currentBoard.unlockedWhiteRows ?? [];

    if (canSpawnAt(currentBoard, row, col, activePlayerRef.current, whiteRows)) {
      if (activeGameMode === "pvp") {
        pushSnapshot(makeSnapshot());
      } else if (
        activePlayerRef.current === 1 &&
        currentTurn.tapsRemaining === currentTurn.tapsPerTurn
      ) {
        pushSnapshot(makeSnapshot());
      }

      const shouldBotPlay = await executeSpawnInternal(
        row,
        col,
        activePlayerRef.current
      );

      if (activeGameMode === "bot" && shouldBotPlay && gameStatus === "playing") {
        scheduleBotTurn();
      }
      return;
    }

    const tappedBox = getBoxAt(currentBoard, row, col);
    if (tappedBox && tappedBox.owner === activePlayerRef.current) {
      playGameSound("tap");
      return;
    }

    playGameSound("invalid");
  };

  const handleExtrude = async (boxId: string, direction: ExtrudeDirection): Promise<boolean> => {
    if (gameStatus !== "playing" || isBotThinking || !boardRef.current) return false;
    if (activeGameMode === "bot" && activePlayerRef.current !== 1) return false;

    const currentBoard = boardRef.current;
    const box = currentBoard.boxes[boxId];
    if (!box || box.owner !== activePlayerRef.current) {
      playGameSound("invalid");
      return false;
    }

    if (!canExpandBlock(currentBoard, box, direction)) {
      playGameSound("invalid");
      return false;
    }

    const currentTurn = turnRef.current;
    if (activeGameMode === "pvp") {
      pushSnapshot(makeSnapshot());
    } else if (
      activePlayerRef.current === 1 &&
      currentTurn.tapsRemaining === currentTurn.tapsPerTurn
    ) {
      pushSnapshot(makeSnapshot());
    }

    const shouldBotPlay = await executeExtrusionInternal(
      boxId,
      direction,
      activePlayerRef.current
    );

    if (activeGameMode === "bot" && shouldBotPlay && gameStatus === "playing") {
      scheduleBotTurn();
    }

    return true;
  };

  const handleSpawn = async (row: number, col: number): Promise<boolean> => {
    await handleTileTap(row, col);
    return true;
  };

  const handleTileLongPress = async (row: number, col: number) => {
    // Unused in Extrusion mode
  };

  const activatePower = (powerId: PowerId) => {};
  const cancelPowerTargeting = () => {};

  const handleUndo = () => {
    if (!canUndo || isBotThinking) return;
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setIsBotThinking(false);
    const snap = popSnapshot();
    if (snap) restoreSnapshot(snap);
  };

  const resetGame = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
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
    totalBoxes: board ? board.rows * board.cols : 0,
    player1ColorHex: PLAYER_CAPTURE_COLORS.player1,
    player2ColorHex: PLAYER_CAPTURE_COLORS.player2,
  };
}
