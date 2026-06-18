% Лабораторная работа № 2.2 «Абстрактные синтаксические деревья»
% 6 апреля 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является получение навыков составления грамматик и
проектирования синтаксических деревьев.

# Индивидуальный вариант
Подмножество Оберона

```
TYPE
  Point = RECORD
    x, y : REAL;
  END;
  Shape = RECORD
    center : Point;
    color : INTEGER;
    next : POINTER TO Shape;
  END;
  Circle = RECORD(Shape)
    radius : REAL;
  END;
  Rectangle = RECORD(Shape)
    width, height : REAL;
  END;

VAR
  p1, p2 : Point;
  s : Shape;
  c : Circle;
  r : Rectangle;
  ps : POINTER TO Shape;
  pc : POINTER TO Circle;
  pr : POINTER TO Rectangle;
BEGIN
  p1.x := 10;
  p1.y := 3.5;
  s.center := p1;
  s.color := 100500;
  c := s;
  c.radius := 7;
  r.center.x := 5.2;
  r.center.y := 2.5;
  r.color := 500100;
  r.width := 4.5;
  r.heigh := 5.4;
  c := r;
  NEW(pr);
  pr^ := r;
  ps := pr;
  NEW(pc);
  pc^ := c;
  ps.next := pc;

  (* комментарий *)
  WHILE p1.x * p1.y < 77777 DO
    p1.x := p1.x * 1.5;
    p1.y := p1.y * 2.5;
  END;

  IF p1.x > pc.radius THEN
    p2 := p1;
    p1 := pc.center;
  ELSE
    p2 := pr.center;
  END;
END.
```
Комментарии записываются как (* … *). Идентификаторы учитывают регистр,
ключевые слова всегда пишутся большими буквами.

Приоритет операций:

Наивысший приоритет имеют обращения к полям.
NOT
*, /, AND, DIV, MOD
+, -, OR
<, >, <=, >=, #, = — неассоциативны.
Ключевые слова и идентификаторы чувствительны к регистру.

## Синтаксическое расширение для защиты
```
vector : ARRAY 10 OF INTEGER;
matrix : ARRAY 10 OF ARRAY 10 OF INTEGER;
vector[1] := matrix[1][1];
matrix[0][0] := vector[0 * 1000];
```

# Реализация

## Абстрактный синтаксис

Абстрактное синтаксическое дерево (AST) для подмножества языка Оберон представлено
следующими классами данных:

**Типы:**
- `Type` — перечисление базовых типов: `INTEGER`, `REAL`, `BOOLEAN`.
- `TypeSpec` — базовый класс для всех спецификаций типов.
- `RefType(name)` — ссылка на тип по имени (например, `Point`, `Shape`).
- `RecordType(base, fields)` — запись с полями; `base` — имя базового типа, `fields` — список полей.
- `PointerType(target)` — указатель на тип (например, `POINTER TO Shape`).
- `Field(name, type)` — поле записи.

**Объявления:**
- `TypeDef(name, spec)` — определение типа: `name = spec`.
- `VarDecl(name, type)` — объявление переменной.

**Программа:**
- `Program(type_defs, var_decls, statements)` — корневой узел, содержащий определения типов и прочее.

**Операторы:**
- `AssignStatement(lvalue, expr)` — присваивание: `lvalue := expr`.
- `NewStatement(var)` — создание указателя: `NEW(var)`.
- `IfStatement(condition, then_body, else_body)` — условный оператор.
- `WhileStatement(condition, body)` — цикл с предусловием: `WHILE condition DO body END`.

**Выражения:**
- `LiteralExpr(value, type)` — литерал (целое, вещественное, логическое).
- `VariableExpr(name)` — переменная.
- `FieldAccessExpr(obj, field)` — обращение к полю записи: `obj.field`.
- `DerefExpr(ptr)` — разыменование указателя: `ptr^`.
- `BinOpExpr(left, op, right)` — бинарная операция.
- `UnOpExpr(op, expr)` — унарная операция (`NOT`).

## Лексическая структура

Лексический анализатор распознаёт следующие классы токенов:

| Токен | Приоритет | Описание |
|-------|-----------|----------|
| `IDENT` | 5 | Идентификаторы (регистр важен) |
| `INTEGER` | 7 | Целые числа |
| `REAL` | 5 | Вещественные числа |
| Ключевые слова | 10 | Чувствительны к регистру (заглавные) |
| Комментарии | — | Многострочные, пропускаются (флаг `re.DOTALL`) |
| Пробелы | — | Пропускаются |

Остальные символы (операторы и пунктуация) задаются непосредственно в грамматике как строковые литералы.

## Конкретный синтаксис (грамматика)

Аксиома: **Program**

```bnf
Program → TYPE TypeDefs VAR VarDecls BEGIN StatementSeq END "."

TypeDefs → ε | TypeDef TypeDefs
TypeDef → IDENT "=" TypeSpec ";"

TypeSpec → IDENT
         | RECORD FieldList END
         | RECORD "(" IDENT ")" FieldList END
         | POINTER TO TypeSpec

FieldList → ε | FieldDef FieldTail
FieldTail → ε | ";" FieldDef FieldTail | ";"
FieldDef → IdentList ":" TypeSpec

IdentList → IDENT | IDENT "," IdentList

VarDecls → ε | VarDecl VarDeclTail
VarDeclTail → ε | ";" VarDecl VarDeclTail | ";"
VarDecl → IdentList ":" TypeSpec

StatementSeq → ε | Statement StatementRest
StatementRest → ε | ";" Statement StatementRest | ";"

Statement → LValue ":=" Expr
          | NEW "(" IDENT ")"
          | IF Expr THEN StatementSeq ELSE StatementSeq END
          | WHILE Expr DO StatementSeq END

LValue → IDENT | LValue "." IDENT | LValue "^"

Expr → SimpleExpr
     | SimpleExpr "=" SimpleExpr
     | SimpleExpr "<>" SimpleExpr
     | SimpleExpr "<" SimpleExpr
     | SimpleExpr ">" SimpleExpr
     | SimpleExpr "<=" SimpleExpr
     | SimpleExpr ">=" SimpleExpr
     | SimpleExpr "#" SimpleExpr

SimpleExpr → Term
           | SimpleExpr "+" Term
           | SimpleExpr "-" Term
           | SimpleExpr OR Term

Term → Factor
     | Term "*" Factor
     | Term "/" Factor
     | Term DIV Factor
     | Term MOD Factor
     | Term AND Factor

Factor → NOT Factor
       | LValue
       | Literal
       | "(" Expr ")"

Literal → INTEGER | REAL | TRUE | FALSE
```

## Программная реализация

```python
import parser_edsl as pe
import re
from dataclasses import dataclass
from enum import Enum
import typing

class Type(Enum):
    INTEGER = "INTEGER"
    REAL    = "REAL"
    BOOLEAN = "BOOLEAN"

# TypeSpec → ident | RECORD [ ( ident ) ] FieldList END | POINTER TO TypeSpec
@dataclass
class TypeSpec:
    pass

# TypeSpec → RECORD [ ( ident ) ] FieldList END
@dataclass
class RecordType(TypeSpec):
    base: str | None
    fields: list['Field']

# TypeSpec → POINTER TO TypeSpec
@dataclass
class PointerType(TypeSpec):
    target: TypeSpec

@dataclass
class ArrayType(TypeSpec):
    size: int
    target: TypeSpec

# TypeSpec → ident
@dataclass
class RefType(TypeSpec):
    name: str

# Field → ident : TypeSpec
@dataclass
class Field:
    name: str
    type: TypeSpec

# TypeDef → ident = TypeSpec ;
@dataclass
class TypeDef:
    name: str
    spec: TypeSpec

# VarDecl → IdentList : TypeSpec
@dataclass
class VarDecl:
    name: str
    type: TypeSpec

# Program → TYPE TypeDefs VAR VarDecls BEGIN StatementSeq END .
@dataclass
class Program:
    type_defs: list[TypeDef]
    var_decls: list[VarDecl]
    statements: list['Statement']

# Statement → LValue := Expr | NEW ( ident ) | IF Expr THEN StatementSeq ELSE StatementSeq END
| WHILE Expr DO StatementSeq END
@dataclass
class Statement:
    pass

# Statement → LValue := Expr
@dataclass
class AssignStatement(Statement):
    lvalue: 'LValue'
    expr: 'Expr'

# Statement → NEW ( ident )
@dataclass
class NewStatement(Statement):
    var: str

# Statement → IF Expr THEN StatementSeq ELSE StatementSeq END
@dataclass
class IfStatement(Statement):
    condition: 'Expr'
    then_body: list['Statement']
    else_body: list['Statement']

# Statement → WHILE Expr DO StatementSeq END
@dataclass
class WhileStatement(Statement):
    condition: 'Expr'
    body: list['Statement']

# Expr → SimpleExpr ( RelOp SimpleExpr )? | ...
@dataclass
class Expr:
    pass

# Literal → INTEGER | REAL | TRUE | FALSE
@dataclass
class LiteralExpr(Expr):
    value: typing.Any
    type: Type

# Expr → LValue (переменная, поле, разыменование)
@dataclass
class VariableExpr(Expr):
    name: str

# LValue → LValue . ident
@dataclass
class FieldAccessExpr(Expr):
    obj: Expr
    field: str

@dataclass
class IndexEpr(Expr):
    obj: Expr
    index: Expr

# LValue → LValue ^
@dataclass
class DerefExpr(Expr):
    ptr: Expr

# Expr → Expr BinOp Expr
@dataclass
class BinOpExpr(Expr):
    left: Expr
    op: str
    right: Expr

# Expr → UnOp Expr
@dataclass
class UnOpExpr(Expr):
    op: str
    expr: Expr

LValue = typing.Union[VariableExpr, FieldAccessExpr, DerefExpr]

def make_keyword(image):
    return pe.Terminal(image, image, lambda x: None, priority=10)

KW_TYPE   = make_keyword('TYPE')
KW_RECORD = make_keyword('RECORD')
KW_END    = make_keyword('END')
KW_VAR    = make_keyword('VAR')
KW_BEGIN  = make_keyword('BEGIN')
KW_WHILE  = make_keyword('WHILE')
KW_DO     = make_keyword('DO')
KW_IF     = make_keyword('IF')
KW_THEN   = make_keyword('THEN')
KW_ELSE   = make_keyword('ELSE')
KW_NEW    = make_keyword('NEW')
KW_POINTER= make_keyword('POINTER')
KW_TO     = make_keyword('TO')
KW_AND    = make_keyword('AND')
KW_OR     = make_keyword('OR')
KW_DIV    = make_keyword('DIV')
KW_MOD    = make_keyword('MOD')
KW_NOT    = make_keyword('NOT')
KW_TRUE   = make_keyword('TRUE')
KW_FALSE  = make_keyword('FALSE')

IDENT   = pe.Terminal('IDENT', r'[A-Za-z][A-Za-z0-9]*', str, priority=5)
INTEGER = pe.Terminal('INTEGER', r'[0-9]+', int, priority=7)
REAL    = pe.Terminal('REAL', r'[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+', float, priority=5)

NProgram      = pe.NonTerminal('Program')
NTypeDefs     = pe.NonTerminal('TypeDefs')
NTypeDef      = pe.NonTerminal('TypeDef')
NTypeSpec     = pe.NonTerminal('TypeSpec')
NIdentList    = pe.NonTerminal('IdentList')
NFieldDef     = pe.NonTerminal('FieldDef')
NFieldList    = pe.NonTerminal('FieldList')
NFieldTail    = pe.NonTerminal('FieldTail')
NVarDecl      = pe.NonTerminal('VarDecl')
NVarDeclTail  = pe.NonTerminal('VarDeclTail')
NVarDecls     = pe.NonTerminal('VarDecls')
NStatementSeq = pe.NonTerminal('StatementSeq')
NStatementRest= pe.NonTerminal('StatementRest')
NStatement    = pe.NonTerminal('Statement')
NLValue       = pe.NonTerminal('LValue')
NExpr         = pe.NonTerminal('Expr')
NSimpleExpr   = pe.NonTerminal('SimpleExpr')
NTerm         = pe.NonTerminal('Term')
NFactor       = pe.NonTerminal('Factor')
NLiteral      = pe.NonTerminal('Literal')

# Program → TYPE TypeDefs VAR VarDecls BEGIN StatementSeq END .
NProgram |= KW_TYPE, NTypeDefs, KW_VAR, NVarDecls, KW_BEGIN, NStatementSeq, KW_END, '.', \
    lambda td, vd, stmts: Program(td, vd, stmts)

# TypeDefs → ε | TypeDef TypeDefs
NTypeDefs |= lambda: []
NTypeDefs |= NTypeDef, NTypeDefs, lambda d, ds: [d] + ds

# TypeDef → ident = TypeSpec ;
NTypeDef |= IDENT, '=', NTypeSpec, ';', TypeDef

# TypeSpec → ident | RECORD [ ( ident ) ] FieldList END | POINTER TO TypeSpec
NTypeSpec |= IDENT, RefType
NTypeSpec |= KW_RECORD, '(', IDENT, ')', NFieldList, KW_END, RecordType
NTypeSpec |= KW_RECORD, NFieldList, KW_END, lambda fields: RecordType(None, fields)
NTypeSpec |= KW_POINTER, KW_TO, NTypeSpec, PointerType
#matrix : ARRAY 10 OF ARRAY 10 OF INTEGER;
NTypeSpec |= 'ARRAY', NExpr, 'OF',  NTypeSpec, ArrayType   #!!!!!

# IdentList → ident ( ',' ident )*
NIdentList |= IDENT, lambda name: [name]
NIdentList |= IDENT, ',', NIdentList, lambda name, lst: [name] + lst

# FieldDef → IdentList : TypeSpec
NFieldDef |= NIdentList, ':', NTypeSpec, lambda names, spec: [Field(name, spec) for name in names]

# FieldList → FieldDef FieldTail | ε
NFieldList |= NFieldDef, NFieldTail, lambda fields, tail: fields + tail
NFieldList |= lambda: []

# FieldTail → ε | ; FieldDef FieldTail | ;
NFieldTail |= lambda: []
NFieldTail |= ';', NFieldDef, NFieldTail, lambda fields, tail: fields + tail
NFieldTail |= ';', lambda: []

# VarDecl → IdentList : TypeSpec
NVarDecl |= NIdentList, ':', NTypeSpec, lambda names, spec: [VarDecl(name, spec) for name in names]

# VarDecls → VarDecl VarDeclTail
NVarDecls |= NVarDecl, NVarDeclTail, lambda decls, tail: decls + tail

# VarDeclTail → ε | ; VarDecl VarDeclTail | ;
NVarDeclTail |= lambda: []
NVarDeclTail |= ';', NVarDecl, NVarDeclTail, lambda decls, tail: decls + tail
NVarDeclTail |= ';', lambda: []

# StatementSeq → ε | Statement StatementRest
NStatementSeq |= lambda: []
NStatementSeq |= NStatement, NStatementRest, lambda s, sr: [s] + sr

# StatementRest → ε | ; Statement StatementRest | ;
NStatementRest |= lambda: []
NStatementRest |= ';', NStatement, NStatementRest, lambda s, sr: [s] + sr
NStatementRest |= ';', lambda: []

# Statement → LValue := Expr | NEW ( ident ) | IF Expr THEN StatementSeq ELSE StatementSeq END |
WHILE Expr DO StatementSeq END
NStatement |= NLValue, ':=', NExpr, AssignStatement
NStatement |= KW_NEW, '(', IDENT, ')', NewStatement
NStatement |= KW_IF, NExpr, KW_THEN, NStatementSeq, KW_ELSE, NStatementSeq, KW_END, IfStatement
NStatement |= KW_WHILE, NExpr, KW_DO, NStatementSeq, KW_END, WhileStatement

# LValue → ident | LValue . ident | LValue ^
NLValue |= IDENT, VariableExpr
NLValue |= NLValue, '.', IDENT, FieldAccessExpr
NLValue |= NLValue, '^', DerefExpr
NLValue |= NLValue, '[', NExpr , ']', IndexEpr

# Expr → SimpleExpr ( RelOp SimpleExpr )?
NExpr |= NSimpleExpr
NExpr |= NSimpleExpr, '=', NSimpleExpr, lambda left, right: BinOpExpr(left, '=', right)
NExpr |= NSimpleExpr, '<>', NSimpleExpr, lambda left, right: BinOpExpr(left, '<>', right)
NExpr |= NSimpleExpr, '<', NSimpleExpr, lambda left, right: BinOpExpr(left, '<', right)
NExpr |= NSimpleExpr, '>', NSimpleExpr, lambda left, right: BinOpExpr(left, '>', right)
NExpr |= NSimpleExpr, '<=', NSimpleExpr, lambda left, right: BinOpExpr(left, '<=', right)
NExpr |= NSimpleExpr, '>=', NSimpleExpr, lambda left, right: BinOpExpr(left, '>=', right)
NExpr |= NSimpleExpr, '#', NSimpleExpr, lambda left, right: BinOpExpr(left, '#', right)

# SimpleExpr → Term ( AddOp Term )*
NSimpleExpr |= NTerm
NSimpleExpr |= NSimpleExpr, '+', NTerm, lambda left, right: BinOpExpr(left, '+', right)
NSimpleExpr |= NSimpleExpr, '-', NTerm, lambda left, right: BinOpExpr(left, '-', right)
NSimpleExpr |= NSimpleExpr, KW_OR, NTerm, lambda left, right: BinOpExpr(left, 'OR', right)

# Term → Factor ( MulOp Factor )*
NTerm |= NFactor
NTerm |= NTerm, '*', NFactor, lambda left, right: BinOpExpr(left, '*', right)
NTerm |= NTerm, '/', NFactor, lambda left, right: BinOpExpr(left, '/', right)
NTerm |= NTerm, KW_DIV, NFactor, lambda left, right: BinOpExpr(left, 'DIV', right)
NTerm |= NTerm, KW_MOD, NFactor, lambda left, right: BinOpExpr(left, 'MOD', right)
NTerm |= NTerm, KW_AND, NFactor, lambda left, right: BinOpExpr(left, 'AND', right)

# Factor → NOT Factor | LValue | Literal | ( Expr )
NFactor |= KW_NOT, NFactor, lambda expr: UnOpExpr('NOT', expr)
NFactor |= NLValue
NFactor |= NLiteral
NFactor |= '(', NExpr, ')', lambda expr: expr

# Literal → INTEGER | REAL | TRUE | FALSE
NLiteral |= INTEGER, lambda v: LiteralExpr(v, Type.INTEGER)
NLiteral |= REAL, lambda v: LiteralExpr(v, Type.REAL)
NLiteral |= KW_TRUE, lambda: LiteralExpr(True, Type.BOOLEAN)
NLiteral |= KW_FALSE, lambda: LiteralExpr(False, Type.BOOLEAN)

parser = pe.Parser(NProgram)
parser.add_skipped_domain(r'\s')
parser.add_skipped_domain(r'(?s)\(\*.*?\*\)')

if __name__ == '__main__':
    import sys
    from pprint import pprint

    if len(sys.argv) > 1:
        filename = sys.argv[1]
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                text = f.read()
                print("Исходный код:")
                print(text)
                print("\nРезультат парсинга:")
                tree = parser.parse(text)
                pprint(tree)
        except pe.Error as e:
            print(f'Ошибка {e.pos}: {e.message}')
        except Exception as e:
            print(f'Ошибка: {e}')
    else:
        print("Укажите имя файла для парсинга")
```

# Тестирование

## Входные данные

```
TYPE
  Point = RECORD
    x, y : REAL;
  END;
  Shape = RECORD
    center : Point;
    color : INTEGER;
    next : POINTER TO Shape;
  END;
  Circle = RECORD(Shape)
    radius : REAL;
  END;
  Rectangle = RECORD(Shape)
    width, height : REAL;
  END;

VAR
  p1, p2 : Point;
  s : Shape;
  c : Circle;
  r : Rectangle;
  ps : POINTER TO Shape;
  pc : POINTER TO Circle;
  pr : POINTER TO Rectangle;
  vector : ARRAY 10 OF INTEGER;
  matrix : ARRAY 10 OF ARRAY 10 OF INTEGER;
BEGIN
  p1.x := 10;
  p1.y := 3.5;
  s.center := p1;
  s.color := 100500;
  c := s;
  c.radius := 7;
  r.center.x := 5.2;
  r.center.y := 2.5;
  r.color := 500100;
  r.width := 4.5;
  r.heigh := 5.4;
  c := r;
  NEW(pr);
  pr^ := r;
  ps := pr;
  NEW(pc);
  pc^ := c;
  ps.next := pc;
  vector[1] := matrix[1][1];
  matrix[0][0] := vector[0 * 1000];

  (* комментарий *)
  WHILE p1.x * p1.y < 77777 DO
    p1.x := p1.x * 1.5;
    p1.y := p1.y * 2.5;
  END;

  IF p1.x > pc.radius THEN
    p2 := p1;
    p1 := pc.center;
  ELSE
    p2 := pr.center;
  END;
END.
```

## Вывод на `stdout`

<!-- ENABLE LONG LINES -->

```
Исходный код:
TYPE
  Point = RECORD
    x, y : REAL;
  END;
  Shape = RECORD
    center : Point;
    color : INTEGER;
    next : POINTER TO Shape;
  END;
  Circle = RECORD(Shape)
    radius : REAL;
  END;
  Rectangle = RECORD(Shape)
    width, height : REAL;
  END;

VAR
  p1, p2 : Point;
  s : Shape;
  c : Circle;
  r : Rectangle;
  ps : POINTER TO Shape;
  pc : POINTER TO Circle;
  pr : POINTER TO Rectangle;
  vector : ARRAY 10 OF INTEGER;
  matrix : ARRAY 10 OF ARRAY 10 OF INTEGER;
BEGIN
  p1.x := 10;
  p1.y := 3.5;
  s.center := p1;
  s.color := 100500;
  c := s;
  c.radius := 7;
  r.center.x := 5.2;
  r.center.y := 2.5;
  r.color := 500100;
  r.width := 4.5;
  r.heigh := 5.4;
  c := r;
  NEW(pr);
  pr^ := r;
  ps := pr;
  NEW(pc);
  pc^ := c;
  ps.next := pc;
  vector[1] := matrix[1][1];
  matrix[0][0] := vector[0 * 1000];

  (* комментарий *)
  WHILE p1.x * p1.y < 77777 DO
    p1.x := p1.x * 1.5;
    p1.y := p1.y * 2.5;
  END;

  IF p1.x > pc.radius THEN
    p2 := p1;
    p1 := pc.center;
  ELSE
    p2 := pr.center;
  END;
END.

Результат парсинга:
Program(type_defs=[TypeDef(name='Point',
                           spec=RecordType(base=None,
                                           fields=[Field(name='x',
                                                         type=RefType(name='REAL')),
                                                   Field(name='y',
                                                         type=RefType(name='REAL'))])),
                   TypeDef(name='Shape',
                           spec=RecordType(base=None,
                                           fields=[Field(name='center',
                                                         type=RefType(name='Point')),
                                                   Field(name='color',
                                                         type=RefType(name='INTEGER')),
                                                   Field(name='next',
                                                         type=PointerType(target=RefType(name='Shape')))])),
                   TypeDef(name='Circle',
                           spec=RecordType(base='Shape',
                                           fields=[Field(name='radius',
                                                         type=RefType(name='REAL'))])),
                   TypeDef(name='Rectangle',
                           spec=RecordType(base='Shape',
                                           fields=[Field(name='width',
                                                         type=RefType(name='REAL')),
                                                   Field(name='height',
                                                         type=RefType(name='REAL'))]))],
        var_decls=[VarDecl(name='p1', type=RefType(name='Point')),
                   VarDecl(name='p2', type=RefType(name='Point')),
                   VarDecl(name='s', type=RefType(name='Shape')),
                   VarDecl(name='c', type=RefType(name='Circle')),
                   VarDecl(name='r', type=RefType(name='Rectangle')),
                   VarDecl(name='ps',
                           type=PointerType(target=RefType(name='Shape'))),
                   VarDecl(name='pc',
                           type=PointerType(target=RefType(name='Circle'))),
                   VarDecl(name='pr',
                           type=PointerType(target=RefType(name='Rectangle'))),
                   VarDecl(name='vector',
                           type=ArrayType(size=LiteralExpr(value=10,
                                                           type=<Type.INTEGER: 'INTEGER'>),
                                          target=RefType(name='INTEGER'))),
                   VarDecl(name='matrix',
                           type=ArrayType(size=LiteralExpr(value=10,
                                                           type=<Type.INTEGER: 'INTEGER'>),
                                          target=ArrayType(size=LiteralExpr(value=10,
                                                                            type=<Type.INTEGER: 'INTEGER'>),
                                                           target=RefType(name='INTEGER'))))],
        statements=[AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                           field='x'),
                                    expr=LiteralExpr(value=10,
                                                     type=<Type.INTEGER: 'INTEGER'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                           field='y'),
                                    expr=LiteralExpr(value=3.5,
                                                     type=<Type.REAL: 'REAL'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='s'),
                                                           field='center'),
                                    expr=VariableExpr(name='p1')),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='s'),
                                                           field='color'),
                                    expr=LiteralExpr(value=100500,
                                                     type=<Type.INTEGER: 'INTEGER'>)),
                    AssignStatement(lvalue=VariableExpr(name='c'),
                                    expr=VariableExpr(name='s')),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='c'),
                                                           field='radius'),
                                    expr=LiteralExpr(value=7,
                                                     type=<Type.INTEGER: 'INTEGER'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=FieldAccessExpr(obj=VariableExpr(name='r'),
                                                                               field='center'),
                                                           field='x'),
                                    expr=LiteralExpr(value=5.2,
                                                     type=<Type.REAL: 'REAL'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=FieldAccessExpr(obj=VariableExpr(name='r'),
                                                                               field='center'),
                                                           field='y'),
                                    expr=LiteralExpr(value=2.5,
                                                     type=<Type.REAL: 'REAL'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='r'),
                                                           field='color'),
                                    expr=LiteralExpr(value=500100,
                                                     type=<Type.INTEGER: 'INTEGER'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='r'),
                                                           field='width'),
                                    expr=LiteralExpr(value=4.5,
                                                     type=<Type.REAL: 'REAL'>)),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='r'),
                                                           field='heigh'),
                                    expr=LiteralExpr(value=5.4,
                                                     type=<Type.REAL: 'REAL'>)),
                    AssignStatement(lvalue=VariableExpr(name='c'),
                                    expr=VariableExpr(name='r')),
                    NewStatement(var='pr'),
                    AssignStatement(lvalue=DerefExpr(ptr=VariableExpr(name='pr')),
                                    expr=VariableExpr(name='r')),
                    AssignStatement(lvalue=VariableExpr(name='ps'),
                                    expr=VariableExpr(name='pr')),
                    NewStatement(var='pc'),
                    AssignStatement(lvalue=DerefExpr(ptr=VariableExpr(name='pc')),
                                    expr=VariableExpr(name='c')),
                    AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='ps'),
                                                           field='next'),
                                    expr=VariableExpr(name='pc')),
                    AssignStatement(lvalue=IndexEpr(obj=VariableExpr(name='vector'),
                                                    index=LiteralExpr(value=1,
                                                                      type=<Type.INTEGER: 'INTEGER'>)),
                                    expr=IndexEpr(obj=IndexEpr(obj=VariableExpr(name='matrix'),
                                                               index=LiteralExpr(value=1,
                                                                   type=<Type.INTEGER: 'INTEGER'>)),
                                                  index=LiteralExpr(value=1,
                                                                    type=<Type.INTEGER: 'INTEGER'>))),
                    AssignStatement(lvalue=IndexEpr(obj=IndexEpr(obj=VariableExpr(name='matrix'),
                                                                 index=LiteralExpr(value=0,
                                                                     type=<Type.INTEGER: 'INTEGER'>)),
                                                    index=LiteralExpr(value=0,
                                                              type=<Type.INTEGER: 'INTEGER'>)),
                                    expr=IndexEpr(obj=VariableExpr(name='vector'),
                                                  index=BinOpExpr(left=LiteralExpr(value=0,
                                                                    type=<Type.INTEGER: 'INTEGER'>),
                                                                  op='*',
                                                                  right=LiteralExpr(value=1000,
                                                                   type=<Type.INTEGER: 'INTEGER'>)))),
      WhileStatement(condition=BinOpExpr(left=BinOpExpr(left=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                            field='x'),
                                                                      op='*',
                                                  right=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                      field='y')),
                                                       op='<',
                                            right=LiteralExpr(value=77777,
                                                            type=<Type.INTEGER: 'INTEGER'>)),
                         body=[AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                                field='x'),
                    expr=BinOpExpr(left=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                                             field='x'),
                                                                        op='*',
                                                                        right=LiteralExpr(value=1.5,
                                                                                type=<Type.REAL: 'REAL'>))),
                                         AssignStatement(lvalue=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                                field='y'),
                                 expr=BinOpExpr(left=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                                             field='y'),
                                                                        op='*',
                                                                        right=LiteralExpr(value=2.5,
                                                           type=<Type.REAL: 'REAL'>)))]),
                    IfStatement(condition=BinOpExpr(left=FieldAccessExpr(obj=VariableExpr(name='p1'),
                                                                         field='x'),
                                                    op='>',
                                                    right=FieldAccessExpr(obj=VariableExpr(name='pc'),
                                                                          field='radius')),
                                then_body=[AssignStatement(lvalue=VariableExpr(name='p2'),
                                                           expr=VariableExpr(name='p1')),
                                           AssignStatement(lvalue=VariableExpr(name='p1'),
                                                           expr=FieldAccessExpr(obj=VariableExpr(name='pc'),
                                                                                field='center'))],
                                else_body=[AssignStatement(lvalue=VariableExpr(name='p2'),
                                                           expr=FieldAccessExpr(obj=VariableExpr(name='pr'),
                                                                                field='center'))])])
```

# Вывод
Вспомнил (с ТФЯ еще) как составлять грамматики и научился на их основе проектировать синтаксические деревья.