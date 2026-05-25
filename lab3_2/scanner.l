%option reentrant bison-bridge bison-locations
%option noyywrap nounput noinput

%{
#include "parser.tab.h"
#include <string.h>
#include <stdlib.h>
%}

%%

[ \t\r\n]+            { /* пробелы */ }
"{"[^}]*"}"           { /* комментарий { ... } */ }
"(*"[^*]*"*)"         { /* комментарий (* ... *) */ }

"TYPE"|"type"|"Type"        { return TOK_TYPE; }
"CONST"|"const"|"Const"     { return TOK_CONST; }
"RECORD"|"record"|"Record"  { return TOK_RECORD; }
"END"|"end"|"End"           { return TOK_END; }
"ARRAY"|"array"|"Array"     { return TOK_ARRAY; }
"OF"|"of"|"Of"              { return TOK_OF; }
"SET"|"set"|"Set"           { return TOK_SET; }
"CASE"|"case"|"Case"        { return TOK_CASE; }

"="                   { return '='; }
":"                   { return ':'; }
";"                   { return ';'; }
","                   { return ','; }
"("                   { return '('; }
")"                   { return ')'; }
"^"                   { return '^'; }
"["                   { return '['; }
"]"                   { return ']'; }
".."                  { return TOK_DOTDOT; }

[a-zA-Z_][a-zA-Z0-9_]* {
    yylval->str = strdup(yytext);
    return TOK_IDENT;
}

[0-9]+ {
    yylval->num = atoi(yytext);
    return TOK_NUMBER;
}

'.'                   { return '.'; }
<<EOF>>               { return 0; }
.                     { /* ignore */ }

%%