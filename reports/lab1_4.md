% Лабораторная работа № 1.4 «Лексический распознаватель»
% 18 марта 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является изучение использования детерминированных конечных автоматов с размеченными
заключительными состояниями (лексических распознавателей) для решения задачи лексического анализа.

# Индивидуальный вариант
define, typedef, #, ;, строковые литералы ограничены знаками %, допустимы escape-последовательности
вида `\x`, где x — любой символ, могут пересекать границы строк текста.

# Реализация

Лексическая структура языка — регулярные выражения для доменов:

Пробелы `` [ \t\n]+ ``
Идентификаторы `` [a-zA-Z][a-zA-Z0-9]* ``
Целочисленные литералы `` [0-9]+ ``
Ключевые слова `` define `` `` typedef ``
Знаки операций `` # `` `` ; ``
Строковые литералы `` %([^%\\]|\\.)*% ``

Граф детерминированного распознавателя:

![Граф детерминированного распознавателя](pics/1.png)

Реализация распознавателя:

Файл `main.js`:
```js
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

const printableChars = ' !"#$%&\'()*+,-./0123456789:;<=>
?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

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
                        errors.push(`unexpected symbol '${char}' after '${lexeme.join('')}'
at ${currentPos().toString()}`);
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
```

# Тестирование

Входные данные

```
define typedef # ;
define123 typedef456 hello
de define de123
ty typedef ty456
defi123 define456
type123 typedef123
123 456 %hello world%
define#
define!x  %!@#$^&*\%()_+{}":>?<%
def!ine
typ!edef
%unclosed
```

Вывод на `stdout`

```
ОШИБКИ:
' at 1:19ted symbol '
' at 2:27ted symbol '
' at 3:16ted symbol '
' at 4:17ted symbol '
' at 5:18ted symbol '
' at 6:19ted symbol '
' at 7:22ted symbol '
' at 8:8cted symbol '
  unexpected symbol '!' at 9:7
' at 9:31ted symbol '
  unexpected symbol '!' at 10:4
' at 10:8ted symbol '
  unexpected symbol '!' at 11:4
' at 11:9ted symbol '
  incomplete token '%unclosed' at 12:1

ТОКЕНЫ:
DEFINE (1:1-1:7): define
TYPEDEF (1:8-1:15): typedef
HASH (1:16-1:17): #
SEMICOLON (1:18-1:19): ;
IDENT (2:1-2:10): define123
IDENT (2:11-2:21): typedef456
IDENT (2:22-2:27): hello
IDENT (3:1-3:10): de define
IDENT (3:11-3:16): de123
IDENT (4:1-4:11): ty typedef
IDENT (4:12-4:17): ty456
IDENT (5:1-5:8): defi123
IDENT (5:9-5:18): define456
IDENT (6:1-6:8): type123
IDENT (6:9-6:19): typedef123
INT (7:1-7:4): 123
INT (7:5-7:8): 456
STRING (7:9-7:22): %hello world%
DEFINE (8:1-8:7): define
HASH (8:7-8:8): #
DEFINE (9:1-9:7): define
IDENT (9:8-9:9): x
STRING (9:11-9:31): %!@#$^&*()_+{}":>?<%
IDENT (10:1-10:4): def
IDENT (10:5-10:8): ine
IDENT (11:1-11:4): typ
IDENT (11:5-11:9): edef
EOF (12:10-12:10):

asus@LAPTOP-QBCCSRVP MINGW64 ~/IU9-TFL/lab1_4 (lab4)
$ node ./main.js input.txt
ОШИБКИ:
' at 1:19ted symbol '
' at 2:27ted symbol '
' at 3:16ted symbol '
' at 4:17ted symbol '
' at 5:18ted symbol '
' at 6:19ted symbol '
' at 7:22ted symbol '
' at 8:8cted symbol '
  unexpected symbol '!' at 9:7
' at 9:33ted symbol '
  unexpected symbol '!' at 10:4
' at 10:8ted symbol '
  unexpected symbol '!' at 11:4
' at 11:9ted symbol '
  incomplete token '%unclosed' at 12:1

ТОКЕНЫ:
DEFINE (1:1-1:7): define
TYPEDEF (1:8-1:15): typedef
HASH (1:16-1:17): #
SEMICOLON (1:18-1:19): ;
IDENT (2:1-2:10): define123
IDENT (2:11-2:21): typedef456
IDENT (2:22-2:27): hello
IDENT (3:1-3:10): de define
IDENT (3:11-3:16): de123
IDENT (4:1-4:11): ty typedef
IDENT (4:12-4:17): ty456
IDENT (5:1-5:8): defi123
IDENT (5:9-5:18): define456
IDENT (6:1-6:8): type123
IDENT (6:9-6:19): typedef123
INT (7:1-7:4): 123
INT (7:5-7:8): 456
STRING (7:9-7:22): %hello world%
DEFINE (8:1-8:7): define
HASH (8:7-8:8): #
DEFINE (9:1-9:7): define
IDENT (9:8-9:9): x
STRING (9:11-9:33): %!@#$^&*\%()_+{}":>?<%
IDENT (10:1-10:4): def
IDENT (10:5-10:8): ine
IDENT (11:1-11:4): typ
IDENT (11:5-11:9): edef
EOF (12:10-12:10):
```

# Вывод
Вспомнил, как строить ДКА, затем на его основе реализовал разбор с определением типа токена.