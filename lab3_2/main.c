#include "parser.tab.h"
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <input.pas>\n", argv[0]);
        return 1;
    }

    FILE *input = fopen(argv[1], "r");
    if (!input) {
        perror("Cannot open input file");
        return 1;
    }

    void *scanner;
    yylex_init(&scanner);
    yyset_in(input, scanner);

    // Инициализация состояния форматтера
    FormatState state;
    state.output = stdout;
    state.indent = 0;

    yyparse(scanner, &state);

    yylex_destroy(scanner);
    fclose(input);
    return 0;
}