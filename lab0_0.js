/**
 * Основная функция парсера
 * Принимает строку с программой на FORTH-подобном языке
 * Возвращает [словарь_статей, дерево_основного_тела] или null при синтаксической ошибке
 */
function parse(program) {
    program = program.trim();
    if (program === '') return [[], []];
    
    const tokens = program.split(/\s+/);
    let pos = 0;
    
    // Вспомогательные функции для рекурсивного спуска
    
    /**
     * Возвращает текущий токен без его потребления (загляд)
     */
    function peek() {
      return pos < tokens.length ? tokens[pos] : null;
    }
    
    /**
     * Потребляет и возвращает текущий токен (пробег)
     */
    function consume() {
      return pos < tokens.length ? tokens[pos++] : null;
    }
    
    /**
     * Проверяет, является ли токен числом 
     */
    function isNumber(token) {
      return /^-?\d+$/.test(token);
    }
    
    // Рекурсивные функции для грамматики
    
    /**
     * Парсит тело программы (Body из грамматики)
     * <Body> ::= if <Body> endif <Body> | while <Body> do <Body> wend <Body> | integer <Body> | word <Body> | .
     * Возвращает массив элементов тела или null при ошибке
     */
    function parseBody() {
      const result = [];
      
      // Парсим до тех пор, пока не встретим служебное слово или конец ввода
      while (peek() !== null && peek() !== 'end' && peek() !== 'endif' && peek() !== 'do' && peek() !== 'wend') {
        const token = peek();
        
        if (token === 'if') {
          result.push(parseIf());
        } else if (token === 'while') {
          result.push(parseWhile());
        } else if (token === 'define') {
          // define не разрешен в теле программы
          return null;
        } else {
          const token = consume();
          result.push(isNumber(token) ? parseInt(token) : token);
        }
      }
      
      return result;
    }
    
    /**
     * Парсит if-конструкцию
     * if <Body> endif
     * Возвращает массив ['if', тело_if] или null при ошибке
     */
    function parseIf() {
      if (consume() !== 'if') return null;
      
      const ifBody = parseBody();
      if (ifBody === null) return null; //слышал я что-то про проверку на null, но чисто бизнес-логика, смотрится здраво имхо
      
      if (peek() !== 'endif') return null;
      consume(); // съедаем endif
      
      return ['if', ifBody];
    }
    
    /**
     * Парсит while-конструкцию
     * while <Body> do <Body> wend
     * Возвращает массив ['while', условие, тело_цикла] или null при ошибке
     */
    function parseWhile() {
      if (consume() !== 'while') return null;
      
      const condition = parseBody();
      if (condition === null) return null;
      
      if (peek() !== 'do') return null;
      consume(); // съедаем do
      
      const loopBody = parseBody();
      if (loopBody === null) return null;
      
      if (peek() !== 'wend') return null;
      consume(); // съедаем wend
      
      return ['while', condition, loopBody];
    }
    
    /**
     * Парсит определение статьи (define)
     * define word <Body> end
     * Возвращает объект {name, body} или null при ошибке
     */
    function parseArticle() {
      if (consume() !== 'define') return null;
      
      const name = consume();
      if (!name) return null;
      
      const body = parseBody();
      if (body === null) return null;
      
      if (peek() !== 'end') return null;
      consume(); // съедаем end
      
      return { name, body };
    }
    
    // Основной парсинг, тут уже в принципе уместно вкинуть неподход
    try {
      const articles = {};
      
      // Парсим все define статьи
      while (peek() === 'define') {
        const article = parseArticle();
        if (article === null) return null;
        
        if (articles[article.name]) {
          return null; // дублирование имени статьи
        }
        
        articles[article.name] = article.body;
      }
      
      // Парсим основное тело программы
      const mainBody = parseBody();
      if (mainBody === null) return null;
      
      // Должны были прочитать все токены
      if (peek() !== null) {
        return null;
      }
      
      return [articles, mainBody];
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Форматирует результат парсинга в строку, похожую на Scheme-выражение (но в принципе не обязательно, но пусть будет)
   * Возвращает строку в формате ((статьи) (тело)) или "#f" при ошибке
   */
  function formatResult(result) {
    if (result === null) return '#f';
    
    const [articles, body] = result;
    
    // Форматируем статьи
    const articlesList = [];
    for (const name in articles) {
      const formattedBody = formatBody(articles[name], true);
      articlesList.push(`(${name} ${formattedBody})`);
    }
    
    const articlesStr = articlesList.length === 0 ? "()" : articlesList.join("\n   ");
    const bodyStr = formatBody(body, false);
    
    if (articlesList.length === 0) {
      return `(() ${bodyStr})`;
    } else {
      return `(((${articlesStr})\n  ${bodyStr}))`;
    }
  }
  
  /**
   * Форматирует тело программы (массив элементов) в строку
   * @param {Array} body - тело программы для форматирования
   * @param {boolean} isArticle - true если форматируем тело статьи, false если основное тело
   * @returns {string} отформатированная строка
   */
  function formatBody(body, isArticle = false) {
    const parts = [];
    let i = 0;
    
    while (i < body.length) {
      const item = body[i];
      
      if (Array.isArray(item)) {
        if (item[0] === 'if') {
          // Для if: (if (тело))
          const ifBody = formatBody(item[1], true);
          parts.push(`(if (${ifBody}))`);
        } else if (item[0] === 'while') {
          // Для while: (while (условие) (тело))
          const condition = formatBody(item[1], true);
          const loopBody = formatBody(item[2], true);
          parts.push(`(while (${condition}) (${loopBody}))`);
        }
      } else {
        parts.push(item);
      }
      i++;
    }
    
    if (isArticle && parts.length > 0) {
      // В статьях - просто элементы через пробел
      return parts.join(' ');
    } else {
      // В основном теле - в скобках
      return `(${parts.join(' ')})`;
    }
  }
  
  // Тестирование
  console.log('(parse "1 2 +")');
  const result1 = parse("1 2 +");
  console.log('⇒', result1 === null ? '#f' : formatResult(result1));
  console.log();
  
  console.log('(parse "x dup 0 swap if drop -1 endif")');
  const result2 = parse("x dup 0 swap if drop -1 endif");
  console.log('⇒', result2 === null ? '#f' : formatResult(result2));
  console.log();
  
  console.log('(parse "1 x dup while dup 0 > do 1 - swap over * swap wend")');
  const result3 = parse("1 x dup while dup 0 > do 1 - swap over * swap wend");
  console.log('⇒', result3 === null ? '#f' : formatResult(result3));
  console.log();
  
  console.log(`(parse " define -- 1 - end
         define =0? dup 0 = end
         define =1? dup 1 = end
         define factorial
             =0? if drop 1 exit endif
             =1? if drop 1 exit endif
             1 swap
             while dup 0 > do
                 1 - swap over * swap
             wend
             drop
         end
         0 factorial
         1 factorial
         2 factorial
         3 factorial
         4 factorial ")`);
  const complexExample = `define -- 1 - end
  define =0? dup 0 = end
  define =1? dup 1 = end
  define factorial
    =0? if drop 1 exit endif
    =1? if drop 1 exit endif
    1 swap
    while dup 0 > do
        1 - swap over * swap
    wend
    drop
  end
  0 factorial
  1 factorial
  2 factorial
  3 factorial
  4 factorial`;
  const result4 = parse(complexExample);
  console.log('⇒', result4 === null ? '#f' : formatResult(result4));
  console.log();
  
  console.log('(parse "define word w1 w2 w3")');
  const result5 = parse("define word w1 w2 w3");
  console.log('⇒', result5 === null ? '#f' : formatResult(result5));
  
  // Дополнительные тесты для проверки рекурсивного спуска
  
  console.log('(parse "if if 1 endif endif")');
  console.log('⇒', formatResult(parse("if if 1 endif endif")));
  
  console.log('\n(parse "while 1 do while 2 do 3 wend wend")');
  console.log('⇒', formatResult(parse("while 1 do while 2 do 3 wend wend")));
  
  console.log('\n(parse "define test if 1 endif end test")');
  console.log('⇒', formatResult(parse("define test if 1 endif end test")));