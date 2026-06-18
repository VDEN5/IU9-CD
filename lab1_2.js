const fs = require('fs');

const DomainType = {
  VAR_IDENT: 'VAR_IDENT',
  FUNC_IDENT: 'FUNC_IDENT',
  KEYWORD: 'KEYWORD',
  OPERATOR: 'OPERATOR',
  NUMBER: 'NUMBER',
  WS: 'WS',
  COMMENT: 'COM',
  SYMBOL: 'SYM'
};

const DomainRules = [
  { pattern: /^sub\b/, type: DomainType.KEYWORD },
  { pattern: /^if\b/, type: DomainType.KEYWORD },
  { pattern: /^unless\b/, type: DomainType.KEYWORD },
  { pattern: /^\#[^\n]*/, type: DomainType.COMMENT },
  { pattern: /^\+/, type: DomainType.OPERATOR },
  { pattern: /^\./, type: DomainType.OPERATOR },
  { pattern: /^[+-]?\d+,\d+/, type: DomainType.NUMBER },
  { pattern: /^[$@%][\p{L}\p{N}]+/u, type: DomainType.VAR_IDENT },
  { pattern: /^[\p{L}][\p{L}\p{N}]*/u, type: DomainType.FUNC_IDENT },
  { pattern: /^\s+/, type: DomainType.WS },
  { pattern: /^./s, type: DomainType.SYMBOL }
];

class LexerError extends Error {
  constructor(line, column) {
    super(`syntax error (${line},${column})`);
    this.line = line;
    this.column = column;
  }
}

class Lexer {
  constructor(text) {
    this.text = text;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
  }

  nextToken() {
    if (this.pos >= this.text.length) return null;

    const remainingText = this.text.slice(this.pos);
    let bestMatch = null;
    let bestType = null;
    let bestLength = -1;

    for (const { pattern, type } of DomainRules) {
      const match = remainingText.match(pattern);
      if (match) {
        const length = match[0].length;
        if (length > bestLength) {
          bestLength = length;
          bestMatch = match[0];
          bestType = type;
        }
      }
    }

    if (!bestMatch) {
      const errLine = this.line;
      const errColumn = this.column;
      this.pos++;
      this.column++;
      throw new LexerError(errLine, errColumn);
    }

    const tokenLine = this.line;
    const tokenColumn = this.column;

    for (let i = 0; i < bestMatch.length; i++) {
      if (bestMatch[i] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    this.pos += bestMatch.length;

    return {
      type: bestType,
      text: bestMatch,
      line: tokenLine,
      column: tokenColumn
    };
  }

  getAllTokens() {
    const tokens = [];
    while (true) {
      try {
        const token = this.nextToken();
        if (!token) break;
        tokens.push(token);
      } catch (e) {
        if (e instanceof LexerError) {
          console.error(`syntax error (${e.line},${e.column})`);
          continue;
        }
        throw e;
      }
    }
    return tokens;
  }
}

function main() {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('Использование: node main.js <файл>');
    process.exit(1);
  }

  try {
    const text = fs.readFileSync(filename, 'utf8');
    const lexer = new Lexer(text);
    
    while (true) {
      try {
        const token = lexer.nextToken();
        if (!token) break;
        
        if (token.type !== 'WS') {
          console.log(`${token.type} (${token.line},${token.column}): ${token.text}`);
        }
      } catch (e) {
        if (e instanceof LexerError) {
          console.error(`syntax error (${e.line},${e.column})`);
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    console.error(`Ошибка чтения файла: ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  DomainType,
  DomainRules,
  Lexer,
  LexerError
};
