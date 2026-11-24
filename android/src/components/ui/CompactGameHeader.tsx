import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Player } from "../../types/game";
import { GamifiedPanel } from "./GamifiedPanel";
import { formatPercent } from "../../utils/formatting";

interface CompactGameHeaderProps {
  levelNumber: number;
  stageName: string;
  player1Score: number;
  player2Score: number;
  totalBoxes: number;
  activePlayer: Player;
  tapsRemaining: number;
  isBotThinking: boolean;
  winner: Player | "draw" | null;
  gameMode: "bot" | "pvp";
  player1ColorHex?: string;
  player2ColorHex?: string;
  density?: "normal" | "compact" | "tight";
}

export function CompactGameHeader({
  levelNumber,
  stageName,
  player1Score,
  player2Score,
  totalBoxes,
  activePlayer,
  tapsRemaining,
  isBotThinking,
  winner,
  gameMode,
  player1ColorHex = "#2563EB",
  player2ColorHex = "#EF4444",
}: CompactGameHeaderProps) {
  const isBotMode = gameMode === "bot";
  const p1Percent = formatPercent(player1Score, totalBoxes);
  const p2Percent = formatPercent(player2Score, totalBoxes);

  // Turn status
  let turnStatusText = "";
  if (winner) {
    if (winner === 1) turnStatusText = isBotMode ? "YOU WON! 🏆" : "P1 WON! 🏆";
    else if (winner === 2) turnStatusText = isBotMode ? "BOT WON 💀" : "P2 WON! 🏆";
    else turnStatusText = "DRAW! 🤝";
  } else if (isBotThinking) {
    turnStatusText = "🤖 Thinking…";
  } else {
    const actionWord = tapsRemaining === 1 ? "action" : "actions";
    turnStatusText = isBotMode
      ? activePlayer === 1
        ? `${tapsRemaining} ${actionWord}`
        : "Bot turn"
      : `P${activePlayer}: ${tapsRemaining} ${actionWord}`;
  }

  const isP1Active = activePlayer === 1 && !winner && !isBotThinking;
  const isP2Active = activePlayer === 2 && !winner && isBotMode ? isBotThinking : activePlayer === 2 && !winner;

  return (
    <GamifiedPanel variant="card" contentStyle={styles.card}>
      <View style={styles.container}>
        {/* Left: Stage Info */}
        <View style={styles.stageBlock}>
          <Text style={styles.stageTitle} numberOfLines={1}>
            Stage {levelNumber}
          </Text>
          <Text style={styles.stageSubtitle} numberOfLines={1}>
            {stageName}
          </Text>
        </View>

        {/* Center: Territory Scores */}
        <View style={styles.scoresSection}>
          <View
            style={[
              styles.scorePill,
              styles.scorePillP1,
              isP1Active && styles.activeP1Border,
            ]}
          >
            <Text style={styles.playerLabelP1}>{isBotMode ? "YOU" : "P1"}</Text>
            <Text style={styles.scoreValP1}>{player1Score}</Text>
            <Text style={styles.percentTextP1}>{p1Percent}</Text>
          </View>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View
            style={[
              styles.scorePill,
              styles.scorePillP2,
              isP2Active && styles.activeP2Border,
            ]}
          >
            <Text style={styles.percentTextP2}>{p2Percent}</Text>
            <Text style={styles.scoreValP2}>{player2Score}</Text>
            <Text style={styles.playerLabelP2}>{isBotMode ? "BOT" : "P2"}</Text>
          </View>
        </View>

        {/* Right: Turn / Actions Info */}
        <View style={styles.turnBlock}>
          <View
            style={[
              styles.turnPill,
              isBotThinking && styles.turnPillBot,
              winner !== null && styles.turnPillWinner,
            ]}
          >
            {!winner && !isBotThinking && (
              <View
                style={[
                  styles.turnDot,
                  {
                    backgroundColor:
                      activePlayer === 1 ? player1ColorHex : player2ColorHex,
                  },
                ]}
              />
            )}
            <Text
              style={[
                styles.turnText,
                isBotThinking && styles.turnTextBot,
                winner !== null && styles.turnTextWinner,
              ]}
              numberOfLines={1}
            >
              {turnStatusText}
            </Text>
          </View>
        </View>
      </View>
    </GamifiedPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageBlock: {
    flex: 1.1,
    justifyContent: "center",
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    includeFontPadding: false,
  },
  stageSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    includeFontPadding: false,
  },
  scoresSection: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  scorePillP1: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  activeP1Border: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  playerLabelP1: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1E40AF",
    includeFontPadding: false,
  },
  percentTextP1: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
    opacity: 0.85,
    includeFontPadding: false,
  },
  scoreValP1: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E40AF",
    includeFontPadding: false,
  },
  scorePillP2: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1.5,
    borderColor: "#FECDD3",
  },
  activeP2Border: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  playerLabelP2: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
    includeFontPadding: false,
  },
  percentTextP2: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
    opacity: 0.85,
    includeFontPadding: false,
  },
  scoreValP2: {
    fontSize: 15,
    fontWeight: "900",
    color: "#991B1B",
    includeFontPadding: false,
  },
  vsCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#64748B",
    includeFontPadding: false,
  },
  turnBlock: {
    flex: 1.2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  turnPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  turnPillBot: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  turnPillWinner: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  turnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    includeFontPadding: false,
  },
  turnTextBot: {
    color: "#B45309",
  },
  turnTextWinner: {
    color: "#15803D",
  },
});
