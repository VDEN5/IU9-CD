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
                        if (ch === '\n') { this.line++; this.col = 1; }
                        else { this.col++; }
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

class Parser {
    constructor(tokens, table, terminals = null) {
        this.tokens = tokens;
        this.table = table;
        this.terminals = terminals || new Set(['LCURLY', 'RCURLY', 'LT', 'GT', 'COLON', 'AT', 'COMMA', 'IDENT', 'STRING', 'EOF']);
        this.pos = 0;
        this.stack = [];
        this.root = null;
    }
    current() { return this.tokens[this.pos]; }
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
            if (this.terminals.has(topSym)) {
                if (topSym === tok.type) {
                    const consumed = this.consume(topSym);
                    const leaf = new Node(consumed.type, consumed.value);
                    leaf.line = consumed.line;
                    leaf.col = consumed.col;
                    topNode.children.push(leaf);
                } else {
                    throw new Error(`Syntax error at ${tok.line}:${tok.col} – expected ${topSym}, got ${tok.type}`);
                }
            } else {
                const prod = this.table[topSym]?.[tok.type];
                if (!prod) {
                    throw new Error(`No production for ${topSym} with token ${tok.type} at ${tok.line}:${tok.col}`);
                }
                const childrenNodes = [];
                for (let sym of prod) {
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

function toDot(node) {
    const lines = [];
    let counter = 0;
    const ids = new Map();
    const getId = (n) => {
        if (!ids.has(n)) ids.set(n, `n${counter++}`);
        return ids.get(n);
    };
    function dfs(n) {
        const id = getId(n);
        let label;
        if (n.value !== null && n.value !== undefined) {
            let raw = n.value;
            if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
            label = raw;
        } else if (n.name === 'ε') {
            label = 'ε';
        } else {
            label = n.name;
        }
        label = escapeDot(label);
        if (n.line !== undefined) label += ` (${n.line}, ${n.col})`;
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

if (require.main === module) {
    const args = process.argv.slice(2);
    let inputFile = args[0];
    let outputFile = args[1];
    let tableFile = 'table.js';
    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--table') tableFile = args[++i];
    }
    if (!inputFile || !outputFile) {
        console.error("Usage: node parser.js <input.txt> <output.dot> [--table <table.js>]");
        process.exit(1);
    }
    const inputText = fs.readFileSync(inputFile, 'utf8');
    try {
        const table = require('./' + tableFile);
        const lexer = new Lexer(inputText);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, table);
        const tree = parser.parse('Grammar');
        const dot = toDot(tree);
        fs.writeFileSync(outputFile, dot, 'utf8');
        console.log(`Success. DOT output written to ${outputFile}`);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

module.exports = { Lexer, Parser, Node, toDot };