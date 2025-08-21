// /static/js/puzzles/mate_bestmove_puzzles.js
// Curate your puzzles here. Add/remove freely.
//
// Shape:
// {
//   id: string,
//   title: string,
//   fen: string,
//   solutionUci: string[] // full PV in UCI, alternating sides
// }

export const PUZZLES = [
  // Mate in 2 - KR vs k
  {
    id: "cm-001",
    title: "KR vs k",
    fen: "8/8/8/4R3/8/4K3/8/5k2 w - - 0 1",
    solutionUci: ["e5g5", "f1e1", "g5g1"] //Checkmate
  },
  // Mate in 2 — KRR vs k
  {
    id: "cm-002",
    title: "KRR vs k",
    fen: "7k/8/1K6/1R6/1R5P/8/8/8 w - - 0 1",
    solutionUci: ["b4g4", "h8h7", "b5h5"] //Checkmate
  },
  // Mate in 1 - KRQ vs kp
  {
    id: "cm-003",
    title: "KRQ vs kp",
    fen: "1k6/p4Q2/8/8/8/8/K6R/8 w - - 0 1",
    solutionUci: ["h2h8"] //Checkmate
  },
  // Mate in 1 - KRBP vs krp
  {
    id: "cm-004",
    title: "KRBP vs krp",
    fen: "r7/6pk/8/6P1/4R3/3B2K1/8/8 w - - 0 1",
    solutionUci: ["e4e8"] //Checkmate
  },
  // Mate in 2 - KQN vs krpp
  {
    id: "cm-005",
    title: "KQN vs krpp",
    fen: "1r5k/6pp/7N/8/8/8/Q7/6K1 w - - 0 1",
    solutionUci: ["a2g8", "b8g8", "h6f7"] //Checkmate
  }
];
