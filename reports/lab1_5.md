% Лабораторная работа № 1.5 «Порождение лексического анализатора с помощью flex»
% 25 марта 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является изучение генератора лексических анализаторов flex.

# Индивидуальный вариант
Целые числа: последовательности десятичных цифр.
Вещественные числа: последовательности десятичных цифр, содержащие точку.
Идентификаторы: последовательности латинских букв, цифр и точек, содержащих как минимум одну букву.
Знаки операций: «+», «,», «.».
Строки: ограничены знаками «@», не могут пересекать границы строчек текста, для представления «@» внутри
строки знак удваивается.

## Лексический домен для защиты
тип целого числа произвольной разрядности: int22, uint88, int7, uint1234
атрибут: целое число, положительное для беззнаковых, отрицательное для знаковых
соответственно -22, 88, -7, 1234

# Реализация

```lex
%option noyywrap bison-bridge bison-locations
%option yylineno

%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <ctype.h>

/* Теги токенов для Bison */
#define TAG_INTEGER   1
#define TAG_FLOAT     2
#define TAG_IDENTIFIER 3
#define TAG_PLUS      4
#define TAG_COMMA     5
#define TAG_DOT       6
#define TAG_STRING    7
#define TAG_EOF       0
#define TAG_NEW 8
#define TAG_INT_TYPE 9

/* на вывод */
char *tag_names[] = {
    "END_OF_PROGRAM",
    "INTEGER",
    "FLOAT",
    "IDENTIFIER",
    "PLUS",
    "COMMA",
    "DOT",
    "STRING",
    "NEW",
    "INT_TYPE"
};

struct Position {
    int line;
    int pos;
    int index;
};

void print_pos(struct Position *p) {
    printf("(%d,%d)", p->line, p->pos);
}

/* фрагмент текста */
struct Fragment {
    struct Position starting;
    struct Position following; /* конец */
};

typedef struct Fragment YYLTYPE;

void print_frag(struct Fragment *f) {
    print_pos(&(f->starting));
    printf("-");
    print_pos(&(f->following));
}

/* Токен */
union Token {
    int64_t int_value;
    double float_value;
    char *string_value;
    char *ident_value;
    struct {
        int64_t value;
        int is_signed;
    } int_type_value;
};

typedef union Token YYSTYPE;

/* условно массивы для хранения (а далее и функции по взаимодействию с ними: от положить до очистки) */
static char** errors = NULL;
static size_t errors_count = 0;
static size_t errors_capacity = 0;

static struct Fragment* comments = NULL;
static size_t comments_count = 0;
static size_t comments_capacity = 0;

/* а вот такую структуру мы и будем хранить в памяти */
struct TokenRecord {
    int tag;
    struct Fragment coords;
    union {
        int64_t int_value;
        double float_value;
        char* string_value;
        char* ident_value;
        struct {
            int64_t value;
            int is_signed;
        } int_type_value;
    } value;
};

static struct TokenRecord* tokens = NULL;
static size_t tokens_count = 0;
static size_t tokens_capacity = 0;

static void add_token(int tag, struct Fragment coords, YYSTYPE value) {
    if (tokens_count >= tokens_capacity) {
        tokens_capacity = tokens_capacity == 0 ? 10 : tokens_capacity * 2;
        tokens = realloc(tokens, tokens_capacity * sizeof(struct TokenRecord));
        if (!tokens) {
            fprintf(stderr, "Memory allocation failed\n");
            exit(1);
        }
    }
    tokens[tokens_count].tag = tag;
    tokens[tokens_count].coords = coords;
    if (tag == TAG_INTEGER) {
        tokens[tokens_count].value.int_value = value.int_value;
    } else if (tag == TAG_FLOAT) {
        tokens[tokens_count].value.float_value = value.float_value;
    } else if (tag == TAG_NEW) {
        tokens[tokens_count].value.int_value = value.int_value;
    } else if (tag == TAG_INT_TYPE) {
        tokens[tokens_count].value.int_type_value.value = value.int_type_value.value;
        tokens[tokens_count].value.int_type_value.is_signed = value.int_type_value.is_signed;
    } else if (tag == TAG_IDENTIFIER) {
        tokens[tokens_count].value.ident_value = value.ident_value;
    } else if (tag == TAG_STRING) {
        tokens[tokens_count].value.string_value = value.string_value;
    }
    tokens_count++;
}

static void add_error(const char* format, int line, int pos, const char* text) {
    if (errors_count >= errors_capacity) {
        errors_capacity = errors_capacity == 0 ? 10 : errors_capacity * 2;
        errors = realloc(errors, errors_capacity * sizeof(char*));
        if (!errors) {
            fprintf(stderr, "Memory allocation failed\n");
            exit(1);
        }
    }
    
    char buffer[512];
    snprintf(buffer, sizeof(buffer), "Error (%d,%d): ", line, pos);
    size_t len = strlen(buffer);
    snprintf(buffer + len, sizeof(buffer) - len, format, text);
    
    errors[errors_count] = malloc(strlen(buffer) + 1);
    if (errors[errors_count]) {
        strcpy(errors[errors_count], buffer);
        errors_count++;
    }
}

static void add_comment(struct Fragment frag) {
    if (comments_count >= comments_capacity) {
        comments_capacity = comments_capacity == 0 ? 10 : comments_capacity * 2;
        comments = realloc(comments, comments_capacity * sizeof(struct Fragment));
        if (!comments) {
            fprintf(stderr, "Memory allocation failed\n");
            exit(1);
        }
    }
    comments[comments_count++] = frag;
}

static void free_lists(void) {
    for (size_t i = 0; i < errors_count; i++) {
        free(errors[i]);
    }
    free(errors);
    free(comments);
    for (size_t i = 0; i < tokens_count; i++) {
        if (tokens[i].tag == TAG_IDENTIFIER && tokens[i].value.ident_value) {
            free(tokens[i].value.ident_value);
        }
        if (tokens[i].tag == TAG_STRING && tokens[i].value.string_value) {
            free(tokens[i].value.string_value);
        }
    }
    free(tokens);
}

static int continued; /* указывает, что текущее действие продолжает предыдущее */
static struct Position cur;

void init_scanner(FILE *input) {
    continued = 0;
    cur.line = 1;
    cur.pos = 1;
    cur.index = 0;
    yyin = input;
}

static char* process_string(const char* text, int len) {
    const char* start = text + 1;
    int str_len = len - 2;
    
    char* result = malloc(str_len + 1);
    if (!result) return NULL;
    
    int j = 0;
    for (int i = 0; i < str_len; i++) {
        if (start[i] == '@' && i + 1 < str_len && start[i + 1] == '@') {
            result[j++] = '@';
            i++;
        } else {
            result[j++] = start[i];
        }
    }
    result[j] = '\0';
    
    return result;
}

/* Макрос для вычисления координат со слайдов */
#define YY_USER_ACTION \
    { \
        int i; \
        if (!continued) \
            yylloc->starting = cur; \
        continued = 0; \
        for (i = 0; i < yyleng; i++) { \
            if (yytext[i] == '\n') { \
                cur.line++; \
                cur.pos = 1; \
            } else { \
                cur.pos++; \
            } \
            cur.index++; \
        } \
        yylloc->following = cur; \
    }

%}

/* Регулярные выражения для доменов */
LETTER [a-zA-Z]
DIGIT [0-9]
INTEGER {DIGIT}+
FLOAT {DIGIT}+\.{DIGIT}+
IDENTIFIER ([a-zA-Z0-9\.]*[a-zA-Z][a-zA-Z0-9\.]*)
OPERATOR_PLUS \+
OPERATOR_COMMA ,
OPERATOR_DOT \.
STRING @([^@\n]|@@)*@
NEW 0[xX][0-9a-fA-F]+

/* тип целого числа произвольной разрядности: int22, uint88, int7, uint1234 */
/* атрибут: целое число, положительное для беззнаковых, отрицательное для знаковых */
/* соответственно -22, 88, -7, 1234 */
INT_TYPE (int|uint){DIGIT}+

%x COMMENT_STAR COMMENT_BRACE

%%

[\n\t ]+           /* пропускаем пробелы */

{INTEGER}          {
    const char* text = yytext;
    char* endptr;
    int64_t number = strtoll(text, &endptr, 10); /* перегон в число */
    
    if (*endptr != '\0') {
        add_error("invalid integer: %s", yylineno, yylloc->starting.pos, text);
    } else {
        yylval->int_value = number;
        add_token(TAG_INTEGER, *yylloc, *yylval);
        return TAG_INTEGER;
    }
}

{FLOAT}            {
    const char* text = yytext;
    char* endptr;
    double number = strtod(text, &endptr); 
    
    if (*endptr != '\0') {
        add_error("invalid float: %s", yylineno, yylloc->starting.pos, text);
    } else {
        yylval->float_value = number;
        add_token(TAG_FLOAT, *yylloc, *yylval);
        return TAG_FLOAT;
    }
}

{NEW}              {
    const char* text = yytext;
    char* endptr;
    int64_t number = strtoll(text, &endptr, 16);
    
    if (*endptr != '\0') {
        add_error("invalid hexadecimal: %s", yylineno, yylloc->starting.pos, text);
    } else {
        yylval->int_value = number;
        add_token(TAG_NEW, *yylloc, *yylval);
        return TAG_NEW;
    }
}

{INT_TYPE}         {
    const char* text = yytext;
    int64_t number;
    int is_signed;
    
    if (strncmp(text, "int", 3) == 0) {
        is_signed = 1;
        number = -atoi(text + 3);
    } else if (strncmp(text, "uint", 4) == 0) {
        is_signed = 0;
        number = atoi(text + 4);
    } else {
        add_error("invalid int type: %s", yylineno, yylloc->starting.pos, text);
        return 0;
    }
    
    yylval->int_type_value.value = number;
    yylval->int_type_value.is_signed = is_signed;
    add_token(TAG_INT_TYPE, *yylloc, *yylval);
    return TAG_INT_TYPE;
}

{IDENTIFIER}       {
    const char* text = yytext;
    int len = strlen(text);
    
    if (len > 0 && (text[0] == '.' || text[len-1] == '.')) {
        add_error("invalid identifier (starts or ends with dot): %s", 
                  yylineno, yylloc->starting.pos, text);
    } else {
        yylval->ident_value = malloc(strlen(text) + 1);
        if (yylval->ident_value) {
            strcpy(yylval->ident_value, text);
            add_token(TAG_IDENTIFIER, *yylloc, *yylval);
            return TAG_IDENTIFIER;
        }
    }
}

{OPERATOR_PLUS}    {
    add_token(TAG_PLUS, *yylloc, *yylval);
    return TAG_PLUS;
}

{OPERATOR_COMMA}   {
    add_token(TAG_COMMA, *yylloc, *yylval);
    return TAG_COMMA;
}

{OPERATOR_DOT}     {
    add_token(TAG_DOT, *yylloc, *yylval);
    return TAG_DOT;
}

{STRING}           {
    const char* text = yytext;
    int len = yyleng;
    
    if (strchr(text, '\n') != NULL) { /* строка не должна пересекать границу строки */
        add_error("string cannot cross line boundary: %s", 
                  yylineno, yylloc->starting.pos, text);
    } else {
        char* processed = process_string(text, len);
        if (processed) {
            yylval->string_value = processed;
            add_token(TAG_STRING, *yylloc, *yylval);
            return TAG_STRING;
        } else {
            add_error("failed to process string: %s", 
                      yylineno, yylloc->starting.pos, text);
        }
    }
}

"/*"               {
    BEGIN(COMMENT_STAR);
    continued = 1; /* теперь комментарий продолжает прошлый фрагмент */
}

<COMMENT_STAR>[^*]* {
    continued = 1;
}

<COMMENT_STAR>"*/" { /* тут уже класть надо комментарий */
    add_comment(*yylloc);
    BEGIN(0);
}

<COMMENT_STAR>"*" {
    continued = 1; 
}

<COMMENT_STAR><<EOF>> {
    add_error("end of program found, '*/' expected", 
              yylineno, yylloc->starting.pos, "");
    BEGIN(0);
}

"{"                { /* по аналогии */
    BEGIN(COMMENT_BRACE);
    continued = 1;
}

<COMMENT_BRACE>[^}]* {
    continued = 1;
}

<COMMENT_BRACE>"}" {
    add_comment(*yylloc);
    BEGIN(0);
}

<COMMENT_BRACE><<EOF>> {
    add_error("end of program found, '}' expected", 
              yylineno, yylloc->starting.pos, "");
    BEGIN(0);
}

.                  {
    add_error("unexpected character: %s", 
              yylineno, yylloc->starting.pos, yytext);
}

%%

int main(int argc, char** argv) {
    if (argc > 1) {
        FILE* input = fopen(argv[1], "r");
        if (!input) {
            fprintf(stderr, "Cannot open file: %s\n", argv[1]);
            return 1;
        }
        init_scanner(input);
    } else {
        init_scanner(stdin);
    }
    
    int tag;
    YYSTYPE yylval;
    YYLTYPE yylloc;
    
    printf("=== BISON INTERFACE ===\n\n");
    
    while ((tag = yylex(&yylval, &yylloc)) != 0) {
        printf("token: %s", tag_names[tag]);
        printf(" at (%d,%d)-(%d,%d)",
               yylloc.starting.line, yylloc.starting.pos,
               yylloc.following.line, yylloc.following.pos);
        
        if (tag == TAG_INTEGER) {
            printf(" value=%ld", yylval.int_value);
        } else if (tag == TAG_FLOAT) {
            printf(" value=%g", yylval.float_value);
        } else if (tag == TAG_NEW) {
            printf(" value=%ld", yylval.int_value);
        } else if (tag == TAG_INT_TYPE) {
            printf(" value=%ld %s", yylval.int_type_value.value, 
                   yylval.int_type_value.is_signed ? "(signed)" : "(unsigned)");
        } else if (tag == TAG_IDENTIFIER) {
            printf(" value=\"%s\"", yylval.ident_value);
        } else if (tag == TAG_STRING) {
            printf(" value=\"%s\"", yylval.string_value);
        }
        printf("\n");
    }
    
    printf("\ntoken: END_OF_PROGRAM\n\n");
    
    /* Ошибки */
    for (size_t i = 0; i < errors_count; i++) {
        printf("%s\n", errors[i]);
    }
    
    /* Токены */
    for (size_t i = 0; i < tokens_count; i++) {
        struct TokenRecord* t = &tokens[i];
        printf("%s ", tag_names[t->tag]);
        printf("(%d,%d)-(%d,%d)",
               t->coords.starting.line, t->coords.starting.pos,
               t->coords.following.line, t->coords.following.pos);
        
        if (t->tag == TAG_INTEGER) {
            printf(": %ld\n", t->value.int_value);
        } else if (t->tag == TAG_FLOAT) {
            printf(": %g\n", t->value.float_value);
        } else if (t->tag == TAG_NEW) {
            printf(": %ld\n", t->value.int_value);
        } else if (t->tag == TAG_INT_TYPE) {
            printf(": %ld %s\n", t->value.int_type_value.value,
                   t->value.int_type_value.is_signed ? "(signed)" : "(unsigned)");
        } else if (t->tag == TAG_IDENTIFIER) {
            printf(": %s\n", t->value.ident_value);
        } else if (t->tag == TAG_STRING) {
            printf(": %s\n", t->value.string_value);
        } else {
            printf(":\n");
        }
    }
    
    /* Комментарии */
    for (size_t i = 0; i < comments_count; i++) {
        struct Fragment* c = &comments[i];
        printf("(%d,%d)-(%d,%d) comment\n",
               c->starting.line, c->starting.pos,
               c->following.line, c->following.pos);
    }
    
    free_lists();
    
    if (argc > 1) {
        fclose(yyin);
    }
    
    return 0;
}
```

# Тестирование

Входные данные

```
123
456.789
0xFF
0x1A3B
int22
uint88
int7
uint1234
abc
def123
a.b.c
+
,
.
@Hello World@
/* это комментарий */
{ это тоже комментарий }
```

Вывод на `stdout`

```
=== BISON INTERFACE ===

token: INTEGER at (1,1)-(1,4) value=123
token: FLOAT at (2,1)-(2,8) value=456.789
token: NEW at (3,1)-(3,5) value=255
token: NEW at (4,1)-(4,7) value=6715
token: INT_TYPE at (5,1)-(5,7) value=-22 (signed)
token: INT_TYPE at (6,1)-(6,8) value=88 (unsigned)
token: INT_TYPE at (7,1)-(7,6) value=-7 (signed)
token: INT_TYPE at (8,1)-(8,11) value=1234 (unsigned)
token: IDENTIFIER at (9,1)-(9,4) value="abc"
token: IDENTIFIER at (10,1)-(10,7) value="def123"
token: IDENTIFIER at (11,1)-(11,6) value="a.b.c"
token: PLUS at (12,1)-(12,2)
token: COMMA at (13,1)-(13,2)
token: DOT at (14,1)-(14,2)
token: STRING at (15,1)-(15,14) value="Hello World"

token: END_OF_PROGRAM

INTEGER (1,1)-(1,4): 123
FLOAT (2,1)-(2,8): 456.789
NEW (3,1)-(3,5): 255
NEW (4,1)-(4,7): 6715
INT_TYPE (5,1)-(5,7): -22 (signed)
INT_TYPE (6,1)-(6,8): 88 (unsigned)
INT_TYPE (7,1)-(7,6): -7 (signed)
INT_TYPE (8,1)-(8,11): 1234 (unsigned)
IDENTIFIER (9,1)-(9,4): abc
IDENTIFIER (10,1)-(10,7): def123
IDENTIFIER (11,1)-(11,6): a.b.c
PLUS (12,1)-(12,2):
COMMA (13,1)-(13,2):
DOT (14,1)-(14,2):
STRING (15,1)-(15,14): Hello World
(5,1)-(5,14) comment
(6,1)-(6,18) comment
```

# Вывод
В ходе выполнения лабораторной работы был разработан лексический анализатор с использованием генератора
flex. Освоены основные возможности flex: описание регулярных выражений для распознавания лексем,
использование состояний для обработки многострочных комментариев, работа с координатами токенов
(yylineno, YY_USER_ACTION), механизмы возврата токенов и накопления их в массиве для последующего вывода.