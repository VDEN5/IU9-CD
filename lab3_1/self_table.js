// Generated parsing table from self.txt
const TABLE = {
  "Grammar": {
    "IDENT": ["Axiom", "Rules"],
    "LCURLY": ["Axiom", "Rules"]
  },
  "Axiom": {
    "IDENT": ["NtList"],
    "LCURLY": ["NtList"]
  },
  "NtList": {
    "IDENT": ["NtItem", "NtListTail"],
    "LCURLY": ["NtItem", "NtListTail"]
  },
  "NtListTail": {
    "COMMA": ["COMMA", "NtItem", "NtListTail"],
    "LT": [],
    "EOF": []
  },
  "NtItem": {
    "IDENT": ["IDENT"],
    "LCURLY": ["LCURLY", "IDENT", "RCURLY"]
  },
  "Rules": {
    "LT": ["Rule", "Rules"],
    "EOF": []
  },
  "Rule": {
    "LT": ["LT", "IDENT", "COLON", "AltList", "GT"]
  },
  "AltList": {
    "AT": ["Alternative", "MoreAlts"],
    "IDENT": ["Alternative", "MoreAlts"],
    "STRING": ["Alternative", "MoreAlts"]
  },
  "MoreAlts": {
    "COLON": ["COLON", "Alternative", "MoreAlts"],
    "GT": []
  },
  "Alternative": {
    "IDENT": ["SymbolSeq"],
    "STRING": ["SymbolSeq"],
    "AT": ["AT"]
  },
  "SymbolSeq": {
    "IDENT": ["Symbol", "SymbolSeqRest"],
    "STRING": ["Symbol", "SymbolSeqRest"]
  },
  "SymbolSeqRest": {
    "IDENT": ["Symbol", "SymbolSeqRest"],
    "STRING": ["Symbol", "SymbolSeqRest"],
    "COLON": [],
    "GT": []
  },
  "Symbol": {
    "IDENT": ["IDENT"],
    "STRING": ["STRING"]
  }
};
module.exports = TABLE;