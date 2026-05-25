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