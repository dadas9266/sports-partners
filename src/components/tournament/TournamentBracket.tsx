"use client";

interface Participant {
  id: string;
  status: string;
  rank?: number | null;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
}

interface MatchSlot {
  seed: number;
  participant: Participant | null; // null = bye
  isWinner: boolean;
}

interface BracketMatch {
  id: string;
  topSlot: MatchSlot;
  bottomSlot: MatchSlot;
  round: number;
  position: number;
}

interface Props {
  participants: Participant[];
  format: string;
  status: string;
}

// Compute bracket rounds for single elimination
function buildBracket(participants: Participant[], status: string): BracketMatch[][] {
  const approved = participants
    .filter((p) => p.status === "APPROVED")
    .sort((a, b) => {
      // Sort by rank (lower is better) if available, otherwise by joinedAt
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

  if (approved.length < 2) return [];

  // Next power of 2
  const totalSlots = Math.pow(2, Math.ceil(Math.log2(approved.length)));
  const numRounds = Math.log2(totalSlots);

  // Seed the bracket with standard seeding (1v last, 2v second-last, etc.)
  // Build first-round pairings
  const seedings: number[] = generateSeedings(totalSlots);
  const firstRoundMatches: BracketMatch[] = [];
  for (let i = 0; i < seedings.length; i += 2) {
    const topSeedIdx = seedings[i] - 1;
    const bottomSeedIdx = seedings[i + 1] - 1;
    const topParticipant = topSeedIdx < approved.length ? approved[topSeedIdx] : null;
    const bottomParticipant = bottomSeedIdx < approved.length ? approved[bottomSeedIdx] : null;

    const matchId = `r0-m${i / 2}`;
    const isCompleted = status === "COMPLETED";

    // For completed tournaments, determine winner by rank
    const topIsWinner = determineWinner(topParticipant, bottomParticipant, "top");
    const bottomIsWinner = determineWinner(topParticipant, bottomParticipant, "bottom");

    firstRoundMatches.push({
      id: matchId,
      topSlot: {
        seed: seedings[i],
        participant: topParticipant,
        isWinner: isCompleted ? topIsWinner : false,
      },
      bottomSlot: {
        seed: seedings[i + 1],
        participant: bottomParticipant,
        isWinner: isCompleted ? bottomIsWinner : false,
      },
      round: 0,
      position: i / 2,
    });
  }

  const allRounds: BracketMatch[][] = [firstRoundMatches];

  // Build subsequent rounds from winners
  for (let r = 1; r < numRounds; r++) {
    const prevRound = allRounds[r - 1];
    const currentRound: BracketMatch[] = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      const topMatch = prevRound[i];
      const bottomMatch = prevRound[i + 1];
      const topWinner = getMatchWinner(topMatch, status);
      const bottomWinner = getMatchWinner(bottomMatch, status);

      const isCompleted = status === "COMPLETED";
      const topIsWinner = determineWinner(topWinner, bottomWinner, "top");
      const bottomIsWinner = determineWinner(topWinner, bottomWinner, "bottom");

      currentRound.push({
        id: `r${r}-m${i / 2}`,
        topSlot: { seed: 0, participant: topWinner, isWinner: isCompleted ? topIsWinner : false },
        bottomSlot: { seed: 0, participant: bottomWinner, isWinner: isCompleted ? bottomIsWinner : false },
        round: r,
        position: i / 2,
      });
    }
    allRounds.push(currentRound);
  }

  return allRounds;
}

// Standard bracket seeding [1, totalSlots, totalSlots/2+1, totalSlots/2, ...]
function generateSeedings(n: number): number[] {
  if (n === 2) return [1, 2];
  const half = generateSeedings(n / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(n + 1 - s);
  }
  return result;
}

function determineWinner(
  topP: Participant | null,
  bottomP: Participant | null,
  side: "top" | "bottom"
): boolean {
  if (!topP && !bottomP) return false;
  if (!topP) return side === "bottom"; // bye — bottom wins
  if (!bottomP) return side === "top"; // bye — top wins
  // Lower rank = better
  if (topP.rank != null && bottomP.rank != null) {
    if (side === "top") return topP.rank < bottomP.rank;
    return bottomP.rank < topP.rank;
  }
  return false;
}

function getMatchWinner(match: BracketMatch, status: string): Participant | null {
  if (status !== "COMPLETED") return null;
  if (match.topSlot.isWinner) return match.topSlot.participant;
  if (match.bottomSlot.isWinner) return match.bottomSlot.participant;
  // Bye: one side is null
  if (!match.topSlot.participant) return match.bottomSlot.participant;
  if (!match.bottomSlot.participant) return match.topSlot.participant;
  return null;
}

function ParticipantSlot({ slot, isFinal }: { slot: MatchSlot; isFinal?: boolean }) {
  const p = slot.participant;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
        slot.isWinner
          ? "bg-amber-900/40 border-amber-600/60 text-amber-300 font-semibold"
          : p
          ? "bg-gray-800/80 border-gray-600/60 text-gray-300"
          : "bg-gray-900/30 border-gray-700/40 text-gray-600 italic"
      }`}
      style={{ minWidth: "140px" }}
    >
      {p ? (
        <>
          <div className="w-6 h-6 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
            {p.user.avatarUrl ? (
              <img src={p.user.avatarUrl} alt={p.user.name} className="w-full h-full object-cover" />
            ) : (
              p.user.name?.[0]?.toUpperCase()
            )}
          </div>
          <span className="truncate max-w-[90px]">{p.user.name}</span>
          {slot.isWinner && <span className="ml-auto text-amber-400">🏆</span>}
        </>
      ) : (
        <span className="text-gray-600 text-xs">Bye</span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  return (
    <div className="flex flex-col gap-1 my-2">
      <ParticipantSlot slot={match.topSlot} />
      <div className="w-full h-px bg-gray-700/50" />
      <ParticipantSlot slot={match.bottomSlot} />
    </div>
  );
}

// Round-robin table
function RoundRobinTable({ participants }: { participants: Participant[] }) {
  const approved = participants.filter((p) => p.status === "APPROVED");
  if (approved.length < 2) {
    return <p className="text-sm text-gray-500">Henüz yeterli katılımcı yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs text-gray-300 border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-gray-500">#</th>
            <th className="px-3 py-1 text-left text-gray-400">Katılımcı</th>
            {approved.map((_, i) => (
              <th key={i} className="px-2 py-1 text-center text-gray-500 font-normal">
                {i + 1}
              </th>
            ))}
            <th className="px-2 py-1 text-center text-gray-400">Sıra</th>
          </tr>
        </thead>
        <tbody>
          {approved.map((p, i) => (
            <tr key={p.id} className="border-t border-gray-700/50">
              <td className="px-2 py-1.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-1.5 font-medium text-gray-200 whitespace-nowrap">{p.user.name}</td>
              {approved.map((_, j) => (
                <td key={j} className="px-2 py-1.5 text-center">
                  {i === j ? <span className="text-gray-600">—</span> : <span className="text-gray-600">?</span>}
                </td>
              ))}
              <td className="px-2 py-1.5 text-center text-amber-400 font-medium">
                {p.rank != null ? `#${p.rank}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TournamentBracket({ participants, format, status }: Props) {
  if (format === "SINGLE_ELIMINATION") {
    const rounds = buildBracket(participants, status);
    const roundLabels: Record<number, string> = {};
    const totalRounds = rounds.length;
    if (totalRounds > 0) {
      rounds.forEach((_, i) => {
        if (i === totalRounds - 1) roundLabels[i] = "Final";
        else if (i === totalRounds - 2) roundLabels[i] = "Yarı Final";
        else if (i === totalRounds - 3) roundLabels[i] = "Çeyrek Final";
        else roundLabels[i] = `Tur ${i + 1}`;
      });
    }

    if (rounds.length === 0) {
      return (
        <p className="text-sm text-gray-500 py-4">
          Bracket oluşturmak için en az 2 onaylı katılımcı gereklidir.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-8 items-start min-w-max">
          {rounds.map((roundMatches, rIdx) => (
            <div key={rIdx} className="flex flex-col">
              {/* Round label */}
              <div className="text-xs text-center text-gray-500 font-medium mb-3 uppercase tracking-wide px-2">
                {roundLabels[rIdx] ?? `Tur ${rIdx + 1}`}
              </div>
              {/* Matches spaced to align with connectors */}
              <div
                className="flex flex-col justify-around"
                style={{ gap: `${Math.pow(2, rIdx) * 8}px` }}
              >
                {roundMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (format === "ROUND_ROBIN") {
    return <RoundRobinTable participants={participants} />;
  }

  // Swiss or unknown
  return (
    <div className="text-center py-8 text-gray-500 text-sm">
      <p className="text-3xl mb-3">🏆</p>
      <p>İsviçre sistemi için bracket görünümü desteklenmemektedir.</p>
      <p className="text-gray-600 text-xs mt-1">Sonuçlar katılımcı listesinde sıralama olarak görünür.</p>
    </div>
  );
}
