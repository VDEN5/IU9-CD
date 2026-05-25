CC = gcc
CFLAGS = -Wall -Wextra -g

TARGET = format
OBJS = parser.tab.o lex.yy.o main.o

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

parser.tab.c parser.tab.h: parser.y
	bison -d parser.y

lex.yy.c: scanner.l parser.tab.h
	flex scanner.l

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(TARGET) lex.yy.c parser.tab.c parser.tab.h *.o

.PHONY: all clean