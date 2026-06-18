% Лабораторная работа № 2.3 «Синтаксический анализатор на основе
  предсказывающего анализа»
% 15 апреля 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является изучение алгоритма построения таблиц предсказывающего анализатора.

# Индивидуальный вариант
```
-- аксиома заключена
-- в фигурные скобки
T, T', { E }, E', F
< E  : T E' >
< E' : "+" T E' : @ >
< T  : F T' >
< T' : "*" F T' : @ >
< F  : "n" : "(" E ")" >
```

# Реализация

## Неформальное описание синтаксиса входного языка

Входной язык предназначен для описания контекстно-свободных грамматик.
Грамматика состоит из объявления списка нетерминалов (аксиомы) и последовательности правил.

Список нетерминалов записывается в виде последовательности идентификаторов, разделённых запятыми.
Стартовый нетерминал (аксиома) заключается в фигурные скобки. Пример: `T, T', { E }, E', F`

Каждое правило имеет вид: `< Имя : Альтернатива1 : Альтернатива2 : ... >`

Символ `@` обозначает пустую цепочку (ε).

Терминальные символы заключаются в двойные кавычки, например `"n"`, `"+"`, `"("`.

Нетерминалы — идентификаторы, состоящие из букв, цифр и апострофа, начинающиеся с буквы.

Комментарии начинаются с `--` и продолжаются до конца строки.

Пробельные символы (пробелы, табуляции, переводы строк) игнорируются.

## Лексическая структура

| Токен | Обозначение | Регулярное выражение |
|-------|-------------|----------------------|
| `LCURLY` | `{` | `\{` |
| `RCURLY` | `}` | `\}` |
| `LT` | `<` | `<` |
| `GT` | `>` | `>` |
| `COLON` | `:` | `:` |
| `AT` | `@` | `@` |
| `COMMA` | `,` | `,` |
| `IDENT` | идентификатор | `[A-Za-z][A-Za-z0-9']*` |
| `STRING` | строка | `"[^"]*"` |
| `COMMENT` | комментарий | `--[^\n]*` (пропускается) |
| `WS` | пробелы | `[ \t\n\r]+` (пропускается) |

## Грамматика языка

```
Grammar → Axiom Rules
Axiom → NtList
NtList → NtItem NtListTail
NtListTail → COMMA NtItem NtListTail | ε
NtItem → IDENT | LCURLY IDENT RCURLY
Rules → Rule Rules | ε
Rule → LT IDENT COLON AltList GT
AltList → Alternative MoreAlts
MoreAlts → COLON Alternative MoreAlts | ε
Alternative → SymbolSeq | AT
SymbolSeq → Symbol SymbolSeqRest
SymbolSeqRest → Symbol SymbolSeqRest | ε
Symbol → IDENT | STRING
```

## Программная реализация

```js
const fs = require('fs');

class Token {
    constructor(type, value, line, col, endLine, endCol) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
        this.endLine = endLine;
        this.endCol = endCol;
    }
}

class Lexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
    }

    tokenize() {
        //правила распознавания
        const tokenSpec = [
            { regex: /^--[^\n]*/, type: 'COMMENT', skip: true },
            { regex: /^[ \t\n\r]+/, type: 'WS', skip: true },
            { regex: /^{/, type: 'LCURLY' },
            { regex: /^}/, type: 'RCURLY' },
            { regex: /^</, type: 'LT' },
            { regex: /^>/, type: 'GT' },
            { regex: /^:/, type: 'COLON' },
            { regex: /^@/, type: 'AT' },
            { regex: /^,/, type: 'COMMA' },
            { regex: /^[A-Za-z][A-Za-z0-9']*/, type: 'IDENT' },
            { regex: /^"[^"]*"/, type: 'STRING' }
        ];
        //перебор правил и попытка подбора
        while (this.pos < this.input.length) {
            let matched = false;
            for (let spec of tokenSpec) {
                const re = new RegExp(spec.regex);
                const match = re.exec(this.input.slice(this.pos));
                if (match && match.index === 0) {
                    const value = match[0];
                    const startLine = this.line;
                    const startCol = this.col;
                    for (let ch of value) {
                        if (ch === '\n') {
                            this.line++;
                            this.col = 1;
                        } else {
                            this.col++;
                        }
                    }
                    this.pos += value.length;
                    if (!spec.skip) {
  this.tokens.push(new Token(spec.type, value, startLine, startCol, this.line, this.col - 1));
                    }
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                throw new Error(`Unexpected character at line ${this.line}, column ${this.col}`);
            }
        }
        this.tokens.push(new Token('EOF', '$', this.line, this.col, this.line, this.col));
        return this.tokens;
    }
}

class Node {
    constructor(name, value = null) {
        this.id = 'n' + Math.random().toString(36).substr(2, 16);
        this.name = name;
        this.value = value;
        this.children = [];
    }
}

const TABLE = {
    'Grammar': { 'IDENT': ['Axiom', 'Rules'] },
    'Axiom': { 'IDENT': ['NtList'] },
    'NtList': { 'IDENT': ['NtItem', 'NtListTail'], 'LCURLY': ['NtItem', 'NtListTail'] },
    'NtListTail': { 'COMMA': ['COMMA', 'NtItem', 'NtListTail'], 'LT': [], 'EOF': [], 'RCURLY': [] },
    'NtItem': { 'IDENT': ['IDENT'], 'LCURLY': ['LCURLY', 'IDENT', 'RCURLY'] },
    'Rules': { 'LT': ['Rule', 'Rules'], 'EOF': [] },
    'Rule': { 'LT': ['LT', 'IDENT', 'COLON', 'AltList', 'GT'] },
    'AltList': {
        'AT': ['Alternative', 'MoreAlts'],
        'IDENT': ['Alternative', 'MoreAlts'],
        'STRING': ['Alternative', 'MoreAlts'],
        'COLON': ['Alternative', 'MoreAlts'],
        'GT': ['Alternative', 'MoreAlts'],
        'EOF': ['Alternative', 'MoreAlts']
    },
    'MoreAlts': { 'COLON': ['COLON', 'Alternative', 'MoreAlts'], 'GT': [], 'EOF': [] },
    'Alternative': { 'AT': ['AT'], 'IDENT': ['SymbolSeq'], 'STRING': ['SymbolSeq'] },
    'SymbolSeq': { 'IDENT': ['Symbol', 'SymbolSeqRest'], 'STRING': ['Symbol', 'SymbolSeqRest'] },
    'SymbolSeqRest': {
        'IDENT': ['Symbol', 'SymbolSeqRest'],
        'STRING': ['Symbol', 'SymbolSeqRest'],
        'GT': [], 'COLON': [], 'EOF': []
    },
    'Symbol': { 'IDENT': ['IDENT'], 'STRING': ['STRING'] }
};

const TERMINALS = new Set(['LCURLY', 'RCURLY', 'LT', 'GT', 'COLON', 'AT','COMMA','IDENT','STRING','EOF']);

class Parser {
    constructor(tokens, table, terminals) {
        this.tokens = tokens;
        this.table = table;
        this.terminals = terminals;
        this.pos = 0;
        this.stack = [];
        this.root = null;
    }
    current() { return this.tokens[this.pos]; }
    //текущий уже без сдвига позиции
    consume(expected) {
        const tok = this.current();
        if (tok.type === expected) {
            this.pos++;
            return tok;
        }
        throw new Error(`Expected ${expected}, got ${tok.type} at ${tok.line}:${tok.col}`);
    }
    parse(start) {
        this.root = new Node(start);
        this.stack = [[start, this.root]];
        while (this.stack.length) {
            const [topSym, topNode] = this.stack.pop();
            const tok = this.current();
            if (this.terminals.has(topSym)) {//для терминалов
                if (topSym === tok.type) {//если тип совпал,, то съедаем токен, иначе выкинуть ошибку
                    const consumed = this.consume(topSym);
                    const leaf = new Node(consumed.type, consumed.value);
                    leaf.line = consumed.line;
                    leaf.col = consumed.col;
                    topNode.children.push(leaf);
                } else {
         throw new Error(`Syntax error at ${tok.line}:${tok.col} – expected ${topSym}, got ${tok.type}`);
                }
            } else {//для нетерминалов
                const prod = this.table[topSym]?.[tok.type];
                if (!prod) {
           throw new Error(`No production for ${topSym} with token ${tok.type} at ${tok.line}:${tok.col}`);
                }
                const childrenNodes = [];
                for (let sym of prod) {//для каждого символа правой части создаем дочерний узел
                    const childNode = new Node(sym);
                    topNode.children.push(childNode);
                    childrenNodes.unshift([sym, childNode]);
                }
                for (let item of childrenNodes) this.stack.push(item);
                if (prod.length === 0) {
                    topNode.children.push(new Node('ε'));
                }
            }
        }
        if (this.current().type !== 'EOF') throw new Error(`Extra tokens after parsing`);
        return this.root;
    }
}

function escapeDot(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
//вывод на графвиз
function toDot(node) {
    const lines = [];
    let counter = 0;
    const ids = new Map();
    const getId = (n) => {
        if (!ids.has(n)) ids.set(n, `n${counter++}`);
        return ids.get(n);
    };
    function dfs(n) {//проход по узлам
        const id = getId(n);
        let label;
        if (n.value !== null && n.value !== undefined) {
            let raw = n.value;
            if (raw.startsWith('"') && raw.endsWith('"')) {
                raw = raw.slice(1, -1);
            }
            label = raw;
        } else if (n.name === 'ε') {
            label = 'ε';
        } else {
            label = n.name;
        }
        label = escapeDot(label);
        if (n.line !== undefined) {
            label += " (" + n.line + ", " + n.col + ")";
        }
        lines.push(`${id} [label="${label}"]`);
        for (let i = 0; i < n.children.length; i++) {
            const child = n.children[i];
            const cid = getId(child);
            lines.push(`${id} -> ${cid}`);
            dfs(child);
        }
        if (n.children.length > 1) {
            for (let i = 0; i < n.children.length - 1; i++) {
                lines.push(`${getId(n.children[i])} -> ${getId(n.children[i+1])} [style=invis]`);
            }
            lines.push(`{ rank=same; ${n.children.map(c => getId(c)).join(' -> ')} [style=invis] }`);
        }
    }
    dfs(node);
    return `digraph {\n${lines.join('\n')}\n}`;
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];
if (!inputFile || !outputFile) {
    console.error("Usage: node parser.js <input.txt> <output.dot>");
    process.exit(1);
}
const inputText = fs.readFileSync(inputFile, 'utf8');
try {
    const lexer = new Lexer(inputText);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, TABLE, TERMINALS);
    const tree = parser.parse('Grammar');
    const dot = toDot(tree);
    fs.writeFileSync(outputFile, dot, 'utf8');
    console.log(`Success. DOT output written to ${outputFile}`);
} catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
}
```

# Тестирование

Входные данные

```
-- аксиома заключена
-- в фигурные скобки
T, T', { E }, E', F
< E  : T E' >
< E' : "+" T E' : @ >
< T  : F T' >
< T' : "*" F T' : @ >
< F  : "n" : "(" E ")" >
```

Вывод на `stdout`

```
digraph {
n0 [label="Grammar"]
n0 -> n1
n1 [label="Axiom"]
n1 -> n2
n2 [label="NtList"]
n2 -> n3
n3 [label="NtItem"]
n3 -> n4
n4 [label="IDENT"]
n4 -> n5
n5 [label="T (3, 1)"]
n2 -> n6
n6 [label="NtListTail"]
n6 -> n7
n7 [label="COMMA"]
n7 -> n8
n8 [label=", (3, 2)"]
n6 -> n9
n9 [label="NtItem"]
n9 -> n10
n10 [label="IDENT"]
n10 -> n11
n11 [label="T' (3, 4)"]
n6 -> n12
n12 [label="NtListTail"]
n12 -> n13
n13 [label="COMMA"]
n13 -> n14
n14 [label=", (3, 6)"]
n12 -> n15
n15 [label="NtItem"]
n15 -> n16
n16 [label="LCURLY"]
n16 -> n17
n17 [label="{ (3, 8)"]
n15 -> n18
n18 [label="IDENT"]
n18 -> n19
n19 [label="E (3, 10)"]
...
```

Результат:

![Результат](pics/1504.png)

# Вывод
Научился строить таблицы предсказывающего анализатора.