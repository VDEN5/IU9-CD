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