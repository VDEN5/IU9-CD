// Generated parsing table
const TABLE = {
  "E": {
    "n": [
      "T",
      "E'"
    ],
    "(": [
      "T",
      "E'"
    ]
  },
  "E'": {
    "+": [
      "+",
      "T",
      "E'"
    ],
    "EOF": [],
    ")": []
  },
  "T": {
    "n": [
      "F",
      "T'"
    ],
    "(": [
      "F",
      "T'"
    ]
  },
  "T'": {
    "*": [
      "*",
      "F",
      "T'"
    ],
    "+": [],
    "EOF": [],
    ")": []
  },
  "F": {
    "n": [
      "n"
    ],
    "(": [
      "(",
      "E",
      ")"
    ]
  }
};
module.exports = TABLE;