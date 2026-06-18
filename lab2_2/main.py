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

# Statement → LValue := Expr | NEW ( ident ) | IF Expr THEN StatementSeq ELSE StatementSeq END | WHILE Expr DO StatementSeq END
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

# Statement → LValue := Expr | NEW ( ident ) | IF Expr THEN StatementSeq ELSE StatementSeq END | WHILE Expr DO StatementSeq END
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