% Лабораторная работа № 1.3 «Объектно-ориентированный
  лексический анализатор»
% 11 марта 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является приобретение навыка реализации лексического анализатора на
объектно-ориентированном языке без применения каких-либо средств автоматизации решения задачи
лексического анализа.

# Индивидуальный вариант
Комментарии: начинаются с «//» и продолжаются до окончания строки текста.
Идентификаторы: любой текст, не содержащий «/» и ограниченный символами «/».
Ключевые слова: «/while/», «/do/», «/end/».

## Лексический домен для защиты
Числовые литералы вида /123134/

# Реализация

## Файл `Main.js`
```js
const readline = require('readline');

class Position {
    constructor(line = 1, pos = 1) {
        this.line = line;
        this.pos = pos;
    }
    
    next(char) {
        if (char === '\n') {
            return new Position(this.line + 1, 1);
        }
        return new Position(this.line, this.pos + 1);
    }
    
    toString() { return `(${this.line},${this.pos})`; }
}

class Fragment {
    constructor(starting, following) {
        this.starting = starting;
        this.following = following;
    }
    toString() { return `${this.starting}-${this.following}`; }
}

class Message {
    constructor(isError, position, text) {
        this.isError = isError;
        this.position = position;
        this.text = text;
    }
}

const DomainTag = {
    IDENT: 1,
    KEYWORD_WHILE: 2,
    KEYWORD_DO: 3,
    KEYWORD_END: 4,
    NEWDOM: 5,   
    END_OF_PROGRAM: 6
};

class Token {
    constructor(tag, starting, following) {
        this.tag = tag;
        this.coords = new Fragment(starting, following);
    }
}

class IdentToken extends Token {
    constructor(code, starting, following) {
        super(DomainTag.IDENT, starting, following);
        this.code = code;
    }
    toString() { return `IDENT ${this.coords}: ${this.code}`; }
}

class KeywordToken extends Token {
    constructor(tag, starting, following) {
        super(tag, starting, following);
    }
    toString() {
        const names = ['', '', 'WHILE', 'DO', 'END'];
        return `${names[this.tag]} ${this.coords}:`;
    }
}


class NewDomToken extends Token {
    constructor(value, starting, following) {
        super(DomainTag.NEWDOM, starting, following);
        this.value = value;
    }
    toString() { return `NEWDOM ${this.coords}: ${this.value}`; }
}


class EofToken extends Token {
    constructor(starting, following) {
        super(DomainTag.END_OF_PROGRAM, starting, following);
    }
    toString() { return `END_OF_PROGRAM ${this.coords}:`; }
}

class Comment {
    constructor(coords) { this.coords = coords; }
}

class Compiler {
    constructor() {
        this.messages = [];
        this.nameCodes = new Map();
        this.names = [];
        this.comments = [];
    }
    
    addName(name) {
        if (!this.nameCodes.has(name)) {
            this.nameCodes.set(name, this.names.length);
            this.names.push(name);
        }
        return this.nameCodes.get(name);
    }
    
    addMessage(isError, position, text) {
        this.messages.push(new Message(isError, position, text));
    }
}

class Scanner {
    constructor() {
        this.compiler = new Compiler();
        this.pos = new Position(1, 1);
        this.tokenStart = this.pos;
        this.buffer = [];
        this.eof = false;
        this.lineBuffer = [];
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });
        
        this.rl.on('line', (line) => {
            this.lineBuffer.push(line + '\n');
        });
        
        this.rl.on('close', () => {
            this.eof = true;
        });
    }
    
    async _nextChar() {
        if (this.buffer.length > 0) {
            return this.buffer.shift();
        }
        
        if (this.lineBuffer.length === 0) {
            if (this.eof) return null;
            await new Promise(resolve => setTimeout(resolve, 10));
            return this._nextChar();
        }
        
        const line = this.lineBuffer[0];
        if (line.length === 0) {
            this.lineBuffer.shift();
            return '\n';
        }
        
        const char = line[0];
        this.lineBuffer[0] = line.slice(1);
        return char;
    }
    
    _pushBack(c) {
        if (c !== null) {
            this.buffer.unshift(c);
        }
    }
    
    _isKeyword(word) {
        return word === 'while' || word === 'do' || word === 'end';
    }
    
    _isIdentBoundary(c) {
        return c === '/';
    }
    
    /*
    _isNewDomStart(c) {
        return c == "/" && (next =="1" ;
    }
    */
    
    _isCommentStart(c, next) {
        return c === '/' && next === '/';
    }
    
    async _skipWhiteSpace() {
        while (true) {
            const c = await this._nextChar();
            if (c === null) {
                this.eof = true;
                return null;
            }
            this.pos = this.pos.next(c);
            if (!/\s/.test(c)) {
                this.tokenStart = this.pos;
                return c;
            }
            this.tokenStart = this.pos;
        }
    }
    
    async _handleComment() {
        const start = this.pos;
        while (true) {
            const c = await this._nextChar();
            if (c === null) break;
            this.pos = this.pos.next(c);
            if (c === '\n') break;
        }
        this.compiler.comments.push(new Comment(new Fragment(start, this.pos)));
    }
    
    /*
    async _handleNewDom(firstChar) {
        const start = this.tokenStart;
        let value = 0;
        
        while (true) {
            const c = await this._nextChar();
            if (c === null) break;
            val += c;
            this.pos = this.pos.next(c);
        }
        this._pushBack(c);
        
        return new NewDomToken(value, start, this.pos);
    }
    */
    
    async _handleIdent() {
        const start = this.tokenStart;
        // Пропускаем открывающий '/'
        const slash = await this._nextChar();
        if (slash !== '/') {
            this.compiler.addMessage(true, this.pos, "expected '/' at start of identifier");
            return null;
        }
        this.pos = this.pos.next(slash);
        let ident = '';
        let isNumber = true; 
        
        while (true) {
            const c = await this._nextChar();
            if (c === null) {
                this.eof = true;
                break;
            }
            this.pos = this.pos.next(c);

            if (c === '/') {
                break;
            }
            if (c === '\n') {
                this.compiler.addMessage(true, this.pos, "expected '/' before newline");
                this._pushBack(c);
                return null;
            }
        
            if (!(c>"0" && c<"9")) {
                isNumber = false;
            }
        
            ident += c;
        }

    if (this._isKeyword(ident)) {
        let tag;
        if (ident === 'while') tag = DomainTag.KEYWORD_WHILE;
        else if (ident === 'do') tag = DomainTag.KEYWORD_DO;
        else if (ident === 'end') tag = DomainTag.KEYWORD_END;
        return new KeywordToken(tag, start, this.pos);
    } else {
        const code = this.compiler.addName(ident);
        if (isNumber) return new NewDomToken(code, start, this.pos);
        return new IdentToken(code, start, this.pos);
    }
}
    
    async nextToken() {
        if (this.eof && this.lineBuffer.length === 0) {
            return new EofToken(this.pos, this.pos);
        }
        
        while (true) {
            const c = await this._skipWhiteSpace();
            if (c === null) {
                return new EofToken(this.pos, this.pos);
            }
            
            // Смотрим следующий символ для комментариев
            const nextChar = this.buffer.length > 0 ? this.buffer[0] : 
                            (this.lineBuffer.length > 0 ? this.lineBuffer[0][0] : null);
            
            if (this._isCommentStart(c, nextChar)) {
                await this._handleComment();
                continue;
            }
            
            /*
            if (this._isNewDomStart(c)) {
                const token = await this._handleNewDom(c);
                this.tokenStart = this.pos;
                return token;
            }
            */
            
            if (this._isIdentBoundary(c)) {
                this._pushBack(c);
                const token = await this._handleIdent();
                this.tokenStart = this.pos;
                if (token) return token;
                continue;
            }
            
            this.compiler.addMessage(true, this.pos, `unexpected character '${c}'`);
            this.tokenStart = this.pos;
        }
    }
    
    async run() {
        const tokens = [];
        while (true) {
            const token = await this.nextToken();
            tokens.push(token);
            console.log(token.toString());
            if (token.tag === DomainTag.END_OF_PROGRAM) break;
        }
        
        console.log('\nКомментарии:');
        if (this.compiler.comments.length === 0) {
            console.log('(нет комментариев)');
        } else {
            this.compiler.comments.forEach(c => console.log(c.coords.toString()));
        }
        
        console.log('\nТаблица идентификаторов:');
        if (this.compiler.names.length === 0) {
            console.log('(нет идентификаторов)');
        } else {
            this.compiler.names.forEach((name, code) => {
                console.log(`${code}: ${name}`);
            });
        }
        
        console.log('\nОшибки:');
        if (this.compiler.messages.length === 0) {
            console.log('(нет ошибок)');
        } else {
            this.compiler.messages.forEach(m => {
                console.log(`Error ${m.position}: ${m.text}`);
            });
        }
        
        this.rl.close();
        process.exit(0);
    }
}

async function main() {
    console.log('Введите текст (после ввода нажмите Ctrl+D):');
    const scanner = new Scanner();
    await scanner.run();
}

if (require.main === module) {
    main().catch(console.error);
}

// Числовые литералы вида /123134/
```

# Тестирование

Входные данные

```
/123/ /aaa/

/abc/ /def@/ /123/ /while/ /x
```

Вывод на `stdout`

```
Введите текст (после ввода нажмите Ctrl+D):
/123/ /aaa/
NEWDOM (1,2)-(1,7): 0
IDENT (1,9)-(1,14): 1
/abc/ /def@/ /123/ /while/ /x
IDENT (3,2)-(3,7): 2
IDENT (3,9)-(3,15): 3
NEWDOM (3,17)-(3,22): 0
WHILE (3,24)-(3,31):
END_OF_PROGRAM (6,1)-(6,1):

Комментарии:
(нет комментариев)

Таблица идентификаторов:
0: 123
1: aaa
2: abc
3: def@

Ошибки:
Error (4,1): expected '/' before newline
```

# Вывод
В ходе выполнения лабораторной работы был реализован объектно-ориентированный лексический анализатор для
заданного индивидуального варианта. Анализатор корректно распознает комментарии, ключевые слова,
идентификаторы и числовые литералы. В процессе тестирования выявлена и исправлена ошибка в логике
определения числовых литералов: теперь проверка на число выполняется после полного сбора строки между
символами '/', что позволяет корректно отличать числа от идентификаторов. Программа успешно обрабатывает
входной текст и выдает необходимую информацию о токенах, комментариях, таблице идентификаторов и ошибках.