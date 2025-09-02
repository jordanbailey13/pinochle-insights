import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Pinochle Style Insights – Clean Single-File App
 * - Shuffled 25-question quiz
 * - No in-app results; exports JSON for organizer
 * - Tailwind classes for styling (works without Tailwind too)
 */

/* =========================
   Types
   ========================= */
type Question =
  | { id: string; type: "likert"; text: string }
  | { id: string; type: "multi"; text: string; options: string[] }
  | { id: string; type: "slider"; text: string; min: number; max: number };

type Quadrant = "TR" | "BR" | "TL" | "BL";
type PersonaKey = "Maverick" | "Tactician" | "Sage" | "Guardian";

/* =========================
   Question Bank (stable IDs; order shuffled per session)
   ========================= */
const BANK: Question[] = [
  {
    id: "Q1",
    type: "multi",
    text:
      "You’re dealt 3 parts of a double pinochle in a close game where either team could win with a big hand. How many times are you willing to overbid your partner to win the bid?",
    options: ["0–1", "2", "3", "4", "As many as required"],
  },
  {
    id: "Q2",
    type: "likert",
    text: "Bidding without looking at my cards is a good strategy for winning the game.",
  },
  {
    id: "Q3",
    type: "slider",
    text:
      "Final game, you lead 140–6, dealt 7 nines (special rule = automatic win). What is the maximum bid you’d make?",
    min: 25,
    max: 150,
  },
  {
    id: "Q4",
    type: "likert",
    text: "I adjust my playing style significantly depending on who my partner is.",
  },
  {
    id: "Q5",
    type: "multi",
    text: "When on a cold streak, the best way to find a groove is to:",
    options: [
      "Defer to my partner and stop being aggressive",
      "I don’t change my approach",
      "Bid more and drag the team out of the doldrums",
      "Have a Margarita and trust Crom or Baphomet to deliver glory",
    ],
  },
  {
    id: "Q6",
    type: "slider",
    text:
      "When bidding with decent but not great cards, at what bid amount do you start to seriously question if you can make it?",
    min: 25,
    max: 45,
  },
  {
    id: "Q7",
    type: "likert",
    text:
      "I intentionally play deceptively (masking strength, sandbagging meld, misleading suit leads) as part of my strategy.",
  },
  {
    id: "Q8",
    type: "likert",
    text: "I’d rather underbid slightly than risk going set.",
  },
  {
    id: "Q9",
    type: "likert",
    text: "When trailing late, I’ll push bids higher than usual to try to swing the game.",
  },
  {
    id: "Q10",
    type: "likert",
    text: "Stopping opponents from winning a bid is more important to me than maximizing our points.",
  },
  {
    id: "Q11",
    type: "likert",
    text:
      "I’d rather go after a spectacular hand once in a while than play steady, moderate hands every time.",
  },
  {
    id: "Q12",
    type: "likert",
    text: "When frustrated, I sometimes bid higher than I should just to shake things up.",
  },
  {
    id: "Q13",
    type: "likert",
    text: "I actively track remaining trumps and point cards throughout a hand.",
  },
  { id: "Q14", type: "likert", text: "Sometimes the feel of the table matters more to me than the numbers." },
  {
    id: "Q15",
    type: "likert",
    text: "Before making a play, I think about the odds of it working based on what’s been played.",
  },
  {
    id: "Q16",
    type: "likert",
    text: "Pauses and tendencies from other players influence my decisions.",
  },
  {
    id: "Q17",
    type: "likert",
    text: "Precise meld math and score context heavily influence my decisions.",
  },
  {
    id: "Q18",
    type: "likert",
    text: "Even if math says no, if my gut says yes, I’ll go for it.",
  },
  {
    id: "Q19",
    type: "likert",
    text: "I often defer to my partner’s judgment when we disagree on approach.",
  },
  {
    id: "Q20",
    type: "likert",
    text: "Throwing off opponents’ rhythm is worth deviating from sound play.",
  },
  {
    id: "Q21",
    type: "likert",
    text:
      "With a strong hand, I try to dictate the flow of play and force opponents into bad spots.",
  },
  {
    id: "Q22",
    type: "likert",
    text: "When winning Crom is on the line, I change my style dramatically.",
  },
  {
    id: "Q23",
    type: "likert",
    text: "If we’re way ahead, I play more cautiously to lock in the win.",
  },
  {
    id: "Q24",
    type: "likert",
    text: "My style varies depending on the meta of the group that night (who’s hot, who’s cold).",
  },
  {
    id: "Q25",
    type: "multi",
    text: "If forced to choose, I’d rather…",
    options: ["Win with a safe, small hand", "Lose spectacularly trying for something legendary"],
  },
];

/* =========================
   Helpers
   ========================= */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function likertToScore(v: number) {
  return v - 3; // 1..5 => -2..+2
}

/* =========================
   Scoring
   ========================= */
function scoreQuestion(
  q: Question,
  a: any
): { dx: number; dy: number; maxDx: number; maxDy: number } {
  let dx = 0,
    dy = 0,
    maxDx = 0,
    maxDy = 0;

  switch (q.id) {
    case "Q1": {
      const map: Record<string, number> = {
        "0–1": -2,
        "2": -1,
        "3": +1,
        "4": +2,
        "As many as required": +2,
      };
      dx = map[a] ?? 0;
      maxDx = 2;
      break;
    }
    case "Q2": {
      const s = likertToScore(a);
      dy = s;
      maxDy = 2;
      break;
    }
    case "Q3": {
      const v = typeof a === "number" ? a : 25;
      if (v <= 30) dx = -2;
      else if (v <= 40) dx = 0;
      else dx = clamp(((v - 40) / (150 - 40)) * 2, 0, 2);
      maxDx = 2;
      break;
    }
    case "Q4": {
      const s = likertToScore(a);
      dy = -s;
      maxDy = 2;
      break;
    }
    case "Q5": {
      const mapDX: Record<string, number> = {
        "Defer to my partner and stop being aggressive": -1.5,
        "I don’t change my approach": 0,
        "Bid more and drag the team out of the doldrums": +1.5,
        "Have a Margarita and trust Crom or Baphomet to deliver glory": +1.5,
      };
      const mapDY: Record<string, number> = {
        "Defer to my partner and stop being aggressive": -1.0,
        "I don’t change my approach": 0,
        "Bid more and drag the team out of the doldrums": -0.5,
        "Have a Margarita and trust Crom or Baphomet to deliver glory": +1.0,
      };
      dx = mapDX[a] ?? 0;
      dy = mapDY[a] ?? 0;
      maxDx = 1.5;
      maxDy = 1.0;
      break;
    }
    case "Q6": {
      const v = typeof a === "number" ? a : 25;
      dx = 2 - ((v - 25) / (45 - 25)) * 4;
      maxDx = 2;
      break;
    }
    case "Q7": {
      const s = likertToScore(a);
      dy = s;
      maxDy = 2;
      break;
    }
    case "Q8": {
      const s = likertToScore(a);
      dx = -s;
      maxDx = 2;
      break;
    }
    case "Q9": {
      const s = likertToScore(a);
      dx = s;
      maxDx = 2;
      break;
    }
    case "Q10": {
      const s = likertToScore(a);
      dx = -s;
      maxDx = 2;
      break;
    }
    case "Q11": {
      const s = likertToScore(a);
      dx = s;
      maxDx = 2;
      break;
    }
    case "Q12": {
      const s = likertToScore(a);
      dx = s * 0.8;
      dy = s * 0.8;
      maxDx = 1.6;
      maxDy = 1.6;
      break;
    }
    case "Q13": {
      const s = likertToScore(a);
      dy = -s;
      maxDy = 2;
      break;
    }
    case "Q14": {
      const s = likertToScore(a);
      dy = s;
      maxDy = 2;
      break;
    }
    case "Q15": {
      const s = likertToScore(a);
      dy = -s;
      maxDy = 2;
      break;
    }
    case "Q16": {
      const s = likertToScore(a);
      dy = s;
      maxDy = 2;
      break;
    }
    case "Q17": {
      const s = likertToScore(a);
      dy = -s;
      maxDy = 2;
      break;
    }
    case "Q18": {
      const s = likertToScore(a);
      dy = s;
      maxDy = 2;
      break;
    }
    case "Q19": {
      const s = likertToScore(a);
      dx = -s * 0.5;
      dy = -s * 0.8;
      maxDx = 1;
      maxDy = 1.6;
      break;
    }
    case "Q20": {
      const s = likertToScore(a);
      dx = s * 0.8;
      dy = s * 0.3;
      maxDx = 1.6;
      maxDy = 0.6;
      break;
    }
    case "Q21": {
      const s = likertToScore(a);
      dx = s * 0.8;
      dy = -s * 0.3;
      maxDx = 1.6;
      maxDy = 0.6;
      break;
    }
    case "Q22": {
      const s = likertToScore(a);
      dx = s * 0.8;
      dy = s * 0.8;
      maxDx = 1.6;
      maxDy = 1.6;
      break;
    }
    case "Q23": {
      const s = likertToScore(a);
      dx = -s;
      maxDx = 2;
      break;
    }
    case "Q24": {
      const s = likertToScore(a);
      dy = s * 0.7;
      maxDy = 1.4;
      break;
    }
    case "Q25": {
      if (a === "Win with a safe, small hand") {
        dx = -2;
        dy = -1;
      } else if (a === "Lose spectacularly trying for something legendary") {
        dx = +2;
        dy = +1;
      }
      maxDx = 2;
      maxDy = 1;
      break;
    }
    default:
      break;
  }

  return { dx, dy, maxDx, maxDy };
}

function computeScores(questions: Question[], answers: Record<string, any>) {
  let x = 0,
    y = 0;
  let maxX = 0,
    maxY = 0;

  questions.forEach((q) => {
    const a = answers[q.id];
    const { dx, dy, maxDx, maxDy } = scoreQuestion(q, a);
    x += dx;
    y += dy;
    maxX += Math.abs(maxDx);
    maxY += Math.abs(maxDy);
  });

  const normX = maxX ? clamp((x / maxX) * 10, -10, 10) : 0;
  const normY = maxY ? clamp((y / maxY) * 10, -10, 10) : 0;
  const quadrant: Quadrant =
    normX >= 0 && normY >= 0
      ? "TR"
      : normX >= 0 && normY < 0
      ? "BR"
      : normX < 0 && normY >= 0
      ? "TL"
      : "BL";
  const persona: PersonaKey =
    quadrant === "TR" ? "Maverick" : quadrant === "BR" ? "Tactician" : quadrant === "TL" ? "Sage" : "Guardian";

  return { rawX: x, rawY: y, normX, normY, maxX, maxY, quadrant, persona, questions };
}

function buildResultPayload({
  respondent,
  answers,
  questions,
  scores,
}: {
  respondent: string;
  answers: Record<string, any>;
  questions: Question[];
  scores: ReturnType<typeof computeScores>;
}) {
  return {
    version: "clean-v1",
    timestamp: new Date().toISOString(),
    respondent,
    question_order: questions.map((q) => q.id),
    answers,
    scores, // organizer convenience only; not shown in-app
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/* =========================
   App
   ========================= */
export default function App() {
  const [phase, setPhase] = useState<"intro" | "quiz" | "handoff">("intro");
  const [name, setName] = useState("");
  const [questions] = useState<Question[]>(() => shuffle([...BANK]));
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);

  const q = questions[idx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {phase === "intro" && (
          <div className="rounded-2xl bg-white shadow p-6">
            <h1 className="text-2xl font-semibold mb-2">Pinochle Style Insights</h1>
            <p className="text-slate-600 mb-4">
              Answer 25 quick, scenario-based questions. At the end you’ll download a small file to share with your
              organizer. No results are shown here.
            </p>
            <label className="block text-sm text-slate-600 mb-2">Your name or alias (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dani, Ace of Nines"
              className="w-full border rounded-xl px-3 py-2 mb-4"
            />
            <button
              onClick={() => setPhase("quiz")}
              className="rounded-xl bg-slate-900 text-white px-4 py-2 shadow hover:bg-slate-800"
            >
              Start
            </button>
          </div>
        )}

        {phase === "quiz" && (
          <div className="rounded-2xl bg-white shadow p-6">
            <div className="text-sm text-slate-500 mb-2">
              Question {idx + 1} of {questions.length}
            </div>
            <div className="text-lg font-medium mb-4">{q.text}</div>
            <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
            <div className="mt-6 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Answered: {answeredCount}/{questions.length}
              </div>
              <button
                onClick={() => {
                  if (idx < questions.length - 1) setIdx(idx + 1);
                  else setPhase("handoff");
                }}
                disabled={answers[q.id] === undefined}
                className={
                  "rounded-xl px-4 py-2 text-white shadow " +
                  (answers[q.id] !== undefined ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-300 cursor-not-allowed")
                }
              >
                {idx < questions.length - 1 ? "Next" : "Finish"}
              </button>
            </div>
          </div>
        )}

        {phase === "handoff" && <Handoff name={name} questions={questions} answers={answers} />}
      </div>
    </div>
  );
}

/* =========================
   UI Pieces
   ========================= */
function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: any;
  onChange: (v: any) => void;
}) {
  if (q.type === "likert") {
    const opts = [
      { v: 1, label: "Strongly Disagree" },
      { v: 2, label: "Disagree" },
      { v: 3, label: "Neutral" },
      { v: 4, label: "Agree" },
      { v: 5, label: "Strongly Agree" },
    ];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={
              "px-2 py-2 rounded-xl border text-xs md:text-sm " +
              (value === o.v ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-100 border-slate-300")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (q.type === "multi") {
    return (
      <div className="flex flex-col gap-2">
        {q.options!.map((opt, i) => (
          <button
            key={i}
            onClick={() => onChange(opt)}
            className={
              "px-3 py-2 rounded-xl border text-sm text-left " +
              (value === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-100 border-slate-300")
            }
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // slider
  return (
    <div className="flex flex-col gap-2">
      <input
        type="range"
        min={(q as any).min}
        max={(q as any).max}
        value={value ?? (q as any).min}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
      <div className="text-sm">Selected: {value ?? (q as any).min}</div>
    </div>
  );
}

function Handoff({
  name,
  questions,
  answers,
}: {
  name: string;
  questions: Question[];
  answers: Record<string, any>;
}) {
  const respondent = name?.trim() || "anonymous";
  const scores = useMemo(() => computeScores(questions, answers), [questions, answers]);
  const jsonText = useMemo(
    () =>
      JSON.stringify(
        {
          version: "clean-v1",
          timestamp: new Date().toISOString(),
          respondent,
          question_order: questions.map((q) => q.id),
          answers,
          scores,
        },
        null,
        2
      ),
    [respondent, answers, questions, scores]
  );

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const autoTried = useRef(false);

  // Prepare a blob URL for the visible download link
  useEffect(() => {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [jsonText]);

  // Optional auto-download (gracefully ignored if the browser blocks it)
  useEffect(() => {
    if (autoTried.current || !blobUrl) return;
    autoTried.current = true;
    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `pinochle-result-${Date.now()}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      /* ignore; user can click button/link */
    }
  }, [blobUrl]);

  function manualDownload() {
    const blob = new Blob([jsonText], { type: "application/json" });
    triggerDownload(blob, `pinochle-result-${Date.now()}.json`);
  }

  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(jsonText);
      alert("Copied JSON to clipboard.");
    } catch {
      window.prompt("Copy the JSON below:", jsonText);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow p-6">
      <h2 className="text-2xl font-semibold mb-2">All set!</h2>
      <p className="text-slate-700">
        We generated your result file. Some browsers block auto-downloads in previews, so use the options below if
        needed.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={manualDownload}
          className="rounded-xl bg-slate-900 text-white px-4 py-2 shadow hover:bg-slate-800"
        >
          Download JSON
        </button>
        {blobUrl && (
          <a
            href={blobUrl}
            download={`pinochle-result-${Date.now()}.json`}
            className="rounded-xl bg-slate-200 text-slate-800 px-4 py-2 shadow hover:bg-slate-300"
          >
            Or click here if button is blocked
          </a>
        )}
        <button onClick={copyJSON} className="rounded-xl bg-white border px-4 py-2 shadow-sm">
          Copy JSON
        </button>
      </div>

      <details className="mt-4">
        <summary className="text-sm text-slate-600 cursor-pointer">Preview JSON</summary>
        <pre className="mt-2 text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-60">
          {jsonText}
        </pre>
      </details>

      <div className="text-sm text-slate-600 mt-4">
        Share the file with your organizer for a detailed evaluation. No results are shown here.
      </div>
    </div>
  );
}
