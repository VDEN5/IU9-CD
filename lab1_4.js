const fs = require('fs');

const edges = [];

const whitespace = [' ', '\t', '\n'];
for (const ws of whitespace) {
    edges.push([0, ws, 1]);
    edges.push([1, ws, 1]);
}


for (let d = 0; d <= 9; d++) {
    const digit = d.toString();
    edges.push([0, digit, 3]);
    edges.push([3, digit, 3]);
}

const otherLetters = 'abcefghijklmnopqrsuvwxyz'.split('');
for (const letter of otherLetters) {
    edges.push([0, letter, 2]);
}

const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
for (const letter of allLetters) {
    edges.push([2, letter, 2]);
}
for (let d = 0; d <= 9; d++) {
    edges.push([2, d.toString(), 2]);
}

edges.push([0, 'd', 4]);
edges.push([4, 'e', 5]);
edges.push([5, 'f', 6]);
edges.push([6, 'i', 7]);
edges.push([7, 'n', 8]);
edges.push([8, 'e', 9]);

for (const letter of allLetters) {
    if (letter !== 'e') {
        edges.push([4, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([4, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'f') {
        edges.push([5, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([5, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'i') {
        edges.push([6, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([6, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'n') {
        edges.push([7, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([7, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'e') {
        edges.push([8, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([8, d.toString(), 2]);
}

for (const letter of allLetters) {
    edges.push([9, letter, 2]);
}
for (let d = 0; d <= 9; d++) {
    edges.push([9, d.toString(), 2]);
}

edges.push([0, 't', 10]);
edges.push([10, 'y', 11]);
edges.push([11, 'p', 12]);
edges.push([12, 'e', 13]);
edges.push([13, 'd', 14]);
edges.push([14, 'e', 15]);
edges.push([15, 'f', 16]);

for (const letter of allLetters) {
    if (letter !== 'y') {
        edges.push([10, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([10, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'p') {
        edges.push([11, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([11, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'e') {
        edges.push([12, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([12, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'd') {
        edges.push([13, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([13, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'e') {
        edges.push([14, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([14, d.toString(), 2]);
}

for (const letter of allLetters) {
    if (letter !== 'f') {
        edges.push([15, letter, 2]);
    }
}
for (let d = 0; d <= 9; d++) {
    edges.push([15, d.toString(), 2]);
}

for (const letter of allLetters) {
    edges.push([16, letter, 2]);
}
for (let d = 0; d <= 9; d++) {
    edges.push([16, d.toString(), 2]);
}

function addFinalTransitions() {
    const terminators = [...whitespace, '#', ';', '%'];
    
    for (let state of [4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]) {
        for (const term of terminators) {
            edges.push([state, term, 2]);
        }
    }
}
addFinalTransitions();

edges.push([0, '#', 17]);
edges.push([0, ';', 18]);

edges.push([0, '%', 19]);
edges.push([19, '\n', 19]);

const printableChars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

for (const ch of printableChars) {
    if (ch !== '%' && ch !== '\\') {
        edges.push([19, ch, 19]);
    }
}

edges.push([19, '\\', 20]);
edges.push([20, '\n', 19]);

for (const ch of printableChars) {
    edges.push([20, ch, 19]);
}

edges.push([19, '%', 21]);

const finals = {
    1: 'WS',
    2: 'IDENT',
    3: 'INT',
    4: 'IDENT',
    5: 'IDENT',
    6: 'IDENT',
    7: 'IDENT',
    8: 'IDENT',
    9: 'DEFINE',
    10: 'IDENT',
    11: 'IDENT',
    12: 'IDENT',
    13: 'IDENT',
    14: 'IDENT',
    15: 'IDENT',
    16: 'TYPEDEF',
    17: 'HASH',
    18: 'SEMICOLON',
    21: 'STRING',
};

function buildTransitions(edges) {
    const trans = {};
    for (const [from, char, to] of edges) {
        if (!trans[from]) trans[from] = {};
        trans[from][char] = to;
    }
    return trans;
}

class Position {
    constructor(line, column) {
        this.line = line;
        this.column = column;
    }
    
    toString() {
        return `${this.line}:${this.column}`;
    }
}

class Token {
    constructor(type, image, start, end) {
        this.type = type;
        this.image = image;
        this.start = start;
        this.end = end;
    }
    
    format() {
        return `${this.type} (${this.start.toString()}-${this.end.toString()}): ${this.image}`;
    }
}

class Lexer {
    constructor(edges, finals) {
        this.finals = finals;
        this.transitions = buildTransitions(edges);
    }
    
    getNextState(state, char) {
        const stateTrans = this.transitions[state];
        if (!stateTrans) return null;
        return stateTrans[char] !== undefined ? stateTrans[char] : null;
    }
    
    isFinal(state) {
        return this.finals[state] !== undefined;
    }
    
    tokenize(text) {
        const tokens = [];
        let state = 0;
        let lexeme = [];
        let line = 1;
        let column = 1;
        let startLine = 1;
        let startColumn = 1;
        let pos = 0;
        const errors = [];
        
        const startPos = () => new Position(startLine, startColumn);
        const currentPos = () => new Position(line, column);
        
        while (pos <= text.length) {
            if (pos === text.length) {
                if (lexeme.length > 0) {
                    if (this.isFinal(state)) {
                        const tokenClass = this.finals[state];
                        if (tokenClass !== 'WS') {
                            tokens.push(new Token(
                                tokenClass,
                                lexeme.join(''),
                                startPos(),
                                currentPos()
                            ));
                        }
                    } else {
                        errors.push(`incomplete token '${lexeme.join('')}' at ${startPos().toString()}`);
                    }
                }
                break;
            }
            
            const char = text[pos];
            const nextState = this.getNextState(state, char);
            
            if (nextState === null) {
                if (lexeme.length > 0 && this.isFinal(state)) {
                    const tokenClass = this.finals[state];
                    if (tokenClass !== 'WS') {
                        tokens.push(new Token(
                            tokenClass,
                            lexeme.join(''),
                            startPos(),
                            new Position(line, column)
                        ));
                    }
                    
                    state = 0;
                    lexeme = [];
                    startLine = line;
                    startColumn = column;
                } else {
                    if (lexeme.length > 0) {
                        errors.push(`unexpected symbol '${char}' after '${lexeme.join('')}' at ${currentPos().toString()}`);
                    } else {
                        errors.push(`unexpected symbol '${char}' at ${currentPos().toString()}`);
                    }
                    pos++;
                    if (char === '\n') {
                        line++;
                        column = 1;
                    } else {
                        column++;
                    }
                    startLine = line;
                    startColumn = column;
                    state = 0;
                    lexeme = [];
                }
            } else {
                lexeme.push(char);
                state = nextState;
                pos++;
                if (char === '\n') {
                    line++;
                    column = 1;
                } else {
                    column++;
                }
            }
        }
        
        tokens.push(new Token('EOF', '', new Position(line, column), new Position(line, column)));
        
        return { tokens, errors };
    }
}

function main() {
    const filename = process.argv[2];
    if (!filename) {
        console.error('Использование: node lexer.js <файл>');
        process.exit(1);
    }
    
    try {
        const text = fs.readFileSync(filename, 'utf8');
        const lexer = new Lexer(edges, finals);
        const result = lexer.tokenize(text);
        
        if (result.errors.length > 0) {
            console.log('ОШИБКИ:');
            result.errors.forEach(e => console.log('  ' + e));
            console.log();
        }
        
        console.log('ТОКЕНЫ:');
        for (const token of result.tokens) {
            if (token.type !== 'WS') {
                console.log(token.format());
            }
        }
    } catch (err) {
        console.error('Ошибка чтения файла:', err.message);
    }
}

main();