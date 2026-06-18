% Лабораторная работа № 3.1 «Самоприменимый генератор компиляторов
  на основе предсказывающего анализа»
% 6 мая 2026 г.
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

# Грамматика на входном языке

```
-- Грамматика входного языка генератора компиляторов, в нотации входного языка)))
{ Grammar }, Axiom, NtList, NtListTail, NtItem, Rules, Rule, AltList, MoreAlts, Alternative,
SymbolSeq, SymbolSeqRest, Symbol

< Grammar : Axiom Rules >
< Axiom : NtList >
< NtList : NtItem NtListTail >
< NtListTail : "," NtItem NtListTail : @ >
< NtItem : IDENT : "{" IDENT "}" >
< Rules : Rule Rules : @ >
< Rule : "<" IDENT ":" AltList ">" >
< AltList : Alternative MoreAlts >
< MoreAlts : ":" Alternative MoreAlts : @ >
< Alternative : SymbolSeq : "@" >
< SymbolSeq : Symbol SymbolSeqRest >
< SymbolSeqRest : Symbol SymbolSeqRest : @ >
< Symbol : IDENT : STRING >
```

# Реализация

## Генератор компиляторов

```js
const fs = require('fs');
const { Lexer, Parser } = require('./parser');

function unquote(s) {
    if (typeof s === 'string' && s.length >= 2 && s[0] === '"' && s[s.length-1] === '"')
        return s.slice(1, -1);
    return s;
}

function deepValue(node) {
    if (!node) return null;
    if (typeof node.value === 'string' && node.value !== '') return unquote(node.value);
    if (node.children) {
        for (let c of node.children) {
            let v = deepValue(c);
            if (v) return v;
        }
    }
    return null;
}

function termToTokenType(term) {
    const map = {
        '{': 'LCURLY',
        '}': 'RCURLY',
        '<': 'LT',
        '>': 'GT',
        ':': 'COLON',
        '@': 'AT',
        ',': 'COMMA',
        'IDENT': 'IDENT',
        'STRING': 'STRING',
        '$': 'EOF'
    };
    return map[term] || term;
}

function collectSymbols(symSeqNode) {
    const result = [];
    function gather(n) {
        if (n.name === 'IDENT' || n.name === 'STRING') {
            let val = deepValue(n);
            if (val) result.push(val);
        }
        if (n.children) for (let c of n.children) gather(c);
    }
    gather(symSeqNode);
    const uniq = [];
    for (let i = 0; i < result.length; i++) {
        if (i === 0 || result[i] !== result[i-1]) uniq.push(result[i]);
    }
    return uniq;
}

function extractGrammar(root) {
    let axiom = null;
    const rules = new Map();
    const positions = new Map();

    function traverse(node) {
        if (node.name === 'NtItem') {
            let hasLCURLY = false, identNode = null;
            for (let child of node.children) {
                if (child.name === 'LCURLY') hasLCURLY = true;
                if (child.name === 'IDENT') identNode = child;
            }
            if (hasLCURLY && identNode) {
                let name = deepValue(identNode);
                if (name) {
                    if (axiom !== null) throw new Error('More than one axiom');
                    axiom = name;
                    positions.set(axiom, identNode);
                    console.log(`Axiom: ${axiom}`);
                }
            }
        }
        if (node.name === 'Rule') {
            const lhsNode = node.children.find(c => c.name === 'IDENT');
            if (!lhsNode) return;
            const lhs = deepValue(lhsNode);
            if (!lhs) return;
            positions.set(lhs, lhsNode);
            console.log(`\nRule ${lhs}`);
            const altList = node.children.find(c => c.name === 'AltList');
            if (!altList) return;
            const alternatives = [];
            function processAlt(altNode) {
                if (altNode.name === 'Alternative') {
                    const symSeq = altNode.children.find(c => c.name === 'SymbolSeq');
                    const atNode = altNode.children.find(c => c.name === 'AT');
                    if (symSeq) {
                        const rhs = collectSymbols(symSeq);
                        alternatives.push(rhs);
                    } else if (atNode) {
                        alternatives.push([]);
                    }
                } else if (altNode.name === 'MoreAlts') {
                    const next = altNode.children.find(c => c.name === 'Alternative');
                    if (next) processAlt(next);
                    const more = altNode.children.find(c => c.name === 'MoreAlts');
                    if (more) processAlt(more);
                }
            }
            for (let child of altList.children) processAlt(child);
            rules.set(lhs, alternatives);
            const rhsStr = alternatives.map(a => a.length ? a.join(' ') : 'ε').join(' | ');
            console.log(`RESULT: ${lhs} -> ${rhsStr}\n`);
        }
        for (let child of node.children) traverse(child);
    }
    traverse(root);
    if (axiom === null) throw new Error('No axiom');
    return { axiom, rules, positions };
}

function isNonterm(s, rules) { return rules.has(s); }

function firstOfSeq(seq, first, rules) {
    if (seq.length === 0) return new Set(['ε']);
    const sym = seq[0];
    if (!isNonterm(sym, rules)) return new Set([sym]);
    const f = first.get(sym);
    if (!f.has('ε')) return new Set(f);
    const rest = firstOfSeq(seq.slice(1), first, rules);
    const res = new Set([...f].filter(x => x !== 'ε'));
    for (const x of rest) res.add(x);
    return res;
}

function computeFirst(rules) {
    const first = new Map();
    for (const lhs of rules.keys()) first.set(lhs, new Set());
    let changed;
    do {
        changed = false;
        for (const [lhs, alts] of rules.entries()) {
            const oldSize = first.get(lhs).size;
            for (const rhs of alts) {
                const f = firstOfSeq(rhs, first, rules);
                for (const sym of f) first.get(lhs).add(sym);
            }
            if (first.get(lhs).size !== oldSize) changed = true;
        }
    } while (changed);
    return first;
}

function computeFollow(axiom, rules, first) {
    const follow = new Map();
    for (const lhs of rules.keys()) follow.set(lhs, new Set());
    follow.set(axiom, new Set(['$']));
    let changed;
    do {
        changed = false;
        for (const [lhs, alts] of rules.entries()) {
            for (const rhs of alts) {
                for (let i = 0; i < rhs.length; i++) {
                    const B = rhs[i];
                    if (!isNonterm(B, rules)) continue;
                    const beta = rhs.slice(i+1);
                    const firstBeta = firstOfSeq(beta, first, rules);
                    for (const sym of firstBeta) {
                        if (sym !== 'ε' && !follow.get(B).has(sym)) {
                            follow.get(B).add(sym);
                            changed = true;
                        }
                    }
                    if (firstBeta.has('ε') || beta.length === 0) {
                        for (const sym of follow.get(lhs)) {
                            if (!follow.get(B).has(sym)) {
                                follow.get(B).add(sym);
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
    } while (changed);
    return follow;
}

function checkUndefined(rules) {
    const all = new Set(rules.keys());
    for (const [lhs, alts] of rules.entries()) {
        for (const rhs of alts) {
            for (const sym of rhs) {
                if (isNonterm(sym, rules) && !all.has(sym))
                    throw new Error(`Undefined nonterminal: ${sym}`);
            }
        }
    }
}

function buildTable(rules, first, follow, axiom, positions) {
    const table = new Map();
    for (const lhs of rules.keys()) table.set(lhs, new Map());
    for (const [lhs, alts] of rules.entries()) {
        for (const rhs of alts) {
            const fset = firstOfSeq(rhs, first, rules);
            for (const term of fset) {
                if (term === 'ε') continue;
                const tokenType = termToTokenType(term);
                if (table.get(lhs).has(tokenType)) {
                    const pos = positions.get(lhs);
                    throw new Error(`LL(1) conflict at ${lhs} on ${tokenType} (${pos?.line}:${pos?.col})`);
                }
                table.get(lhs).set(tokenType, rhs);
            }
            if (fset.has('ε')) {
                for (const term of follow.get(lhs)) {
                    const tokenType = termToTokenType(term);
                    if (table.get(lhs).has(tokenType)) {
                        const pos = positions.get(lhs);
       throw new Error(`LL(1) epsilon conflict at ${lhs} on ${tokenType} (${pos?.line}:${pos?.col})`);
                    }
                    table.get(lhs).set(tokenType, rhs);
                }
            }
        }
    }
    return table;
}

function generateTableCode(table, rules) {
    const obj = {};
    for (const [lhs, row] of table.entries()) {
        obj[lhs] = {};
        for (const [term, rhs] of row.entries()) {
            const rhsArr = rhs.map(sym => {
                if (isNonterm(sym, rules)) return sym;
                else return termToTokenType(sym);
            });
            obj[lhs][term] = rhsArr;
        }
    }
return `// Generated parsing table\nconst TABLE = ${JSON.stringify(obj, null, 2)};\nmodule.exports = TABLE;`;
}

function main() {
    const args = process.argv.slice(2);
    let grammarFile = null;
    let tableFile = 'table.js';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--table') {
            tableFile = args[++i];
        } else if (!grammarFile) {
            grammarFile = args[i];
        }
    }
    if (!grammarFile) {
        console.error('Usage: node generator.js <grammar.txt> [--table <input_table.js>]');
        process.exit(1);
    }

    let inputTable;
    try {
        inputTable = require('./' + tableFile);
        console.log(`Using table from ${tableFile}`);
    } catch (e) {
        console.error(`Cannot load table from ${tableFile}`);
        process.exit(1);
    }

    const src = fs.readFileSync(grammarFile, 'utf8');
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, inputTable);
    const tree = parser.parse('Grammar');
    const { axiom, rules, positions } = extractGrammar(tree);
    console.log(`\nAxiom confirmed: ${axiom}`);
    checkUndefined(rules);
    const first = computeFirst(rules);
    const follow = computeFollow(axiom, rules, first);
    const table = buildTable(rules, first, follow, axiom, positions);
    const code = generateTableCode(table, rules);
    fs.writeFileSync('table.js', code, 'utf8');
    console.log('Table written to table.js');
}

if (require.main === module) main();
```

## Калькулятор

```js
const { Parser } = require('./parser');
const rawTable = require('./table.js');   

const TABLE = JSON.parse(JSON.stringify(rawTable).replace(/"\$"/g, '"EOF"'));
const TERMINALS = new Set(['n', '+', '*', '(', ')', 'EOF']);

class CalcLexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
    }
    tokenize() {
        const tokens = [];
        while (this.pos < this.input.length) {
            let ch = this.input[this.pos];
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
                if (ch === '\n') { this.line++; this.col = 1; } else { this.col++; }
                this.pos++;
                continue;
            }
            if (ch === '+') {
                tokens.push({ type: '+', value: '+', line: this.line, col: this.col });
                this.pos++; this.col++;
            } else if (ch === '*') {
                tokens.push({ type: '*', value: '*', line: this.line, col: this.col });
                this.pos++; this.col++;
            } else if (ch === '(') {
                tokens.push({ type: '(', value: '(', line: this.line, col: this.col });
                this.pos++; this.col++;
            } else if (ch === ')') {
                tokens.push({ type: ')', value: ')', line: this.line, col: this.col });
                this.pos++; this.col++;
            } else if (ch >= '0' && ch <= '9') {
                let val = '';
                const startCol = this.col;
    while (this.pos < this.input.length && this.input[this.pos] >= '0' && this.input[this.pos] <= '9') {
                    val += this.input[this.pos];
                    this.pos++;
                    this.col++;
                }
                tokens.push({ type: 'n', value: val, line: this.line, col: startCol });
            } else {
                throw new Error(`Unexpected character '${ch}' at ${this.line}:${this.col}`);
            }
        }
        tokens.push({ type: 'EOF', value: '$', line: this.line, col: this.col });
        return tokens;
    }
}

function getNumber(node) {
    if (node.value !== undefined && node.value !== null && !isNaN(parseInt(node.value))) {
        return parseInt(node.value, 10);
    }
    if (node.children) {
        for (const child of node.children) {
            const num = getNumber(child);
            if (!isNaN(num)) return num;
        }
    }
    return NaN;
}

function evaluate(node) {
    if (node.name === 'n') {
        const num = getNumber(node);
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
    }
    if (node.name === 'E') {
        const t = node.children.find(c => c.name === 'T');
        const ePrime = node.children.find(c => c.name === "E'");
        const left = evaluate(t);
        return evalEPrime(ePrime, left);
    }
    if (node.name === "E'") {
        const nonEps = node.children.filter(c => c.name !== 'ε');
        if (nonEps.length === 0) return 0;
        const tVal = evaluate(nonEps[1]);
        return tVal + evalEPrime(nonEps[2], 0);
    }
    if (node.name === 'T') {
        const f = node.children.find(c => c.name === 'F');
        const tPrime = node.children.find(c => c.name === "T'");
        const left = evaluate(f);
        return evalTPrime(tPrime, left);
    }
    if (node.name === "T'") {
        const nonEps = node.children.filter(c => c.name !== 'ε');
        if (nonEps.length === 0) return 0;
        const fVal = evaluate(nonEps[1]);
        return fVal * evalTPrime(nonEps[2], 1);
    }
    if (node.name === 'F') {
        const nNode = node.children.find(c => c.name === 'n');
        if (nNode) return evaluate(nNode);
        const eNode = node.children.find(c => c.name === 'E');
        if (eNode) return evaluate(eNode);
        throw new Error('Invalid F');
    }
    throw new Error(`Unknown node: ${node.name}`);
}

function evalEPrime(node, acc) {
    const nonEps = node.children.filter(c => c.name !== 'ε');
    if (nonEps.length === 0) return acc;
    const tVal = evaluate(nonEps[1]);
    const newAcc = acc + tVal;
    return evalEPrime(nonEps[2], newAcc);
}

function evalTPrime(node, acc) {
    const nonEps = node.children.filter(c => c.name !== 'ε');
    if (nonEps.length === 0) return acc;
    const fVal = evaluate(nonEps[1]);
    const newAcc = acc * fVal;
    return evalTPrime(nonEps[2], newAcc);
}

function main() {
    const expr = process.argv[2] || '(2+3)*4';
    const lexer = new CalcLexer(expr);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, TABLE, TERMINALS);
    const tree = parser.parse('E');
    const result = evaluate(tree);
    console.log(`Result: ${result}`);
}

if (require.main === module) main();
```

# Тестирование

## Генератор компиляторов

Таблица для калькулятора

```js
const TABLE = {
  "E": {
    "n": ["T", "E'"],
    "(": ["T", "E'"]
  },
  "E'": {
    "+": ["+", "T", "E'"],
    "EOF": [],
    ")": []
  },
  "T": {
    "n": ["F", "T'"],
    "(": ["F", "T'"]
  },
  "T'": {
    "*": ["*", "F", "T'"],
    "+": [],
    "EOF": [],
    ")": []
  },
  "F": {
    "n": ["n"],
    "(": ["(", "E", ")"]
  }
};
```

Таблица для собственной грамматики

```js
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
```

## Калькулятор

```
Result: 20
```

# Вывод
Научился строить таблицы предсказывающего анализатора не прямо вручную, а уже через алгоритм.
Далее полученные результаты были протестированы при создании программы-калькулятора.