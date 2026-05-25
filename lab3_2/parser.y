%glr-parser
%expect 4
%expect-rr 1

%code requires {
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>

    // Структура для хранения состояния форматтера
    typedef struct FormatState {
        FILE *output;   // выходной файл
        int indent;     // текущий уровень отступа
    } FormatState;
}

%code provides {
    int yylex(YYSTYPE *yylval, YYLTYPE *yyloc, void *scanner);
}

%{
#include "parser.tab.h"

void yyerror(YYLTYPE *loc, void *scanner, FormatState *state, const char *msg) {
    fprintf(stderr, "Error at %d.%d: %s\n", loc->first_line, loc->first_column, msg);
    exit(1);
}
%}

%define api.pure
%locations
%lex-param {void *scanner}
%parse-param {void *scanner}
%parse-param {FormatState *state}

%debug
%verbose

%union {
    char *str;
    int num;
}
//объявления токенов
%token <str> TOK_IDENT TOK_STRING
%token <num> TOK_NUMBER
%token TOK_TYPE TOK_CONST TOK_RECORD TOK_END TOK_ARRAY TOK_OF TOK_SET TOK_CASE
%token TOK_DOTDOT
%token TOK_ERROR
//объявления нетермов
%type <str> id_list type_spec const_expr record_body field_list field_decl variant_section variant_list variant const_list
%type <str> range range_list enum_list field_list_no_indent field_decl_no_indent

%%
//грамматика (и действия в зависимости от захода)
program:
    %empty
    | program declaration
;

declaration:
    type_section
    | const_section
;

type_section:
    TOK_TYPE { fprintf(state->output, "TYPE\n"); } type_decls
;

type_decls:
    type_decl
    | type_decls type_decl
;

type_decl:
    TOK_IDENT '=' type_spec ';' {
        fprintf(state->output, "  %s = %s;\n", $1, $3);
        free($1); free($3); //имя типа и спецификация типа
    }
;

type_spec:
    TOK_IDENT { $$ = strdup($1); free($1); }
    | '(' enum_list ')' {
        char *tmp = malloc(strlen($2) + 3);
        sprintf(tmp, "(%s)", $2);
        $$ = tmp; free($2);
    }
    | range {
        $$ = $1;
    }
    | '^' TOK_IDENT {
        char *tmp = malloc(strlen($2) + 2);
        sprintf(tmp, "^%s", $2);
        $$ = tmp; free($2);
    }
    | TOK_ARRAY '[' range_list ']' TOK_OF type_spec {
        char *tmp = malloc(strlen($3) + strlen($6) + 15);
        sprintf(tmp, "ARRAY [%s] OF %s", $3, $6);
        $$ = tmp; free($3); free($6);
    }
    | TOK_ARRAY range_list TOK_OF type_spec {
        char *tmp = malloc(strlen($2) + strlen($4) + 15);
        sprintf(tmp, "ARRAY %s OF %s", $2, $4);
        $$ = tmp; free($2); free($4);
    }
    | TOK_SET TOK_OF type_spec {
        char *tmp = malloc(strlen($3) + 9);
        sprintf(tmp, "SET OF %s", $3);
        $$ = tmp; free($3);
    }
    | TOK_RECORD {
        state->indent++; //увеличиваем отступ, а ниже наоборот к левому краю
    } record_body TOK_END {
        state->indent--;
        char *tmp = malloc(strlen($3) + 13);
        sprintf(tmp, "RECORD\n%s\n%*sEND", $3, state->indent*2, "");
        $$ = tmp; free($3);
    }
;

enum_list:
    TOK_IDENT { $$ = strdup($1); free($1); }
    | enum_list ',' TOK_IDENT {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s, %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

range:
    const_expr TOK_DOTDOT const_expr {
        char *tmp = malloc(strlen($1) + strlen($3) + 4);
        sprintf(tmp, "%s..%s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

range_list:
    range {
        $$ = $1;
    }
    | range_list ',' range {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s, %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

record_body:
    field_list
    | field_list ';' variant_section {
        char *tmp = malloc(strlen($1) + strlen($3) + 4);
        sprintf(tmp, "%s;\n%s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
    | variant_section { $$ = $1; }
;

field_list:
    %empty { $$ = strdup(""); }
    | field_decl {
        char *tmp = malloc(strlen($1) + state->indent*2 + 2);
        sprintf(tmp, "%*s%s", state->indent*2, "", $1);
        $$ = tmp; free($1);
    }
    | field_list ';' field_decl {
        char *tmp = malloc(strlen($1) + strlen($3) + state->indent*2 + 6);
        sprintf(tmp, "%s;\n%*s%s", $1, state->indent*2, "", $3);
        $$ = tmp; free($1); free($3);
    }
;

field_decl:
    id_list ':' type_spec {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s: %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

variant_section:
    TOK_CASE id_list ':' type_spec TOK_OF {
        state->indent++;
    } variant_list {
        state->indent--;
        char *tmp = malloc(strlen($2) + strlen($4) + strlen($7) + 20);
        // Выводим CASE ... OF, затем перевод строки и содержимое variant_list
        sprintf(tmp, "CASE %s: %s OF\n%s", $2, $4, $7);
        $$ = tmp; free($2); free($4); free($7);
    }
;

variant_list:
    variant {
        char *tmp = malloc(strlen($1) + state->indent*2 + 2);
        sprintf(tmp, "%*s%s", state->indent*2, "", $1);
        $$ = tmp; free($1);
    }
    | variant_list ';' variant {
        // коварно: под конец не добавляем перевода ;, потому так делаем
        char *tmp = malloc(strlen($1) + strlen($3) + state->indent*2 + 6);
        sprintf(tmp, "%s;\n%*s%s", $1, state->indent*2, "", $3);
        $$ = tmp; free($1); free($3);
    }
;

variant:
    const_list ':' '(' field_list_no_indent ')' {
        char *tmp = malloc(strlen($1) + strlen($4) + 6);
        sprintf(tmp, "%s: (%s)", $1, $4);
        $$ = tmp; free($1); free($4);
    }
;

field_list_no_indent:
    %empty { $$ = strdup(""); }
    | field_decl_no_indent { $$ = $1; }
    | field_list_no_indent ';' field_decl_no_indent {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s; %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

field_decl_no_indent:
    id_list ':' type_spec {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s: %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

const_list:
    const_expr { $$ = $1; }
    | const_list ',' const_expr {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s, %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

id_list:
    TOK_IDENT { $$ = strdup($1); free($1); }
    | id_list ',' TOK_IDENT {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s, %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
;

const_section:
    TOK_CONST { fprintf(state->output, "CONST\n"); } const_decls
;

const_decls:
    const_decl
    | const_decls const_decl
;

const_decl:
    TOK_IDENT '=' const_expr ';' {
        fprintf(state->output, "  %s = %s;\n", $1, $3);
        free($1); free($3);
    }
;

const_expr:
    TOK_NUMBER {
        char *tmp = malloc(12);
        sprintf(tmp, "%d", $1);
        $$ = tmp;
    }
    | TOK_STRING { $$ = strdup($1); free($1); }
    | TOK_IDENT { $$ = strdup($1); free($1); }
    | const_expr '+' const_expr {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s + %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
    | const_expr '-' const_expr {
        char *tmp = malloc(strlen($1) + strlen($3) + 3);
        sprintf(tmp, "%s - %s", $1, $3);
        $$ = tmp; free($1); free($3);
    }
    | '(' const_expr ')' {
        char *tmp = malloc(strlen($2) + 3);
        sprintf(tmp, "(%s)", $2);
        $$ = tmp; free($2);
    }
;

%%