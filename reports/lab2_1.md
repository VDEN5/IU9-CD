% Лабораторная работа № 2.1. Синтаксические деревья
% 18 февраля 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является изучение представления синтаксических деревьев
в памяти компилятора и приобретение навыков преобразования синтаксических деревьев.

# Индивидуальный вариант
Разбить блоки объявления нескольких переменных на несколько блоков объявления одной переменной.

# Реализация

Демонстрационная программа:

```go
//сплагиачу у себя же с дискретной математики (интересно, покажет ли совпадение)
package main

import (
	"bufio"
	"fmt"
	"os"
)

type cond struct {
	T    []int
	F    []string
	used bool
	New  int
}

var n, m, q, order int
var A, A1 []cond

func dfs(i int) {
	A[i].used, A[i].New = true, order
	order++
	for j := 0; j < m; j++ {
		if !(A[A[i].T[j]].used) {
			dfs(A[i].T[j])
		}
	}
}
func main() {
	stdin := bufio.NewReader(os.Stdin)
	fmt.Fscan(stdin, &n, &m, &q)
	A = make([]cond, n)
	A1 = make([]cond, n)
	for i := 0; i < n; i++ {
		A[i].T = make([]int, m)
		A1[i].T = make([]int, m)
		for j := 0; j < m; j++ {
			fmt.Fscan(stdin, &A[i].T[j])
		}
	}
	for i := 0; i < n; i++ {
		A[i].F = make([]string, m)
		A1[i].F = make([]string, m)
		for j := 0; j < m; j++ {
			fmt.Fscan(stdin, &A[i].F[j])
		}
	}
	dfs(q)
	for i := 0; i < n; i++ {
		for j := 0; j < m; j++ {
			A1[A[i].New].T[j], A1[A[i].New].F[j] = A[A[i].T[j]].New, A[i].F[j]
		}
	}
	fmt.Println(order)
	fmt.Println(m)
	fmt.Println("0")
	for i := 0; i < order; i++ {
		for j := 0; j < m; j++ {
			fmt.Printf("%d ", A1[i].T[j])
		}
		fmt.Println()
	}
	for i := 0; i < order; i++ {
		for j := 0; j < m; j++ {
			fmt.Printf("%s ", A1[i].F[j])
		}
		fmt.Println()
	}
}
```

Программа, осуществляющая преобразование синтаксического дерева:

```go
package main

import (
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"os"
)

// разбивает множественные объявления переменных на отдельные
func splitDeclarations(file *ast.File) {
	// Вспомогательная функция для разбиения одного GenDecl
	splitGenDecl := func(decl *ast.GenDecl, groupDoc *ast.CommentGroup) []ast.Decl {
		var result []ast.Decl
		for i, spec := range decl.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				result = append(result, &ast.GenDecl{
					Tok:   decl.Tok,
					Specs: []ast.Spec{spec},
					Doc:   groupDoc,
				})
				continue
			}
			if len(vs.Names) == 1 {
				// одиночное объявление
				newDecl := &ast.GenDecl{
					Tok:   decl.Tok,
					Specs: []ast.Spec{vs},
				}
				if i == 0 {
					newDecl.Doc = groupDoc
				}
				result = append(result, newDecl)
				continue
			}
			// множественное объявление – разбиваем на отдельные
			for j, name := range vs.Names {
				newVs := &ast.ValueSpec{
					Names:   []*ast.Ident{name},
					Type:    vs.Type,
					Doc:     vs.Doc,    
					Comment: vs.Comment, 
				}
				// распределяем 
				if len(vs.Values) == len(vs.Names) {
					newVs.Values = []ast.Expr{vs.Values[j]}
				} else if len(vs.Values) == 1 && len(vs.Names) > 1 {
					newVs.Values = []ast.Expr{vs.Values[0]}
				}
				newDecl := &ast.GenDecl{
					Tok:   decl.Tok,
					Specs: []ast.Spec{newVs},
				}
				if i == 0 && j == 0 {
					newDecl.Doc = groupDoc
				}
				result = append(result, newDecl)
			}
		}
		return result
	}

	// --- Обработка верхнего уровня ---
	var newDecls []ast.Decl
	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.VAR {
			newDecls = append(newDecls, decl)
			continue
		}
		split := splitGenDecl(genDecl, genDecl.Doc)
		newDecls = append(newDecls, split...)
	}
	file.Decls = newDecls

	// --- Обработка блоков внутри функций ---
	var processStmtList func([]ast.Stmt) []ast.Stmt
	processStmtList = func(stmts []ast.Stmt) []ast.Stmt {
		var newStmts []ast.Stmt
		for _, stmt := range stmts {
			switch s := stmt.(type) {
			case *ast.DeclStmt: //с var
				genDecl, ok := s.Decl.(*ast.GenDecl)
				if !ok || genDecl.Tok != token.VAR {
					newStmts = append(newStmts, stmt)
					continue
				}
				split := splitGenDecl(genDecl, genDecl.Doc)
				for _, d := range split {
					newStmts = append(newStmts, &ast.DeclStmt{Decl: d})
				}
			case *ast.AssignStmt: //короткие
				if s.Tok == token.DEFINE && len(s.Lhs) > 1 {
					for i, lhs := range s.Lhs {
						if i < len(s.Rhs) {
							newStmts = append(newStmts, &ast.AssignStmt{
								Lhs: []ast.Expr{lhs},
								Tok: token.DEFINE,
								Rhs: []ast.Expr{s.Rhs[i]},
							})
						}
					}
				} else {
					newStmts = append(newStmts, stmt)
				}
			default:
				newStmts = append(newStmts, stmt)
			}
		}
		return newStmts
	}

	ast.Inspect(file, func(n ast.Node) bool {
		switch node := n.(type) {
		case *ast.BlockStmt:
			node.List = processStmtList(node.List)
		case *ast.CaseClause:
			node.Body = processStmtList(node.Body)
		case *ast.CommClause:
			node.Body = processStmtList(node.Body)
		}
		return true
	})
}

func main() {
	if len(os.Args) != 3 {
		fmt.Printf("Использование: %s <входной_файл.go> <выходной_файл.go>\n", os.Args[0])
		os.Exit(1)
	}

	fset := token.NewFileSet()

	file, err := parser.ParseFile(
		fset,
		os.Args[1],
		nil,
		parser.ParseComments,
	)

	if err != nil {
		fmt.Printf("Ошибка при парсинге: %v\n", err)
		os.Exit(1)
	}

	splitDeclarations(file)

	outFile, err := os.Create(os.Args[2])
	if err != nil {
		fmt.Printf("Ошибка при создании файла: %v\n", err)
		os.Exit(1)
	}
	defer outFile.Close()

	err = format.Node(outFile, fset, file)
	if err != nil {
		fmt.Printf("Ошибка при форматировании: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Трансформация завершена! Результат в %s\n", os.Args[2])
}
```

# Тестирование

Результат трансформации демонстрационной программы:

```go
package main

import (
	"bufio"
	"fmt"
	"os"
)

type cond struct {
	T    []int
	F    []string
	used bool
	New  int
}

var n int
var m int
var q int
var order int
var A []cond
var A1 []cond

func dfs(i int) {
	A[i].used, A[i].New = true, order
	order++
	for j := 0; j < m; j++ {
		if !(A[A[i].T[j]].used) {
			dfs(A[i].T[j])
		}
	}
}
func main() {
	stdin := bufio.NewReader(os.Stdin)
	fmt.Fscan(stdin, &n, &m, &q)
	A = make([]cond, n)
	A1 = make([]cond, n)
	for i := 0; i < n; i++ {
		A[i].T = make([]int, m)
		A1[i].T = make([]int, m)
		for j := 0; j < m; j++ {
			fmt.Fscan(stdin, &A[i].T[j])
		}
	}
	for i := 0; i < n; i++ {
		A[i].F = make([]string, m)
		A1[i].F = make([]string, m)
		for j := 0; j < m; j++ {
			fmt.Fscan(stdin, &A[i].F[j])
		}
	}
	dfs(q)
	for i := 0; i < n; i++ {
		for j := 0; j < m; j++ {
			A1[A[i].New].T[j], A1[A[i].New].F[j] = A[A[i].T[j]].New, A[i].F[j]
		}
	}
	fmt.Println(order)
	fmt.Println(m)
	fmt.Println("0")
	for i := 0; i < order; i++ {
		for j := 0; j < m; j++ {
			fmt.Printf("%d ", A1[i].T[j])
		}
		fmt.Println()
	}
	for i := 0; i < order; i++ {
		for j := 0; j < m; j++ {
			fmt.Printf("%s ", A1[i].F[j])
		}
		fmt.Println()
	}
}

```


# Вывод
Пусть задан код программы, мы его можем преобразовать в синтаксическое дерево.
В этой работе я прежде всего научился изменять заданное синтаксическое дерево.
То есть в начале дан код, преобразуется он в дерево, а затем мы это дерево модифицируем,
тем самым возвращая новый код программы.