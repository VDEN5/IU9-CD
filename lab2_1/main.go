package main

import (
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"os"
)

// Функция для вставки init и next в циклы for
func insertInitNext(file *ast.File) {
	// Обходим всё синтаксическое дерево
	ast.Inspect(file, func(node ast.Node) bool {
		// Проверяем, является ли узел циклом for
		if forStmt, ok := node.(*ast.ForStmt); ok {
			// Если цикл уже имеет init или post - пропускаем
			if forStmt.Init != nil || forStmt.Post != nil {
				return true
			}

			// Создаём выражение fmt.Println("init") для блока инициализации
			forStmt.Init = &ast.ExprStmt{
				X: &ast.CallExpr{
					Fun: &ast.SelectorExpr{
						X:   ast.NewIdent("fmt"),
						Sel: ast.NewIdent("Println"),
					},
					Args: []ast.Expr{
						&ast.BasicLit{
							Kind:  token.STRING,
							Value: `"init"`,
						},
					},
				},
			}

			// Создаём выражение fmt.Println("next") для пост-обработки
			forStmt.Post = &ast.ExprStmt{
				X: &ast.CallExpr{
					Fun: &ast.SelectorExpr{
						X:   ast.NewIdent("fmt"),
						Sel: ast.NewIdent("Println"),
					},
					Args: []ast.Expr{
						&ast.BasicLit{
							Kind:  token.STRING,
							Value: `"next"`,
						},
					},
				},
			}
		}
		return true
	})
}

func main() {
	// Проверяем аргументы командной строки
	if len(os.Args) != 3 {
		fmt.Printf("Использование: %s <входной_файл.go> <выходной_файл.go>\n", os.Args[0])
		os.Exit(1)
	}

	// Создаём набор файлов для хранения позиций в исходном коде
	fset := token.NewFileSet()

	// Парсим входной файл
	file, err := parser.ParseFile(
		fset,                 // данные об исходниках
		os.Args[1],           // имя входного файла
		nil,                  // nil = парсер сам прочитает файл
		parser.ParseComments, // сохраняем комментарии
	)

	if err != nil {
		fmt.Printf("Ошибка при парсинге: %v\n", err)
		os.Exit(1)
	}

	// Трансформируем синтаксическое дерево
	insertInitNext(file)

	// Создаём выходной файл
	outFile, err := os.Create(os.Args[2])
	if err != nil {
		fmt.Printf("Ошибка при создании файла: %v\n", err)
		os.Exit(1)
	}
	defer outFile.Close()

	// Записываем трансформированный код в файл
	err = format.Node(outFile, fset, file)
	if err != nil {
		fmt.Printf("Ошибка при форматировании: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Трансформация завершена! Результат сохранён в %s\n", os.Args[2])
}
